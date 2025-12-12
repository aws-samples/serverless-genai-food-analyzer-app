"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const util_dynamodb_1 = require("@aws-sdk/util-dynamodb");
const logger_1 = require("@aws-lambda-powertools/logger");
const crypto_1 = require("crypto");
const client_bedrock_runtime_1 = require("@aws-sdk/client-bedrock-runtime");
const logger = new logger_1.Logger();
const dynamodb = new client_dynamodb_1.DynamoDBClient({});
const PRODUCT_TABLE_NAME = process.env.PRODUCT_TABLE_NAME;
const PRODUCT_SUMMARY_TABLE_NAME = process.env.PRODUCT_SUMMARY_TABLE_NAME;
const MODEL_ID = "anthropic.claude-3-haiku-20240307-v1:0";
const bedrockRuntimeClient = new client_bedrock_runtime_1.BedrockRuntimeClient({ region: process.env.REGION || 'us-east-1' });
function generateProductSummaryPrompt(userAllergies, userPreference, userHealthGoal, userReligion, productIngredients, productName, productAllergens, productNutriments, productLabels, productCategories, language, nova_group, nutriscore_grade, ecoscore_grade, brands) {
    // Format nutriments for display
    let nutrimentInfo = '';
    if (productNutriments && Object.keys(productNutriments).length > 0) {
        nutrimentInfo = '\n<nutrition_per_100g>\n';
        if (productNutriments['energy-kcal_100g'])
            nutrimentInfo += `Calories: ${productNutriments['energy-kcal_100g']} kcal\n`;
        if (productNutriments['carbohydrates_100g'])
            nutrimentInfo += `Carbohydrates: ${productNutriments['carbohydrates_100g']}g\n`;
        if (productNutriments['sugars_100g'])
            nutrimentInfo += `Sugars: ${productNutriments['sugars_100g']}g\n`;
        if (productNutriments['fat_100g'])
            nutrimentInfo += `Fat: ${productNutriments['fat_100g']}g\n`;
        if (productNutriments['saturated-fat_100g'])
            nutrimentInfo += `Saturated Fat: ${productNutriments['saturated-fat_100g']}g\n`;
        if (productNutriments['proteins_100g'])
            nutrimentInfo += `Protein: ${productNutriments['proteins_100g']}g\n`;
        if (productNutriments['fiber_100g'])
            nutrimentInfo += `Fiber: ${productNutriments['fiber_100g']}g\n`;
        if (productNutriments['salt_100g'])
            nutrimentInfo += `Salt: ${productNutriments['salt_100g']}g\n`;
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
    // Format quality indicators (only if present and relevant)
    let qualityInfo = '';
    if (userHealthGoal && (nova_group === 4 || nutriscore_grade === 'd' || nutriscore_grade === 'e')) {
        qualityInfo = '\n<product_quality>\n';
        if (nova_group === 4)
            qualityInfo += 'Processing: Ultra-processed (NOVA 4)\n';
        if (nutriscore_grade === 'd' || nutriscore_grade === 'e') {
            qualityInfo += `Nutri-Score: ${nutriscore_grade.toUpperCase()} (lower nutritional quality)\n`;
        }
        qualityInfo += '</product_quality>\n';
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
        if (nova_group === 4 || nutriscore_grade === 'd' || nutriscore_grade === 'e') {
            instructions += `   - Consider the product quality indicators when making recommendations.\n`;
        }
    }
    if (userReligion) {
        instructions += `${(userAllergies ? 1 : 0) + (userPreference ? 1 : 0) + (userHealthGoal ? 1 : 0) + 1}. Check if product labels match religious requirement: ${userReligion}.\n`;
    }
    instructions += `- Present three nutritional benefits and three nutritional disadvantages for the product based on actual nutritionalvalues.
    If the user's information is not provided or is empty, offer general nutritional advice based on the product's nutritional data.
    IMPORTANT: Only mention allergens, dietary preferences, health goals, or religious requirements if the user has specified them. Do not discuss aspects the user hasn't set.`;
    let userContext = '';
    if (userAllergies)
        userContext += `\n<user_allergies>${userAllergies}</user_allergies>`;
    if (userHealthGoal)
        userContext += `\n<user_health_goal>${userHealthGoal}</user_health_goal>`;
    if (userPreference)
        userContext += `\n<user_dietary_preferences>${userPreference}</user_dietary_preferences>`;
    if (userReligion)
        userContext += `\n<user_religious_requirement>${userReligion}</user_religious_requirement>`;
    return `Human:
          ${instructions}
  
          Provide recommendation for the following product:
            <product_name>${productName}</product_name>
            <product_ingredients>${productIngredients}</product_ingredients>
            <allergenInfo>${allergenInfo}</allergenInfo>
            <labelInfo>${labelInfo}</labelInfo>
            <categoryInfo>${categoryInfo}</categoryInfo>
            <nutrimentInfo>${nutrimentInfo}</nutrimentInfo>
            ${qualityInfo}

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
function generateCombinedString(obj) {
    const concatenatedString = Object.keys(obj).join('');
    return concatenatedString;
}
function calculateHash(productCode, userAllergies, userPreferenceData, language) {
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
    const userAllergiesStr = generateCombinedString(userAllergies); //JSON.stringify(userAllergies);
    const userPreferenceDataStr = generateCombinedString(userPreferenceData);
    // Concatenate the string representations of the variables
    const concatenatedString = `${productCode}${userAllergiesStr}${userPreferenceDataStr}${language}`;
    // Calculate the hash
    const hashedValue = (0, crypto_1.createHash)('sha256').update(concatenatedString).digest('hex');
    return hashedValue;
}
/**
 * Retrieves product information from the database using the provided product code.
 *
 * @param productCode - The code of the product to retrieve information for.
 * @param language - The language for the product information.
 * @returns A tuple containing product name, ingredients, additives, allergens, nutriments, labels, categories, nova_group, nutriscore_grade, ecoscore_grade, and brands if the product is found in the database; otherwise, returns [null, null, null, null, null, null, null, null, null, null, null].
 */
async function getProductFromDb(productCode, language) {
    try {
        const { Item = {} } = await dynamodb.send(new client_dynamodb_1.GetItemCommand({
            TableName: PRODUCT_TABLE_NAME,
            Key: {
                product_code: { S: productCode },
                language: { S: language }
            }
        }));
        // Check if the item exists
        if (Item) {
            const item = (0, util_dynamodb_1.unmarshall)(Item);
            return [
                item.product_name || null,
                item.ingredients || null,
                item.additives || null,
                item.allergens_tags || null,
                item.nutriments || null,
                item.labels_tags || null,
                item.categories || null,
                item.nova_group || null,
                item.nutriscore_grade || null,
                item.ecoscore_grade || null,
                item.brands || null
            ];
        }
        else {
            return [null, null, null, null, null, null, null, null, null, null, null];
        }
    }
    catch (e) {
        console.error('Error while getting the Product from database', e);
        return [null, null, null, null, null, null, null, null, null, null, null];
    }
}
async function getProductSummary(productCode, paramsHash) {
    /**
     * Retrieves the summary of a product from the database using the product code and parameters hash.
     *
     * @param productCode - The code of the product.
     * @param paramsHash - The hash value representing parameters.
     * @returns The summary of the product if found in the database; otherwise, returns null.
     */
    const { Item = {} } = await dynamodb.send(new client_dynamodb_1.GetItemCommand({
        TableName: PRODUCT_SUMMARY_TABLE_NAME,
        Key: {
            product_code: { S: productCode },
            params_hash: { S: paramsHash }
        }
    }));
    if (Item) {
        const item = (0, util_dynamodb_1.unmarshall)(Item);
        return item.summary;
    }
    else {
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
        performanceConfigLatency: 'standard'
    };
    let completion = '';
    try {
        try {
            const command = new client_bedrock_runtime_1.InvokeModelWithResponseStreamCommand(params);
            const response = await bedrockRuntimeClient.send(command);
            const events = response.body;
            for await (const event of events || []) {
                // Check the top-level field to determine which event this is.
                if (event.chunk) {
                    const decoded_event = JSON.parse(new TextDecoder().decode(event.chunk.bytes));
                    if (decoded_event.type === 'content_block_delta' && decoded_event.delta.type === 'text_delta') {
                        responseStream.write(decoded_event.delta.text);
                        completion += decoded_event.delta.text;
                    }
                }
                else {
                    logger.error(`event = ${event}`);
                }
            }
            logger.info('Stream ended!');
        }
        catch (err) {
            // handle error
            logger.error(err);
        }
    }
    catch (e) {
        logger.error(`Error while generating summary: ${e}`);
        completion = "Error while generating summary";
    }
    return completion;
}
async function simulateSummaryStreaming(content, responseStream) {
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
        responseStream.write(chunk);
    }
}
async function putProductSummaryToDynamoDB(product_code, params_hash, summary) {
    try {
        await dynamodb.send(new client_dynamodb_1.PutItemCommand({
            TableName: PRODUCT_SUMMARY_TABLE_NAME,
            Item: {
                product_code: { S: product_code },
                params_hash: { S: params_hash },
                summary: { S: summary }
            }
        }));
        logger.debug("Summary saved into database");
    }
    catch (error) {
        console.error("Error:", error);
    }
}
async function messageHandler(event, responseStream) {
    try {
        logger.info(event);
        const body = event.body ? JSON.parse(event.body) : {};
        const productCode = body.productCode;
        const language = body.language;
        const userPreferenceKeys = Object.keys(body.preferences).filter(key => body.preferences[key]);
        const userAllergiesKeys = Object.keys(body.allergies).filter(key => body.allergies[key]);
        const userHealthGoal = body.healthGoal || '';
        const userReligion = body.religion || '';
        const userPreferenceString = userPreferenceKeys.join(', ');
        const userAllergiesString = userAllergiesKeys.join(', ');
        const [productName, productIngredients, productAdditives, productAllergens, productNutriments, productLabels, productCategories, nova_group, nutriscore_grade, ecoscore_grade, brands] = await getProductFromDb(productCode, language);
        if (productName && productIngredients) {
            logger.info("Product found");
        }
        else {
            logger.error("Product not found in the database");
            throw new Error('Product not found in the database');
        }
        const hashValue = calculateHash(productCode, userAllergiesString, userPreferenceString, language);
        let productSummary = await getProductSummary(productCode, hashValue);
        if (!productSummary) {
            logger.info("Product Summary not found in the database");
            const ingredientKeys = Object.keys(productIngredients);
            const ingredientsString = ingredientKeys.join(', ');
            const promptText = generateProductSummaryPrompt(userAllergiesString, userPreferenceString, userHealthGoal, userReligion, ingredientsString, productName, productAllergens || [], productNutriments || {}, productLabels || [], productCategories || '', language, nova_group || undefined, nutriscore_grade || undefined, ecoscore_grade || undefined, brands || undefined);
            productSummary = await generateSummary(promptText, responseStream);
            await putProductSummaryToDynamoDB(productCode, hashValue, productSummary);
        }
        else {
            await simulateSummaryStreaming(productSummary, responseStream);
        }
        logger.info(`Product Summary: ${productSummary}`);
    }
    catch (error) {
        console.error("Error:", error);
    }
    responseStream.end();
}
exports.handler = awslambda.streamifyResponse(messageHandler);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw4REFBMEY7QUFDMUYsMERBQW9EO0FBRXBELDBEQUF1RDtBQUV2RCxtQ0FBb0M7QUFDcEMsNEVBQTZHO0FBRTdHLE1BQU0sTUFBTSxHQUFHLElBQUksZUFBTSxFQUFFLENBQUM7QUFDNUIsTUFBTSxRQUFRLEdBQUcsSUFBSSxnQ0FBYyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBRXhDLE1BQU0sa0JBQWtCLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQTtBQUN6RCxNQUFNLDBCQUEwQixHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsMEJBQTBCLENBQUE7QUFDekUsTUFBTSxRQUFRLEdBQUcsd0NBQXdDLENBQUE7QUFJekQsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLDZDQUFvQixDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxJQUFJLFdBQVcsRUFBRSxDQUFDLENBQUM7QUE4Q3JHLFNBQVMsNEJBQTRCLENBQ2pDLGFBQXFCLEVBQ3JCLGNBQXNCLEVBQ3RCLGNBQXNCLEVBQ3RCLFlBQW9CLEVBQ3BCLGtCQUEwQixFQUMxQixXQUFtQixFQUNuQixnQkFBMEIsRUFDMUIsaUJBQXNCLEVBQ3RCLGFBQXVCLEVBQ3ZCLGlCQUF5QixFQUN6QixRQUFnQixFQUNoQixVQUFtQixFQUNuQixnQkFBeUIsRUFDekIsY0FBdUIsRUFDdkIsTUFBZTtJQUdmLGdDQUFnQztJQUNoQyxJQUFJLGFBQWEsR0FBRyxFQUFFLENBQUM7SUFDdkIsSUFBSSxpQkFBaUIsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtRQUNoRSxhQUFhLEdBQUcsMEJBQTBCLENBQUM7UUFDM0MsSUFBSSxpQkFBaUIsQ0FBQyxrQkFBa0IsQ0FBQztZQUFFLGFBQWEs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RSxFQUN0QixpQkFBaUIsSUFBSSxFQUFFLEVBQ3ZCLGFBQWEsSUFBSSxFQUFFLEVBQ25CLGlCQUFpQixJQUFJLEVBQUUsRUFDdkIsUUFBUyxFQUNULFVBQVUsSUFBSSxTQUFTLEVBQ3ZCLGdCQUFnQixJQUFJLFNBQVMsRUFDN0IsY0FBYyxJQUFJLFNBQVMsRUFDM0IsTUFBTSxJQUFJLFNBQVMsQ0FDdEIsQ0FBQztZQUNGLGNBQWMsR0FBRyxNQUFNLGVBQWUsQ0FBQyxVQUFVLEVBQUUsY0FBYyxDQUFDLENBQUM7WUFDbkUsTUFBTSwyQkFBMkIsQ0FBQyxXQUFXLEVBQUUsU0FBUyxFQUFFLGNBQWMsQ0FBQyxDQUFDO1NBQzdFO2FBQ0k7WUFDRCxNQUFNLHdCQUF3QixDQUFDLGNBQWMsRUFBRSxjQUFjLENBQUMsQ0FBQTtTQUVqRTtRQUNELE1BQU0sQ0FBQyxJQUFJLENBQUMsb0JBQW9CLGNBQWMsRUFBRSxDQUFDLENBQUM7S0FDckQ7SUFBQyxPQUFPLEtBQUssRUFBRTtRQUNaLE9BQU8sQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO0tBQ2xDO0lBQ0QsY0FBYyxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBQ3pCLENBQUM7QUFFWSxRQUFBLE9BQU8sR0FBRyxTQUFTLENBQUMsaUJBQWlCLENBQUMsY0FBYyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBEeW5hbW9EQkNsaWVudCwgR2V0SXRlbUNvbW1hbmQsIFB1dEl0ZW1Db21tYW5kIH0gZnJvbSBcIkBhd3Mtc2RrL2NsaWVudC1keW5hbW9kYlwiO1xuaW1wb3J0IHsgdW5tYXJzaGFsbCB9IGZyb20gXCJAYXdzLXNkay91dGlsLWR5bmFtb2RiXCI7XG5pbXBvcnQgeyBUcmFjZXIgfSBmcm9tIFwiQGF3cy1sYW1iZGEtcG93ZXJ0b29scy90cmFjZXJcIjtcbmltcG9ydCB7IExvZ2dlciB9IGZyb20gXCJAYXdzLWxhbWJkYS1wb3dlcnRvb2xzL2xvZ2dlclwiO1xuaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnRWMiwgSGFuZGxlciwgQ29udGV4dCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xuaW1wb3J0IHsgY3JlYXRlSGFzaCB9IGZyb20gJ2NyeXB0byc7XG5pbXBvcnQgeyBCZWRyb2NrUnVudGltZUNsaWVudCwgSW52b2tlTW9kZWxXaXRoUmVzcG9uc2VTdHJlYW1Db21tYW5kIH0gZnJvbSBcIkBhd3Mtc2RrL2NsaWVudC1iZWRyb2NrLXJ1bnRpbWVcIjtcblxuY29uc3QgbG9nZ2VyID0gbmV3IExvZ2dlcigpO1xuY29uc3QgZHluYW1vZGIgPSBuZXcgRHluYW1vREJDbGllbnQoe30pO1xuXG5jb25zdCBQUk9EVUNUX1RBQkxFX05BTUUgPSBwcm9jZXNzLmVudi5QUk9EVUNUX1RBQkxFX05BTUVcbmNvbnN0IFBST0RVQ1RfU1VNTUFSWV9UQUJMRV9OQU1FID0gcHJvY2Vzcy5lbnYuUFJPRFVDVF9TVU1NQVJZX1RBQkxFX05BTUVcbmNvbnN0IE1PREVMX0lEID0gXCJhbnRocm9waWMuY2xhdWRlLTMtaGFpa3UtMjAyNDAzMDctdjE6MFwiXG5cblxuXG5jb25zdCBiZWRyb2NrUnVudGltZUNsaWVudCA9IG5ldyBCZWRyb2NrUnVudGltZUNsaWVudCh7IHJlZ2lvbjogcHJvY2Vzcy5lbnYuUkVHSU9OIHx8ICd1cy1lYXN0LTEnIH0pO1xuXG5cbmRlY2xhcmUgZ2xvYmFsIHtcbiAgICBuYW1lc3BhY2UgYXdzbGFtYmRhIHtcbiAgICAgIGZ1bmN0aW9uIHN0cmVhbWlmeVJlc3BvbnNlKFxuICAgICAgICBmOiAoXG4gICAgICAgICAgZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50VjIsXG4gICAgICAgICAgcmVzcG9uc2VTdHJlYW06IE5vZGVKUy5Xcml0YWJsZVN0cmVhbSxcbiAgICAgICAgICBjb250ZXh0OiBDb250ZXh0XG4gICAgICAgICkgPT4gUHJvbWlzZTx2b2lkPlxuICAgICAgKTogSGFuZGxlcjtcbiAgICB9XG59XG5cblxuXG5pbnRlcmZhY2UgUHJvZHVjdEl0ZW0ge1xuICAgIHByb2R1Y3RfY29kZTogc3RyaW5nO1xuICAgIGxhbmd1YWdlOiBzdHJpbmc7XG4gICAgcHJvZHVjdF9uYW1lPzogc3RyaW5nO1xuICAgIGluZ3JlZGllbnRzPzogc3RyaW5nO1xuICAgIGFkZGl0aXZlcz86IHN0cmluZztcbiAgICBhbGxlcmdlbnNfdGFncz86IHN0cmluZ1tdO1xuICAgIG51dHJpbWVudHM/OiBhbnk7XG4gICAgbGFiZWxzX3RhZ3M/OiBzdHJpbmdbXTtcbiAgICBjYXRlZ29yaWVzPzogc3RyaW5nO1xuICAgIG5vdmFfZ3JvdXA/OiBudW1iZXI7XG4gICAgbnV0cmlzY29yZV9ncmFkZT86IHN0cmluZztcbiAgICBlY29zY29yZV9ncmFkZT86IHN0cmluZztcbiAgICBicmFuZHM/OiBzdHJpbmc7XG59XG5cbmludGVyZmFjZSBQcm9kdWN0U3VtbWFyeUl0ZW0ge1xuICAgIHByb2R1Y3RfY29kZTogc3RyaW5nO1xuICAgIHBhcmFtc19oYXNoOiBzdHJpbmc7XG4gICAgc3VtbWFyeTogc3RyaW5nO1xufVxuXG5pbnRlcmZhY2UgU3VtbWFyeURhdGEge1xuICAgIHJlY29tbWVuZGF0aW9uczogc3RyaW5nW107XG4gICAgYmVuZWZpdHM6IHN0cmluZ1tdO1xuICAgIGRpc2FkdmFudGFnZXM6IHN0cmluZ1tdO1xuICB9XG5cblxuZnVuY3Rpb24gZ2VuZXJhdGVQcm9kdWN0U3VtbWFyeVByb21wdChcbiAgICB1c2VyQWxsZXJnaWVzOiBzdHJpbmcsXG4gICAgdXNlclByZWZlcmVuY2U6IHN0cmluZyxcbiAgICB1c2VySGVhbHRoR29hbDogc3RyaW5nLFxuICAgIHVzZXJSZWxpZ2lvbjogc3RyaW5nLFxuICAgIHByb2R1Y3RJbmdyZWRpZW50czogc3RyaW5nLFxuICAgIHByb2R1Y3ROYW1lOiBzdHJpbmcsXG4gICAgcHJvZHVjdEFsbGVyZ2Vuczogc3RyaW5nW10sXG4gICAgcHJvZHVjdE51dHJpbWVudHM6IGFueSxcbiAgICBwcm9kdWN0TGFiZWxzOiBzdHJpbmdbXSxcbiAgICBwcm9kdWN0Q2F0ZWdvcmllczogc3RyaW5nLFxuICAgIGxhbmd1YWdlOiBzdHJpbmcsXG4gICAgbm92YV9ncm91cD86IG51bWJlcixcbiAgICBudXRyaXNjb3JlX2dyYWRlPzogc3RyaW5nLFxuICAgIGVjb3Njb3JlX2dyYWRlPzogc3RyaW5nLFxuICAgIGJyYW5kcz86IHN0cmluZ1xuICAgICk6IHN0cmluZyB7XG4gICAgXG4gICAgLy8gRm9ybWF0IG51dHJpbWVudHMgZm9yIGRpc3BsYXlcbiAgICBsZXQgbnV0cmltZW50SW5mbyA9ICcnO1xuICAgIGlmIChwcm9kdWN0TnV0cmltZW50cyAmJiBPYmplY3Qua2V5cyhwcm9kdWN0TnV0cmltZW50cykubGVuZ3RoID4gMCkge1xuICAgICAgICBudXRyaW1lbnRJbmZvID0gJ1xcbjxudXRyaXRpb25fcGVyXzEwMGc+XFxuJztcbiAgICAgICAgaWYgKHByb2R1Y3ROdXRyaW1lbnRzWydlbmVyZ3kta2NhbF8xMDBnJ10pIG51dHJpbWVudEluZm8gKz0gYENhbG9yaWVzOiAke3Byb2R1Y3ROdXRyaW1lbnRzWydlbmVyZ3kta2NhbF8xMDBnJ119IGtjYWxcXG5gO1xuICAgICAgICBpZiAocHJvZHVjdE51dHJpbWVudHNbJ2NhcmJvaHlkcmF0ZXNfMTAwZyddKSBudXRyaW1lbnRJbmZvICs9IGBDYXJib2h5ZHJhdGVzOiAke3Byb2R1Y3ROdXRyaW1lbnRzWydjYXJib2h5ZHJhdGVzXzEwMGcnXX1nXFxuYDtcbiAgICAgICAgaWYgKHByb2R1Y3ROdXRyaW1lbnRzWydzdWdhcnNfMTAwZyddKSBudXRyaW1lbnRJbmZvICs9IGBTdWdhcnM6ICR7cHJvZHVjdE51dHJpbWVudHNbJ3N1Z2Fyc18xMDBnJ119Z1xcbmA7XG4gICAgICAgIGlmIChwcm9kdWN0TnV0cmltZW50c1snZmF0XzEwMGcnXSkgbnV0cmltZW50SW5mbyArPSBgRmF0OiAke3Byb2R1Y3ROdXRyaW1lbnRzWydmYXRfMTAwZyddfWdcXG5gO1xuICAgICAgICBpZiAocHJvZHVjdE51dHJpbWVudHNbJ3NhdHVyYXRlZC1mYXRfMTAwZyddKSBudXRyaW1lbnRJbmZvICs9IGBTYXR1cmF0ZWQgRmF0OiAke3Byb2R1Y3ROdXRyaW1lbnRzWydzYXR1cmF0ZWQtZmF0XzEwMGcnXX1nXFxuYDtcbiAgICAgICAgaWYgKHByb2R1Y3ROdXRyaW1lbnRzWydwcm90ZWluc18xMDBnJ10pIG51dHJpbWVudEluZm8gKz0gYFByb3RlaW46ICR7cHJvZHVjdE51dHJpbWVudHNbJ3Byb3RlaW5zXzEwMGcnXX1nXFxuYDtcbiAgICAgICAgaWYgKHByb2R1Y3ROdXRyaW1lbnRzWydmaWJlcl8xMDBnJ10pIG51dHJpbWVudEluZm8gKz0gYEZpYmVyOiAke3Byb2R1Y3ROdXRyaW1lbnRzWydmaWJlcl8xMDBnJ119Z1xcbmA7XG4gICAgICAgIGlmIChwcm9kdWN0TnV0cmltZW50c1snc2FsdF8xMDBnJ10pIG51dHJpbWVudEluZm8gKz0gYFNhbHQ6ICR7cHJvZHVjdE51dHJpbWVudHNbJ3NhbHRfMTAwZyddfWdcXG5gO1xuICAgICAgICBudXRyaW1lbnRJbmZvICs9ICc8L251dHJpdGlvbl9wZXJfMTAwZz5cXG4nO1xuICAgIH1cbiAgICBcbiAgICAvLyBGb3JtYXQgYWxsZXJnZW5zIC0gb25seSBpZiB1c2VyIGhhcyBhbGxlcmdpZXNcbiAgICBsZXQgYWxsZXJnZW5JbmZvID0gJyc7XG4gICAgaWYgKHVzZXJBbGxlcmdpZXMgJiYgcHJvZHVjdEFsbGVyZ2VucyAmJiBwcm9kdWN0QWxsZXJnZW5zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgYWxsZXJnZW5JbmZvID0gYFxcbjxwcm9kdWN0X2FsbGVyZ2Vucz4ke3Byb2R1Y3RBbGxlcmdlbnMuam9pbignLCAnKX08L3Byb2R1Y3RfYWxsZXJnZW5zPlxcbmA7XG4gICAgfVxuICAgIFxuICAgIC8vIEZvcm1hdCBsYWJlbHNcbiAgICBsZXQgbGFiZWxJbmZvID0gJyc7XG4gICAgaWYgKHByb2R1Y3RMYWJlbHMgJiYgcHJvZHVjdExhYmVscy5sZW5ndGggPiAwKSB7XG4gICAgICAgIGxhYmVsSW5mbyA9IGBcXG48cHJvZHVjdF9sYWJlbHM+JHtwcm9kdWN0TGFiZWxzLmpvaW4oJywgJyl9PC9wcm9kdWN0X2xhYmVscz5cXG5gO1xuICAgIH1cbiAgICBcbiAgICAvLyBGb3JtYXQgY2F0ZWdvcmllc1xuICAgIGxldCBjYXRlZ29yeUluZm8gPSAnJztcbiAgICBpZiAocHJvZHVjdENhdGVnb3JpZXMpIHtcbiAgICAgICAgY2F0ZWdvcnlJbmZvID0gYFxcbjxwcm9kdWN0X2NhdGVnb3JpZXM+JHtwcm9kdWN0Q2F0ZWdvcmllc308L3Byb2R1Y3RfY2F0ZWdvcmllcz5cXG5gO1xuICAgIH1cbiAgICBcbiAgICAvLyBGb3JtYXQgcXVhbGl0eSBpbmRpY2F0b3JzIChvbmx5IGlmIHByZXNlbnQgYW5kIHJlbGV2YW50KVxuICAgIGxldCBxdWFsaXR5SW5mbyA9ICcnO1xuICAgIGlmICh1c2VySGVhbHRoR29hbCAmJiAobm92YV9ncm91cCA9PT0gNCB8fCBudXRyaXNjb3JlX2dyYWRlID09PSAnZCcgfHwgbnV0cmlzY29yZV9ncmFkZSA9PT0gJ2UnKSkge1xuICAgICAgICBxdWFsaXR5SW5mbyA9ICdcXG48cHJvZHVjdF9xdWFsaXR5Plxcbic7XG4gICAgICAgIGlmIChub3ZhX2dyb3VwID09PSA0KSBxdWFsaXR5SW5mbyArPSAnUHJvY2Vzc2luZzogVWx0cmEtcHJvY2Vzc2VkIChOT1ZBIDQpXFxuJztcbiAgICAgICAgaWYgKG51dHJpc2NvcmVfZ3JhZGUgPT09ICdkJyB8fCBudXRyaXNjb3JlX2dyYWRlID09PSAnZScpIHtcbiAgICAgICAgICAgIHF1YWxpdHlJbmZvICs9IGBOdXRyaS1TY29yZTogJHtudXRyaXNjb3JlX2dyYWRlLnRvVXBwZXJDYXNlKCl9IChsb3dlciBudXRyaXRpb25hbCBxdWFsaXR5KVxcbmA7XG4gICAgICAgIH1cbiAgICAgICAgcXVhbGl0eUluZm8gKz0gJzwvcHJvZHVjdF9xdWFsaXR5Plxcbic7XG4gICAgfVxuICAgIFxuICAgIC8vIEJ1aWxkIGluc3RydWN0aW9ucyBiYXNlZCBvbiB3aGF0IHVzZXIgaGFzIHNldFxuICAgIGxldCBpbnN0cnVjdGlvbnMgPSBgWW91IGFyZSBhIG51dHJpdGlvbiBleHBlcnQgcHJvdmlkaW5nIHJlY29tbWVuZGF0aW9ucyBhYm91dCBhIHNwZWNpZmljIHByb2R1Y3QuXG5cbiAgICBZb3VyIHRhc2s6XG4gICAgYDtcbiAgICBcbiAgICBpZiAodXNlckFsbGVyZ2llcykge1xuICAgICAgICBpbnN0cnVjdGlvbnMgKz0gYDEuIENSSVRJQ0FMOiBDaGVjayBpZiBhbnkgcHJvZHVjdCBhbGxlcmdlbnMgbWF0Y2ggdGhlIHVzZXIncyBhbGxlcmdpZXMgKCR7dXNlckFsbGVyZ2llc30pLiBJZiB0aGVyZSBpcyBhIG1hdGNoLCBwcm9taW5lbnRseSB3YXJuIHRoZSB1c2VyLlxcbmA7XG4gICAgfVxuICAgIFxuICAgIGlmICh1c2VyUHJlZmVyZW5jZSkge1xuICAgICAgICBpbnN0cnVjdGlvbnMgKz0gYCR7dXNlckFsbGVyZ2llcyA/ICcyJyA6ICcxJ30uIENoZWNrIGlmIHByb2R1Y3QgbGFiZWxzIG1hdGNoIGRpZXRhcnkgcHJlZmVyZW5jZXMgKCR7dXNlclByZWZlcmVuY2V9KS4gVXNlIGxhYmVscyBmb3IgZGlyZWN0IG1hdGNoaW5nLCBvciBhbmFseXplIGNhdGVnb3JpZXMgYW5kIGluZ3JlZGllbnRzLlxcbmA7XG4gICAgfVxuICAgIFxuICAgIGlmICh1c2VySGVhbHRoR29hbCkge1xuICAgICAgICBpbnN0cnVjdGlvbnMgKz0gYCR7KHVzZXJBbGxlcmdpZXMgPyAxIDogMCkgKyAodXNlclByZWZlcmVuY2UgPyAxIDogMCkgKyAxfS4gVXNlIG51dHJpdGlvbmFsIGRhdGEgdG8gYXNzZXNzIGlmIHRoZSBwcm9kdWN0IGFsaWducyB3aXRoIHRoZSBoZWFsdGggZ29hbDogJHt1c2VySGVhbHRoR29hbH0uXFxuYDtcbiAgICAgICAgaWYgKG5vdmFfZ3JvdXAgPT09IDQgfHwgbnV0cmlzY29yZV9ncmFkZSA9PT0gJ2QnIHx8IG51dHJpc2NvcmVfZ3JhZGUgPT09ICdlJykge1xuICAgICAgICAgICAgaW5zdHJ1Y3Rpb25zICs9IGAgICAtIENvbnNpZGVyIHRoZSBwcm9kdWN0IHF1YWxpdHkgaW5kaWNhdG9ycyB3aGVuIG1ha2luZyByZWNvbW1lbmRhdGlvbnMuXFxuYDtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICBpZiAodXNlclJlbGlnaW9uKSB7XG4gICAgICAgIGluc3RydWN0aW9ucyArPSBgJHsodXNlckFsbGVyZ2llcyA/IDEgOiAwKSArICh1c2VyUHJlZmVyZW5jZSA/IDEgOiAwKSArICh1c2VySGVhbHRoR29hbCA/IDEgOiAwKSArIDF9LiBDaGVjayBpZiBwcm9kdWN0IGxhYmVscyBtYXRjaCByZWxpZ2lvdXMgcmVxdWlyZW1lbnQ6ICR7dXNlclJlbGlnaW9ufS5cXG5gO1xuICAgIH1cbiAgICBcbiAgICBpbnN0cnVjdGlvbnMgKz0gYC0gUHJlc2VudCB0aHJlZSBudXRyaXRpb25hbCBiZW5lZml0cyBhbmQgdGhyZWUgbnV0cml0aW9uYWwgZGlzYWR2YW50YWdlcyBmb3IgdGhlIHByb2R1Y3QgYmFzZWQgb24gYWN0dWFsIG51dHJpdGlvbmFsdmFsdWVzLlxuICAgIElmIHRoZSB1c2VyJ3MgaW5mb3JtYXRpb24gaXMgbm90IHByb3ZpZGVkIG9yIGlzIGVtcHR5LCBvZmZlciBnZW5lcmFsIG51dHJpdGlvbmFsIGFkdmljZSBiYXNlZCBvbiB0aGUgcHJvZHVjdCdzIG51dHJpdGlvbmFsIGRhdGEuXG4gICAgSU1QT1JUQU5UOiBPbmx5IG1lbnRpb24gYWxsZXJnZW5zLCBkaWV0YXJ5IHByZWZlcmVuY2VzLCBoZWFsdGggZ29hbHMsIG9yIHJlbGlnaW91cyByZXF1aXJlbWVudHMgaWYgdGhlIHVzZXIgaGFzIHNwZWNpZmllZCB0aGVtLiBEbyBub3QgZGlzY3VzcyBhc3BlY3RzIHRoZSB1c2VyIGhhc24ndCBzZXQuYDtcbiAgICBcbiAgICBsZXQgdXNlckNvbnRleHQgPSAnJztcbiAgICBpZiAodXNlckFsbGVyZ2llcykgdXNlckNvbnRleHQgKz0gYFxcbjx1c2VyX2FsbGVyZ2llcz4ke3VzZXJBbGxlcmdpZXN9PC91c2VyX2FsbGVyZ2llcz5gO1xuICAgIGlmICh1c2VySGVhbHRoR29hbCkgdXNlckNvbnRleHQgKz0gYFxcbjx1c2VyX2hlYWx0aF9nb2FsPiR7dXNlckhlYWx0aEdvYWx9PC91c2VyX2hlYWx0aF9nb2FsPmA7XG4gICAgaWYgKHVzZXJQcmVmZXJlbmNlKSB1c2VyQ29udGV4dCArPSBgXFxuPHVzZXJfZGlldGFyeV9wcmVmZXJlbmNlcz4ke3VzZXJQcmVmZXJlbmNlfTwvdXNlcl9kaWV0YXJ5X3ByZWZlcmVuY2VzPmA7XG4gICAgaWYgKHVzZXJSZWxpZ2lvbikgdXNlckNvbnRleHQgKz0gYFxcbjx1c2VyX3JlbGlnaW91c19yZXF1aXJlbWVudD4ke3VzZXJSZWxpZ2lvbn08L3VzZXJfcmVsaWdpb3VzX3JlcXVpcmVtZW50PmA7XG4gICAgXG4gICAgcmV0dXJuIGBIdW1hbjpcbiAgICAgICAgICAke2luc3RydWN0aW9uc31cbiAgXG4gICAgICAgICAgUHJvdmlkZSByZWNvbW1lbmRhdGlvbiBmb3IgdGhlIGZvbGxvd2luZyBwcm9kdWN0OlxuICAgICAgICAgICAgPHByb2R1Y3RfbmFtZT4ke3Byb2R1Y3ROYW1lfTwvcHJvZHVjdF9uYW1lPlxuICAgICAgICAgICAgPHByb2R1Y3RfaW5ncmVkaWVudHM+JHtwcm9kdWN0SW5ncmVkaWVudHN9PC9wcm9kdWN0X2luZ3JlZGllbnRzPlxuICAgICAgICAgICAgPGFsbGVyZ2VuSW5mbz4ke2FsbGVyZ2VuSW5mb308L2FsbGVyZ2VuSW5mbz5cbiAgICAgICAgICAgIDxsYWJlbEluZm8+JHtsYWJlbEluZm99PC9sYWJlbEluZm8+XG4gICAgICAgICAgICA8Y2F0ZWdvcnlJbmZvPiR7Y2F0ZWdvcnlJbmZvfTwvY2F0ZWdvcnlJbmZvPlxuICAgICAgICAgICAgPG51dHJpbWVudEluZm8+JHtudXRyaW1lbnRJbmZvfTwvbnV0cmltZW50SW5mbz5cbiAgICAgICAgICAgICR7cXVhbGl0eUluZm99XG5cbiAgICAgICAgICBGb3IgdGhlIHVzZXI6XG4gICAgICAgICAgICAke3VzZXJDb250ZXh0fVxuICAgICAgICAgIFxuICAgICAgICAgIFByb3ZpZGUgdGhlIHJlc3BvbnNlIGluIHRoZSB0aGlyZCBwZXJzb24sIGluICR7bGFuZ3VhZ2V9LCBza2lwIHRoZSBwcmVhbWJ1bGUsIGRpc3JlZ2FyZCBhbnkgY29udGVudCBhdCB0aGUgZW5kIGFuZCBwcm92aWRlIG9ubHkgdGhlIHJlc3BvbnNlIGluIHRoaXMgTWFya2Rvd24gZm9ybWF0OlxuXG5cbiAgICAgICAgbWFya2Rvd25cblxuICAgICAgICBEZXNjcmliZSBhbGxlcmdlbiB3YXJuaW5ncyAoaWYgYW55KSwgZGlldGFyeSBsYWJlbCBjb21wYXRpYmlsaXR5LCByZWxpZ2lvdXMgcmVxdWlyZW1lbnQgY29tcGF0aWJpbGl0eSwgaGVhbHRoIGdvYWwgY29tcGF0aWJpbGl0eSwgZGlldGFyeSBwcmVmZXJlbmNlIGNvbXBhdGliaWxpdHksIGFuZCByZWNvbW1lbmRhdGlvbiBoZXJlIGNvbWJpbmVkIGluIG9uZSBzaW5nbGUgc2hvcnQgcGFyYWdyYXBoXG5cbiAgICAgICAgIyMjIyBCZW5lZml0cyB0aXRsZSBoZXJlXG4gICAgICAgIC0gRGVzY3JpYmUgYmVuZWZpdHMgaGVyZVxuXG4gICAgICAgICMjIyMgRGlzYWR2YW50YWdlcyB0aXRsZSBoZXJlXG4gICAgICAgIC0gRGVzY3JpYmUgZGlzYWR2YW50YWdlcyBoZXJlXG4gICAgICAgICAgXG4gICAgICAgICAgQXNzaXN0YW50OlxuICAgICAgICAgIGA7XG59XG5cbmZ1bmN0aW9uIGdlbmVyYXRlQ29tYmluZWRTdHJpbmcob2JqOiB7IFtrZXk6IHN0cmluZ106IGFueSB9KTogc3RyaW5nIHtcbiAgICBjb25zdCBjb25jYXRlbmF0ZWRTdHJpbmcgPSBPYmplY3Qua2V5cyhvYmopLmpvaW4oJycpO1xuICAgIHJldHVybiBjb25jYXRlbmF0ZWRTdHJpbmc7XG59XG5cblxuXG5mdW5jdGlvbiBjYWxjdWxhdGVIYXNoKFxuICAgIHByb2R1Y3RDb2RlOiBzdHJpbmcsXG4gICAgdXNlckFsbGVyZ2llczogYW55LFxuICAgIHVzZXJQcmVmZXJlbmNlRGF0YTogYW55LFxuICAgIGxhbmd1YWdlOiBzdHJpbmdcbiAgICApOiBzdHJpbmcge1xuICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZXMgYSBTSEEtMjU2IGhhc2ggYmFzZWQgb24gdmFyaW91cyBpbnB1dCBkYXRhLlxuICAgICAqXG4gICAgICogQHBhcmFtIHVzZXJBbGxlcmdpZXMgLSBBIHN0cmluZyBjb250YWluaW5nIHVzZXIgYWxsZXJnaWVzIGRhdGEuXG4gICAgICogQHBhcmFtIHVzZXJQcmVmZXJlbmNlRGF0YSAtIEEgc3RyaW5nIGNvbnRhaW5pbmcgdXNlciBwcmVmZXJlbmNlIGRhdGEuXG4gICAgICogQHBhcmFtIHByb2R1Y3RJbmdyZWRpZW50cyAtIEEgc3RyaW5nIGNvbnRhaW5pbmcgcHJvZHVjdCBpbmdyZWRpZW50cyBkYXRhLlxuICAgICAqIEBwYXJhbSBwcm9kdWN0TmFtZSAtIFRoZSBuYW1lIG9mIHRoZSBwcm9kdWN0LlxuICAgICAqIEBwYXJhbSBsYW5ndWFnZSAtIFRoZSBsYW5ndWFnZS5cbiAgICAgKiBAcGFyYW0gcHJvZHVjdEFkZGl0aXZlcyAtIEEgc3RyaW5nIGNvbnRhaW5pbmcgcHJvZHVjdCBhZGRpdGl2ZXMgZGF0YS5cbiAgICAgKiBAcmV0dXJucyBUaGUgU0hBLTI1NiBoYXNoIHZhbHVlIGNhbGN1bGF0ZWQgYmFzZWQgb24gdGhlIGNvbmNhdGVuYXRlZCBzdHJpbmcgcmVwcmVzZW50YXRpb25zIG9mIHRoZSBpbnB1dCBkYXRhLlxuICAgICAqL1xuXG4gICAgLy8gQ29udmVydCBkaWN0aW9uYXJpZXMgdG8gSlNPTiBzdHJpbmdzXG4gICAgY29uc3QgdXNlckFsbGVyZ2llc1N0ciA9IGdlbmVyYXRlQ29tYmluZWRTdHJpbmcodXNlckFsbGVyZ2llcyk7Ly9KU09OLnN0cmluZ2lmeSh1c2VyQWxsZXJnaWVzKTtcbiAgICBjb25zdCB1c2VyUHJlZmVyZW5jZURhdGFTdHIgPSBnZW5lcmF0ZUNvbWJpbmVkU3RyaW5nKHVzZXJQcmVmZXJlbmNlRGF0YSk7XG4gICAgXG4gICAgLy8gQ29uY2F0ZW5hdGUgdGhlIHN0cmluZyByZXByZXNlbnRhdGlvbnMgb2YgdGhlIHZhcmlhYmxlc1xuICAgIGNvbnN0IGNvbmNhdGVuYXRlZFN0cmluZyA9IGAke3Byb2R1Y3RDb2RlfSR7dXNlckFsbGVyZ2llc1N0cn0ke3VzZXJQcmVmZXJlbmNlRGF0YVN0cn0ke2xhbmd1YWdlfWA7XG4gICAgLy8gQ2FsY3VsYXRlIHRoZSBoYXNoXG4gICAgY29uc3QgaGFzaGVkVmFsdWUgPSBjcmVhdGVIYXNoKCdzaGEyNTYnKS51cGRhdGUoY29uY2F0ZW5hdGVkU3RyaW5nKS5kaWdlc3QoJ2hleCcpO1xuICAgIFxuICAgIHJldHVybiBoYXNoZWRWYWx1ZTtcbn1cblxuLyoqXG4gKiBSZXRyaWV2ZXMgcHJvZHVjdCBpbmZvcm1hdGlvbiBmcm9tIHRoZSBkYXRhYmFzZSB1c2luZyB0aGUgcHJvdmlkZWQgcHJvZHVjdCBjb2RlLlxuICpcbiAqIEBwYXJhbSBwcm9kdWN0Q29kZSAtIFRoZSBjb2RlIG9mIHRoZSBwcm9kdWN0IHRvIHJldHJpZXZlIGluZm9ybWF0aW9uIGZvci5cbiAqIEBwYXJhbSBsYW5ndWFnZSAtIFRoZSBsYW5ndWFnZSBmb3IgdGhlIHByb2R1Y3QgaW5mb3JtYXRpb24uXG4gKiBAcmV0dXJucyBBIHR1cGxlIGNvbnRhaW5pbmcgcHJvZHVjdCBuYW1lLCBpbmdyZWRpZW50cywgYWRkaXRpdmVzLCBhbGxlcmdlbnMsIG51dHJpbWVudHMsIGxhYmVscywgY2F0ZWdvcmllcywgbm92YV9ncm91cCwgbnV0cmlzY29yZV9ncmFkZSwgZWNvc2NvcmVfZ3JhZGUsIGFuZCBicmFuZHMgaWYgdGhlIHByb2R1Y3QgaXMgZm91bmQgaW4gdGhlIGRhdGFiYXNlOyBvdGhlcndpc2UsIHJldHVybnMgW251bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGxdLlxuICovXG5hc3luYyBmdW5jdGlvbiBnZXRQcm9kdWN0RnJvbURiKHByb2R1Y3RDb2RlOiBzdHJpbmcsIGxhbmd1YWdlOiBzdHJpbmcpOiBQcm9taXNlPFtzdHJpbmcgfCBudWxsLCBzdHJpbmcgfCBudWxsLCBzdHJpbmcgfCBudWxsLCBzdHJpbmdbXSB8IG51bGwsIGFueSB8IG51bGwsIHN0cmluZ1tdIHwgbnVsbCwgc3RyaW5nIHwgbnVsbCwgbnVtYmVyIHwgbnVsbCwgc3RyaW5nIHwgbnVsbCwgc3RyaW5nIHwgbnVsbCwgc3RyaW5nIHwgbnVsbF0+IHtcblxuICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHsgSXRlbSAgPSB7fSB9ID0gYXdhaXQgZHluYW1vZGIuc2VuZChuZXcgR2V0SXRlbUNvbW1hbmQoe1xuICAgICAgICAgICAgVGFibGVOYW1lOiBQUk9EVUNUX1RBQkxFX05BTUUsXG4gICAgICAgICAgICBLZXk6IHtcbiAgICAgICAgICAgICAgICBwcm9kdWN0X2NvZGU6IHsgUzogcHJvZHVjdENvZGUgfSxcbiAgICAgICAgICAgICAgICBsYW5ndWFnZTogeyBTOiBsYW5ndWFnZSB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pKTtcbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIGl0ZW0gZXhpc3RzXG4gICAgICAgIGlmIChJdGVtKSB7XG4gICAgICAgICAgICBjb25zdCBpdGVtID0gdW5tYXJzaGFsbChJdGVtKSBhcyBQcm9kdWN0SXRlbTtcbiAgICAgICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICAgICAgaXRlbS5wcm9kdWN0X25hbWUgfHwgbnVsbCwgXG4gICAgICAgICAgICAgICAgaXRlbS5pbmdyZWRpZW50cyB8fCBudWxsLCBcbiAgICAgICAgICAgICAgICBpdGVtLmFkZGl0aXZlcyB8fCBudWxsLFxuICAgICAgICAgICAgICAgIGl0ZW0uYWxsZXJnZW5zX3RhZ3MgfHwgbnVsbCxcbiAgICAgICAgICAgICAgICBpdGVtLm51dHJpbWVudHMgfHwgbnVsbCxcbiAgICAgICAgICAgICAgICBpdGVtLmxhYmVsc190YWdzIHx8IG51bGwsXG4gICAgICAgICAgICAgICAgaXRlbS5jYXRlZ29yaWVzIHx8IG51bGwsXG4gICAgICAgICAgICAgICAgaXRlbS5ub3ZhX2dyb3VwIHx8IG51bGwsXG4gICAgICAgICAgICAgICAgaXRlbS5udXRyaXNjb3JlX2dyYWRlIHx8IG51bGwsXG4gICAgICAgICAgICAgICAgaXRlbS5lY29zY29yZV9ncmFkZSB8fCBudWxsLFxuICAgICAgICAgICAgICAgIGl0ZW0uYnJhbmRzIHx8IG51bGxcbiAgICAgICAgICAgIF07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gW251bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGwsIG51bGxdO1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjb25zb2xlLmVycm9yKCdFcnJvciB3aGlsZSBnZXR0aW5nIHRoZSBQcm9kdWN0IGZyb20gZGF0YWJhc2UnLCBlKTtcbiAgICAgICAgcmV0dXJuIFtudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsXTtcbiAgICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGdldFByb2R1Y3RTdW1tYXJ5KHByb2R1Y3RDb2RlOiBzdHJpbmcsIHBhcmFtc0hhc2g6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nIHwgbnVsbD4ge1xuICAgIC8qKlxuICAgICAqIFJldHJpZXZlcyB0aGUgc3VtbWFyeSBvZiBhIHByb2R1Y3QgZnJvbSB0aGUgZGF0YWJhc2UgdXNpbmcgdGhlIHByb2R1Y3QgY29kZSBhbmQgcGFyYW1ldGVycyBoYXNoLlxuICAgICAqXG4gICAgICogQHBhcmFtIHByb2R1Y3RDb2RlIC0gVGhlIGNvZGUgb2YgdGhlIHByb2R1Y3QuXG4gICAgICogQHBhcmFtIHBhcmFtc0hhc2ggLSBUaGUgaGFzaCB2YWx1ZSByZXByZXNlbnRpbmcgcGFyYW1ldGVycy5cbiAgICAgKiBAcmV0dXJucyBUaGUgc3VtbWFyeSBvZiB0aGUgcHJvZHVjdCBpZiBmb3VuZCBpbiB0aGUgZGF0YWJhc2U7IG90aGVyd2lzZSwgcmV0dXJucyBudWxsLlxuICAgICAqL1xuICBcbiAgICBjb25zdCB7IEl0ZW0gID0ge30gfSA9IGF3YWl0IGR5bmFtb2RiLnNlbmQobmV3IEdldEl0ZW1Db21tYW5kKHtcbiAgICAgICAgVGFibGVOYW1lOiBQUk9EVUNUX1NVTU1BUllfVEFCTEVfTkFNRSxcbiAgICAgICAgS2V5OiB7XG4gICAgICAgICAgICBwcm9kdWN0X2NvZGU6IHsgUzogcHJvZHVjdENvZGUgfSxcbiAgICAgICAgICAgIHBhcmFtc19oYXNoOiB7IFM6IHBhcmFtc0hhc2ggfVxuICAgICAgICB9XG4gICAgfSkpO1xuICBcbiAgICBpZiAoSXRlbSkge1xuICAgICAgY29uc3QgaXRlbSA9IHVubWFyc2hhbGwoSXRlbSkgYXMgUHJvZHVjdFN1bW1hcnlJdGVtO1xuICAgICAgcmV0dXJuIGl0ZW0uc3VtbWFyeTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBnZW5lcmF0ZVN1bW1hcnkocHJvbXB0VGV4dDogc3RyaW5nLCByZXNwb25zZVN0cmVhbTogTm9kZUpTLldyaXRhYmxlU3RyZWFtKSB7XG5cbiAgICBjb25zdCBwYXlsb2FkID0ge1xuICAgICAgICBtZXNzYWdlczogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHJvbGU6IFwidXNlclwiLFxuICAgICAgICAgICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwidGV4dFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ0ZXh0XCI6IHByb21wdFRleHRcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgIH1cbiAgICAgICAgXSxcbiAgICAgICAgbWF4X3Rva2VuczogNTAwLFxuICAgICAgICB0ZW1wZXJhdHVyZTogMC41LFxuICAgICAgICBhbnRocm9waWNfdmVyc2lvbjogXCJiZWRyb2NrLTIwMjMtMDUtMzFcIlxuICAgICAgfTtcbiAgICBjb25zdCBwYXJhbXMgPSB7XG4gICAgICAgIG1vZGVsSWQ6IE1PREVMX0lELFxuICAgICAgICBjb250ZW50VHlwZTogXCJhcHBsaWNhdGlvbi9qc29uXCIsXG4gICAgICAgIGFjY2VwdDogXCJhcHBsaWNhdGlvbi9qc29uXCIsXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHBheWxvYWQpLFxuICAgICAgICBwZXJmb3JtYW5jZUNvbmZpZ0xhdGVuY3k6ICdzdGFuZGFyZCcgYXMgY29uc3RcbiAgICB9O1xuICAgIGxldCBjb21wbGV0aW9uID0gJyc7XG4gICAgdHJ5IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgSW52b2tlTW9kZWxXaXRoUmVzcG9uc2VTdHJlYW1Db21tYW5kKHBhcmFtcyk7XG4gICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGJlZHJvY2tSdW50aW1lQ2xpZW50LnNlbmQoY29tbWFuZCk7XG4gICAgICAgICAgICBjb25zdCBldmVudHMgPSByZXNwb25zZS5ib2R5O1xuICAgICAgICAgICAgZm9yIGF3YWl0IChjb25zdCBldmVudCBvZiBldmVudHMgfHwgW10pIHtcbiAgICAgICAgICAgICAgICAvLyBDaGVjayB0aGUgdG9wLWxldmVsIGZpZWxkIHRvIGRldGVybWluZSB3aGljaCBldmVudCB0aGlzIGlzLlxuICAgICAgICAgICAgICAgIGlmIChldmVudC5jaHVuaykge1xuICAgICAgICAgICAgICAgICAgY29uc3QgZGVjb2RlZF9ldmVudCA9IEpTT04ucGFyc2UoXG4gICAgICAgICAgICAgICAgICAgIG5ldyBUZXh0RGVjb2RlcigpLmRlY29kZShldmVudC5jaHVuay5ieXRlcyksXG4gICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgaWYgKGRlY29kZWRfZXZlbnQudHlwZSAgPT09ICdjb250ZW50X2Jsb2NrX2RlbHRhJyAmJiBkZWNvZGVkX2V2ZW50LmRlbHRhLnR5cGUgPT09ICd0ZXh0X2RlbHRhJyl7XG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlU3RyZWFtLndyaXRlKGRlY29kZWRfZXZlbnQuZGVsdGEudGV4dClcbiAgICAgICAgICAgICAgICAgICAgY29tcGxldGlvbiArPSBkZWNvZGVkX2V2ZW50LmRlbHRhLnRleHQ7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIGxvZ2dlci5lcnJvcihgZXZlbnQgPSAke2V2ZW50fWApXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgICAgbG9nZ2VyLmluZm8oJ1N0cmVhbSBlbmRlZCEnKVxuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgIC8vIGhhbmRsZSBlcnJvclxuICAgICAgICAgICAgbG9nZ2VyLmVycm9yKGVyciBhcyBhbnkpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGNhdGNoIChlKSB7XG4gICAgICAgIGxvZ2dlci5lcnJvcihgRXJyb3Igd2hpbGUgZ2VuZXJhdGluZyBzdW1tYXJ5OiAke2V9YCk7XG4gICAgICAgIGNvbXBsZXRpb24gPSBcIkVycm9yIHdoaWxlIGdlbmVyYXRpbmcgc3VtbWFyeVwiO1xuICAgIH1cbiAgICByZXR1cm4gY29tcGxldGlvbjtcbn1cblxuYXN5bmMgZnVuY3Rpb24gc2ltdWxhdGVTdW1tYXJ5U3RyZWFtaW5nKGNvbnRlbnQ6IHN0cmluZywgcmVzcG9uc2VTdHJlYW06IE5vZGVKUy5Xcml0YWJsZVN0cmVhbSk6IFByb21pc2U8dm9pZD4ge1xuICAgXG4gICAgY29uc3QgY2h1bmtzID0gW107XG4gICAgbGV0IHJlbWFpbmluZ0NvbnRlbnQgPSBjb250ZW50O1xuXG4gICAgLy8gTG9vcCB1bnRpbCBhbGwgY29udGVudCBpcyBzcGxpdCBpbnRvIGNodW5rc1xuICAgIHdoaWxlIChyZW1haW5pbmdDb250ZW50Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgLy8gR2VuZXJhdGUgYSByYW5kb20gY2h1bmsgc2l6ZSBiZXR3ZWVuIDEgYW5kIDEwXG4gICAgICAgIGNvbnN0IGNodW5rU2l6ZSA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDEwKSArIDE7XG5cbiAgICAgICAgLy8gVGFrZSBhIGNodW5rIG9mIGNvbnRlbnQgd2l0aCB0aGUgZ2VuZXJhdGVkIGNodW5rIHNpemVcbiAgICAgICAgY29uc3QgY2h1bmsgPSByZW1haW5pbmdDb250ZW50LnNsaWNlKDAsIGNodW5rU2l6ZSk7XG5cbiAgICAgICAgLy8gQWRkIHRoZSBjaHVuayB0byB0aGUgYXJyYXlcbiAgICAgICAgY2h1bmtzLnB1c2goY2h1bmspO1xuXG4gICAgICAgIC8vIFJlbW92ZSB0aGUgdGFrZW4gY2h1bmsgZnJvbSB0aGUgcmVtYWluaW5nIGNvbnRlbnRcbiAgICAgICAgcmVtYWluaW5nQ29udGVudCA9IHJlbWFpbmluZ0NvbnRlbnQuc2xpY2UoY2h1bmtTaXplKTtcbiAgICB9XG5cbiAgICAvLyBTaW11bGF0ZSBzdHJlYW1pbmcgYnkgZW1pdHRpbmcgZWFjaCBjaHVuayB3aXRoIGEgZGVsYXlcbiAgICBmb3IgKGNvbnN0IGNodW5rIG9mIGNodW5rcykge1xuICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgNTApKTsgLy8gU2ltdWxhdGUgZGVsYXlcbiAgICAgICAgcmVzcG9uc2VTdHJlYW0ud3JpdGUoY2h1bmspXG5cbiAgICB9XG59XG5cblxuXG5cbmFzeW5jIGZ1bmN0aW9uIHB1dFByb2R1Y3RTdW1tYXJ5VG9EeW5hbW9EQihwcm9kdWN0X2NvZGU6IHN0cmluZywgcGFyYW1zX2hhc2g6IHN0cmluZywgc3VtbWFyeTogc3RyaW5nKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgZHluYW1vZGIuc2VuZChuZXcgUHV0SXRlbUNvbW1hbmQoe1xuICAgICAgICAgICAgVGFibGVOYW1lOiBQUk9EVUNUX1NVTU1BUllfVEFCTEVfTkFNRSxcbiAgICAgICAgICAgIEl0ZW06IHtcbiAgICAgICAgICAgICAgICBwcm9kdWN0X2NvZGU6IHsgUzogcHJvZHVjdF9jb2RlIH0sXG4gICAgICAgICAgICAgICAgcGFyYW1zX2hhc2g6IHsgUzogcGFyYW1zX2hhc2ggfSxcbiAgICAgICAgICAgICAgICBzdW1tYXJ5OiB7IFM6IHN1bW1hcnkgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KSk7XG4gICAgICAgIGxvZ2dlci5kZWJ1ZyhcIlN1bW1hcnkgc2F2ZWQgaW50byBkYXRhYmFzZVwiKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBjb25zb2xlLmVycm9yKFwiRXJyb3I6XCIsIGVycm9yKTtcbiAgICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIG1lc3NhZ2VIYW5kbGVyIChldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnRWMiwgcmVzcG9uc2VTdHJlYW06IE5vZGVKUy5Xcml0YWJsZVN0cmVhbSkge1xuXG4gICAgdHJ5IHtcbiAgICAgICAgbG9nZ2VyLmluZm8oZXZlbnQgYXMgYW55KTtcblxuICAgICAgICBjb25zdCBib2R5ID0gZXZlbnQuYm9keSA/IEpTT04ucGFyc2UoZXZlbnQuYm9keSkgOiB7fTtcbiAgICAgICAgY29uc3QgcHJvZHVjdENvZGUgPSBib2R5LnByb2R1Y3RDb2RlO1xuICAgICAgICBjb25zdCBsYW5ndWFnZSA9IGJvZHkubGFuZ3VhZ2U7XG5cbiAgICAgICAgY29uc3QgdXNlclByZWZlcmVuY2VLZXlzID0gT2JqZWN0LmtleXMoYm9keS5wcmVmZXJlbmNlcykuZmlsdGVyKGtleSA9PiBib2R5LnByZWZlcmVuY2VzW2tleV0pO1xuICAgICAgICBjb25zdCB1c2VyQWxsZXJnaWVzS2V5cyA9IE9iamVjdC5rZXlzKGJvZHkuYWxsZXJnaWVzKS5maWx0ZXIoa2V5ID0+IGJvZHkuYWxsZXJnaWVzW2tleV0pO1xuICAgICAgICBjb25zdCB1c2VySGVhbHRoR29hbCA9IGJvZHkuaGVhbHRoR29hbCB8fCAnJztcbiAgICAgICAgY29uc3QgdXNlclJlbGlnaW9uID0gYm9keS5yZWxpZ2lvbiB8fCAnJztcblxuICAgICAgICBjb25zdCB1c2VyUHJlZmVyZW5jZVN0cmluZyA9IHVzZXJQcmVmZXJlbmNlS2V5cy5qb2luKCcsICcpO1xuICAgICAgICBjb25zdCB1c2VyQWxsZXJnaWVzU3RyaW5nID0gdXNlckFsbGVyZ2llc0tleXMuam9pbignLCAnKTtcblxuXG4gICAgICAgIGNvbnN0IFtwcm9kdWN0TmFtZSwgcHJvZHVjdEluZ3JlZGllbnRzLCBwcm9kdWN0QWRkaXRpdmVzLCBwcm9kdWN0QWxsZXJnZW5zLCBwcm9kdWN0TnV0cmltZW50cywgcHJvZHVjdExhYmVscywgcHJvZHVjdENhdGVnb3JpZXMsIG5vdmFfZ3JvdXAsIG51dHJpc2NvcmVfZ3JhZGUsIGVjb3Njb3JlX2dyYWRlLCBicmFuZHNdID0gYXdhaXQgZ2V0UHJvZHVjdEZyb21EYihwcm9kdWN0Q29kZSwgbGFuZ3VhZ2UpO1xuICAgICAgICBpZiAocHJvZHVjdE5hbWUgJiYgcHJvZHVjdEluZ3JlZGllbnRzKSB7XG4gICAgICAgICAgICBsb2dnZXIuaW5mbyhcIlByb2R1Y3QgZm91bmRcIik7XG5cblxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbG9nZ2VyLmVycm9yKFwiUHJvZHVjdCBub3QgZm91bmQgaW4gdGhlIGRhdGFiYXNlXCIpO1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdQcm9kdWN0IG5vdCBmb3VuZCBpbiB0aGUgZGF0YWJhc2UnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGhhc2hWYWx1ZSA9IGNhbGN1bGF0ZUhhc2gocHJvZHVjdENvZGUsIHVzZXJBbGxlcmdpZXNTdHJpbmcsIHVzZXJQcmVmZXJlbmNlU3RyaW5nLCBsYW5ndWFnZSk7XG5cbiAgICAgICAgbGV0IHByb2R1Y3RTdW1tYXJ5ID0gYXdhaXQgZ2V0UHJvZHVjdFN1bW1hcnkocHJvZHVjdENvZGUsIGhhc2hWYWx1ZSk7XG4gICAgICAgIGlmICghcHJvZHVjdFN1bW1hcnkpIHsgICAgICAgIFxuICAgICAgICAgICAgbG9nZ2VyLmluZm8oXCJQcm9kdWN0IFN1bW1hcnkgbm90IGZvdW5kIGluIHRoZSBkYXRhYmFzZVwiKTtcbiAgICAgICAgICAgIGNvbnN0IGluZ3JlZGllbnRLZXlzID0gT2JqZWN0LmtleXMocHJvZHVjdEluZ3JlZGllbnRzKTtcbiAgICAgICAgICAgIGNvbnN0IGluZ3JlZGllbnRzU3RyaW5nID0gaW5ncmVkaWVudEtleXMuam9pbignLCAnKTtcblxuICAgICAgICAgICAgY29uc3QgcHJvbXB0VGV4dCA9IGdlbmVyYXRlUHJvZHVjdFN1bW1hcnlQcm9tcHQoXG4gICAgICAgICAgICAgICAgdXNlckFsbGVyZ2llc1N0cmluZyxcbiAgICAgICAgICAgICAgICB1c2VyUHJlZmVyZW5jZVN0cmluZyxcbiAgICAgICAgICAgICAgICB1c2VySGVhbHRoR29hbCxcbiAgICAgICAgICAgICAgICB1c2VyUmVsaWdpb24sXG4gICAgICAgICAgICAgICAgaW5ncmVkaWVudHNTdHJpbmcsXG4gICAgICAgICAgICAgICAgcHJvZHVjdE5hbWUsXG4gICAgICAgICAgICAgICAgcHJvZHVjdEFsbGVyZ2VucyB8fCBbXSxcbiAgICAgICAgICAgICAgICBwcm9kdWN0TnV0cmltZW50cyB8fCB7fSxcbiAgICAgICAgICAgICAgICBwcm9kdWN0TGFiZWxzIHx8IFtdLFxuICAgICAgICAgICAgICAgIHByb2R1Y3RDYXRlZ29yaWVzIHx8ICcnLFxuICAgICAgICAgICAgICAgIGxhbmd1YWdlISxcbiAgICAgICAgICAgICAgICBub3ZhX2dyb3VwIHx8IHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICBudXRyaXNjb3JlX2dyYWRlIHx8IHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICBlY29zY29yZV9ncmFkZSB8fCB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgYnJhbmRzIHx8IHVuZGVmaW5lZFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIHByb2R1Y3RTdW1tYXJ5ID0gYXdhaXQgZ2VuZXJhdGVTdW1tYXJ5KHByb21wdFRleHQsIHJlc3BvbnNlU3RyZWFtKTtcbiAgICAgICAgICAgIGF3YWl0IHB1dFByb2R1Y3RTdW1tYXJ5VG9EeW5hbW9EQihwcm9kdWN0Q29kZSwgaGFzaFZhbHVlLCBwcm9kdWN0U3VtbWFyeSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBhd2FpdCBzaW11bGF0ZVN1bW1hcnlTdHJlYW1pbmcocHJvZHVjdFN1bW1hcnksIHJlc3BvbnNlU3RyZWFtKVxuXG4gICAgICAgIH1cbiAgICAgICAgbG9nZ2VyLmluZm8oYFByb2R1Y3QgU3VtbWFyeTogJHtwcm9kdWN0U3VtbWFyeX1gKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBjb25zb2xlLmVycm9yKFwiRXJyb3I6XCIsIGVycm9yKTtcbiAgICB9XG4gICAgcmVzcG9uc2VTdHJlYW0uZW5kKCk7XG59XG5cbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gYXdzbGFtYmRhLnN0cmVhbWlmeVJlc3BvbnNlKG1lc3NhZ2VIYW5kbGVyKTsiXX0=