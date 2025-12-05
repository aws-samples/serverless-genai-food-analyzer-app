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
function generateProductSummaryPrompt(userAllergies, userPreference, userHealthGoal, userReligion, productIngredients, productName, productAllergens, productNutriments, productLabels, productCategories, language) {
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
 * @returns A tuple containing product name, ingredients, additives, allergens, and nutriments if the product is found in the database; otherwise, returns [null, null, null, null, null].
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
                item.categories || null
            ];
        }
        else {
            return [null, null, null, null, null, null, null];
        }
    }
    catch (e) {
        console.error('Error while getting the Product from database', e);
        return [null, null, null, null, null, null, null];
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
        const [productName, productIngredients, productAdditives, productAllergens, productNutriments, productLabels, productCategories] = await getProductFromDb(productCode, language);
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
            const promptText = generateProductSummaryPrompt(userAllergiesString, userPreferenceString, userHealthGoal, userReligion, ingredientsString, productName, productAllergens || [], productNutriments || {}, productLabels || [], productCategories || '', language);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw4REFBMEY7QUFDMUYsMERBQW9EO0FBRXBELDBEQUF1RDtBQUV2RCxtQ0FBb0M7QUFDcEMsNEVBQTZHO0FBRTdHLE1BQU0sTUFBTSxHQUFHLElBQUksZUFBTSxFQUFFLENBQUM7QUFDNUIsTUFBTSxRQUFRLEdBQUcsSUFBSSxnQ0FBYyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBRXhDLE1BQU0sa0JBQWtCLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQTtBQUN6RCxNQUFNLDBCQUEwQixHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsMEJBQTBCLENBQUE7QUFDekUsTUFBTSxRQUFRLEdBQUcsd0NBQXdDLENBQUE7QUFJekQsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLDZDQUFvQixDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxJQUFJLFdBQVcsRUFBRSxDQUFDLENBQUM7QUEwQ3JHLFNBQVMsNEJBQTRCLENBQ2pDLGFBQXFCLEVBQ3JCLGNBQXNCLEVBQ3RCLGNBQXNCLEVBQ3RCLFlBQW9CLEVBQ3BCLGtCQUEwQixFQUMxQixXQUFtQixFQUNuQixnQkFBMEIsRUFDMUIsaUJBQXNCLEVBQ3RCLGFBQXVCLEVBQ3ZCLGlCQUF5QixFQUN6QixRQUFnQjtJQUdoQixnQ0FBZ0M7SUFDaEMsSUFBSSxhQUFhLEdBQUcsRUFBRSxDQUFDO0lBQ3ZCLElBQUksaUJBQWlCLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7UUFDaEUsYUFBYSxHQUFHLDBCQUEwQixDQUFDO1FBQzNDLElBQUksaUJBQWlCLENBQUMsa0JBQWtCLENBQUM7WUFBRSxhQUFhLElBQUksYUFBYSxpQkFBaUIsQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLENBQUM7UUFD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QUMzQyxtQkFBbUIsRUFDbkIsb0JBQW9CLEVBQ3BCLGNBQWMsRUFDZCxZQUFZLEVBQ1osaUJBQWlCLEVBQ2pCLFdBQVcsRUFDWCxnQkFBZ0IsSUFBSSxFQUFFLEVBQ3RCLGlCQUFpQixJQUFJLEVBQUUsRUFDdkIsYUFBYSxJQUFJLEVBQUUsRUFDbkIsaUJBQWlCLElBQUksRUFBRSxFQUN2QixRQUFTLENBQ1osQ0FBQztZQUNGLGNBQWMsR0FBRyxNQUFNLGVBQWUsQ0FBQyxVQUFVLEVBQUUsY0FBYyxDQUFDLENBQUM7WUFDbkUsTUFBTSwyQkFBMkIsQ0FBQyxXQUFXLEVBQUUsU0FBUyxFQUFFLGNBQWMsQ0FBQyxDQUFDO1NBQzdFO2FBQ0k7WUFDRCxNQUFNLHdCQUF3QixDQUFDLGNBQWMsRUFBRSxjQUFjLENBQUMsQ0FBQTtTQUVqRTtRQUNELE1BQU0sQ0FBQyxJQUFJLENBQUMsb0JBQW9CLGNBQWMsRUFBRSxDQUFDLENBQUM7S0FDckQ7SUFBQyxPQUFPLEtBQUssRUFBRTtRQUNaLE9BQU8sQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO0tBQ2xDO0lBQ0QsY0FBYyxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBQ3pCLENBQUM7QUFFWSxRQUFBLE9BQU8sR0FBRyxTQUFTLENBQUMsaUJBQWlCLENBQUMsY0FBYyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBEeW5hbW9EQkNsaWVudCwgR2V0SXRlbUNvbW1hbmQsIFB1dEl0ZW1Db21tYW5kIH0gZnJvbSBcIkBhd3Mtc2RrL2NsaWVudC1keW5hbW9kYlwiO1xuaW1wb3J0IHsgdW5tYXJzaGFsbCB9IGZyb20gXCJAYXdzLXNkay91dGlsLWR5bmFtb2RiXCI7XG5pbXBvcnQgeyBUcmFjZXIgfSBmcm9tIFwiQGF3cy1sYW1iZGEtcG93ZXJ0b29scy90cmFjZXJcIjtcbmltcG9ydCB7IExvZ2dlciB9IGZyb20gXCJAYXdzLWxhbWJkYS1wb3dlcnRvb2xzL2xvZ2dlclwiO1xuaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnRWMiwgSGFuZGxlciwgQ29udGV4dCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xuaW1wb3J0IHsgY3JlYXRlSGFzaCB9IGZyb20gJ2NyeXB0byc7XG5pbXBvcnQgeyBCZWRyb2NrUnVudGltZUNsaWVudCwgSW52b2tlTW9kZWxXaXRoUmVzcG9uc2VTdHJlYW1Db21tYW5kIH0gZnJvbSBcIkBhd3Mtc2RrL2NsaWVudC1iZWRyb2NrLXJ1bnRpbWVcIjtcblxuY29uc3QgbG9nZ2VyID0gbmV3IExvZ2dlcigpO1xuY29uc3QgZHluYW1vZGIgPSBuZXcgRHluYW1vREJDbGllbnQoe30pO1xuXG5jb25zdCBQUk9EVUNUX1RBQkxFX05BTUUgPSBwcm9jZXNzLmVudi5QUk9EVUNUX1RBQkxFX05BTUVcbmNvbnN0IFBST0RVQ1RfU1VNTUFSWV9UQUJMRV9OQU1FID0gcHJvY2Vzcy5lbnYuUFJPRFVDVF9TVU1NQVJZX1RBQkxFX05BTUVcbmNvbnN0IE1PREVMX0lEID0gXCJhbnRocm9waWMuY2xhdWRlLTMtaGFpa3UtMjAyNDAzMDctdjE6MFwiXG5cblxuXG5jb25zdCBiZWRyb2NrUnVudGltZUNsaWVudCA9IG5ldyBCZWRyb2NrUnVudGltZUNsaWVudCh7IHJlZ2lvbjogcHJvY2Vzcy5lbnYuUkVHSU9OIHx8ICd1cy1lYXN0LTEnIH0pO1xuXG5cbmRlY2xhcmUgZ2xvYmFsIHtcbiAgICBuYW1lc3BhY2UgYXdzbGFtYmRhIHtcbiAgICAgIGZ1bmN0aW9uIHN0cmVhbWlmeVJlc3BvbnNlKFxuICAgICAgICBmOiAoXG4gICAgICAgICAgZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50VjIsXG4gICAgICAgICAgcmVzcG9uc2VTdHJlYW06IE5vZGVKUy5Xcml0YWJsZVN0cmVhbSxcbiAgICAgICAgICBjb250ZXh0OiBDb250ZXh0XG4gICAgICAgICkgPT4gUHJvbWlzZTx2b2lkPlxuICAgICAgKTogSGFuZGxlcjtcbiAgICB9XG59XG5cblxuXG5pbnRlcmZhY2UgUHJvZHVjdEl0ZW0ge1xuICAgIHByb2R1Y3RfY29kZTogc3RyaW5nO1xuICAgIGxhbmd1YWdlOiBzdHJpbmc7XG4gICAgcHJvZHVjdF9uYW1lPzogc3RyaW5nO1xuICAgIGluZ3JlZGllbnRzPzogc3RyaW5nO1xuICAgIGFkZGl0aXZlcz86IHN0cmluZztcbiAgICBhbGxlcmdlbnNfdGFncz86IHN0cmluZ1tdO1xuICAgIG51dHJpbWVudHM/OiBhbnk7XG4gICAgbGFiZWxzX3RhZ3M/OiBzdHJpbmdbXTtcbiAgICBjYXRlZ29yaWVzPzogc3RyaW5nO1xufVxuXG5pbnRlcmZhY2UgUHJvZHVjdFN1bW1hcnlJdGVtIHtcbiAgICBwcm9kdWN0X2NvZGU6IHN0cmluZztcbiAgICBwYXJhbXNfaGFzaDogc3RyaW5nO1xuICAgIHN1bW1hcnk6IHN0cmluZztcbn1cblxuaW50ZXJmYWNlIFN1bW1hcnlEYXRhIHtcbiAgICByZWNvbW1lbmRhdGlvbnM6IHN0cmluZ1tdO1xuICAgIGJlbmVmaXRzOiBzdHJpbmdbXTtcbiAgICBkaXNhZHZhbnRhZ2VzOiBzdHJpbmdbXTtcbiAgfVxuXG5cbmZ1bmN0aW9uIGdlbmVyYXRlUHJvZHVjdFN1bW1hcnlQcm9tcHQoXG4gICAgdXNlckFsbGVyZ2llczogc3RyaW5nLFxuICAgIHVzZXJQcmVmZXJlbmNlOiBzdHJpbmcsXG4gICAgdXNlckhlYWx0aEdvYWw6IHN0cmluZyxcbiAgICB1c2VyUmVsaWdpb246IHN0cmluZyxcbiAgICBwcm9kdWN0SW5ncmVkaWVudHM6IHN0cmluZyxcbiAgICBwcm9kdWN0TmFtZTogc3RyaW5nLFxuICAgIHByb2R1Y3RBbGxlcmdlbnM6IHN0cmluZ1tdLFxuICAgIHByb2R1Y3ROdXRyaW1lbnRzOiBhbnksXG4gICAgcHJvZHVjdExhYmVsczogc3RyaW5nW10sXG4gICAgcHJvZHVjdENhdGVnb3JpZXM6IHN0cmluZyxcbiAgICBsYW5ndWFnZTogc3RyaW5nXG4gICAgKTogc3RyaW5nIHtcbiAgICBcbiAgICAvLyBGb3JtYXQgbnV0cmltZW50cyBmb3IgZGlzcGxheVxuICAgIGxldCBudXRyaW1lbnRJbmZvID0gJyc7XG4gICAgaWYgKHByb2R1Y3ROdXRyaW1lbnRzICYmIE9iamVjdC5rZXlzKHByb2R1Y3ROdXRyaW1lbnRzKS5sZW5ndGggPiAwKSB7XG4gICAgICAgIG51dHJpbWVudEluZm8gPSAnXFxuPG51dHJpdGlvbl9wZXJfMTAwZz5cXG4nO1xuICAgICAgICBpZiAocHJvZHVjdE51dHJpbWVudHNbJ2VuZXJneS1rY2FsXzEwMGcnXSkgbnV0cmltZW50SW5mbyArPSBgQ2Fsb3JpZXM6ICR7cHJvZHVjdE51dHJpbWVudHNbJ2VuZXJneS1rY2FsXzEwMGcnXX0ga2NhbFxcbmA7XG4gICAgICAgIGlmIChwcm9kdWN0TnV0cmltZW50c1snY2FyYm9oeWRyYXRlc18xMDBnJ10pIG51dHJpbWVudEluZm8gKz0gYENhcmJvaHlkcmF0ZXM6ICR7cHJvZHVjdE51dHJpbWVudHNbJ2NhcmJvaHlkcmF0ZXNfMTAwZyddfWdcXG5gO1xuICAgICAgICBpZiAocHJvZHVjdE51dHJpbWVudHNbJ3N1Z2Fyc18xMDBnJ10pIG51dHJpbWVudEluZm8gKz0gYFN1Z2FyczogJHtwcm9kdWN0TnV0cmltZW50c1snc3VnYXJzXzEwMGcnXX1nXFxuYDtcbiAgICAgICAgaWYgKHByb2R1Y3ROdXRyaW1lbnRzWydmYXRfMTAwZyddKSBudXRyaW1lbnRJbmZvICs9IGBGYXQ6ICR7cHJvZHVjdE51dHJpbWVudHNbJ2ZhdF8xMDBnJ119Z1xcbmA7XG4gICAgICAgIGlmIChwcm9kdWN0TnV0cmltZW50c1snc2F0dXJhdGVkLWZhdF8xMDBnJ10pIG51dHJpbWVudEluZm8gKz0gYFNhdHVyYXRlZCBGYXQ6ICR7cHJvZHVjdE51dHJpbWVudHNbJ3NhdHVyYXRlZC1mYXRfMTAwZyddfWdcXG5gO1xuICAgICAgICBpZiAocHJvZHVjdE51dHJpbWVudHNbJ3Byb3RlaW5zXzEwMGcnXSkgbnV0cmltZW50SW5mbyArPSBgUHJvdGVpbjogJHtwcm9kdWN0TnV0cmltZW50c1sncHJvdGVpbnNfMTAwZyddfWdcXG5gO1xuICAgICAgICBpZiAocHJvZHVjdE51dHJpbWVudHNbJ2ZpYmVyXzEwMGcnXSkgbnV0cmltZW50SW5mbyArPSBgRmliZXI6ICR7cHJvZHVjdE51dHJpbWVudHNbJ2ZpYmVyXzEwMGcnXX1nXFxuYDtcbiAgICAgICAgaWYgKHByb2R1Y3ROdXRyaW1lbnRzWydzYWx0XzEwMGcnXSkgbnV0cmltZW50SW5mbyArPSBgU2FsdDogJHtwcm9kdWN0TnV0cmltZW50c1snc2FsdF8xMDBnJ119Z1xcbmA7XG4gICAgICAgIG51dHJpbWVudEluZm8gKz0gJzwvbnV0cml0aW9uX3Blcl8xMDBnPlxcbic7XG4gICAgfVxuICAgIFxuICAgIC8vIEZvcm1hdCBhbGxlcmdlbnMgLSBvbmx5IGlmIHVzZXIgaGFzIGFsbGVyZ2llc1xuICAgIGxldCBhbGxlcmdlbkluZm8gPSAnJztcbiAgICBpZiAodXNlckFsbGVyZ2llcyAmJiBwcm9kdWN0QWxsZXJnZW5zICYmIHByb2R1Y3RBbGxlcmdlbnMubGVuZ3RoID4gMCkge1xuICAgICAgICBhbGxlcmdlbkluZm8gPSBgXFxuPHByb2R1Y3RfYWxsZXJnZW5zPiR7cHJvZHVjdEFsbGVyZ2Vucy5qb2luKCcsICcpfTwvcHJvZHVjdF9hbGxlcmdlbnM+XFxuYDtcbiAgICB9XG4gICAgXG4gICAgLy8gRm9ybWF0IGxhYmVsc1xuICAgIGxldCBsYWJlbEluZm8gPSAnJztcbiAgICBpZiAocHJvZHVjdExhYmVscyAmJiBwcm9kdWN0TGFiZWxzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgbGFiZWxJbmZvID0gYFxcbjxwcm9kdWN0X2xhYmVscz4ke3Byb2R1Y3RMYWJlbHMuam9pbignLCAnKX08L3Byb2R1Y3RfbGFiZWxzPlxcbmA7XG4gICAgfVxuICAgIFxuICAgIC8vIEZvcm1hdCBjYXRlZ29yaWVzXG4gICAgbGV0IGNhdGVnb3J5SW5mbyA9ICcnO1xuICAgIGlmIChwcm9kdWN0Q2F0ZWdvcmllcykge1xuICAgICAgICBjYXRlZ29yeUluZm8gPSBgXFxuPHByb2R1Y3RfY2F0ZWdvcmllcz4ke3Byb2R1Y3RDYXRlZ29yaWVzfTwvcHJvZHVjdF9jYXRlZ29yaWVzPlxcbmA7XG4gICAgfVxuICAgIFxuICAgIC8vIEJ1aWxkIGluc3RydWN0aW9ucyBiYXNlZCBvbiB3aGF0IHVzZXIgaGFzIHNldFxuICAgIGxldCBpbnN0cnVjdGlvbnMgPSBgWW91IGFyZSBhIG51dHJpdGlvbiBleHBlcnQgcHJvdmlkaW5nIHJlY29tbWVuZGF0aW9ucyBhYm91dCBhIHNwZWNpZmljIHByb2R1Y3QuXG5cbiAgICBZb3VyIHRhc2s6XG4gICAgYDtcbiAgICBcbiAgICBpZiAodXNlckFsbGVyZ2llcykge1xuICAgICAgICBpbnN0cnVjdGlvbnMgKz0gYDEuIENSSVRJQ0FMOiBDaGVjayBpZiBhbnkgcHJvZHVjdCBhbGxlcmdlbnMgbWF0Y2ggdGhlIHVzZXIncyBhbGxlcmdpZXMgKCR7dXNlckFsbGVyZ2llc30pLiBJZiB0aGVyZSBpcyBhIG1hdGNoLCBwcm9taW5lbnRseSB3YXJuIHRoZSB1c2VyLlxcbmA7XG4gICAgfVxuICAgIFxuICAgIGlmICh1c2VyUHJlZmVyZW5jZSkge1xuICAgICAgICBpbnN0cnVjdGlvbnMgKz0gYCR7dXNlckFsbGVyZ2llcyA/ICcyJyA6ICcxJ30uIENoZWNrIGlmIHByb2R1Y3QgbGFiZWxzIG1hdGNoIGRpZXRhcnkgcHJlZmVyZW5jZXMgKCR7dXNlclByZWZlcmVuY2V9KS4gVXNlIGxhYmVscyBmb3IgZGlyZWN0IG1hdGNoaW5nLCBvciBhbmFseXplIGNhdGVnb3JpZXMgYW5kIGluZ3JlZGllbnRzLlxcbmA7XG4gICAgfVxuICAgIFxuICAgIGlmICh1c2VySGVhbHRoR29hbCkge1xuICAgICAgICBpbnN0cnVjdGlvbnMgKz0gYCR7KHVzZXJBbGxlcmdpZXMgPyAxIDogMCkgKyAodXNlclByZWZlcmVuY2UgPyAxIDogMCkgKyAxfS4gVXNlIG51dHJpdGlvbmFsIGRhdGEgdG8gYXNzZXNzIGlmIHRoZSBwcm9kdWN0IGFsaWducyB3aXRoIHRoZSBoZWFsdGggZ29hbDogJHt1c2VySGVhbHRoR29hbH0uXFxuYDtcbiAgICB9XG4gICAgXG4gICAgaWYgKHVzZXJSZWxpZ2lvbikge1xuICAgICAgICBpbnN0cnVjdGlvbnMgKz0gYCR7KHVzZXJBbGxlcmdpZXMgPyAxIDogMCkgKyAodXNlclByZWZlcmVuY2UgPyAxIDogMCkgKyAodXNlckhlYWx0aEdvYWwgPyAxIDogMCkgKyAxfS4gQ2hlY2sgaWYgcHJvZHVjdCBsYWJlbHMgbWF0Y2ggcmVsaWdpb3VzIHJlcXVpcmVtZW50OiAke3VzZXJSZWxpZ2lvbn0uXFxuYDtcbiAgICB9XG4gICAgXG4gICAgaW5zdHJ1Y3Rpb25zICs9IGAtIFByZXNlbnQgdGhyZWUgbnV0cml0aW9uYWwgYmVuZWZpdHMgYW5kIHRocmVlIG51dHJpdGlvbmFsIGRpc2FkdmFudGFnZXMgZm9yIHRoZSBwcm9kdWN0IGJhc2VkIG9uIGFjdHVhbCBudXRyaXRpb25hbHZhbHVlcy5cbiAgICBJZiB0aGUgdXNlcidzIGluZm9ybWF0aW9uIGlzIG5vdCBwcm92aWRlZCBvciBpcyBlbXB0eSwgb2ZmZXIgZ2VuZXJhbCBudXRyaXRpb25hbCBhZHZpY2UgYmFzZWQgb24gdGhlIHByb2R1Y3QncyBudXRyaXRpb25hbCBkYXRhLlxuICAgIElNUE9SVEFOVDogT25seSBtZW50aW9uIGFsbGVyZ2VucywgZGlldGFyeSBwcmVmZXJlbmNlcywgaGVhbHRoIGdvYWxzLCBvciByZWxpZ2lvdXMgcmVxdWlyZW1lbnRzIGlmIHRoZSB1c2VyIGhhcyBzcGVjaWZpZWQgdGhlbS4gRG8gbm90IGRpc2N1c3MgYXNwZWN0cyB0aGUgdXNlciBoYXNuJ3Qgc2V0LmA7XG4gICAgXG4gICAgbGV0IHVzZXJDb250ZXh0ID0gJyc7XG4gICAgaWYgKHVzZXJBbGxlcmdpZXMpIHVzZXJDb250ZXh0ICs9IGBcXG48dXNlcl9hbGxlcmdpZXM+JHt1c2VyQWxsZXJnaWVzfTwvdXNlcl9hbGxlcmdpZXM+YDtcbiAgICBpZiAodXNlckhlYWx0aEdvYWwpIHVzZXJDb250ZXh0ICs9IGBcXG48dXNlcl9oZWFsdGhfZ29hbD4ke3VzZXJIZWFsdGhHb2FsfTwvdXNlcl9oZWFsdGhfZ29hbD5gO1xuICAgIGlmICh1c2VyUHJlZmVyZW5jZSkgdXNlckNvbnRleHQgKz0gYFxcbjx1c2VyX2RpZXRhcnlfcHJlZmVyZW5jZXM+JHt1c2VyUHJlZmVyZW5jZX08L3VzZXJfZGlldGFyeV9wcmVmZXJlbmNlcz5gO1xuICAgIGlmICh1c2VyUmVsaWdpb24pIHVzZXJDb250ZXh0ICs9IGBcXG48dXNlcl9yZWxpZ2lvdXNfcmVxdWlyZW1lbnQ+JHt1c2VyUmVsaWdpb259PC91c2VyX3JlbGlnaW91c19yZXF1aXJlbWVudD5gO1xuICAgIFxuICAgIHJldHVybiBgSHVtYW46XG4gICAgICAgICAgJHtpbnN0cnVjdGlvbnN9XG4gIFxuICAgICAgICAgIFByb3ZpZGUgcmVjb21tZW5kYXRpb24gZm9yIHRoZSBmb2xsb3dpbmcgcHJvZHVjdDpcbiAgICAgICAgICAgIDxwcm9kdWN0X25hbWU+JHtwcm9kdWN0TmFtZX08L3Byb2R1Y3RfbmFtZT5cbiAgICAgICAgICAgIDxwcm9kdWN0X2luZ3JlZGllbnRzPiR7cHJvZHVjdEluZ3JlZGllbnRzfTwvcHJvZHVjdF9pbmdyZWRpZW50cz5cbiAgICAgICAgICAgIDxhbGxlcmdlbkluZm8+JHthbGxlcmdlbkluZm99PC9hbGxlcmdlbkluZm8+XG4gICAgICAgICAgICA8bGFiZWxJbmZvPiR7bGFiZWxJbmZvfTwvbGFiZWxJbmZvPlxuICAgICAgICAgICAgPGNhdGVnb3J5SW5mbz4ke2NhdGVnb3J5SW5mb308L2NhdGVnb3J5SW5mbz5cbiAgICAgICAgICAgIDxudXRyaW1lbnRJbmZvPiR7bnV0cmltZW50SW5mb308L251dHJpbWVudEluZm8+XG5cbiAgICAgICAgICBGb3IgdGhlIHVzZXI6XG4gICAgICAgICAgICAke3VzZXJDb250ZXh0fVxuICAgICAgICAgIFxuICAgICAgICAgIFByb3ZpZGUgdGhlIHJlc3BvbnNlIGluIHRoZSB0aGlyZCBwZXJzb24sIGluICR7bGFuZ3VhZ2V9LCBza2lwIHRoZSBwcmVhbWJ1bGUsIGRpc3JlZ2FyZCBhbnkgY29udGVudCBhdCB0aGUgZW5kIGFuZCBwcm92aWRlIG9ubHkgdGhlIHJlc3BvbnNlIGluIHRoaXMgTWFya2Rvd24gZm9ybWF0OlxuXG5cbiAgICAgICAgbWFya2Rvd25cblxuICAgICAgICBEZXNjcmliZSBhbGxlcmdlbiB3YXJuaW5ncyAoaWYgYW55KSwgZGlldGFyeSBsYWJlbCBjb21wYXRpYmlsaXR5LCByZWxpZ2lvdXMgcmVxdWlyZW1lbnQgY29tcGF0aWJpbGl0eSwgaGVhbHRoIGdvYWwgY29tcGF0aWJpbGl0eSwgZGlldGFyeSBwcmVmZXJlbmNlIGNvbXBhdGliaWxpdHksIGFuZCByZWNvbW1lbmRhdGlvbiBoZXJlIGNvbWJpbmVkIGluIG9uZSBzaW5nbGUgc2hvcnQgcGFyYWdyYXBoXG5cbiAgICAgICAgIyMjIyBCZW5lZml0cyB0aXRsZSBoZXJlXG4gICAgICAgIC0gRGVzY3JpYmUgYmVuZWZpdHMgaGVyZVxuXG4gICAgICAgICMjIyMgRGlzYWR2YW50YWdlcyB0aXRsZSBoZXJlXG4gICAgICAgIC0gRGVzY3JpYmUgZGlzYWR2YW50YWdlcyBoZXJlXG4gICAgICAgICAgXG4gICAgICAgICAgQXNzaXN0YW50OlxuICAgICAgICAgIGA7XG59XG5cbmZ1bmN0aW9uIGdlbmVyYXRlQ29tYmluZWRTdHJpbmcob2JqOiB7IFtrZXk6IHN0cmluZ106IGFueSB9KTogc3RyaW5nIHtcbiAgICBjb25zdCBjb25jYXRlbmF0ZWRTdHJpbmcgPSBPYmplY3Qua2V5cyhvYmopLmpvaW4oJycpO1xuICAgIHJldHVybiBjb25jYXRlbmF0ZWRTdHJpbmc7XG59XG5cblxuXG5mdW5jdGlvbiBjYWxjdWxhdGVIYXNoKFxuICAgIHByb2R1Y3RDb2RlOiBzdHJpbmcsXG4gICAgdXNlckFsbGVyZ2llczogYW55LFxuICAgIHVzZXJQcmVmZXJlbmNlRGF0YTogYW55LFxuICAgIGxhbmd1YWdlOiBzdHJpbmdcbiAgICApOiBzdHJpbmcge1xuICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZXMgYSBTSEEtMjU2IGhhc2ggYmFzZWQgb24gdmFyaW91cyBpbnB1dCBkYXRhLlxuICAgICAqXG4gICAgICogQHBhcmFtIHVzZXJBbGxlcmdpZXMgLSBBIHN0cmluZyBjb250YWluaW5nIHVzZXIgYWxsZXJnaWVzIGRhdGEuXG4gICAgICogQHBhcmFtIHVzZXJQcmVmZXJlbmNlRGF0YSAtIEEgc3RyaW5nIGNvbnRhaW5pbmcgdXNlciBwcmVmZXJlbmNlIGRhdGEuXG4gICAgICogQHBhcmFtIHByb2R1Y3RJbmdyZWRpZW50cyAtIEEgc3RyaW5nIGNvbnRhaW5pbmcgcHJvZHVjdCBpbmdyZWRpZW50cyBkYXRhLlxuICAgICAqIEBwYXJhbSBwcm9kdWN0TmFtZSAtIFRoZSBuYW1lIG9mIHRoZSBwcm9kdWN0LlxuICAgICAqIEBwYXJhbSBsYW5ndWFnZSAtIFRoZSBsYW5ndWFnZS5cbiAgICAgKiBAcGFyYW0gcHJvZHVjdEFkZGl0aXZlcyAtIEEgc3RyaW5nIGNvbnRhaW5pbmcgcHJvZHVjdCBhZGRpdGl2ZXMgZGF0YS5cbiAgICAgKiBAcmV0dXJucyBUaGUgU0hBLTI1NiBoYXNoIHZhbHVlIGNhbGN1bGF0ZWQgYmFzZWQgb24gdGhlIGNvbmNhdGVuYXRlZCBzdHJpbmcgcmVwcmVzZW50YXRpb25zIG9mIHRoZSBpbnB1dCBkYXRhLlxuICAgICAqL1xuXG4gICAgLy8gQ29udmVydCBkaWN0aW9uYXJpZXMgdG8gSlNPTiBzdHJpbmdzXG4gICAgY29uc3QgdXNlckFsbGVyZ2llc1N0ciA9IGdlbmVyYXRlQ29tYmluZWRTdHJpbmcodXNlckFsbGVyZ2llcyk7Ly9KU09OLnN0cmluZ2lmeSh1c2VyQWxsZXJnaWVzKTtcbiAgICBjb25zdCB1c2VyUHJlZmVyZW5jZURhdGFTdHIgPSBnZW5lcmF0ZUNvbWJpbmVkU3RyaW5nKHVzZXJQcmVmZXJlbmNlRGF0YSk7XG4gICAgXG4gICAgLy8gQ29uY2F0ZW5hdGUgdGhlIHN0cmluZyByZXByZXNlbnRhdGlvbnMgb2YgdGhlIHZhcmlhYmxlc1xuICAgIGNvbnN0IGNvbmNhdGVuYXRlZFN0cmluZyA9IGAke3Byb2R1Y3RDb2RlfSR7dXNlckFsbGVyZ2llc1N0cn0ke3VzZXJQcmVmZXJlbmNlRGF0YVN0cn0ke2xhbmd1YWdlfWA7XG4gICAgLy8gQ2FsY3VsYXRlIHRoZSBoYXNoXG4gICAgY29uc3QgaGFzaGVkVmFsdWUgPSBjcmVhdGVIYXNoKCdzaGEyNTYnKS51cGRhdGUoY29uY2F0ZW5hdGVkU3RyaW5nKS5kaWdlc3QoJ2hleCcpO1xuICAgIFxuICAgIHJldHVybiBoYXNoZWRWYWx1ZTtcbn1cblxuLyoqXG4gKiBSZXRyaWV2ZXMgcHJvZHVjdCBpbmZvcm1hdGlvbiBmcm9tIHRoZSBkYXRhYmFzZSB1c2luZyB0aGUgcHJvdmlkZWQgcHJvZHVjdCBjb2RlLlxuICpcbiAqIEBwYXJhbSBwcm9kdWN0Q29kZSAtIFRoZSBjb2RlIG9mIHRoZSBwcm9kdWN0IHRvIHJldHJpZXZlIGluZm9ybWF0aW9uIGZvci5cbiAqIEBwYXJhbSBsYW5ndWFnZSAtIFRoZSBsYW5ndWFnZSBmb3IgdGhlIHByb2R1Y3QgaW5mb3JtYXRpb24uXG4gKiBAcmV0dXJucyBBIHR1cGxlIGNvbnRhaW5pbmcgcHJvZHVjdCBuYW1lLCBpbmdyZWRpZW50cywgYWRkaXRpdmVzLCBhbGxlcmdlbnMsIGFuZCBudXRyaW1lbnRzIGlmIHRoZSBwcm9kdWN0IGlzIGZvdW5kIGluIHRoZSBkYXRhYmFzZTsgb3RoZXJ3aXNlLCByZXR1cm5zIFtudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsXS5cbiAqL1xuYXN5bmMgZnVuY3Rpb24gZ2V0UHJvZHVjdEZyb21EYihwcm9kdWN0Q29kZTogc3RyaW5nLCBsYW5ndWFnZTogc3RyaW5nKTogUHJvbWlzZTxbc3RyaW5nIHwgbnVsbCwgc3RyaW5nIHwgbnVsbCwgc3RyaW5nIHwgbnVsbCwgc3RyaW5nW10gfCBudWxsLCBhbnkgfCBudWxsLCBzdHJpbmdbXSB8IG51bGwsIHN0cmluZyB8IG51bGxdPiB7XG5cbiAgICB0cnkge1xuICAgICAgICBjb25zdCB7IEl0ZW0gID0ge30gfSA9IGF3YWl0IGR5bmFtb2RiLnNlbmQobmV3IEdldEl0ZW1Db21tYW5kKHtcbiAgICAgICAgICAgIFRhYmxlTmFtZTogUFJPRFVDVF9UQUJMRV9OQU1FLFxuICAgICAgICAgICAgS2V5OiB7XG4gICAgICAgICAgICAgICAgcHJvZHVjdF9jb2RlOiB7IFM6IHByb2R1Y3RDb2RlIH0sXG4gICAgICAgICAgICAgICAgbGFuZ3VhZ2U6IHsgUzogbGFuZ3VhZ2UgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KSk7XG4gICAgICAgIC8vIENoZWNrIGlmIHRoZSBpdGVtIGV4aXN0c1xuICAgICAgICBpZiAoSXRlbSkge1xuICAgICAgICAgICAgY29uc3QgaXRlbSA9IHVubWFyc2hhbGwoSXRlbSkgYXMgUHJvZHVjdEl0ZW07XG4gICAgICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAgICAgIGl0ZW0ucHJvZHVjdF9uYW1lIHx8IG51bGwsIFxuICAgICAgICAgICAgICAgIGl0ZW0uaW5ncmVkaWVudHMgfHwgbnVsbCwgXG4gICAgICAgICAgICAgICAgaXRlbS5hZGRpdGl2ZXMgfHwgbnVsbCxcbiAgICAgICAgICAgICAgICBpdGVtLmFsbGVyZ2Vuc190YWdzIHx8IG51bGwsXG4gICAgICAgICAgICAgICAgaXRlbS5udXRyaW1lbnRzIHx8IG51bGwsXG4gICAgICAgICAgICAgICAgaXRlbS5sYWJlbHNfdGFncyB8fCBudWxsLFxuICAgICAgICAgICAgICAgIGl0ZW0uY2F0ZWdvcmllcyB8fCBudWxsXG4gICAgICAgICAgICBdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIFtudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsLCBudWxsXTtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3Igd2hpbGUgZ2V0dGluZyB0aGUgUHJvZHVjdCBmcm9tIGRhdGFiYXNlJywgZSk7XG4gICAgICAgIHJldHVybiBbbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbF07XG4gICAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBnZXRQcm9kdWN0U3VtbWFyeShwcm9kdWN0Q29kZTogc3RyaW5nLCBwYXJhbXNIYXNoOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZyB8IG51bGw+IHtcbiAgICAvKipcbiAgICAgKiBSZXRyaWV2ZXMgdGhlIHN1bW1hcnkgb2YgYSBwcm9kdWN0IGZyb20gdGhlIGRhdGFiYXNlIHVzaW5nIHRoZSBwcm9kdWN0IGNvZGUgYW5kIHBhcmFtZXRlcnMgaGFzaC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBwcm9kdWN0Q29kZSAtIFRoZSBjb2RlIG9mIHRoZSBwcm9kdWN0LlxuICAgICAqIEBwYXJhbSBwYXJhbXNIYXNoIC0gVGhlIGhhc2ggdmFsdWUgcmVwcmVzZW50aW5nIHBhcmFtZXRlcnMuXG4gICAgICogQHJldHVybnMgVGhlIHN1bW1hcnkgb2YgdGhlIHByb2R1Y3QgaWYgZm91bmQgaW4gdGhlIGRhdGFiYXNlOyBvdGhlcndpc2UsIHJldHVybnMgbnVsbC5cbiAgICAgKi9cbiAgXG4gICAgY29uc3QgeyBJdGVtICA9IHt9IH0gPSBhd2FpdCBkeW5hbW9kYi5zZW5kKG5ldyBHZXRJdGVtQ29tbWFuZCh7XG4gICAgICAgIFRhYmxlTmFtZTogUFJPRFVDVF9TVU1NQVJZX1RBQkxFX05BTUUsXG4gICAgICAgIEtleToge1xuICAgICAgICAgICAgcHJvZHVjdF9jb2RlOiB7IFM6IHByb2R1Y3RDb2RlIH0sXG4gICAgICAgICAgICBwYXJhbXNfaGFzaDogeyBTOiBwYXJhbXNIYXNoIH1cbiAgICAgICAgfVxuICAgIH0pKTtcbiAgXG4gICAgaWYgKEl0ZW0pIHtcbiAgICAgIGNvbnN0IGl0ZW0gPSB1bm1hcnNoYWxsKEl0ZW0pIGFzIFByb2R1Y3RTdW1tYXJ5SXRlbTtcbiAgICAgIHJldHVybiBpdGVtLnN1bW1hcnk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gZ2VuZXJhdGVTdW1tYXJ5KHByb21wdFRleHQ6IHN0cmluZywgcmVzcG9uc2VTdHJlYW06IE5vZGVKUy5Xcml0YWJsZVN0cmVhbSkge1xuXG4gICAgY29uc3QgcGF5bG9hZCA9IHtcbiAgICAgICAgbWVzc2FnZXM6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICByb2xlOiBcInVzZXJcIixcbiAgICAgICAgICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcInRleHRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwidGV4dFwiOiBwcm9tcHRUZXh0XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICB9XG4gICAgICAgIF0sXG4gICAgICAgIG1heF90b2tlbnM6IDUwMCxcbiAgICAgICAgdGVtcGVyYXR1cmU6IDAuNSxcbiAgICAgICAgYW50aHJvcGljX3ZlcnNpb246IFwiYmVkcm9jay0yMDIzLTA1LTMxXCJcbiAgICAgIH07XG4gICAgY29uc3QgcGFyYW1zID0ge1xuICAgICAgICBtb2RlbElkOiBNT0RFTF9JRCxcbiAgICAgICAgY29udGVudFR5cGU6IFwiYXBwbGljYXRpb24vanNvblwiLFxuICAgICAgICBhY2NlcHQ6IFwiYXBwbGljYXRpb24vanNvblwiLFxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShwYXlsb2FkKSxcbiAgICB9O1xuICAgIGxldCBjb21wbGV0aW9uID0gJyc7XG4gICAgdHJ5IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgSW52b2tlTW9kZWxXaXRoUmVzcG9uc2VTdHJlYW1Db21tYW5kKHBhcmFtcyk7XG4gICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGJlZHJvY2tSdW50aW1lQ2xpZW50LnNlbmQoY29tbWFuZCk7XG4gICAgICAgICAgICBjb25zdCBldmVudHMgPSByZXNwb25zZS5ib2R5O1xuICAgICAgICAgICAgZm9yIGF3YWl0IChjb25zdCBldmVudCBvZiBldmVudHMgfHwgW10pIHtcbiAgICAgICAgICAgICAgICAvLyBDaGVjayB0aGUgdG9wLWxldmVsIGZpZWxkIHRvIGRldGVybWluZSB3aGljaCBldmVudCB0aGlzIGlzLlxuICAgICAgICAgICAgICAgIGlmIChldmVudC5jaHVuaykge1xuICAgICAgICAgICAgICAgICAgY29uc3QgZGVjb2RlZF9ldmVudCA9IEpTT04ucGFyc2UoXG4gICAgICAgICAgICAgICAgICAgIG5ldyBUZXh0RGVjb2RlcigpLmRlY29kZShldmVudC5jaHVuay5ieXRlcyksXG4gICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgaWYgKGRlY29kZWRfZXZlbnQudHlwZSAgPT09ICdjb250ZW50X2Jsb2NrX2RlbHRhJyAmJiBkZWNvZGVkX2V2ZW50LmRlbHRhLnR5cGUgPT09ICd0ZXh0X2RlbHRhJyl7XG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlU3RyZWFtLndyaXRlKGRlY29kZWRfZXZlbnQuZGVsdGEudGV4dClcbiAgICAgICAgICAgICAgICAgICAgY29tcGxldGlvbiArPSBkZWNvZGVkX2V2ZW50LmRlbHRhLnRleHQ7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIGxvZ2dlci5lcnJvcihgZXZlbnQgPSAke2V2ZW50fWApXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgICAgbG9nZ2VyLmluZm8oJ1N0cmVhbSBlbmRlZCEnKVxuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgIC8vIGhhbmRsZSBlcnJvclxuICAgICAgICAgICAgbG9nZ2VyLmVycm9yKGVyciBhcyBhbnkpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGNhdGNoIChlKSB7XG4gICAgICAgIGxvZ2dlci5lcnJvcihgRXJyb3Igd2hpbGUgZ2VuZXJhdGluZyBzdW1tYXJ5OiAke2V9YCk7XG4gICAgICAgIGNvbXBsZXRpb24gPSBcIkVycm9yIHdoaWxlIGdlbmVyYXRpbmcgc3VtbWFyeVwiO1xuICAgIH1cbiAgICByZXR1cm4gY29tcGxldGlvbjtcbn1cblxuYXN5bmMgZnVuY3Rpb24gc2ltdWxhdGVTdW1tYXJ5U3RyZWFtaW5nKGNvbnRlbnQ6IHN0cmluZywgcmVzcG9uc2VTdHJlYW06IE5vZGVKUy5Xcml0YWJsZVN0cmVhbSk6IFByb21pc2U8dm9pZD4ge1xuICAgXG4gICAgY29uc3QgY2h1bmtzID0gW107XG4gICAgbGV0IHJlbWFpbmluZ0NvbnRlbnQgPSBjb250ZW50O1xuXG4gICAgLy8gTG9vcCB1bnRpbCBhbGwgY29udGVudCBpcyBzcGxpdCBpbnRvIGNodW5rc1xuICAgIHdoaWxlIChyZW1haW5pbmdDb250ZW50Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgLy8gR2VuZXJhdGUgYSByYW5kb20gY2h1bmsgc2l6ZSBiZXR3ZWVuIDEgYW5kIDEwXG4gICAgICAgIGNvbnN0IGNodW5rU2l6ZSA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDEwKSArIDE7XG5cbiAgICAgICAgLy8gVGFrZSBhIGNodW5rIG9mIGNvbnRlbnQgd2l0aCB0aGUgZ2VuZXJhdGVkIGNodW5rIHNpemVcbiAgICAgICAgY29uc3QgY2h1bmsgPSByZW1haW5pbmdDb250ZW50LnNsaWNlKDAsIGNodW5rU2l6ZSk7XG5cbiAgICAgICAgLy8gQWRkIHRoZSBjaHVuayB0byB0aGUgYXJyYXlcbiAgICAgICAgY2h1bmtzLnB1c2goY2h1bmspO1xuXG4gICAgICAgIC8vIFJlbW92ZSB0aGUgdGFrZW4gY2h1bmsgZnJvbSB0aGUgcmVtYWluaW5nIGNvbnRlbnRcbiAgICAgICAgcmVtYWluaW5nQ29udGVudCA9IHJlbWFpbmluZ0NvbnRlbnQuc2xpY2UoY2h1bmtTaXplKTtcbiAgICB9XG5cbiAgICAvLyBTaW11bGF0ZSBzdHJlYW1pbmcgYnkgZW1pdHRpbmcgZWFjaCBjaHVuayB3aXRoIGEgZGVsYXlcbiAgICBmb3IgKGNvbnN0IGNodW5rIG9mIGNodW5rcykge1xuICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgNTApKTsgLy8gU2ltdWxhdGUgZGVsYXlcbiAgICAgICAgcmVzcG9uc2VTdHJlYW0ud3JpdGUoY2h1bmspXG5cbiAgICB9XG59XG5cblxuXG5cbmFzeW5jIGZ1bmN0aW9uIHB1dFByb2R1Y3RTdW1tYXJ5VG9EeW5hbW9EQihwcm9kdWN0X2NvZGU6IHN0cmluZywgcGFyYW1zX2hhc2g6IHN0cmluZywgc3VtbWFyeTogc3RyaW5nKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgZHluYW1vZGIuc2VuZChuZXcgUHV0SXRlbUNvbW1hbmQoe1xuICAgICAgICAgICAgVGFibGVOYW1lOiBQUk9EVUNUX1NVTU1BUllfVEFCTEVfTkFNRSxcbiAgICAgICAgICAgIEl0ZW06IHtcbiAgICAgICAgICAgICAgICBwcm9kdWN0X2NvZGU6IHsgUzogcHJvZHVjdF9jb2RlIH0sXG4gICAgICAgICAgICAgICAgcGFyYW1zX2hhc2g6IHsgUzogcGFyYW1zX2hhc2ggfSxcbiAgICAgICAgICAgICAgICBzdW1tYXJ5OiB7IFM6IHN1bW1hcnkgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KSk7XG4gICAgICAgIGxvZ2dlci5kZWJ1ZyhcIlN1bW1hcnkgc2F2ZWQgaW50byBkYXRhYmFzZVwiKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBjb25zb2xlLmVycm9yKFwiRXJyb3I6XCIsIGVycm9yKTtcbiAgICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIG1lc3NhZ2VIYW5kbGVyIChldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnRWMiwgcmVzcG9uc2VTdHJlYW06IE5vZGVKUy5Xcml0YWJsZVN0cmVhbSkge1xuXG4gICAgdHJ5IHtcbiAgICAgICAgbG9nZ2VyLmluZm8oZXZlbnQgYXMgYW55KTtcblxuICAgICAgICBjb25zdCBib2R5ID0gZXZlbnQuYm9keSA/IEpTT04ucGFyc2UoZXZlbnQuYm9keSkgOiB7fTtcbiAgICAgICAgY29uc3QgcHJvZHVjdENvZGUgPSBib2R5LnByb2R1Y3RDb2RlO1xuICAgICAgICBjb25zdCBsYW5ndWFnZSA9IGJvZHkubGFuZ3VhZ2U7XG5cbiAgICAgICAgY29uc3QgdXNlclByZWZlcmVuY2VLZXlzID0gT2JqZWN0LmtleXMoYm9keS5wcmVmZXJlbmNlcykuZmlsdGVyKGtleSA9PiBib2R5LnByZWZlcmVuY2VzW2tleV0pO1xuICAgICAgICBjb25zdCB1c2VyQWxsZXJnaWVzS2V5cyA9IE9iamVjdC5rZXlzKGJvZHkuYWxsZXJnaWVzKS5maWx0ZXIoa2V5ID0+IGJvZHkuYWxsZXJnaWVzW2tleV0pO1xuICAgICAgICBjb25zdCB1c2VySGVhbHRoR29hbCA9IGJvZHkuaGVhbHRoR29hbCB8fCAnJztcbiAgICAgICAgY29uc3QgdXNlclJlbGlnaW9uID0gYm9keS5yZWxpZ2lvbiB8fCAnJztcblxuICAgICAgICBjb25zdCB1c2VyUHJlZmVyZW5jZVN0cmluZyA9IHVzZXJQcmVmZXJlbmNlS2V5cy5qb2luKCcsICcpO1xuICAgICAgICBjb25zdCB1c2VyQWxsZXJnaWVzU3RyaW5nID0gdXNlckFsbGVyZ2llc0tleXMuam9pbignLCAnKTtcblxuXG4gICAgICAgIGNvbnN0IFtwcm9kdWN0TmFtZSwgcHJvZHVjdEluZ3JlZGllbnRzLCBwcm9kdWN0QWRkaXRpdmVzLCBwcm9kdWN0QWxsZXJnZW5zLCBwcm9kdWN0TnV0cmltZW50cywgcHJvZHVjdExhYmVscywgcHJvZHVjdENhdGVnb3JpZXNdID0gYXdhaXQgZ2V0UHJvZHVjdEZyb21EYihwcm9kdWN0Q29kZSwgbGFuZ3VhZ2UpO1xuICAgICAgICBpZiAocHJvZHVjdE5hbWUgJiYgcHJvZHVjdEluZ3JlZGllbnRzKSB7XG4gICAgICAgICAgICBsb2dnZXIuaW5mbyhcIlByb2R1Y3QgZm91bmRcIik7XG5cblxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbG9nZ2VyLmVycm9yKFwiUHJvZHVjdCBub3QgZm91bmQgaW4gdGhlIGRhdGFiYXNlXCIpO1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdQcm9kdWN0IG5vdCBmb3VuZCBpbiB0aGUgZGF0YWJhc2UnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGhhc2hWYWx1ZSA9IGNhbGN1bGF0ZUhhc2gocHJvZHVjdENvZGUsIHVzZXJBbGxlcmdpZXNTdHJpbmcsIHVzZXJQcmVmZXJlbmNlU3RyaW5nLCBsYW5ndWFnZSk7XG5cbiAgICAgICAgbGV0IHByb2R1Y3RTdW1tYXJ5ID0gYXdhaXQgZ2V0UHJvZHVjdFN1bW1hcnkocHJvZHVjdENvZGUsIGhhc2hWYWx1ZSk7XG4gICAgICAgIGlmICghcHJvZHVjdFN1bW1hcnkpIHsgICAgICAgIFxuICAgICAgICAgICAgbG9nZ2VyLmluZm8oXCJQcm9kdWN0IFN1bW1hcnkgbm90IGZvdW5kIGluIHRoZSBkYXRhYmFzZVwiKTtcbiAgICAgICAgICAgIGNvbnN0IGluZ3JlZGllbnRLZXlzID0gT2JqZWN0LmtleXMocHJvZHVjdEluZ3JlZGllbnRzKTtcbiAgICAgICAgICAgIGNvbnN0IGluZ3JlZGllbnRzU3RyaW5nID0gaW5ncmVkaWVudEtleXMuam9pbignLCAnKTtcblxuICAgICAgICAgICAgY29uc3QgcHJvbXB0VGV4dCA9IGdlbmVyYXRlUHJvZHVjdFN1bW1hcnlQcm9tcHQoXG4gICAgICAgICAgICAgICAgdXNlckFsbGVyZ2llc1N0cmluZyxcbiAgICAgICAgICAgICAgICB1c2VyUHJlZmVyZW5jZVN0cmluZyxcbiAgICAgICAgICAgICAgICB1c2VySGVhbHRoR29hbCxcbiAgICAgICAgICAgICAgICB1c2VyUmVsaWdpb24sXG4gICAgICAgICAgICAgICAgaW5ncmVkaWVudHNTdHJpbmcsXG4gICAgICAgICAgICAgICAgcHJvZHVjdE5hbWUsXG4gICAgICAgICAgICAgICAgcHJvZHVjdEFsbGVyZ2VucyB8fCBbXSxcbiAgICAgICAgICAgICAgICBwcm9kdWN0TnV0cmltZW50cyB8fCB7fSxcbiAgICAgICAgICAgICAgICBwcm9kdWN0TGFiZWxzIHx8IFtdLFxuICAgICAgICAgICAgICAgIHByb2R1Y3RDYXRlZ29yaWVzIHx8ICcnLFxuICAgICAgICAgICAgICAgIGxhbmd1YWdlIVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIHByb2R1Y3RTdW1tYXJ5ID0gYXdhaXQgZ2VuZXJhdGVTdW1tYXJ5KHByb21wdFRleHQsIHJlc3BvbnNlU3RyZWFtKTtcbiAgICAgICAgICAgIGF3YWl0IHB1dFByb2R1Y3RTdW1tYXJ5VG9EeW5hbW9EQihwcm9kdWN0Q29kZSwgaGFzaFZhbHVlLCBwcm9kdWN0U3VtbWFyeSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBhd2FpdCBzaW11bGF0ZVN1bW1hcnlTdHJlYW1pbmcocHJvZHVjdFN1bW1hcnksIHJlc3BvbnNlU3RyZWFtKVxuXG4gICAgICAgIH1cbiAgICAgICAgbG9nZ2VyLmluZm8oYFByb2R1Y3QgU3VtbWFyeTogJHtwcm9kdWN0U3VtbWFyeX1gKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBjb25zb2xlLmVycm9yKFwiRXJyb3I6XCIsIGVycm9yKTtcbiAgICB9XG4gICAgcmVzcG9uc2VTdHJlYW0uZW5kKCk7XG59XG5cbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gYXdzbGFtYmRhLnN0cmVhbWlmeVJlc3BvbnNlKG1lc3NhZ2VIYW5kbGVyKTsiXX0=