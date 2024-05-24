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
    productIngredients: string,
    productName: string,
    language: string
    ): string {
    return `Human:
          You are a nutrition expert with the task to provide recommendations about a specific product for the user based on the user's allergies and preferences. 
          Your task involves the following steps:

          1. Use the user's allergy information, if provided, to ensure that the ingredients in the product are suitable for the user.
          2. Use the user's preferences, if provided, to ensure that the user will enjoy the product. Note that the product can contain additives listed in the additives. Make sure these additives are compatible with user allergies and preferences.
          3. Present three benefits and three disadvantages for the product, ensuring that each list consists of precisely three points.
          4. Provide nutritional recommendations for the product based on its ingredients and the user's needs.
  
          If the user's allergy information or preferences are not provided or are empty, offer general nutritional advice on the product.
  
          Example:
          <product_name>Chocolate and hazelnut spread</product_name>
          <product_ingredients>
          {{
              Sucre, sirop de glucose, NOISETTES entières torréfiées, matières grasses végétales (palme, karité), beurre de cacao¹, LAIT entier en poudre, PETIT-LAIT filtré en poudre, LAIT écrémé concentré sucré (LAIT écrémé, sucre), sirop de glucose-fructose, pâte de cacao¹, blancs d'ŒUFS en poudre, émulsifiant (lécithines). Peut contenir ARACHIDES, autres FRUITS À COQUE (AMANDES, NOIX DE CAJOU, NOIX DE PECAN) et SOJA. ¹Bilan massique certifié Rainforest Alliance. www.ra.org/fr.
          }}
          </product_ingredients>
          <user_allergies></user_allergies>
          <user_preferences>I don't like chocolate</user_preferences>
          </example>
          Response: 
          <data>
              <recommendations>
                  <recommendation>
                  Although Nutella contains a small amount of calcium and iron, it's not very nutritious and high in sugar, calories and fat.
                  </recommendation>
              </recommendations>
              <benefits>
                  <benefit>{{benefit}}</benefit>
              </benefits>
              <disadvantages>
                  <disadvantage>{{disadvantage}}</disadvantage>
              </disadvantages>                 
          </data>
  
          Provide recommendation for the following product
          <product_name>${productName}</product_name>
          <product_ingredients>
          ${productIngredients}
          </product_ingredients>
          <user_allergies>${userAllergies}</user_allergies>
          <user_preferences>${userPreference}</user_preferences>
          Provide the response in the third person, in ${language}, skip the preambule, disregard any content at the end and provide only the response in this Markdown format:


        markdown

        Describe potential_health_issues, preference_matter and recommendation here combines in one single short paragraph

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
 * @returns A tuple containing product name, ingredients, and additives if the product is found in the database; otherwise, returns [null, null, null].
 */
async function getProductFromDb(productCode: string, language: string): Promise<[string | null, string | null, string | null]> {

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
            return [item.product_name || null, item.ingredients || null, item.additives || null];
        } else {
            return [null, null, null];
        }
    } catch (e) {
        console.error('Error while getting the Product from database', e);
        return [null, null, null];
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

async function generateSummary(promptText, responseStream) {

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

async function simulateSummaryStreaming(content: string, responseStream): Promise<void> {
   
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

async function messageHandler (event, responseStream) {

    try {
        logger.info(event as any);

        const body = event.body ? JSON.parse(event.body) : {};
        const productCode = body.productCode;
        const language = body.language;

        const userPreferenceKeys = Object.keys(body.preferences).filter(key => body.preferences[key]);
        const userAllergiesKeys = Object.keys(body.allergies).filter(key => body.allergies[key]);

        const userPreferenceString = userPreferenceKeys.join(', ');
        const userAllergiesString = userAllergiesKeys.join(', ');


        const [productName, productIngredients, productAdditives] = await getProductFromDb(productCode, language);
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
                ingredientsString,
                productName,
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