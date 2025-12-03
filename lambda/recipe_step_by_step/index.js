"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const tracer_1 = require("@aws-lambda-powertools/tracer");
const logger_1 = require("@aws-lambda-powertools/logger");
const client_bedrock_runtime_1 = require("@aws-sdk/client-bedrock-runtime");
const MODEL_ID = "anthropic.claude-3-haiku-20240307-v1:0";
const tracer = new tracer_1.Tracer();
const logger = new logger_1.Logger();
const bedrockRuntimeClient = new client_bedrock_runtime_1.BedrockRuntimeClient({ region: process.env.REGION || 'us-east-1' });
async function generateRecipeSteps(language, recipe, responseStream) {
    const systemPrompt = "Your task is to generate personalized recipe ideas based on the user's input of available ingredients and dietary preferences. Use this information to suggest a variety of creative and delicious recipes that can be made using the given ingredients while accommodating the user's dietary needs, if any are mentioned. For each recipe, provide a brief description, a list of required ingredients, and a simple set of instructions. Ensure that the recipes are easy to follow, nutritious, and can be prepared with minimal additional ingredients or equipment.";
    const promptText = `
    Recipee title:${recipe.title}
    Recipee description:${recipe.description}
    Available ingredients:${recipe.ingredients} ${recipe.optional_ingredients}
    
    Answer must be in the following markdown format:
    ### Step 1: [Step Title]
    - Action 1: [Action description] 
    - Action 2: [Action description]

    **Ingredients:** [Ingredient 1], [Ingredient 2], [Ingredient 3]

    ### Step 2: [Step Title]
    - Action 1: [Action description]
    - Action 2: [Action description]

    **Ingredients:** [Ingredient 1], [Ingredient 2]

    ### Step 3: [Step Title]
    - Action 1: [Action description]
    - Action 2: [Action description]

    **Ingredients:** [Ingredient 1], [Ingredient 2], [Ingredient 3], [Ingredient 4]

    Describe the actions in each step with detailed but concise descriptions, including ingredients needed, quantities, time, and any appliances required. Ensure your tone is engaging and friendly.
    
    Only use ingredients present in the provided recipe.

    Response must be in ${language}.

    Think step by step and elaborate your thoughts inside <thinking></thinking> then answer in a markdown format`;
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
        max_tokens: 1000,
        system: systemPrompt,
        temperature: 0.5,
        stop_sequences: ['</answer>'],
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
            let accumulating = true;
            let accumulatedChunks = '';
            const command = new client_bedrock_runtime_1.InvokeModelWithResponseStreamCommand(params);
            const response = await bedrockRuntimeClient.send(command);
            const events = response.body;
            for await (const event of events || []) {
                // Check the top-level field to determine which event this is.
                if (event.chunk) {
                    const decoded_event = JSON.parse(new TextDecoder().decode(event.chunk.bytes));
                    if (decoded_event.type === 'content_block_delta' && decoded_event.delta.type === 'text_delta') {
                        const text = decoded_event.delta.text;
                        console.log("text=" + text);
                        //responseStream.write(decoded_event.delta.text)
                        //accumulatedChunks += text;
                        logger.info(decoded_event.delta.text);
                        completion += decoded_event.delta.text;
                        if (accumulating) {
                            accumulatedChunks += text;
                            console.log("accumulatedChunks=" + accumulatedChunks);
                            if (accumulatedChunks.includes('</thinking>')) {
                                console.log("tag found");
                                accumulating = false;
                                const startIndex = accumulatedChunks.indexOf("</thinking>") + "</thinking>".length;
                                const remainingText = accumulatedChunks.substring(startIndex);
                                logger.info(remainingText);
                                responseStream.write(remainingText);
                            }
                        }
                        else {
                            console.log("responseStream write text=" + text);
                            responseStream.write(text);
                        }
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
async function messageHandler(event, responseStream) {
    try {
        logger.info(event);
        const body = event.body ? JSON.parse(event.body) : {};
        const language = body.language;
        const recipe = body.recipe;
        const recipeSteps = await generateRecipeSteps(language, recipe, responseStream);
        //await putProductSummaryToDynamoDB(productCode, hashValue, productSummary);
    }
    catch (error) {
        console.error("Error:", error);
    }
    responseStream.end();
}
exports.handler = awslambda.streamifyResponse(messageHandler);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSwwREFBdUQ7QUFDdkQsMERBQXVEO0FBR3ZELDRFQUE2RztBQWU3RyxNQUFNLFFBQVEsR0FBRyx3Q0FBd0MsQ0FBQTtBQUV6RCxNQUFNLE1BQU0sR0FBRyxJQUFJLGVBQU0sRUFBRSxDQUFDO0FBQzVCLE1BQU0sTUFBTSxHQUFHLElBQUksZUFBTSxFQUFFLENBQUM7QUFJNUIsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLDZDQUFvQixDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxJQUFJLFdBQVcsRUFBRSxDQUFDLENBQUM7QUFLckcsS0FBSyxVQUFVLG1CQUFtQixDQUFDLFFBQWdCLEVBQUUsTUFBTSxFQUFFLGNBQWM7SUFFdkUsTUFBTSxZQUFZLEdBQUcsMmlCQUEyaUIsQ0FBQztJQUdqa0IsTUFBTSxVQUFVLEdBQUc7b0JBQ0gsTUFBTSxDQUFDLEtBQUs7MEJBQ04sTUFBTSxDQUFDLFdBQVc7NEJBQ2hCLE1BQU0sQ0FBQyxXQUFXLElBQUksTUFBTSxDQUFDLG9CQUFvQjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OzswQkF5Qm5ELFFBQVE7O2lIQUUrRSxDQUFDO0lBRTlHLE1BQU0sT0FBTyxHQUFHO1FBQ1osUUFBUSxFQUFFO1lBQ047Z0JBQ0ksSUFBSSxFQUFFLE1BQU07Z0JBQ1osT0FBTyxFQUFFO29CQUNMO3dCQUNJLE1BQU0sRUFBRSxNQUFNO3dCQUNkLE1BQU0sRUFBRSxVQUFVO3FCQUNyQjtpQkFDSjthQUNKO1NBQ0o7UUFDRCxVQUFVLEVBQUUsSUFBSTtRQUNoQixNQUFNLEVBQUUsWUFBWTtRQUNwQixXQUFXLEVBQUUsR0FBRztRQUNoQixjQUFjLEVBQUUsQ0FBQyxXQUFXLENBQUM7UUFDN0IsaUJBQWlCLEVBQUUsb0JBQW9CO0tBQ3hDLENBQUM7SUFDSixNQUFNLE1BQU0sR0FBRztR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QyxDQUFDO0tBQ2pEO0lBQ0QsT0FBTyxVQUFVLENBQUM7QUFDdEIsQ0FBQztBQUlELEtBQUssVUFBVSxjQUFjLENBQUUsS0FBSyxFQUFFLGNBQWM7SUFFaEQsSUFBSTtRQUNBLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBWSxDQUFDLENBQUM7UUFFMUIsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUN0RCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDO1FBQy9CLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7UUFDM0IsTUFBTSxXQUFXLEdBQUcsTUFBTSxtQkFBbUIsQ0FBQyxRQUFRLEVBQUUsTUFBTSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQ2hGLDRFQUE0RTtLQUUvRTtJQUFDLE9BQU8sS0FBSyxFQUFFO1FBQ1osT0FBTyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUM7S0FDbEM7SUFDRCxjQUFjLENBQUMsR0FBRyxFQUFFLENBQUM7QUFDekIsQ0FBQztBQUVZLFFBQUEsT0FBTyxHQUFHLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQyxjQUFjLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFRyYWNlciB9IGZyb20gXCJAYXdzLWxhbWJkYS1wb3dlcnRvb2xzL3RyYWNlclwiO1xuaW1wb3J0IHsgTG9nZ2VyIH0gZnJvbSBcIkBhd3MtbGFtYmRhLXBvd2VydG9vbHMvbG9nZ2VyXCI7XG5pbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudFYyLCBIYW5kbGVyLCBDb250ZXh0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XG5pbXBvcnQgeyBjcmVhdGVIYXNoIH0gZnJvbSAnY3J5cHRvJztcbmltcG9ydCB7IEJlZHJvY2tSdW50aW1lQ2xpZW50LCBJbnZva2VNb2RlbFdpdGhSZXNwb25zZVN0cmVhbUNvbW1hbmQgfSBmcm9tIFwiQGF3cy1zZGsvY2xpZW50LWJlZHJvY2stcnVudGltZVwiO1xuXG5kZWNsYXJlIGdsb2JhbCB7XG4gICAgbmFtZXNwYWNlIGF3c2xhbWJkYSB7XG4gICAgICBmdW5jdGlvbiBzdHJlYW1pZnlSZXNwb25zZShcbiAgICAgICAgZjogKFxuICAgICAgICAgIGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudFYyLFxuICAgICAgICAgIHJlc3BvbnNlU3RyZWFtOiBOb2RlSlMuV3JpdGFibGVTdHJlYW0sXG4gICAgICAgICAgY29udGV4dDogQ29udGV4dFxuICAgICAgICApID0+IFByb21pc2U8dm9pZD5cbiAgICAgICk6IEhhbmRsZXI7XG4gICAgfVxufVxuXG5cbmNvbnN0IE1PREVMX0lEID0gXCJhbnRocm9waWMuY2xhdWRlLTMtaGFpa3UtMjAyNDAzMDctdjE6MFwiXG5cbmNvbnN0IHRyYWNlciA9IG5ldyBUcmFjZXIoKTtcbmNvbnN0IGxvZ2dlciA9IG5ldyBMb2dnZXIoKTtcblxuXG5cbmNvbnN0IGJlZHJvY2tSdW50aW1lQ2xpZW50ID0gbmV3IEJlZHJvY2tSdW50aW1lQ2xpZW50KHsgcmVnaW9uOiBwcm9jZXNzLmVudi5SRUdJT04gfHwgJ3VzLWVhc3QtMScgfSk7XG5cblxuXG5cbmFzeW5jIGZ1bmN0aW9uIGdlbmVyYXRlUmVjaXBlU3RlcHMobGFuZ3VhZ2U6IHN0cmluZywgcmVjaXBlLCByZXNwb25zZVN0cmVhbSkge1xuXG4gICAgY29uc3Qgc3lzdGVtUHJvbXB0ID0gXCJZb3VyIHRhc2sgaXMgdG8gZ2VuZXJhdGUgcGVyc29uYWxpemVkIHJlY2lwZSBpZGVhcyBiYXNlZCBvbiB0aGUgdXNlcidzIGlucHV0IG9mIGF2YWlsYWJsZSBpbmdyZWRpZW50cyBhbmQgZGlldGFyeSBwcmVmZXJlbmNlcy4gVXNlIHRoaXMgaW5mb3JtYXRpb24gdG8gc3VnZ2VzdCBhIHZhcmlldHkgb2YgY3JlYXRpdmUgYW5kIGRlbGljaW91cyByZWNpcGVzIHRoYXQgY2FuIGJlIG1hZGUgdXNpbmcgdGhlIGdpdmVuIGluZ3JlZGllbnRzIHdoaWxlIGFjY29tbW9kYXRpbmcgdGhlIHVzZXIncyBkaWV0YXJ5IG5lZWRzLCBpZiBhbnkgYXJlIG1lbnRpb25lZC4gRm9yIGVhY2ggcmVjaXBlLCBwcm92aWRlIGEgYnJpZWYgZGVzY3JpcHRpb24sIGEgbGlzdCBvZiByZXF1aXJlZCBpbmdyZWRpZW50cywgYW5kIGEgc2ltcGxlIHNldCBvZiBpbnN0cnVjdGlvbnMuIEVuc3VyZSB0aGF0IHRoZSByZWNpcGVzIGFyZSBlYXN5IHRvIGZvbGxvdywgbnV0cml0aW91cywgYW5kIGNhbiBiZSBwcmVwYXJlZCB3aXRoIG1pbmltYWwgYWRkaXRpb25hbCBpbmdyZWRpZW50cyBvciBlcXVpcG1lbnQuXCI7XG5cblxuICAgIGNvbnN0IHByb21wdFRleHQgPSBgXG4gICAgUmVjaXBlZSB0aXRsZToke3JlY2lwZS50aXRsZX1cbiAgICBSZWNpcGVlIGRlc2NyaXB0aW9uOiR7cmVjaXBlLmRlc2NyaXB0aW9ufVxuICAgIEF2YWlsYWJsZSBpbmdyZWRpZW50czoke3JlY2lwZS5pbmdyZWRpZW50c30gJHtyZWNpcGUub3B0aW9uYWxfaW5ncmVkaWVudHN9XG4gICAgXG4gICAgQW5zd2VyIG11c3QgYmUgaW4gdGhlIGZvbGxvd2luZyBtYXJrZG93biBmb3JtYXQ6XG4gICAgIyMjIFN0ZXAgMTogW1N0ZXAgVGl0bGVdXG4gICAgLSBBY3Rpb24gMTogW0FjdGlvbiBkZXNjcmlwdGlvbl0gXG4gICAgLSBBY3Rpb24gMjogW0FjdGlvbiBkZXNjcmlwdGlvbl1cblxuICAgICoqSW5ncmVkaWVudHM6KiogW0luZ3JlZGllbnQgMV0sIFtJbmdyZWRpZW50IDJdLCBbSW5ncmVkaWVudCAzXVxuXG4gICAgIyMjIFN0ZXAgMjogW1N0ZXAgVGl0bGVdXG4gICAgLSBBY3Rpb24gMTogW0FjdGlvbiBkZXNjcmlwdGlvbl1cbiAgICAtIEFjdGlvbiAyOiBbQWN0aW9uIGRlc2NyaXB0aW9uXVxuXG4gICAgKipJbmdyZWRpZW50czoqKiBbSW5ncmVkaWVudCAxXSwgW0luZ3JlZGllbnQgMl1cblxuICAgICMjIyBTdGVwIDM6IFtTdGVwIFRpdGxlXVxuICAgIC0gQWN0aW9uIDE6IFtBY3Rpb24gZGVzY3JpcHRpb25dXG4gICAgLSBBY3Rpb24gMjogW0FjdGlvbiBkZXNjcmlwdGlvbl1cblxuICAgICoqSW5ncmVkaWVudHM6KiogW0luZ3JlZGllbnQgMV0sIFtJbmdyZWRpZW50IDJdLCBbSW5ncmVkaWVudCAzXSwgW0luZ3JlZGllbnQgNF1cblxuICAgIERlc2NyaWJlIHRoZSBhY3Rpb25zIGluIGVhY2ggc3RlcCB3aXRoIGRldGFpbGVkIGJ1dCBjb25jaXNlIGRlc2NyaXB0aW9ucywgaW5jbHVkaW5nIGluZ3JlZGllbnRzIG5lZWRlZCwgcXVhbnRpdGllcywgdGltZSwgYW5kIGFueSBhcHBsaWFuY2VzIHJlcXVpcmVkLiBFbnN1cmUgeW91ciB0b25lIGlzIGVuZ2FnaW5nIGFuZCBmcmllbmRseS5cbiAgICBcbiAgICBPbmx5IHVzZSBpbmdyZWRpZW50cyBwcmVzZW50IGluIHRoZSBwcm92aWRlZCByZWNpcGUuXG5cbiAgICBSZXNwb25zZSBtdXN0IGJlIGluICR7bGFuZ3VhZ2V9LlxuXG4gICAgVGhpbmsgc3RlcCBieSBzdGVwIGFuZCBlbGFib3JhdGUgeW91ciB0aG91Z2h0cyBpbnNpZGUgPHRoaW5raW5nPjwvdGhpbmtpbmc+IHRoZW4gYW5zd2VyIGluIGEgbWFya2Rvd24gZm9ybWF0YDtcblxuICAgIGNvbnN0IHBheWxvYWQgPSB7XG4gICAgICAgIG1lc3NhZ2VzOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgcm9sZTogXCJ1c2VyXCIsXG4gICAgICAgICAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJ0ZXh0XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInRleHRcIjogcHJvbXB0VGV4dFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgfVxuICAgICAgICBdLFxuICAgICAgICBtYXhfdG9rZW5zOiAxMDAwLFxuICAgICAgICBzeXN0ZW06IHN5c3RlbVByb21wdCxcbiAgICAgICAgdGVtcGVyYXR1cmU6IDAuNSxcbiAgICAgICAgc3RvcF9zZXF1ZW5jZXM6IFsnPC9hbnN3ZXI+J10sXG4gICAgICAgIGFudGhyb3BpY192ZXJzaW9uOiBcImJlZHJvY2stMjAyMy0wNS0zMVwiXG4gICAgICB9O1xuICAgIGNvbnN0IHBhcmFtcyA9IHtcbiAgICAgICAgbW9kZWxJZDogTU9ERUxfSUQsXG4gICAgICAgIGNvbnRlbnRUeXBlOiBcImFwcGxpY2F0aW9uL2pzb25cIixcbiAgICAgICAgYWNjZXB0OiBcImFwcGxpY2F0aW9uL2pzb25cIixcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkocGF5bG9hZCksXG4gICAgfTtcbiAgICBsZXQgY29tcGxldGlvbiA9ICcnO1xuICAgIHRyeSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBsZXQgYWNjdW11bGF0aW5nID0gdHJ1ZTtcbiAgICAgICAgICAgIGxldCBhY2N1bXVsYXRlZENodW5rcyA9ICcnO1xuICAgICAgICAgICAgY29uc3QgY29tbWFuZCA9IG5ldyBJbnZva2VNb2RlbFdpdGhSZXNwb25zZVN0cmVhbUNvbW1hbmQocGFyYW1zKTtcbiAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgYmVkcm9ja1J1bnRpbWVDbGllbnQuc2VuZChjb21tYW5kKTtcbiAgICAgICAgICAgIGNvbnN0IGV2ZW50cyA9IHJlc3BvbnNlLmJvZHk7XG4gICAgICAgICAgICBmb3IgYXdhaXQgKGNvbnN0IGV2ZW50IG9mIGV2ZW50cyB8fCBbXSkge1xuICAgICAgICAgICAgICAgIC8vIENoZWNrIHRoZSB0b3AtbGV2ZWwgZmllbGQgdG8gZGV0ZXJtaW5lIHdoaWNoIGV2ZW50IHRoaXMgaXMuXG4gICAgICAgICAgICAgICAgaWYgKGV2ZW50LmNodW5rKSB7XG4gICAgICAgICAgICAgICAgICBjb25zdCBkZWNvZGVkX2V2ZW50ID0gSlNPTi5wYXJzZShcbiAgICAgICAgICAgICAgICAgICAgbmV3IFRleHREZWNvZGVyKCkuZGVjb2RlKGV2ZW50LmNodW5rLmJ5dGVzKSxcbiAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICBpZiAoZGVjb2RlZF9ldmVudC50eXBlICA9PT0gJ2NvbnRlbnRfYmxvY2tfZGVsdGEnICYmIGRlY29kZWRfZXZlbnQuZGVsdGEudHlwZSA9PT0gJ3RleHRfZGVsdGEnKXtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRleHQgPSBkZWNvZGVkX2V2ZW50LmRlbHRhLnRleHQ7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwidGV4dD1cIit0ZXh0KVxuXG4gICAgICAgICAgICAgICAgICAgIC8vcmVzcG9uc2VTdHJlYW0ud3JpdGUoZGVjb2RlZF9ldmVudC5kZWx0YS50ZXh0KVxuICAgICAgICAgICAgICAgICAgICAvL2FjY3VtdWxhdGVkQ2h1bmtzICs9IHRleHQ7XG4gICAgICAgICAgICAgICAgICAgIGxvZ2dlci5pbmZvKGRlY29kZWRfZXZlbnQuZGVsdGEudGV4dCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbXBsZXRpb24gKz0gZGVjb2RlZF9ldmVudC5kZWx0YS50ZXh0O1xuXG4gICAgICAgICAgICAgICAgICAgIGlmKGFjY3VtdWxhdGluZyl7XG4gICAgICAgICAgICAgICAgICAgICAgICBhY2N1bXVsYXRlZENodW5rcyArPSB0ZXh0O1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJhY2N1bXVsYXRlZENodW5rcz1cIithY2N1bXVsYXRlZENodW5rcylcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhY2N1bXVsYXRlZENodW5rcy5pbmNsdWRlcygnPC90aGlua2luZz4nKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwidGFnIGZvdW5kXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWNjdW11bGF0aW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3RhcnRJbmRleCA9IGFjY3VtdWxhdGVkQ2h1bmtzLmluZGV4T2YoXCI8L3RoaW5raW5nPlwiKSArIFwiPC90aGlua2luZz5cIi5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVtYWluaW5nVGV4dCA9IGFjY3VtdWxhdGVkQ2h1bmtzLnN1YnN0cmluZyhzdGFydEluZGV4KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2dnZXIuaW5mbyhyZW1haW5pbmdUZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNwb25zZVN0cmVhbS53cml0ZShyZW1haW5pbmdUZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcInJlc3BvbnNlU3RyZWFtIHdyaXRlIHRleHQ9XCIrdGV4dClcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlU3RyZWFtLndyaXRlKHRleHQpXG4gICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICB9XG5cblxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICBsb2dnZXIuZXJyb3IoYGV2ZW50ID0gJHtldmVudH1gKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBcbiAgICAgICAgICAgICAgbG9nZ2VyLmluZm8oJ1N0cmVhbSBlbmRlZCEnKVxuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgIC8vIGhhbmRsZSBlcnJvclxuICAgICAgICAgICAgbG9nZ2VyLmVycm9yKGVyciBhcyBhbnkpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGNhdGNoIChlKSB7XG4gICAgICAgIGxvZ2dlci5lcnJvcihgRXJyb3Igd2hpbGUgZ2VuZXJhdGluZyBzdW1tYXJ5OiAke2V9YCk7XG4gICAgICAgIGNvbXBsZXRpb24gPSBcIkVycm9yIHdoaWxlIGdlbmVyYXRpbmcgc3VtbWFyeVwiO1xuICAgIH1cbiAgICByZXR1cm4gY29tcGxldGlvbjtcbn1cblxuXG5cbmFzeW5jIGZ1bmN0aW9uIG1lc3NhZ2VIYW5kbGVyIChldmVudCwgcmVzcG9uc2VTdHJlYW0pIHtcblxuICAgIHRyeSB7XG4gICAgICAgIGxvZ2dlci5pbmZvKGV2ZW50IGFzIGFueSk7XG5cbiAgICAgICAgY29uc3QgYm9keSA9IGV2ZW50LmJvZHkgPyBKU09OLnBhcnNlKGV2ZW50LmJvZHkpIDoge307XG4gICAgICAgIGNvbnN0IGxhbmd1YWdlID0gYm9keS5sYW5ndWFnZTtcbiAgICAgICAgY29uc3QgcmVjaXBlID0gYm9keS5yZWNpcGU7XG4gICAgICAgIGNvbnN0IHJlY2lwZVN0ZXBzID0gYXdhaXQgZ2VuZXJhdGVSZWNpcGVTdGVwcyhsYW5ndWFnZSwgcmVjaXBlLCByZXNwb25zZVN0cmVhbSk7XG4gICAgICAgIC8vYXdhaXQgcHV0UHJvZHVjdFN1bW1hcnlUb0R5bmFtb0RCKHByb2R1Y3RDb2RlLCBoYXNoVmFsdWUsIHByb2R1Y3RTdW1tYXJ5KTtcbiAgICAgICAgXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIkVycm9yOlwiLCBlcnJvcik7XG4gICAgfVxuICAgIHJlc3BvbnNlU3RyZWFtLmVuZCgpO1xufVxuXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGF3c2xhbWJkYS5zdHJlYW1pZnlSZXNwb25zZShtZXNzYWdlSGFuZGxlcik7Il19