import { DynamoDBClient, GetItemCommand, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { Tracer } from "@aws-lambda-powertools/tracer";
import { Logger } from "@aws-lambda-powertools/logger";
import { APIGatewayProxyEventV2, Handler, Context } from 'aws-lambda';
import { createHash } from 'crypto';
import { BedrockRuntimeClient, InvokeModelWithResponseStreamCommand } from "@aws-sdk/client-bedrock-runtime";

const logger = new Logger();
const dynamodb = new DynamoDBClient({});

const PRODUCT_TABLE_NAME = process.env.PRODUCT_TABLE_NAME
const PRODUCT_SUMMARY_TABLE_NAME = process.env.PRODUCT_SUMMARY_TABLE_NAME
const MODEL_ID = "anthropic.claude-3-haiku-20240307-v1:0"



const bedrockRuntimeClient = new BedrockRuntimeClient({ region: process.env.REGION || 'us-east-1' });


declare global {
    namespace awslambda {
      function streamifyResponse(
        f: (
          event: APIGatewayProxyEventV2,
          responseStream: NodeJS.WritableStream,
          context: Context
        ) => Promise<void>
      ): Handler;
    }
}



interface ProductItem {
    product_code: string;
    language: string;
    product_name?: string;
    ingredients?: string;
    additives?: string;
    allergens_tags?: string[];
    nutriments?: any;
    labels_tags?: string[];
    categories?: string;
}

interface ProductSummaryItem {
    product_code: string;
    params_hash: string;
    summary: string;
}

interface SummaryData {
    recommendations: string[];
    benefits: string[];
    disadvantages: string[];
  }


function generateProductSummaryPrompt(
    userAllergies: string,
    userPreference: string,
    userHealthGoal: string,
    userReligion: string,
    productIngredients: string,
    productName: string,
    productAllergens: string[],
    productNutriments: any,
    productLabels: string[],
    productCategories: string,
    language: string
    ): string {
    
    // Format nutriments for display
    let nutrimentInfo = '';
    if (productNutriments && Object.keys(productNutriments).length > 0) {
        nutrimentInfo = '\n<nutrition_per_100g>\n';
        if (productNutriments['energy-kcal_100g']) nutrimentInfo += `Calories: ${productNutriments['energy-kcal_100g']} kcal\n`;
        if (productNutriments['carbohydrates_100g']) nutrimentInfo += `Carbohydrates: ${productNutriments['carbohydrates_100g']}g\n`;
        if (productNutriments['sugars_100g']) nutrimentInfo += `Sugars: ${productNutriments['sugars_100g']}g\n`;
        if (productNutriments['fat_100g']) nutrimentInfo += `Fat: ${productNutriments['fat_100g']}g\n`;
        if (productNutriments['saturated-fat_100g']) nutrimentInfo += `Saturated Fat: ${productNutriments['saturated-fat_100g']}g\n`;
        if (productNutriments['proteins_100g']) nutrimentInfo += `Protein: ${productNutriments['proteins_100g']}g\n`;
        if (productNutriments['fiber_100g']) nutrimentInfo += `Fiber: ${productNutriments['fiber_100g']}g\n`;
        if (productNutriments['salt_100g']) nutrimentInfo += `Salt: ${productNutriments['salt_100g']}g\n`;
        nutrimentInfo += '</nutrition_per_100g>\n';
    }
    
    // Format allergens - only if user has allergies
    let allergenInfo = '';
    if (userAllergies && productAllergens && productAllergens.length > 0) {
        allergenInfo = `\n<product_allergens>${productAllergens.join(', ')}</product_allergens>\n`;
    }
    
    // Format labels
    let labelInfo = '';
    if (productLabels && productLabels.length > 0) {
        labelInfo = `\n<product_labels>${productLabels.join(', ')}</product_labels>\n`;
    }
    
    // Format categories
    let categoryInfo = '';
    if (productCategories) {
        categoryInfo = `\n<product_categories>${productCategories}</product_categories>\n`;
    }
    
    // Build instructions based on what user has set
    let instructions = `You are a nutrition expert providing recommendations about a specific product.

    Your task:
    `;
    
    if (userAllergies) {
        instructions += `1. CRITICAL: Check if any product allergens match the user's allergies (${userAllergies}). If there is a match, prominently warn the user.\n`;
    }
    
    if (userPreference) {
        instructions += `${userAllergies ? '2' : '1'}. Check if product labels match dietary preferences (${userPreference}). Use labels for direct matching, or analyze categories and ingredients.\n`;
    }
    
    if (userHealthGoal) {
        instructions += `${(userAllergies ? 1 : 0) + (userPreference ? 1 : 0) + 1}. Use nutritional data to assess if the product aligns with the health goal: ${userHealthGoal}.\n`;
    }
    
    if (userReligion) {
        instructions += `${(userAllergies ? 1 : 0) + (userPreference ? 1 : 0) + (userHealthGoal ? 1 : 0) + 1}. Check if product labels match religious requirement: ${userReligion}.\n`;
    }
    
    instructions += `- Present three nutritional benefits and three nutritional disadvantages for the product based on actual nutritionalvalues.
    If the user's information is not provided or is empty, offer general nutritional advice based on the product's nutritional data.
    IMPORTANT: Only mention allergens, dietary preferences, health goals, or religious requirements if the user has specified them. Do not discuss aspects the user hasn't set.`;
    
    let userContext = '';
    if (userAllergies) userContext += `\n<user_allergies>${userAllergies}</user_allergies>`;
    if (userHealthGoal) userContext += `\n<user_health_goal>${userHealthGoal}</user_health_goal>`;
    if (userPreference) userContext += `\n<user_dietary_preferences>${userPreference}</user_dietary_preferences>`;
    if (userReligion) userContext += `\n<user_religious_requirement>${userReligion}</user_religious_requirement>`;
    
    return `Human:
          ${instructions}
  
          Provide recommendation for the following product:
            <product_name>${productName}</product_name>
            <product_ingredients>${productIngredients}</product_ingredients>
            <allergenInfo>${allergenInfo}</allergenInfo>
            <labelInfo>${labelInfo}</labelInfo>
            <categoryInfo>${categoryInfo}</categoryInfo>
            <nutrimentInfo>${nutrimentInfo}</nutrimentInfo>

          For the user:
            ${userContext}
          
          Provide the response in the third person, in ${language}, skip the preambule, disregard any content at the end and provide only the response in this Markdown format:


        markdown

        Describe allergen warnings (if any), dietary label compatibility, religious requirement compatibility, health goal compatibility, dietary preference compatibility, and recommendation here combined in one single short paragraph

        #### Benefits title here
        - Describe benefits here

        #### Disadvantages title here
        - Describe disadvantages here
          
          Assistant:
          `;
}

function generateCombinedString(obj: { [key: string]: any }): string {
    const concatenatedString = Object.keys(obj).join('');
    return concatenatedString;
}



function calculateHash(
    productCode: string,
    userAllergies: any,
    userPreferenceData: any,
    language: string
    ): string {
    /**
     * Calculates a SHA-256 hash based on various input data.
     *
     * @param userAllergies - A string containing user allergies data.
     * @param userPreferenceData - A string containing user preference data.
     * @param productIngredients - A string containing product ingredients data.
     * @param productName - The name of the product.
     * @param language - The language.
     * @param productAdditives - A string containing product additives data.
     * @returns The SHA-256 hash value calculated based on the concatenated string representations of the input data.
     */

    // Convert dictionaries to JSON strings
    const userAllergiesStr = generateCombinedString(userAllergies);//JSON.stringify(userAllergies);
    const userPreferenceDataStr = generateCombinedString(userPreferenceData);
    
    // Concatenate the string representations of the variables
    const concatenatedString = `${productCode}${userAllergiesStr}${userPreferenceDataStr}${language}`;
    // Calculate the hash
    const hashedValue = createHash('sha256').update(concatenatedString).digest('hex');
    
    return hashedValue;
}

/**
 * Retrieves product information from the database using the provided product code.
 *
 * @param productCode - The code of the product to retrieve information for.
 * @param language - The language for the product information.
 * @returns A tuple containing product name, ingredients, additives, allergens, and nutriments if the product is found in the database; otherwise, returns [null, null, null, null, null].
 */
async function getProductFromDb(productCode: string, language: string): Promise<[string | null, string | null, string | null, string[] | null, any | null, string[] | null, string | null]> {

    try {
        const { Item  = {} } = await dynamodb.send(new GetItemCommand({
            TableName: PRODUCT_TABLE_NAME,
            Key: {
                product_code: { S: productCode },
                language: { S: language }
            }
        }));
        // Check if the item exists
        if (Item) {
            const item = unmarshall(Item) as ProductItem;
            return [
                item.product_name || null, 
                item.ingredients || null, 
                item.additives || null,
                item.allergens_tags || null,
                item.nutriments || null,
                item.labels_tags || null,
                item.categories || null
            ];
        } else {
            return [null, null, null, null, null, null, null];
        }
    } catch (e) {
        console.error('Error while getting the Product from database', e);
        return [null, null, null, null, null, null, null];
    }
}

async function getProductSummary(productCode: string, paramsHash: string): Promise<string | null> {
    /**
     * Retrieves the summary of a product from the database using the product code and parameters hash.
     *
     * @param productCode - The code of the product.
     * @param paramsHash - The hash value representing parameters.
     * @returns The summary of the product if found in the database; otherwise, returns null.
     */
  
    const { Item  = {} } = await dynamodb.send(new GetItemCommand({
        TableName: PRODUCT_SUMMARY_TABLE_NAME,
        Key: {
            product_code: { S: productCode },
            params_hash: { S: paramsHash }
        }
    }));
  
    if (Item) {
      const item = unmarshall(Item) as ProductSummaryItem;
      return item.summary;
    } else {
      return null;
    }
}

async function generateSummary(promptText: string, responseStream: NodeJS.WritableStream) {

    const payload = {
        messages: [
            {
                role: "user",
                content: [
                    {
                        "type": "text",
                        "text": promptText
                    }
                ]
            }
        ],
        max_tokens: 500,
        temperature: 0.5,
        anthropic_version: "bedrock-2023-05-31"
      };
    const params = {
        modelId: MODEL_ID,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify(payload),
    };
    let completion = '';
    try {
        try {
            const command = new InvokeModelWithResponseStreamCommand(params);
            const response = await bedrockRuntimeClient.send(command);
            const events = response.body;
            for await (const event of events || []) {
                // Check the top-level field to determine which event this is.
                if (event.chunk) {
                  const decoded_event = JSON.parse(
                    new TextDecoder().decode(event.chunk.bytes),
                  );
                  if (decoded_event.type  === 'content_block_delta' && decoded_event.delta.type === 'text_delta'){
                    responseStream.write(decoded_event.delta.text)
                    completion += decoded_event.delta.text;
                  }
                } else {
                  logger.error(`event = ${event}`)
                }
              }
            
              logger.info('Stream ended!')
        } catch (err) {
            // handle error
            logger.error(err as any);
        }
    }
    catch (e) {
        logger.error(`Error while generating summary: ${e}`);
        completion = "Error while generating summary";
    }
    return completion;
}

async function simulateSummaryStreaming(content: string, responseStream: NodeJS.WritableStream): Promise<void> {
   
    const chunks = [];
    let remainingContent = content;

    // Loop until all content is split into chunks
    while (remainingContent.length > 0) {
        // Generate a random chunk size between 1 and 10
        const chunkSize = Math.floor(Math.random() * 10) + 1;

        // Take a chunk of content with the generated chunk size
        const chunk = remainingContent.slice(0, chunkSize);

        // Add the chunk to the array
        chunks.push(chunk);

        // Remove the taken chunk from the remaining content
        remainingContent = remainingContent.slice(chunkSize);
    }

    // Simulate streaming by emitting each chunk with a delay
    for (const chunk of chunks) {
        await new Promise(resolve => setTimeout(resolve, 50)); // Simulate delay
        responseStream.write(chunk)

    }
}




async function putProductSummaryToDynamoDB(product_code: string, params_hash: string, summary: string) {
    try {
        await dynamodb.send(new PutItemCommand({
            TableName: PRODUCT_SUMMARY_TABLE_NAME,
            Item: {
                product_code: { S: product_code },
                params_hash: { S: params_hash },
                summary: { S: summary }
            }
        }));
        logger.debug("Summary saved into database");
    } catch (error) {
        console.error("Error:", error);
    }
}

async function messageHandler (event: APIGatewayProxyEventV2, responseStream: NodeJS.WritableStream) {

    try {
        logger.info(event as any);

        const body = event.body ? JSON.parse(event.body) : {};
        const productCode = body.productCode;
        const language = body.language;

        const userPreferenceKeys = Object.keys(body.preferences).filter(key => body.preferences[key]);
        const userAllergiesKeys = Object.keys(body.allergies).filter(key => body.allergies[key]);
        const userHealthGoal = body.healthGoal || '';
        const userReligion = body.religion || '';

        const userPreferenceString = userPreferenceKeys.join(', ');
        const userAllergiesString = userAllergiesKeys.join(', ');


        const [productName, productIngredients, productAdditives, productAllergens, productNutriments, productLabels, productCategories] = await getProductFromDb(productCode, language);
        if (productName && productIngredients) {
            logger.info("Product found");


        } else {
            logger.error("Product not found in the database");
            throw new Error('Product not found in the database');
        }

        const hashValue = calculateHash(productCode, userAllergiesString, userPreferenceString, language);

        let productSummary = await getProductSummary(productCode, hashValue);
        if (!productSummary) {        
            logger.info("Product Summary not found in the database");
            const ingredientKeys = Object.keys(productIngredients);
            const ingredientsString = ingredientKeys.join(', ');

            const promptText = generateProductSummaryPrompt(
                userAllergiesString,
                userPreferenceString,
                userHealthGoal,
                userReligion,
                ingredientsString,
                productName,
                productAllergens || [],
                productNutriments || {},
                productLabels || [],
                productCategories || '',
                language!
            );
            productSummary = await generateSummary(promptText, responseStream);
            await putProductSummaryToDynamoDB(productCode, hashValue, productSummary);
        }
        else {
            await simulateSummaryStreaming(productSummary, responseStream)

        }
        logger.info(`Product Summary: ${productSummary}`);
    } catch (error) {
        console.error("Error:", error);
    }
    responseStream.end();
}

export const handler = awslambda.streamifyResponse(messageHandler);