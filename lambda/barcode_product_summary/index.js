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
function generateProductSummaryPrompt(userAllergies, userPreference, productIngredients, productName, language) {
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
 * @returns A tuple containing product name, ingredients, and additives if the product is found in the database; otherwise, returns [null, null, null].
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
            return [item.product_name || null, item.ingredients || null, item.additives || null];
        }
        else {
            return [null, null, null];
        }
    }
    catch (e) {
        console.error('Error while getting the Product from database', e);
        return [null, null, null];
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
        const userPreferenceString = userPreferenceKeys.join(', ');
        const userAllergiesString = userAllergiesKeys.join(', ');
        const [productName, productIngredients, productAdditives] = await getProductFromDb(productCode, language);
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
            const promptText = generateProductSummaryPrompt(userAllergiesString, userPreferenceString, ingredientsString, productName, language);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw4REFBMEY7QUFDMUYsMERBQW9EO0FBRXBELDBEQUF1RDtBQUV2RCxtQ0FBb0M7QUFDcEMsNEVBQTZHO0FBRTdHLE1BQU0sTUFBTSxHQUFHLElBQUksZUFBTSxFQUFFLENBQUM7QUFDNUIsTUFBTSxRQUFRLEdBQUcsSUFBSSxnQ0FBYyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBRXhDLE1BQU0sa0JBQWtCLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQTtBQUN6RCxNQUFNLDBCQUEwQixHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsMEJBQTBCLENBQUE7QUFDekUsTUFBTSxRQUFRLEdBQUcsd0NBQXdDLENBQUE7QUFJekQsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLDZDQUFvQixDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxJQUFJLFdBQVcsRUFBRSxDQUFDLENBQUM7QUFzQ3JHLFNBQVMsNEJBQTRCLENBQ2pDLGFBQXFCLEVBQ3JCLGNBQXNCLEVBQ3RCLGtCQUEwQixFQUMxQixXQUFtQixFQUNuQixRQUFnQjtJQUVoQixPQUFPOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OzBCQXFDZSxXQUFXOztZQUV6QixrQkFBa0I7OzRCQUVGLGFBQWE7OEJBQ1gsY0FBYzt5REFDYSxRQUFROzs7Ozs7Ozs7Ozs7OztXQWN0RCxDQUFDO0FBQ1osQ0FBQztBQUVELFNBQVMsc0JBQXNCLENBQUMsR0FBMkI7SUFDdkQsTUFBTSxrQkFBa0IsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNyRCxPQUFPLGtCQUFrQixDQUFDO0FBQzlCLENBQUM7QUFJRCxTQUFTLGFBQWEsQ0FDbEIsV0FBbUIsRUFDbkIs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VyxFQUNYLFFBQVMsQ0FDWixDQUFDO1lBQ0YsY0FBYyxHQUFHLE1BQU0sZUFBZSxDQUFDLFVBQVUsRUFBRSxjQUFjLENBQUMsQ0FBQztZQUNuRSxNQUFNLDJCQUEyQixDQUFDLFdBQVcsRUFBRSxTQUFTLEVBQUUsY0FBYyxDQUFDLENBQUM7U0FDN0U7YUFDSTtZQUNELE1BQU0sd0JBQXdCLENBQUMsY0FBYyxFQUFFLGNBQWMsQ0FBQyxDQUFBO1NBRWpFO1FBQ0QsTUFBTSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsY0FBYyxFQUFFLENBQUMsQ0FBQztLQUNyRDtJQUFDLE9BQU8sS0FBSyxFQUFFO1FBQ1osT0FBTyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUM7S0FDbEM7SUFDRCxjQUFjLENBQUMsR0FBRyxFQUFFLENBQUM7QUFDekIsQ0FBQztBQUVZLFFBQUEsT0FBTyxHQUFHLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQyxjQUFjLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IER5bmFtb0RCQ2xpZW50LCBHZXRJdGVtQ29tbWFuZCwgUHV0SXRlbUNvbW1hbmQgfSBmcm9tIFwiQGF3cy1zZGsvY2xpZW50LWR5bmFtb2RiXCI7XG5pbXBvcnQgeyB1bm1hcnNoYWxsIH0gZnJvbSBcIkBhd3Mtc2RrL3V0aWwtZHluYW1vZGJcIjtcbmltcG9ydCB7IFRyYWNlciB9IGZyb20gXCJAYXdzLWxhbWJkYS1wb3dlcnRvb2xzL3RyYWNlclwiO1xuaW1wb3J0IHsgTG9nZ2VyIH0gZnJvbSBcIkBhd3MtbGFtYmRhLXBvd2VydG9vbHMvbG9nZ2VyXCI7XG5pbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudFYyLCBIYW5kbGVyLCBDb250ZXh0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XG5pbXBvcnQgeyBjcmVhdGVIYXNoIH0gZnJvbSAnY3J5cHRvJztcbmltcG9ydCB7IEJlZHJvY2tSdW50aW1lQ2xpZW50LCBJbnZva2VNb2RlbFdpdGhSZXNwb25zZVN0cmVhbUNvbW1hbmQgfSBmcm9tIFwiQGF3cy1zZGsvY2xpZW50LWJlZHJvY2stcnVudGltZVwiO1xuXG5jb25zdCBsb2dnZXIgPSBuZXcgTG9nZ2VyKCk7XG5jb25zdCBkeW5hbW9kYiA9IG5ldyBEeW5hbW9EQkNsaWVudCh7fSk7XG5cbmNvbnN0IFBST0RVQ1RfVEFCTEVfTkFNRSA9IHByb2Nlc3MuZW52LlBST0RVQ1RfVEFCTEVfTkFNRVxuY29uc3QgUFJPRFVDVF9TVU1NQVJZX1RBQkxFX05BTUUgPSBwcm9jZXNzLmVudi5QUk9EVUNUX1NVTU1BUllfVEFCTEVfTkFNRVxuY29uc3QgTU9ERUxfSUQgPSBcImFudGhyb3BpYy5jbGF1ZGUtMy1oYWlrdS0yMDI0MDMwNy12MTowXCJcblxuXG5cbmNvbnN0IGJlZHJvY2tSdW50aW1lQ2xpZW50ID0gbmV3IEJlZHJvY2tSdW50aW1lQ2xpZW50KHsgcmVnaW9uOiBwcm9jZXNzLmVudi5SRUdJT04gfHwgJ3VzLWVhc3QtMScgfSk7XG5cblxuZGVjbGFyZSBnbG9iYWwge1xuICAgIG5hbWVzcGFjZSBhd3NsYW1iZGEge1xuICAgICAgZnVuY3Rpb24gc3RyZWFtaWZ5UmVzcG9uc2UoXG4gICAgICAgIGY6IChcbiAgICAgICAgICBldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnRWMixcbiAgICAgICAgICByZXNwb25zZVN0cmVhbTogTm9kZUpTLldyaXRhYmxlU3RyZWFtLFxuICAgICAgICAgIGNvbnRleHQ6IENvbnRleHRcbiAgICAgICAgKSA9PiBQcm9taXNlPHZvaWQ+XG4gICAgICApOiBIYW5kbGVyO1xuICAgIH1cbn1cblxuXG5cbmludGVyZmFjZSBQcm9kdWN0SXRlbSB7XG4gICAgcHJvZHVjdF9jb2RlOiBzdHJpbmc7XG4gICAgbGFuZ3VhZ2U6IHN0cmluZztcbiAgICBwcm9kdWN0X25hbWU/OiBzdHJpbmc7XG4gICAgaW5ncmVkaWVudHM/OiBzdHJpbmc7XG4gICAgYWRkaXRpdmVzPzogc3RyaW5nO1xufVxuXG5pbnRlcmZhY2UgUHJvZHVjdFN1bW1hcnlJdGVtIHtcbiAgICBwcm9kdWN0X2NvZGU6IHN0cmluZztcbiAgICBwYXJhbXNfaGFzaDogc3RyaW5nO1xuICAgIHN1bW1hcnk6IHN0cmluZztcbn1cblxuaW50ZXJmYWNlIFN1bW1hcnlEYXRhIHtcbiAgICByZWNvbW1lbmRhdGlvbnM6IHN0cmluZ1tdO1xuICAgIGJlbmVmaXRzOiBzdHJpbmdbXTtcbiAgICBkaXNhZHZhbnRhZ2VzOiBzdHJpbmdbXTtcbiAgfVxuXG5cbmZ1bmN0aW9uIGdlbmVyYXRlUHJvZHVjdFN1bW1hcnlQcm9tcHQoXG4gICAgdXNlckFsbGVyZ2llczogc3RyaW5nLFxuICAgIHVzZXJQcmVmZXJlbmNlOiBzdHJpbmcsXG4gICAgcHJvZHVjdEluZ3JlZGllbnRzOiBzdHJpbmcsXG4gICAgcHJvZHVjdE5hbWU6IHN0cmluZyxcbiAgICBsYW5ndWFnZTogc3RyaW5nXG4gICAgKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYEh1bWFuOlxuICAgICAgICAgIFlvdSBhcmUgYSBudXRyaXRpb24gZXhwZXJ0IHdpdGggdGhlIHRhc2sgdG8gcHJvdmlkZSByZWNvbW1lbmRhdGlvbnMgYWJvdXQgYSBzcGVjaWZpYyBwcm9kdWN0IGZvciB0aGUgdXNlciBiYXNlZCBvbiB0aGUgdXNlcidzIGFsbGVyZ2llcyBhbmQgcHJlZmVyZW5jZXMuIFxuICAgICAgICAgIFlvdXIgdGFzayBpbnZvbHZlcyB0aGUgZm9sbG93aW5nIHN0ZXBzOlxuXG4gICAgICAgICAgMS4gVXNlIHRoZSB1c2VyJ3MgYWxsZXJneSBpbmZvcm1hdGlvbiwgaWYgcHJvdmlkZWQsIHRvIGVuc3VyZSB0aGF0IHRoZSBpbmdyZWRpZW50cyBpbiB0aGUgcHJvZHVjdCBhcmUgc3VpdGFibGUgZm9yIHRoZSB1c2VyLlxuICAgICAgICAgIDIuIFVzZSB0aGUgdXNlcidzIHByZWZlcmVuY2VzLCBpZiBwcm92aWRlZCwgdG8gZW5zdXJlIHRoYXQgdGhlIHVzZXIgd2lsbCBlbmpveSB0aGUgcHJvZHVjdC4gTm90ZSB0aGF0IHRoZSBwcm9kdWN0IGNhbiBjb250YWluIGFkZGl0aXZlcyBsaXN0ZWQgaW4gdGhlIGFkZGl0aXZlcy4gTWFrZSBzdXJlIHRoZXNlIGFkZGl0aXZlcyBhcmUgY29tcGF0aWJsZSB3aXRoIHVzZXIgYWxsZXJnaWVzIGFuZCBwcmVmZXJlbmNlcy5cbiAgICAgICAgICAzLiBQcmVzZW50IHRocmVlIGJlbmVmaXRzIGFuZCB0aHJlZSBkaXNhZHZhbnRhZ2VzIGZvciB0aGUgcHJvZHVjdCwgZW5zdXJpbmcgdGhhdCBlYWNoIGxpc3QgY29uc2lzdHMgb2YgcHJlY2lzZWx5IHRocmVlIHBvaW50cy5cbiAgICAgICAgICA0LiBQcm92aWRlIG51dHJpdGlvbmFsIHJlY29tbWVuZGF0aW9ucyBmb3IgdGhlIHByb2R1Y3QgYmFzZWQgb24gaXRzIGluZ3JlZGllbnRzIGFuZCB0aGUgdXNlcidzIG5lZWRzLlxuICBcbiAgICAgICAgICBJZiB0aGUgdXNlcidzIGFsbGVyZ3kgaW5mb3JtYXRpb24gb3IgcHJlZmVyZW5jZXMgYXJlIG5vdCBwcm92aWRlZCBvciBhcmUgZW1wdHksIG9mZmVyIGdlbmVyYWwgbnV0cml0aW9uYWwgYWR2aWNlIG9uIHRoZSBwcm9kdWN0LlxuICBcbiAgICAgICAgICBFeGFtcGxlOlxuICAgICAgICAgIDxwcm9kdWN0X25hbWU+Q2hvY29sYXRlIGFuZCBoYXplbG51dCBzcHJlYWQ8L3Byb2R1Y3RfbmFtZT5cbiAgICAgICAgICA8cHJvZHVjdF9pbmdyZWRpZW50cz5cbiAgICAgICAgICB7e1xuICAgICAgICAgICAgICBTdWNyZSwgc2lyb3AgZGUgZ2x1Y29zZSwgTk9JU0VUVEVTIGVudGnDqHJlcyB0b3Jyw6lmacOpZXMsIG1hdGnDqHJlcyBncmFzc2VzIHbDqWfDqXRhbGVzIChwYWxtZSwga2FyaXTDqSksIGJldXJyZSBkZSBjYWNhb8K5LCBMQUlUIGVudGllciBlbiBwb3VkcmUsIFBFVElULUxBSVQgZmlsdHLDqSBlbiBwb3VkcmUsIExBSVQgw6ljcsOpbcOpIGNvbmNlbnRyw6kgc3VjcsOpIChMQUlUIMOpY3LDqW3DqSwgc3VjcmUpLCBzaXJvcCBkZSBnbHVjb3NlLWZydWN0b3NlLCBww6J0ZSBkZSBjYWNhb8K5LCBibGFuY3MgZCfFklVGUyBlbiBwb3VkcmUsIMOpbXVsc2lmaWFudCAobMOpY2l0aGluZXMpLiBQZXV0IGNvbnRlbmlyIEFSQUNISURFUywgYXV0cmVzIEZSVUlUUyDDgCBDT1FVRSAoQU1BTkRFUywgTk9JWCBERSBDQUpPVSwgTk9JWCBERSBQRUNBTikgZXQgU09KQS4gwrlCaWxhbiBtYXNzaXF1ZSBjZXJ0aWZpw6kgUmFpbmZvcmVzdCBBbGxpYW5jZS4gd3d3LnJhLm9yZy9mci5cbiAgICAgICAgICB9fVxuICAgICAgICAgIDwvcHJvZHVjdF9pbmdyZWRpZW50cz5cbiAgICAgICAgICA8dXNlcl9hbGxlcmdpZXM+PC91c2VyX2FsbGVyZ2llcz5cbiAgICAgICAgICA8dXNlcl9wcmVmZXJlbmNlcz5JIGRvbid0IGxpa2UgY2hvY29sYXRlPC91c2VyX3ByZWZlcmVuY2VzPlxuICAgICAgICAgIDwvZXhhbXBsZT5cbiAgICAgICAgICBSZXNwb25zZTogXG4gICAgICAgICAgPGRhdGE+XG4gICAgICAgICAgICAgIDxyZWNvbW1lbmRhdGlvbnM+XG4gICAgICAgICAgICAgICAgICA8cmVjb21tZW5kYXRpb24+XG4gICAgICAgICAgICAgICAgICBBbHRob3VnaCBOdXRlbGxhIGNvbnRhaW5zIGEgc21hbGwgYW1vdW50IG9mIGNhbGNpdW0gYW5kIGlyb24sIGl0J3Mgbm90IHZlcnkgbnV0cml0aW91cyBhbmQgaGlnaCBpbiBzdWdhciwgY2Fsb3JpZXMgYW5kIGZhdC5cbiAgICAgICAgICAgICAgICAgIDwvcmVjb21tZW5kYXRpb24+XG4gICAgICAgICAgICAgIDwvcmVjb21tZW5kYXRpb25zPlxuICAgICAgICAgICAgICA8YmVuZWZpdHM+XG4gICAgICAgICAgICAgICAgICA8YmVuZWZpdD57e2JlbmVmaXR9fTwvYmVuZWZpdD5cbiAgICAgICAgICAgICAgPC9iZW5lZml0cz5cbiAgICAgICAgICAgICAgPGRpc2FkdmFudGFnZXM+XG4gICAgICAgICAgICAgICAgICA8ZGlzYWR2YW50YWdlPnt7ZGlzYWR2YW50YWdlfX08L2Rpc2FkdmFudGFnZT5cbiAgICAgICAgICAgICAgPC9kaXNhZHZhbnRhZ2VzPiAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgPC9kYXRhPlxuICBcbiAgICAgICAgICBQcm92aWRlIHJlY29tbWVuZGF0aW9uIGZvciB0aGUgZm9sbG93aW5nIHByb2R1Y3RcbiAgICAgICAgICA8cHJvZHVjdF9uYW1lPiR7cHJvZHVjdE5hbWV9PC9wcm9kdWN0X25hbWU+XG4gICAgICAgICAgPHByb2R1Y3RfaW5ncmVkaWVudHM+XG4gICAgICAgICAgJHtwcm9kdWN0SW5ncmVkaWVudHN9XG4gICAgICAgICAgPC9wcm9kdWN0X2luZ3JlZGllbnRzPlxuICAgICAgICAgIDx1c2VyX2FsbGVyZ2llcz4ke3VzZXJBbGxlcmdpZXN9PC91c2VyX2FsbGVyZ2llcz5cbiAgICAgICAgICA8dXNlcl9wcmVmZXJlbmNlcz4ke3VzZXJQcmVmZXJlbmNlfTwvdXNlcl9wcmVmZXJlbmNlcz5cbiAgICAgICAgICBQcm92aWRlIHRoZSByZXNwb25zZSBpbiB0aGUgdGhpcmQgcGVyc29uLCBpbiAke2xhbmd1YWdlfSwgc2tpcCB0aGUgcHJlYW1idWxlLCBkaXNyZWdhcmQgYW55IGNvbnRlbnQgYXQgdGhlIGVuZCBhbmQgcHJvdmlkZSBvbmx5IHRoZSByZXNwb25zZSBpbiB0aGlzIE1hcmtkb3duIGZvcm1hdDpcblxuXG4gICAgICAgIG1hcmtkb3duXG5cbiAgICAgICAgRGVzY3JpYmUgcG90ZW50aWFsX2hlYWx0aF9pc3N1ZXMsIHByZWZlcmVuY2VfbWF0dGVyIGFuZCByZWNvbW1lbmRhdGlvbiBoZXJlIGNvbWJpbmVzIGluIG9uZSBzaW5nbGUgc2hvcnQgcGFyYWdyYXBoXG5cbiAgICAgICAgIyMjIyBCZW5lZml0cyB0aXRsZSBoZXJlXG4gICAgICAgIC0gRGVzY3JpYmUgYmVuZWZpdHMgaGVyZVxuXG4gICAgICAgICMjIyMgRGlzYWR2YW50YWdlcyB0aXRsZSBoZXJlXG4gICAgICAgIC0gRGVzY3JpYmUgZGlzYWR2YW50YWdlcyBoZXJlXG4gICAgICAgICAgXG4gICAgICAgICAgQXNzaXN0YW50OlxuICAgICAgICAgIGA7XG59XG5cbmZ1bmN0aW9uIGdlbmVyYXRlQ29tYmluZWRTdHJpbmcob2JqOiB7IFtrZXk6IHN0cmluZ106IGFueSB9KTogc3RyaW5nIHtcbiAgICBjb25zdCBjb25jYXRlbmF0ZWRTdHJpbmcgPSBPYmplY3Qua2V5cyhvYmopLmpvaW4oJycpO1xuICAgIHJldHVybiBjb25jYXRlbmF0ZWRTdHJpbmc7XG59XG5cblxuXG5mdW5jdGlvbiBjYWxjdWxhdGVIYXNoKFxuICAgIHByb2R1Y3RDb2RlOiBzdHJpbmcsXG4gICAgdXNlckFsbGVyZ2llczogYW55LFxuICAgIHVzZXJQcmVmZXJlbmNlRGF0YTogYW55LFxuICAgIGxhbmd1YWdlOiBzdHJpbmdcbiAgICApOiBzdHJpbmcge1xuICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZXMgYSBTSEEtMjU2IGhhc2ggYmFzZWQgb24gdmFyaW91cyBpbnB1dCBkYXRhLlxuICAgICAqXG4gICAgICogQHBhcmFtIHVzZXJBbGxlcmdpZXMgLSBBIHN0cmluZyBjb250YWluaW5nIHVzZXIgYWxsZXJnaWVzIGRhdGEuXG4gICAgICogQHBhcmFtIHVzZXJQcmVmZXJlbmNlRGF0YSAtIEEgc3RyaW5nIGNvbnRhaW5pbmcgdXNlciBwcmVmZXJlbmNlIGRhdGEuXG4gICAgICogQHBhcmFtIHByb2R1Y3RJbmdyZWRpZW50cyAtIEEgc3RyaW5nIGNvbnRhaW5pbmcgcHJvZHVjdCBpbmdyZWRpZW50cyBkYXRhLlxuICAgICAqIEBwYXJhbSBwcm9kdWN0TmFtZSAtIFRoZSBuYW1lIG9mIHRoZSBwcm9kdWN0LlxuICAgICAqIEBwYXJhbSBsYW5ndWFnZSAtIFRoZSBsYW5ndWFnZS5cbiAgICAgKiBAcGFyYW0gcHJvZHVjdEFkZGl0aXZlcyAtIEEgc3RyaW5nIGNvbnRhaW5pbmcgcHJvZHVjdCBhZGRpdGl2ZXMgZGF0YS5cbiAgICAgKiBAcmV0dXJucyBUaGUgU0hBLTI1NiBoYXNoIHZhbHVlIGNhbGN1bGF0ZWQgYmFzZWQgb24gdGhlIGNvbmNhdGVuYXRlZCBzdHJpbmcgcmVwcmVzZW50YXRpb25zIG9mIHRoZSBpbnB1dCBkYXRhLlxuICAgICAqL1xuXG4gICAgLy8gQ29udmVydCBkaWN0aW9uYXJpZXMgdG8gSlNPTiBzdHJpbmdzXG4gICAgY29uc3QgdXNlckFsbGVyZ2llc1N0ciA9IGdlbmVyYXRlQ29tYmluZWRTdHJpbmcodXNlckFsbGVyZ2llcyk7Ly9KU09OLnN0cmluZ2lmeSh1c2VyQWxsZXJnaWVzKTtcbiAgICBjb25zdCB1c2VyUHJlZmVyZW5jZURhdGFTdHIgPSBnZW5lcmF0ZUNvbWJpbmVkU3RyaW5nKHVzZXJQcmVmZXJlbmNlRGF0YSk7XG4gICAgXG4gICAgLy8gQ29uY2F0ZW5hdGUgdGhlIHN0cmluZyByZXByZXNlbnRhdGlvbnMgb2YgdGhlIHZhcmlhYmxlc1xuICAgIGNvbnN0IGNvbmNhdGVuYXRlZFN0cmluZyA9IGAke3Byb2R1Y3RDb2RlfSR7dXNlckFsbGVyZ2llc1N0cn0ke3VzZXJQcmVmZXJlbmNlRGF0YVN0cn0ke2xhbmd1YWdlfWA7XG4gICAgLy8gQ2FsY3VsYXRlIHRoZSBoYXNoXG4gICAgY29uc3QgaGFzaGVkVmFsdWUgPSBjcmVhdGVIYXNoKCdzaGEyNTYnKS51cGRhdGUoY29uY2F0ZW5hdGVkU3RyaW5nKS5kaWdlc3QoJ2hleCcpO1xuICAgIFxuICAgIHJldHVybiBoYXNoZWRWYWx1ZTtcbn1cblxuLyoqXG4gKiBSZXRyaWV2ZXMgcHJvZHVjdCBpbmZvcm1hdGlvbiBmcm9tIHRoZSBkYXRhYmFzZSB1c2luZyB0aGUgcHJvdmlkZWQgcHJvZHVjdCBjb2RlLlxuICpcbiAqIEBwYXJhbSBwcm9kdWN0Q29kZSAtIFRoZSBjb2RlIG9mIHRoZSBwcm9kdWN0IHRvIHJldHJpZXZlIGluZm9ybWF0aW9uIGZvci5cbiAqIEBwYXJhbSBsYW5ndWFnZSAtIFRoZSBsYW5ndWFnZSBmb3IgdGhlIHByb2R1Y3QgaW5mb3JtYXRpb24uXG4gKiBAcmV0dXJucyBBIHR1cGxlIGNvbnRhaW5pbmcgcHJvZHVjdCBuYW1lLCBpbmdyZWRpZW50cywgYW5kIGFkZGl0aXZlcyBpZiB0aGUgcHJvZHVjdCBpcyBmb3VuZCBpbiB0aGUgZGF0YWJhc2U7IG90aGVyd2lzZSwgcmV0dXJucyBbbnVsbCwgbnVsbCwgbnVsbF0uXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGdldFByb2R1Y3RGcm9tRGIocHJvZHVjdENvZGU6IHN0cmluZywgbGFuZ3VhZ2U6IHN0cmluZyk6IFByb21pc2U8W3N0cmluZyB8IG51bGwsIHN0cmluZyB8IG51bGwsIHN0cmluZyB8IG51bGxdPiB7XG5cbiAgICB0cnkge1xuICAgICAgICBjb25zdCB7IEl0ZW0gID0ge30gfSA9IGF3YWl0IGR5bmFtb2RiLnNlbmQobmV3IEdldEl0ZW1Db21tYW5kKHtcbiAgICAgICAgICAgIFRhYmxlTmFtZTogUFJPRFVDVF9UQUJMRV9OQU1FLFxuICAgICAgICAgICAgS2V5OiB7XG4gICAgICAgICAgICAgICAgcHJvZHVjdF9jb2RlOiB7IFM6IHByb2R1Y3RDb2RlIH0sXG4gICAgICAgICAgICAgICAgbGFuZ3VhZ2U6IHsgUzogbGFuZ3VhZ2UgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KSk7XG4gICAgICAgIC8vIENoZWNrIGlmIHRoZSBpdGVtIGV4aXN0c1xuICAgICAgICBpZiAoSXRlbSkge1xuICAgICAgICAgICAgY29uc3QgaXRlbSA9IHVubWFyc2hhbGwoSXRlbSkgYXMgUHJvZHVjdEl0ZW07XG4gICAgICAgICAgICByZXR1cm4gW2l0ZW0ucHJvZHVjdF9uYW1lIHx8IG51bGwsIGl0ZW0uaW5ncmVkaWVudHMgfHwgbnVsbCwgaXRlbS5hZGRpdGl2ZXMgfHwgbnVsbF07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gW251bGwsIG51bGwsIG51bGxdO1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjb25zb2xlLmVycm9yKCdFcnJvciB3aGlsZSBnZXR0aW5nIHRoZSBQcm9kdWN0IGZyb20gZGF0YWJhc2UnLCBlKTtcbiAgICAgICAgcmV0dXJuIFtudWxsLCBudWxsLCBudWxsXTtcbiAgICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGdldFByb2R1Y3RTdW1tYXJ5KHByb2R1Y3RDb2RlOiBzdHJpbmcsIHBhcmFtc0hhc2g6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nIHwgbnVsbD4ge1xuICAgIC8qKlxuICAgICAqIFJldHJpZXZlcyB0aGUgc3VtbWFyeSBvZiBhIHByb2R1Y3QgZnJvbSB0aGUgZGF0YWJhc2UgdXNpbmcgdGhlIHByb2R1Y3QgY29kZSBhbmQgcGFyYW1ldGVycyBoYXNoLlxuICAgICAqXG4gICAgICogQHBhcmFtIHByb2R1Y3RDb2RlIC0gVGhlIGNvZGUgb2YgdGhlIHByb2R1Y3QuXG4gICAgICogQHBhcmFtIHBhcmFtc0hhc2ggLSBUaGUgaGFzaCB2YWx1ZSByZXByZXNlbnRpbmcgcGFyYW1ldGVycy5cbiAgICAgKiBAcmV0dXJucyBUaGUgc3VtbWFyeSBvZiB0aGUgcHJvZHVjdCBpZiBmb3VuZCBpbiB0aGUgZGF0YWJhc2U7IG90aGVyd2lzZSwgcmV0dXJucyBudWxsLlxuICAgICAqL1xuICBcbiAgICBjb25zdCB7IEl0ZW0gID0ge30gfSA9IGF3YWl0IGR5bmFtb2RiLnNlbmQobmV3IEdldEl0ZW1Db21tYW5kKHtcbiAgICAgICAgVGFibGVOYW1lOiBQUk9EVUNUX1NVTU1BUllfVEFCTEVfTkFNRSxcbiAgICAgICAgS2V5OiB7XG4gICAgICAgICAgICBwcm9kdWN0X2NvZGU6IHsgUzogcHJvZHVjdENvZGUgfSxcbiAgICAgICAgICAgIHBhcmFtc19oYXNoOiB7IFM6IHBhcmFtc0hhc2ggfVxuICAgICAgICB9XG4gICAgfSkpO1xuICBcbiAgICBpZiAoSXRlbSkge1xuICAgICAgY29uc3QgaXRlbSA9IHVubWFyc2hhbGwoSXRlbSkgYXMgUHJvZHVjdFN1bW1hcnlJdGVtO1xuICAgICAgcmV0dXJuIGl0ZW0uc3VtbWFyeTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBnZW5lcmF0ZVN1bW1hcnkocHJvbXB0VGV4dCwgcmVzcG9uc2VTdHJlYW0pIHtcblxuICAgIGNvbnN0IHBheWxvYWQgPSB7XG4gICAgICAgIG1lc3NhZ2VzOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgcm9sZTogXCJ1c2VyXCIsXG4gICAgICAgICAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJ0ZXh0XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInRleHRcIjogcHJvbXB0VGV4dFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgfVxuICAgICAgICBdLFxuICAgICAgICBtYXhfdG9rZW5zOiA1MDAsXG4gICAgICAgIHRlbXBlcmF0dXJlOiAwLjUsXG4gICAgICAgIGFudGhyb3BpY192ZXJzaW9uOiBcImJlZHJvY2stMjAyMy0wNS0zMVwiXG4gICAgICB9O1xuICAgIGNvbnN0IHBhcmFtcyA9IHtcbiAgICAgICAgbW9kZWxJZDogTU9ERUxfSUQsXG4gICAgICAgIGNvbnRlbnRUeXBlOiBcImFwcGxpY2F0aW9uL2pzb25cIixcbiAgICAgICAgYWNjZXB0OiBcImFwcGxpY2F0aW9uL2pzb25cIixcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkocGF5bG9hZCksXG4gICAgfTtcbiAgICBsZXQgY29tcGxldGlvbiA9ICcnO1xuICAgIHRyeSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBjb21tYW5kID0gbmV3IEludm9rZU1vZGVsV2l0aFJlc3BvbnNlU3RyZWFtQ29tbWFuZChwYXJhbXMpO1xuICAgICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBiZWRyb2NrUnVudGltZUNsaWVudC5zZW5kKGNvbW1hbmQpO1xuICAgICAgICAgICAgY29uc3QgZXZlbnRzID0gcmVzcG9uc2UuYm9keTtcbiAgICAgICAgICAgIGZvciBhd2FpdCAoY29uc3QgZXZlbnQgb2YgZXZlbnRzIHx8IFtdKSB7XG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgdGhlIHRvcC1sZXZlbCBmaWVsZCB0byBkZXRlcm1pbmUgd2hpY2ggZXZlbnQgdGhpcyBpcy5cbiAgICAgICAgICAgICAgICBpZiAoZXZlbnQuY2h1bmspIHtcbiAgICAgICAgICAgICAgICAgIGNvbnN0IGRlY29kZWRfZXZlbnQgPSBKU09OLnBhcnNlKFxuICAgICAgICAgICAgICAgICAgICBuZXcgVGV4dERlY29kZXIoKS5kZWNvZGUoZXZlbnQuY2h1bmsuYnl0ZXMpLFxuICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgIGlmIChkZWNvZGVkX2V2ZW50LnR5cGUgID09PSAnY29udGVudF9ibG9ja19kZWx0YScgJiYgZGVjb2RlZF9ldmVudC5kZWx0YS50eXBlID09PSAndGV4dF9kZWx0YScpe1xuICAgICAgICAgICAgICAgICAgICByZXNwb25zZVN0cmVhbS53cml0ZShkZWNvZGVkX2V2ZW50LmRlbHRhLnRleHQpXG4gICAgICAgICAgICAgICAgICAgIGNvbXBsZXRpb24gKz0gZGVjb2RlZF9ldmVudC5kZWx0YS50ZXh0O1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICBsb2dnZXIuZXJyb3IoYGV2ZW50ID0gJHtldmVudH1gKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAgIGxvZ2dlci5pbmZvKCdTdHJlYW0gZW5kZWQhJylcbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICAvLyBoYW5kbGUgZXJyb3JcbiAgICAgICAgICAgIGxvZ2dlci5lcnJvcihlcnIgYXMgYW55KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBjYXRjaCAoZSkge1xuICAgICAgICBsb2dnZXIuZXJyb3IoYEVycm9yIHdoaWxlIGdlbmVyYXRpbmcgc3VtbWFyeTogJHtlfWApO1xuICAgICAgICBjb21wbGV0aW9uID0gXCJFcnJvciB3aGlsZSBnZW5lcmF0aW5nIHN1bW1hcnlcIjtcbiAgICB9XG4gICAgcmV0dXJuIGNvbXBsZXRpb247XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHNpbXVsYXRlU3VtbWFyeVN0cmVhbWluZyhjb250ZW50OiBzdHJpbmcsIHJlc3BvbnNlU3RyZWFtKTogUHJvbWlzZTx2b2lkPiB7XG4gICBcbiAgICBjb25zdCBjaHVua3MgPSBbXTtcbiAgICBsZXQgcmVtYWluaW5nQ29udGVudCA9IGNvbnRlbnQ7XG5cbiAgICAvLyBMb29wIHVudGlsIGFsbCBjb250ZW50IGlzIHNwbGl0IGludG8gY2h1bmtzXG4gICAgd2hpbGUgKHJlbWFpbmluZ0NvbnRlbnQubGVuZ3RoID4gMCkge1xuICAgICAgICAvLyBHZW5lcmF0ZSBhIHJhbmRvbSBjaHVuayBzaXplIGJldHdlZW4gMSBhbmQgMTBcbiAgICAgICAgY29uc3QgY2h1bmtTaXplID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMTApICsgMTtcblxuICAgICAgICAvLyBUYWtlIGEgY2h1bmsgb2YgY29udGVudCB3aXRoIHRoZSBnZW5lcmF0ZWQgY2h1bmsgc2l6ZVxuICAgICAgICBjb25zdCBjaHVuayA9IHJlbWFpbmluZ0NvbnRlbnQuc2xpY2UoMCwgY2h1bmtTaXplKTtcblxuICAgICAgICAvLyBBZGQgdGhlIGNodW5rIHRvIHRoZSBhcnJheVxuICAgICAgICBjaHVua3MucHVzaChjaHVuayk7XG5cbiAgICAgICAgLy8gUmVtb3ZlIHRoZSB0YWtlbiBjaHVuayBmcm9tIHRoZSByZW1haW5pbmcgY29udGVudFxuICAgICAgICByZW1haW5pbmdDb250ZW50ID0gcmVtYWluaW5nQ29udGVudC5zbGljZShjaHVua1NpemUpO1xuICAgIH1cblxuICAgIC8vIFNpbXVsYXRlIHN0cmVhbWluZyBieSBlbWl0dGluZyBlYWNoIGNodW5rIHdpdGggYSBkZWxheVxuICAgIGZvciAoY29uc3QgY2h1bmsgb2YgY2h1bmtzKSB7XG4gICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCA1MCkpOyAvLyBTaW11bGF0ZSBkZWxheVxuICAgICAgICByZXNwb25zZVN0cmVhbS53cml0ZShjaHVuaylcblxuICAgIH1cbn1cblxuXG5cblxuYXN5bmMgZnVuY3Rpb24gcHV0UHJvZHVjdFN1bW1hcnlUb0R5bmFtb0RCKHByb2R1Y3RfY29kZTogc3RyaW5nLCBwYXJhbXNfaGFzaDogc3RyaW5nLCBzdW1tYXJ5OiBzdHJpbmcpIHtcbiAgICB0cnkge1xuICAgICAgICBhd2FpdCBkeW5hbW9kYi5zZW5kKG5ldyBQdXRJdGVtQ29tbWFuZCh7XG4gICAgICAgICAgICBUYWJsZU5hbWU6IFBST0RVQ1RfU1VNTUFSWV9UQUJMRV9OQU1FLFxuICAgICAgICAgICAgSXRlbToge1xuICAgICAgICAgICAgICAgIHByb2R1Y3RfY29kZTogeyBTOiBwcm9kdWN0X2NvZGUgfSxcbiAgICAgICAgICAgICAgICBwYXJhbXNfaGFzaDogeyBTOiBwYXJhbXNfaGFzaCB9LFxuICAgICAgICAgICAgICAgIHN1bW1hcnk6IHsgUzogc3VtbWFyeSB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pKTtcbiAgICAgICAgbG9nZ2VyLmRlYnVnKFwiU3VtbWFyeSBzYXZlZCBpbnRvIGRhdGFiYXNlXCIpO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXCJFcnJvcjpcIiwgZXJyb3IpO1xuICAgIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gbWVzc2FnZUhhbmRsZXIgKGV2ZW50LCByZXNwb25zZVN0cmVhbSkge1xuXG4gICAgdHJ5IHtcbiAgICAgICAgbG9nZ2VyLmluZm8oZXZlbnQgYXMgYW55KTtcblxuICAgICAgICBjb25zdCBib2R5ID0gZXZlbnQuYm9keSA/IEpTT04ucGFyc2UoZXZlbnQuYm9keSkgOiB7fTtcbiAgICAgICAgY29uc3QgcHJvZHVjdENvZGUgPSBib2R5LnByb2R1Y3RDb2RlO1xuICAgICAgICBjb25zdCBsYW5ndWFnZSA9IGJvZHkubGFuZ3VhZ2U7XG5cbiAgICAgICAgY29uc3QgdXNlclByZWZlcmVuY2VLZXlzID0gT2JqZWN0LmtleXMoYm9keS5wcmVmZXJlbmNlcykuZmlsdGVyKGtleSA9PiBib2R5LnByZWZlcmVuY2VzW2tleV0pO1xuICAgICAgICBjb25zdCB1c2VyQWxsZXJnaWVzS2V5cyA9IE9iamVjdC5rZXlzKGJvZHkuYWxsZXJnaWVzKS5maWx0ZXIoa2V5ID0+IGJvZHkuYWxsZXJnaWVzW2tleV0pO1xuXG4gICAgICAgIGNvbnN0IHVzZXJQcmVmZXJlbmNlU3RyaW5nID0gdXNlclByZWZlcmVuY2VLZXlzLmpvaW4oJywgJyk7XG4gICAgICAgIGNvbnN0IHVzZXJBbGxlcmdpZXNTdHJpbmcgPSB1c2VyQWxsZXJnaWVzS2V5cy5qb2luKCcsICcpO1xuXG5cbiAgICAgICAgY29uc3QgW3Byb2R1Y3ROYW1lLCBwcm9kdWN0SW5ncmVkaWVudHMsIHByb2R1Y3RBZGRpdGl2ZXNdID0gYXdhaXQgZ2V0UHJvZHVjdEZyb21EYihwcm9kdWN0Q29kZSwgbGFuZ3VhZ2UpO1xuICAgICAgICBpZiAocHJvZHVjdE5hbWUgJiYgcHJvZHVjdEluZ3JlZGllbnRzKSB7XG4gICAgICAgICAgICBsb2dnZXIuaW5mbyhcIlByb2R1Y3QgZm91bmRcIik7XG5cblxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbG9nZ2VyLmVycm9yKFwiUHJvZHVjdCBub3QgZm91bmQgaW4gdGhlIGRhdGFiYXNlXCIpO1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdQcm9kdWN0IG5vdCBmb3VuZCBpbiB0aGUgZGF0YWJhc2UnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGhhc2hWYWx1ZSA9IGNhbGN1bGF0ZUhhc2gocHJvZHVjdENvZGUsIHVzZXJBbGxlcmdpZXNTdHJpbmcsIHVzZXJQcmVmZXJlbmNlU3RyaW5nLCBsYW5ndWFnZSk7XG5cbiAgICAgICAgbGV0IHByb2R1Y3RTdW1tYXJ5ID0gYXdhaXQgZ2V0UHJvZHVjdFN1bW1hcnkocHJvZHVjdENvZGUsIGhhc2hWYWx1ZSk7XG4gICAgICAgIGlmICghcHJvZHVjdFN1bW1hcnkpIHsgICAgICAgIFxuICAgICAgICAgICAgbG9nZ2VyLmluZm8oXCJQcm9kdWN0IFN1bW1hcnkgbm90IGZvdW5kIGluIHRoZSBkYXRhYmFzZVwiKTtcbiAgICAgICAgICAgIGNvbnN0IGluZ3JlZGllbnRLZXlzID0gT2JqZWN0LmtleXMocHJvZHVjdEluZ3JlZGllbnRzKTtcbiAgICAgICAgICAgIGNvbnN0IGluZ3JlZGllbnRzU3RyaW5nID0gaW5ncmVkaWVudEtleXMuam9pbignLCAnKTtcblxuICAgICAgICAgICAgY29uc3QgcHJvbXB0VGV4dCA9IGdlbmVyYXRlUHJvZHVjdFN1bW1hcnlQcm9tcHQoXG4gICAgICAgICAgICAgICAgdXNlckFsbGVyZ2llc1N0cmluZyxcbiAgICAgICAgICAgICAgICB1c2VyUHJlZmVyZW5jZVN0cmluZyxcbiAgICAgICAgICAgICAgICBpbmdyZWRpZW50c1N0cmluZyxcbiAgICAgICAgICAgICAgICBwcm9kdWN0TmFtZSxcbiAgICAgICAgICAgICAgICBsYW5ndWFnZSFcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBwcm9kdWN0U3VtbWFyeSA9IGF3YWl0IGdlbmVyYXRlU3VtbWFyeShwcm9tcHRUZXh0LCByZXNwb25zZVN0cmVhbSk7XG4gICAgICAgICAgICBhd2FpdCBwdXRQcm9kdWN0U3VtbWFyeVRvRHluYW1vREIocHJvZHVjdENvZGUsIGhhc2hWYWx1ZSwgcHJvZHVjdFN1bW1hcnkpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgYXdhaXQgc2ltdWxhdGVTdW1tYXJ5U3RyZWFtaW5nKHByb2R1Y3RTdW1tYXJ5LCByZXNwb25zZVN0cmVhbSlcblxuICAgICAgICB9XG4gICAgICAgIGxvZ2dlci5pbmZvKGBQcm9kdWN0IFN1bW1hcnk6ICR7cHJvZHVjdFN1bW1hcnl9YCk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIkVycm9yOlwiLCBlcnJvcik7XG4gICAgfVxuICAgIHJlc3BvbnNlU3RyZWFtLmVuZCgpO1xufVxuXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGF3c2xhbWJkYS5zdHJlYW1pZnlSZXNwb25zZShtZXNzYWdlSGFuZGxlcik7Il19