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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSwwREFBdUQ7QUFDdkQsMERBQXVEO0FBR3ZELDRFQUE2RztBQWU3RyxNQUFNLFFBQVEsR0FBRyx3Q0FBd0MsQ0FBQTtBQUV6RCxNQUFNLE1BQU0sR0FBRyxJQUFJLGVBQU0sRUFBRSxDQUFDO0FBQzVCLE1BQU0sTUFBTSxHQUFHLElBQUksZUFBTSxFQUFFLENBQUM7QUFJNUIsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLDZDQUFvQixDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxJQUFJLFdBQVcsRUFBRSxDQUFDLENBQUM7QUFLckcsS0FBSyxVQUFVLG1CQUFtQixDQUFDLFFBQWdCLEVBQUUsTUFBVyxFQUFFLGNBQXFDO0lBRW5HLE1BQU0sWUFBWSxHQUFHLDJpQkFBMmlCLENBQUM7SUFHamtCLE1BQU0sVUFBVSxHQUFHO29CQUNILE1BQU0sQ0FBQyxLQUFLOzBCQUNOLE1BQU0sQ0FBQyxXQUFXOzRCQUNoQixNQUFNLENBQUMsV0FBVyxJQUFJLE1BQU0sQ0FBQyxvQkFBb0I7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7MEJBeUJuRCxRQUFROztpSEFFK0UsQ0FBQztJQUU5RyxNQUFNLE9BQU8sR0FBRztRQUNaLFFBQVEsRUFBRTtZQUNOO2dCQUNJLElBQUksRUFBRSxNQUFNO2dCQUNaLE9BQU8sRUFBRTtvQkFDTDt3QkFDSSxNQUFNLEVBQUUsTUFBTTt3QkFDZCxNQUFNLEVBQUUsVUFBVTtxQkFDckI7aUJBQ0o7YUFDSjtTQUNKO1FBQ0QsVUFBVSxFQUFFLElBQUk7UUFDaEIsTUFBTSxFQUFFLFlBQVk7UUFDcEIsV0FBVyxFQUFFLEdBQUc7UUFDaEIsY0FBYyxFQUFFLENBQUMsV0FBVyxDQUFDO1FBQzdCLGlCQUFpQixFQUFFLG9CQUFvQjtLQUN4QyxDQUFDO0lBQ0osTUFBTSxNQUFNLEdBQUc7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Z0MsQ0FBQztLQUNqRDtJQUNELE9BQU8sVUFBVSxDQUFDO0FBQ3RCLENBQUM7QUFJRCxLQUFLLFVBQVUsY0FBYyxDQUFFLEtBQTZCLEVBQUUsY0FBcUM7SUFFL0YsSUFBSTtRQUNBLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBWSxDQUFDLENBQUM7UUFFMUIsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUN0RCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDO1FBQy9CLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7UUFDM0IsTUFBTSxXQUFXLEdBQUcsTUFBTSxtQkFBbUIsQ0FBQyxRQUFRLEVBQUUsTUFBTSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQ2hGLDRFQUE0RTtLQUUvRTtJQUFDLE9BQU8sS0FBSyxFQUFFO1FBQ1osT0FBTyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUM7S0FDbEM7SUFDRCxjQUFjLENBQUMsR0FBRyxFQUFFLENBQUM7QUFDekIsQ0FBQztBQUVZLFFBQUEsT0FBTyxHQUFHLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQyxjQUFjLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFRyYWNlciB9IGZyb20gXCJAYXdzLWxhbWJkYS1wb3dlcnRvb2xzL3RyYWNlclwiO1xuaW1wb3J0IHsgTG9nZ2VyIH0gZnJvbSBcIkBhd3MtbGFtYmRhLXBvd2VydG9vbHMvbG9nZ2VyXCI7XG5pbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudFYyLCBIYW5kbGVyLCBDb250ZXh0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XG5pbXBvcnQgeyBjcmVhdGVIYXNoIH0gZnJvbSAnY3J5cHRvJztcbmltcG9ydCB7IEJlZHJvY2tSdW50aW1lQ2xpZW50LCBJbnZva2VNb2RlbFdpdGhSZXNwb25zZVN0cmVhbUNvbW1hbmQgfSBmcm9tIFwiQGF3cy1zZGsvY2xpZW50LWJlZHJvY2stcnVudGltZVwiO1xuXG5kZWNsYXJlIGdsb2JhbCB7XG4gICAgbmFtZXNwYWNlIGF3c2xhbWJkYSB7XG4gICAgICBmdW5jdGlvbiBzdHJlYW1pZnlSZXNwb25zZShcbiAgICAgICAgZjogKFxuICAgICAgICAgIGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudFYyLFxuICAgICAgICAgIHJlc3BvbnNlU3RyZWFtOiBOb2RlSlMuV3JpdGFibGVTdHJlYW0sXG4gICAgICAgICAgY29udGV4dDogQ29udGV4dFxuICAgICAgICApID0+IFByb21pc2U8dm9pZD5cbiAgICAgICk6IEhhbmRsZXI7XG4gICAgfVxufVxuXG5cbmNvbnN0IE1PREVMX0lEID0gXCJhbnRocm9waWMuY2xhdWRlLTMtaGFpa3UtMjAyNDAzMDctdjE6MFwiXG5cbmNvbnN0IHRyYWNlciA9IG5ldyBUcmFjZXIoKTtcbmNvbnN0IGxvZ2dlciA9IG5ldyBMb2dnZXIoKTtcblxuXG5cbmNvbnN0IGJlZHJvY2tSdW50aW1lQ2xpZW50ID0gbmV3IEJlZHJvY2tSdW50aW1lQ2xpZW50KHsgcmVnaW9uOiBwcm9jZXNzLmVudi5SRUdJT04gfHwgJ3VzLWVhc3QtMScgfSk7XG5cblxuXG5cbmFzeW5jIGZ1bmN0aW9uIGdlbmVyYXRlUmVjaXBlU3RlcHMobGFuZ3VhZ2U6IHN0cmluZywgcmVjaXBlOiBhbnksIHJlc3BvbnNlU3RyZWFtOiBOb2RlSlMuV3JpdGFibGVTdHJlYW0pIHtcblxuICAgIGNvbnN0IHN5c3RlbVByb21wdCA9IFwiWW91ciB0YXNrIGlzIHRvIGdlbmVyYXRlIHBlcnNvbmFsaXplZCByZWNpcGUgaWRlYXMgYmFzZWQgb24gdGhlIHVzZXIncyBpbnB1dCBvZiBhdmFpbGFibGUgaW5ncmVkaWVudHMgYW5kIGRpZXRhcnkgcHJlZmVyZW5jZXMuIFVzZSB0aGlzIGluZm9ybWF0aW9uIHRvIHN1Z2dlc3QgYSB2YXJpZXR5IG9mIGNyZWF0aXZlIGFuZCBkZWxpY2lvdXMgcmVjaXBlcyB0aGF0IGNhbiBiZSBtYWRlIHVzaW5nIHRoZSBnaXZlbiBpbmdyZWRpZW50cyB3aGlsZSBhY2NvbW1vZGF0aW5nIHRoZSB1c2VyJ3MgZGlldGFyeSBuZWVkcywgaWYgYW55IGFyZSBtZW50aW9uZWQuIEZvciBlYWNoIHJlY2lwZSwgcHJvdmlkZSBhIGJyaWVmIGRlc2NyaXB0aW9uLCBhIGxpc3Qgb2YgcmVxdWlyZWQgaW5ncmVkaWVudHMsIGFuZCBhIHNpbXBsZSBzZXQgb2YgaW5zdHJ1Y3Rpb25zLiBFbnN1cmUgdGhhdCB0aGUgcmVjaXBlcyBhcmUgZWFzeSB0byBmb2xsb3csIG51dHJpdGlvdXMsIGFuZCBjYW4gYmUgcHJlcGFyZWQgd2l0aCBtaW5pbWFsIGFkZGl0aW9uYWwgaW5ncmVkaWVudHMgb3IgZXF1aXBtZW50LlwiO1xuXG5cbiAgICBjb25zdCBwcm9tcHRUZXh0ID0gYFxuICAgIFJlY2lwZWUgdGl0bGU6JHtyZWNpcGUudGl0bGV9XG4gICAgUmVjaXBlZSBkZXNjcmlwdGlvbjoke3JlY2lwZS5kZXNjcmlwdGlvbn1cbiAgICBBdmFpbGFibGUgaW5ncmVkaWVudHM6JHtyZWNpcGUuaW5ncmVkaWVudHN9ICR7cmVjaXBlLm9wdGlvbmFsX2luZ3JlZGllbnRzfVxuICAgIFxuICAgIEFuc3dlciBtdXN0IGJlIGluIHRoZSBmb2xsb3dpbmcgbWFya2Rvd24gZm9ybWF0OlxuICAgICMjIyBTdGVwIDE6IFtTdGVwIFRpdGxlXVxuICAgIC0gQWN0aW9uIDE6IFtBY3Rpb24gZGVzY3JpcHRpb25dIFxuICAgIC0gQWN0aW9uIDI6IFtBY3Rpb24gZGVzY3JpcHRpb25dXG5cbiAgICAqKkluZ3JlZGllbnRzOioqIFtJbmdyZWRpZW50IDFdLCBbSW5ncmVkaWVudCAyXSwgW0luZ3JlZGllbnQgM11cblxuICAgICMjIyBTdGVwIDI6IFtTdGVwIFRpdGxlXVxuICAgIC0gQWN0aW9uIDE6IFtBY3Rpb24gZGVzY3JpcHRpb25dXG4gICAgLSBBY3Rpb24gMjogW0FjdGlvbiBkZXNjcmlwdGlvbl1cblxuICAgICoqSW5ncmVkaWVudHM6KiogW0luZ3JlZGllbnQgMV0sIFtJbmdyZWRpZW50IDJdXG5cbiAgICAjIyMgU3RlcCAzOiBbU3RlcCBUaXRsZV1cbiAgICAtIEFjdGlvbiAxOiBbQWN0aW9uIGRlc2NyaXB0aW9uXVxuICAgIC0gQWN0aW9uIDI6IFtBY3Rpb24gZGVzY3JpcHRpb25dXG5cbiAgICAqKkluZ3JlZGllbnRzOioqIFtJbmdyZWRpZW50IDFdLCBbSW5ncmVkaWVudCAyXSwgW0luZ3JlZGllbnQgM10sIFtJbmdyZWRpZW50IDRdXG5cbiAgICBEZXNjcmliZSB0aGUgYWN0aW9ucyBpbiBlYWNoIHN0ZXAgd2l0aCBkZXRhaWxlZCBidXQgY29uY2lzZSBkZXNjcmlwdGlvbnMsIGluY2x1ZGluZyBpbmdyZWRpZW50cyBuZWVkZWQsIHF1YW50aXRpZXMsIHRpbWUsIGFuZCBhbnkgYXBwbGlhbmNlcyByZXF1aXJlZC4gRW5zdXJlIHlvdXIgdG9uZSBpcyBlbmdhZ2luZyBhbmQgZnJpZW5kbHkuXG4gICAgXG4gICAgT25seSB1c2UgaW5ncmVkaWVudHMgcHJlc2VudCBpbiB0aGUgcHJvdmlkZWQgcmVjaXBlLlxuXG4gICAgUmVzcG9uc2UgbXVzdCBiZSBpbiAke2xhbmd1YWdlfS5cblxuICAgIFRoaW5rIHN0ZXAgYnkgc3RlcCBhbmQgZWxhYm9yYXRlIHlvdXIgdGhvdWdodHMgaW5zaWRlIDx0aGlua2luZz48L3RoaW5raW5nPiB0aGVuIGFuc3dlciBpbiBhIG1hcmtkb3duIGZvcm1hdGA7XG5cbiAgICBjb25zdCBwYXlsb2FkID0ge1xuICAgICAgICBtZXNzYWdlczogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHJvbGU6IFwidXNlclwiLFxuICAgICAgICAgICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwidGV4dFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ0ZXh0XCI6IHByb21wdFRleHRcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgIH1cbiAgICAgICAgXSxcbiAgICAgICAgbWF4X3Rva2VuczogMTAwMCxcbiAgICAgICAgc3lzdGVtOiBzeXN0ZW1Qcm9tcHQsXG4gICAgICAgIHRlbXBlcmF0dXJlOiAwLjUsXG4gICAgICAgIHN0b3Bfc2VxdWVuY2VzOiBbJzwvYW5zd2VyPiddLFxuICAgICAgICBhbnRocm9waWNfdmVyc2lvbjogXCJiZWRyb2NrLTIwMjMtMDUtMzFcIlxuICAgICAgfTtcbiAgICBjb25zdCBwYXJhbXMgPSB7XG4gICAgICAgIG1vZGVsSWQ6IE1PREVMX0lELFxuICAgICAgICBjb250ZW50VHlwZTogXCJhcHBsaWNhdGlvbi9qc29uXCIsXG4gICAgICAgIGFjY2VwdDogXCJhcHBsaWNhdGlvbi9qc29uXCIsXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHBheWxvYWQpLFxuICAgIH07XG4gICAgbGV0IGNvbXBsZXRpb24gPSAnJztcbiAgICB0cnkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgbGV0IGFjY3VtdWxhdGluZyA9IHRydWU7XG4gICAgICAgICAgICBsZXQgYWNjdW11bGF0ZWRDaHVua3MgPSAnJztcbiAgICAgICAgICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgSW52b2tlTW9kZWxXaXRoUmVzcG9uc2VTdHJlYW1Db21tYW5kKHBhcmFtcyk7XG4gICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGJlZHJvY2tSdW50aW1lQ2xpZW50LnNlbmQoY29tbWFuZCk7XG4gICAgICAgICAgICBjb25zdCBldmVudHMgPSByZXNwb25zZS5ib2R5O1xuICAgICAgICAgICAgZm9yIGF3YWl0IChjb25zdCBldmVudCBvZiBldmVudHMgfHwgW10pIHtcbiAgICAgICAgICAgICAgICAvLyBDaGVjayB0aGUgdG9wLWxldmVsIGZpZWxkIHRvIGRldGVybWluZSB3aGljaCBldmVudCB0aGlzIGlzLlxuICAgICAgICAgICAgICAgIGlmIChldmVudC5jaHVuaykge1xuICAgICAgICAgICAgICAgICAgY29uc3QgZGVjb2RlZF9ldmVudCA9IEpTT04ucGFyc2UoXG4gICAgICAgICAgICAgICAgICAgIG5ldyBUZXh0RGVjb2RlcigpLmRlY29kZShldmVudC5jaHVuay5ieXRlcyksXG4gICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgaWYgKGRlY29kZWRfZXZlbnQudHlwZSAgPT09ICdjb250ZW50X2Jsb2NrX2RlbHRhJyAmJiBkZWNvZGVkX2V2ZW50LmRlbHRhLnR5cGUgPT09ICd0ZXh0X2RlbHRhJyl7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBjb25zdCB0ZXh0ID0gZGVjb2RlZF9ldmVudC5kZWx0YS50ZXh0O1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcInRleHQ9XCIrdGV4dClcblxuICAgICAgICAgICAgICAgICAgICAvL3Jlc3BvbnNlU3RyZWFtLndyaXRlKGRlY29kZWRfZXZlbnQuZGVsdGEudGV4dClcbiAgICAgICAgICAgICAgICAgICAgLy9hY2N1bXVsYXRlZENodW5rcyArPSB0ZXh0O1xuICAgICAgICAgICAgICAgICAgICBsb2dnZXIuaW5mbyhkZWNvZGVkX2V2ZW50LmRlbHRhLnRleHQpO1xuICAgICAgICAgICAgICAgICAgICBjb21wbGV0aW9uICs9IGRlY29kZWRfZXZlbnQuZGVsdGEudGV4dDtcblxuICAgICAgICAgICAgICAgICAgICBpZihhY2N1bXVsYXRpbmcpe1xuICAgICAgICAgICAgICAgICAgICAgICAgYWNjdW11bGF0ZWRDaHVua3MgKz0gdGV4dDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiYWNjdW11bGF0ZWRDaHVua3M9XCIrYWNjdW11bGF0ZWRDaHVua3MpXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWNjdW11bGF0ZWRDaHVua3MuaW5jbHVkZXMoJzwvdGhpbmtpbmc+JykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcInRhZyBmb3VuZFwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjY3VtdWxhdGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHN0YXJ0SW5kZXggPSBhY2N1bXVsYXRlZENodW5rcy5pbmRleE9mKFwiPC90aGlua2luZz5cIikgKyBcIjwvdGhpbmtpbmc+XCIubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlbWFpbmluZ1RleHQgPSBhY2N1bXVsYXRlZENodW5rcy5zdWJzdHJpbmcoc3RhcnRJbmRleCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLmluZm8ocmVtYWluaW5nVGV4dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2VTdHJlYW0ud3JpdGUocmVtYWluaW5nVGV4dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgIH1lbHNle1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJyZXNwb25zZVN0cmVhbSB3cml0ZSB0ZXh0PVwiK3RleHQpXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNwb25zZVN0cmVhbS53cml0ZSh0ZXh0KVxuICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgfVxuXG5cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgbG9nZ2VyLmVycm9yKGBldmVudCA9ICR7ZXZlbnR9YClcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgXG4gICAgICAgICAgICAgIGxvZ2dlci5pbmZvKCdTdHJlYW0gZW5kZWQhJylcbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICAvLyBoYW5kbGUgZXJyb3JcbiAgICAgICAgICAgIGxvZ2dlci5lcnJvcihlcnIgYXMgYW55KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBjYXRjaCAoZSkge1xuICAgICAgICBsb2dnZXIuZXJyb3IoYEVycm9yIHdoaWxlIGdlbmVyYXRpbmcgc3VtbWFyeTogJHtlfWApO1xuICAgICAgICBjb21wbGV0aW9uID0gXCJFcnJvciB3aGlsZSBnZW5lcmF0aW5nIHN1bW1hcnlcIjtcbiAgICB9XG4gICAgcmV0dXJuIGNvbXBsZXRpb247XG59XG5cblxuXG5hc3luYyBmdW5jdGlvbiBtZXNzYWdlSGFuZGxlciAoZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50VjIsIHJlc3BvbnNlU3RyZWFtOiBOb2RlSlMuV3JpdGFibGVTdHJlYW0pIHtcblxuICAgIHRyeSB7XG4gICAgICAgIGxvZ2dlci5pbmZvKGV2ZW50IGFzIGFueSk7XG5cbiAgICAgICAgY29uc3QgYm9keSA9IGV2ZW50LmJvZHkgPyBKU09OLnBhcnNlKGV2ZW50LmJvZHkpIDoge307XG4gICAgICAgIGNvbnN0IGxhbmd1YWdlID0gYm9keS5sYW5ndWFnZTtcbiAgICAgICAgY29uc3QgcmVjaXBlID0gYm9keS5yZWNpcGU7XG4gICAgICAgIGNvbnN0IHJlY2lwZVN0ZXBzID0gYXdhaXQgZ2VuZXJhdGVSZWNpcGVTdGVwcyhsYW5ndWFnZSwgcmVjaXBlLCByZXNwb25zZVN0cmVhbSk7XG4gICAgICAgIC8vYXdhaXQgcHV0UHJvZHVjdFN1bW1hcnlUb0R5bmFtb0RCKHByb2R1Y3RDb2RlLCBoYXNoVmFsdWUsIHByb2R1Y3RTdW1tYXJ5KTtcbiAgICAgICAgXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIkVycm9yOlwiLCBlcnJvcik7XG4gICAgfVxuICAgIHJlc3BvbnNlU3RyZWFtLmVuZCgpO1xufVxuXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGF3c2xhbWJkYS5zdHJlYW1pZnlSZXNwb25zZShtZXNzYWdlSGFuZGxlcik7Il19