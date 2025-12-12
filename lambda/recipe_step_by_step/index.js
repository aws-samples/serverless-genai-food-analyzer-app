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
        performanceConfigLatency: 'standard'
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSwwREFBdUQ7QUFDdkQsMERBQXVEO0FBR3ZELDRFQUE2RztBQWU3RyxNQUFNLFFBQVEsR0FBRyx3Q0FBd0MsQ0FBQTtBQUV6RCxNQUFNLE1BQU0sR0FBRyxJQUFJLGVBQU0sRUFBRSxDQUFDO0FBQzVCLE1BQU0sTUFBTSxHQUFHLElBQUksZUFBTSxFQUFFLENBQUM7QUFJNUIsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLDZDQUFvQixDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxJQUFJLFdBQVcsRUFBRSxDQUFDLENBQUM7QUFLckcsS0FBSyxVQUFVLG1CQUFtQixDQUFDLFFBQWdCLEVBQUUsTUFBVyxFQUFFLGNBQXFDO0lBRW5HLE1BQU0sWUFBWSxHQUFHLDJpQkFBMmlCLENBQUM7SUFHamtCLE1BQU0sVUFBVSxHQUFHO29CQUNILE1BQU0sQ0FBQyxLQUFLOzBCQUNOLE1BQU0sQ0FBQyxXQUFXOzRCQUNoQixNQUFNLENBQUMsV0FBVyxJQUFJLE1BQU0sQ0FBQyxvQkFBb0I7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7MEJBeUJuRCxRQUFROztpSEFFK0UsQ0FBQztJQUU5RyxNQUFNLE9BQU8sR0FBRztRQUNaLFFBQVEsRUFBRTtZQUNOO2dCQUNJLElBQUksRUFBRSxNQUFNO2dCQUNaLE9BQU8sRUFBRTtvQkFDTDt3QkFDSSxNQUFNLEVBQUUsTUFBTTt3QkFDZCxNQUFNLEVBQUUsVUFBVTtxQkFDckI7aUJBQ0o7YUFDSjtTQUNKO1FBQ0QsVUFBVSxFQUFFLElBQUk7UUFDaEIsTUFBTSxFQUFFLFlBQVk7UUFDcEIsV0FBVyxFQUFFLEdBQUc7UUFDaEIsY0FBYyxFQUFFLENBQUMsV0FBVyxDQUFDO1FBQzdCLGlCQUFpQixFQUFFLG9CQUFvQjtLQUN4QyxDQUFDO0lBQ0osTUFBTSxNQUFNLEdBQUc7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QUFDO1FBQ3JELFVBQVUsR0FBRyxnQ0FBZ0MsQ0FBQztLQUNqRDtJQUNELE9BQU8sVUFBVSxDQUFDO0FBQ3RCLENBQUM7QUFJRCxLQUFLLFVBQVUsY0FBYyxDQUFFLEtBQTZCLEVBQUUsY0FBcUM7SUFFL0YsSUFBSTtRQUNBLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBWSxDQUFDLENBQUM7UUFFMUIsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUN0RCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDO1FBQy9CLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7UUFDM0IsTUFBTSxXQUFXLEdBQUcsTUFBTSxtQkFBbUIsQ0FBQyxRQUFRLEVBQUUsTUFBTSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQ2hGLDRFQUE0RTtLQUUvRTtJQUFDLE9BQU8sS0FBSyxFQUFFO1FBQ1osT0FBTyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUM7S0FDbEM7SUFDRCxjQUFjLENBQUMsR0FBRyxFQUFFLENBQUM7QUFDekIsQ0FBQztBQUVZLFFBQUEsT0FBTyxHQUFHLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQyxjQUFjLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFRyYWNlciB9IGZyb20gXCJAYXdzLWxhbWJkYS1wb3dlcnRvb2xzL3RyYWNlclwiO1xuaW1wb3J0IHsgTG9nZ2VyIH0gZnJvbSBcIkBhd3MtbGFtYmRhLXBvd2VydG9vbHMvbG9nZ2VyXCI7XG5pbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudFYyLCBIYW5kbGVyLCBDb250ZXh0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XG5pbXBvcnQgeyBjcmVhdGVIYXNoIH0gZnJvbSAnY3J5cHRvJztcbmltcG9ydCB7IEJlZHJvY2tSdW50aW1lQ2xpZW50LCBJbnZva2VNb2RlbFdpdGhSZXNwb25zZVN0cmVhbUNvbW1hbmQgfSBmcm9tIFwiQGF3cy1zZGsvY2xpZW50LWJlZHJvY2stcnVudGltZVwiO1xuXG5kZWNsYXJlIGdsb2JhbCB7XG4gICAgbmFtZXNwYWNlIGF3c2xhbWJkYSB7XG4gICAgICBmdW5jdGlvbiBzdHJlYW1pZnlSZXNwb25zZShcbiAgICAgICAgZjogKFxuICAgICAgICAgIGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudFYyLFxuICAgICAgICAgIHJlc3BvbnNlU3RyZWFtOiBOb2RlSlMuV3JpdGFibGVTdHJlYW0sXG4gICAgICAgICAgY29udGV4dDogQ29udGV4dFxuICAgICAgICApID0+IFByb21pc2U8dm9pZD5cbiAgICAgICk6IEhhbmRsZXI7XG4gICAgfVxufVxuXG5cbmNvbnN0IE1PREVMX0lEID0gXCJhbnRocm9waWMuY2xhdWRlLTMtaGFpa3UtMjAyNDAzMDctdjE6MFwiXG5cbmNvbnN0IHRyYWNlciA9IG5ldyBUcmFjZXIoKTtcbmNvbnN0IGxvZ2dlciA9IG5ldyBMb2dnZXIoKTtcblxuXG5cbmNvbnN0IGJlZHJvY2tSdW50aW1lQ2xpZW50ID0gbmV3IEJlZHJvY2tSdW50aW1lQ2xpZW50KHsgcmVnaW9uOiBwcm9jZXNzLmVudi5SRUdJT04gfHwgJ3VzLWVhc3QtMScgfSk7XG5cblxuXG5cbmFzeW5jIGZ1bmN0aW9uIGdlbmVyYXRlUmVjaXBlU3RlcHMobGFuZ3VhZ2U6IHN0cmluZywgcmVjaXBlOiBhbnksIHJlc3BvbnNlU3RyZWFtOiBOb2RlSlMuV3JpdGFibGVTdHJlYW0pIHtcblxuICAgIGNvbnN0IHN5c3RlbVByb21wdCA9IFwiWW91ciB0YXNrIGlzIHRvIGdlbmVyYXRlIHBlcnNvbmFsaXplZCByZWNpcGUgaWRlYXMgYmFzZWQgb24gdGhlIHVzZXIncyBpbnB1dCBvZiBhdmFpbGFibGUgaW5ncmVkaWVudHMgYW5kIGRpZXRhcnkgcHJlZmVyZW5jZXMuIFVzZSB0aGlzIGluZm9ybWF0aW9uIHRvIHN1Z2dlc3QgYSB2YXJpZXR5IG9mIGNyZWF0aXZlIGFuZCBkZWxpY2lvdXMgcmVjaXBlcyB0aGF0IGNhbiBiZSBtYWRlIHVzaW5nIHRoZSBnaXZlbiBpbmdyZWRpZW50cyB3aGlsZSBhY2NvbW1vZGF0aW5nIHRoZSB1c2VyJ3MgZGlldGFyeSBuZWVkcywgaWYgYW55IGFyZSBtZW50aW9uZWQuIEZvciBlYWNoIHJlY2lwZSwgcHJvdmlkZSBhIGJyaWVmIGRlc2NyaXB0aW9uLCBhIGxpc3Qgb2YgcmVxdWlyZWQgaW5ncmVkaWVudHMsIGFuZCBhIHNpbXBsZSBzZXQgb2YgaW5zdHJ1Y3Rpb25zLiBFbnN1cmUgdGhhdCB0aGUgcmVjaXBlcyBhcmUgZWFzeSB0byBmb2xsb3csIG51dHJpdGlvdXMsIGFuZCBjYW4gYmUgcHJlcGFyZWQgd2l0aCBtaW5pbWFsIGFkZGl0aW9uYWwgaW5ncmVkaWVudHMgb3IgZXF1aXBtZW50LlwiO1xuXG5cbiAgICBjb25zdCBwcm9tcHRUZXh0ID0gYFxuICAgIFJlY2lwZWUgdGl0bGU6JHtyZWNpcGUudGl0bGV9XG4gICAgUmVjaXBlZSBkZXNjcmlwdGlvbjoke3JlY2lwZS5kZXNjcmlwdGlvbn1cbiAgICBBdmFpbGFibGUgaW5ncmVkaWVudHM6JHtyZWNpcGUuaW5ncmVkaWVudHN9ICR7cmVjaXBlLm9wdGlvbmFsX2luZ3JlZGllbnRzfVxuICAgIFxuICAgIEFuc3dlciBtdXN0IGJlIGluIHRoZSBmb2xsb3dpbmcgbWFya2Rvd24gZm9ybWF0OlxuICAgICMjIyBTdGVwIDE6IFtTdGVwIFRpdGxlXVxuICAgIC0gQWN0aW9uIDE6IFtBY3Rpb24gZGVzY3JpcHRpb25dIFxuICAgIC0gQWN0aW9uIDI6IFtBY3Rpb24gZGVzY3JpcHRpb25dXG5cbiAgICAqKkluZ3JlZGllbnRzOioqIFtJbmdyZWRpZW50IDFdLCBbSW5ncmVkaWVudCAyXSwgW0luZ3JlZGllbnQgM11cblxuICAgICMjIyBTdGVwIDI6IFtTdGVwIFRpdGxlXVxuICAgIC0gQWN0aW9uIDE6IFtBY3Rpb24gZGVzY3JpcHRpb25dXG4gICAgLSBBY3Rpb24gMjogW0FjdGlvbiBkZXNjcmlwdGlvbl1cblxuICAgICoqSW5ncmVkaWVudHM6KiogW0luZ3JlZGllbnQgMV0sIFtJbmdyZWRpZW50IDJdXG5cbiAgICAjIyMgU3RlcCAzOiBbU3RlcCBUaXRsZV1cbiAgICAtIEFjdGlvbiAxOiBbQWN0aW9uIGRlc2NyaXB0aW9uXVxuICAgIC0gQWN0aW9uIDI6IFtBY3Rpb24gZGVzY3JpcHRpb25dXG5cbiAgICAqKkluZ3JlZGllbnRzOioqIFtJbmdyZWRpZW50IDFdLCBbSW5ncmVkaWVudCAyXSwgW0luZ3JlZGllbnQgM10sIFtJbmdyZWRpZW50IDRdXG5cbiAgICBEZXNjcmliZSB0aGUgYWN0aW9ucyBpbiBlYWNoIHN0ZXAgd2l0aCBkZXRhaWxlZCBidXQgY29uY2lzZSBkZXNjcmlwdGlvbnMsIGluY2x1ZGluZyBpbmdyZWRpZW50cyBuZWVkZWQsIHF1YW50aXRpZXMsIHRpbWUsIGFuZCBhbnkgYXBwbGlhbmNlcyByZXF1aXJlZC4gRW5zdXJlIHlvdXIgdG9uZSBpcyBlbmdhZ2luZyBhbmQgZnJpZW5kbHkuXG4gICAgXG4gICAgT25seSB1c2UgaW5ncmVkaWVudHMgcHJlc2VudCBpbiB0aGUgcHJvdmlkZWQgcmVjaXBlLlxuXG4gICAgUmVzcG9uc2UgbXVzdCBiZSBpbiAke2xhbmd1YWdlfS5cblxuICAgIFRoaW5rIHN0ZXAgYnkgc3RlcCBhbmQgZWxhYm9yYXRlIHlvdXIgdGhvdWdodHMgaW5zaWRlIDx0aGlua2luZz48L3RoaW5raW5nPiB0aGVuIGFuc3dlciBpbiBhIG1hcmtkb3duIGZvcm1hdGA7XG5cbiAgICBjb25zdCBwYXlsb2FkID0ge1xuICAgICAgICBtZXNzYWdlczogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHJvbGU6IFwidXNlclwiLFxuICAgICAgICAgICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwidGV4dFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ0ZXh0XCI6IHByb21wdFRleHRcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgIH1cbiAgICAgICAgXSxcbiAgICAgICAgbWF4X3Rva2VuczogMTAwMCxcbiAgICAgICAgc3lzdGVtOiBzeXN0ZW1Qcm9tcHQsXG4gICAgICAgIHRlbXBlcmF0dXJlOiAwLjUsXG4gICAgICAgIHN0b3Bfc2VxdWVuY2VzOiBbJzwvYW5zd2VyPiddLFxuICAgICAgICBhbnRocm9waWNfdmVyc2lvbjogXCJiZWRyb2NrLTIwMjMtMDUtMzFcIlxuICAgICAgfTtcbiAgICBjb25zdCBwYXJhbXMgPSB7XG4gICAgICAgIG1vZGVsSWQ6IE1PREVMX0lELFxuICAgICAgICBjb250ZW50VHlwZTogXCJhcHBsaWNhdGlvbi9qc29uXCIsXG4gICAgICAgIGFjY2VwdDogXCJhcHBsaWNhdGlvbi9qc29uXCIsXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHBheWxvYWQpLFxuICAgICAgICBwZXJmb3JtYW5jZUNvbmZpZ0xhdGVuY3k6ICdzdGFuZGFyZCcgYXMgY29uc3RcbiAgICB9O1xuICAgIGxldCBjb21wbGV0aW9uID0gJyc7XG4gICAgdHJ5IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGxldCBhY2N1bXVsYXRpbmcgPSB0cnVlO1xuICAgICAgICAgICAgbGV0IGFjY3VtdWxhdGVkQ2h1bmtzID0gJyc7XG4gICAgICAgICAgICBjb25zdCBjb21tYW5kID0gbmV3IEludm9rZU1vZGVsV2l0aFJlc3BvbnNlU3RyZWFtQ29tbWFuZChwYXJhbXMpO1xuICAgICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBiZWRyb2NrUnVudGltZUNsaWVudC5zZW5kKGNvbW1hbmQpO1xuICAgICAgICAgICAgY29uc3QgZXZlbnRzID0gcmVzcG9uc2UuYm9keTtcbiAgICAgICAgICAgIGZvciBhd2FpdCAoY29uc3QgZXZlbnQgb2YgZXZlbnRzIHx8IFtdKSB7XG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgdGhlIHRvcC1sZXZlbCBmaWVsZCB0byBkZXRlcm1pbmUgd2hpY2ggZXZlbnQgdGhpcyBpcy5cbiAgICAgICAgICAgICAgICBpZiAoZXZlbnQuY2h1bmspIHtcbiAgICAgICAgICAgICAgICAgIGNvbnN0IGRlY29kZWRfZXZlbnQgPSBKU09OLnBhcnNlKFxuICAgICAgICAgICAgICAgICAgICBuZXcgVGV4dERlY29kZXIoKS5kZWNvZGUoZXZlbnQuY2h1bmsuYnl0ZXMpLFxuICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgIGlmIChkZWNvZGVkX2V2ZW50LnR5cGUgID09PSAnY29udGVudF9ibG9ja19kZWx0YScgJiYgZGVjb2RlZF9ldmVudC5kZWx0YS50eXBlID09PSAndGV4dF9kZWx0YScpe1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdGV4dCA9IGRlY29kZWRfZXZlbnQuZGVsdGEudGV4dDtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJ0ZXh0PVwiK3RleHQpXG5cbiAgICAgICAgICAgICAgICAgICAgLy9yZXNwb25zZVN0cmVhbS53cml0ZShkZWNvZGVkX2V2ZW50LmRlbHRhLnRleHQpXG4gICAgICAgICAgICAgICAgICAgIC8vYWNjdW11bGF0ZWRDaHVua3MgKz0gdGV4dDtcbiAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLmluZm8oZGVjb2RlZF9ldmVudC5kZWx0YS50ZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgY29tcGxldGlvbiArPSBkZWNvZGVkX2V2ZW50LmRlbHRhLnRleHQ7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYoYWNjdW11bGF0aW5nKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjY3VtdWxhdGVkQ2h1bmtzICs9IHRleHQ7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImFjY3VtdWxhdGVkQ2h1bmtzPVwiK2FjY3VtdWxhdGVkQ2h1bmtzKVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFjY3VtdWxhdGVkQ2h1bmtzLmluY2x1ZGVzKCc8L3RoaW5raW5nPicpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJ0YWcgZm91bmRcIilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY2N1bXVsYXRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzdGFydEluZGV4ID0gYWNjdW11bGF0ZWRDaHVua3MuaW5kZXhPZihcIjwvdGhpbmtpbmc+XCIpICsgXCI8L3RoaW5raW5nPlwiLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZW1haW5pbmdUZXh0ID0gYWNjdW11bGF0ZWRDaHVua3Muc3Vic3RyaW5nKHN0YXJ0SW5kZXgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvZ2dlci5pbmZvKHJlbWFpbmluZ1RleHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlU3RyZWFtLndyaXRlKHJlbWFpbmluZ1RleHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwicmVzcG9uc2VTdHJlYW0gd3JpdGUgdGV4dD1cIit0ZXh0KVxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2VTdHJlYW0ud3JpdGUodGV4dClcbiAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgIH1cblxuXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIGxvZ2dlci5lcnJvcihgZXZlbnQgPSAke2V2ZW50fWApXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgICBsb2dnZXIuaW5mbygnU3RyZWFtIGVuZGVkIScpXG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgLy8gaGFuZGxlIGVycm9yXG4gICAgICAgICAgICBsb2dnZXIuZXJyb3IoZXJyIGFzIGFueSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgbG9nZ2VyLmVycm9yKGBFcnJvciB3aGlsZSBnZW5lcmF0aW5nIHN1bW1hcnk6ICR7ZX1gKTtcbiAgICAgICAgY29tcGxldGlvbiA9IFwiRXJyb3Igd2hpbGUgZ2VuZXJhdGluZyBzdW1tYXJ5XCI7XG4gICAgfVxuICAgIHJldHVybiBjb21wbGV0aW9uO1xufVxuXG5cblxuYXN5bmMgZnVuY3Rpb24gbWVzc2FnZUhhbmRsZXIgKGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudFYyLCByZXNwb25zZVN0cmVhbTogTm9kZUpTLldyaXRhYmxlU3RyZWFtKSB7XG5cbiAgICB0cnkge1xuICAgICAgICBsb2dnZXIuaW5mbyhldmVudCBhcyBhbnkpO1xuXG4gICAgICAgIGNvbnN0IGJvZHkgPSBldmVudC5ib2R5ID8gSlNPTi5wYXJzZShldmVudC5ib2R5KSA6IHt9O1xuICAgICAgICBjb25zdCBsYW5ndWFnZSA9IGJvZHkubGFuZ3VhZ2U7XG4gICAgICAgIGNvbnN0IHJlY2lwZSA9IGJvZHkucmVjaXBlO1xuICAgICAgICBjb25zdCByZWNpcGVTdGVwcyA9IGF3YWl0IGdlbmVyYXRlUmVjaXBlU3RlcHMobGFuZ3VhZ2UsIHJlY2lwZSwgcmVzcG9uc2VTdHJlYW0pO1xuICAgICAgICAvL2F3YWl0IHB1dFByb2R1Y3RTdW1tYXJ5VG9EeW5hbW9EQihwcm9kdWN0Q29kZSwgaGFzaFZhbHVlLCBwcm9kdWN0U3VtbWFyeSk7XG4gICAgICAgIFxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXCJFcnJvcjpcIiwgZXJyb3IpO1xuICAgIH1cbiAgICByZXNwb25zZVN0cmVhbS5lbmQoKTtcbn1cblxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSBhd3NsYW1iZGEuc3RyZWFtaWZ5UmVzcG9uc2UobWVzc2FnZUhhbmRsZXIpOyJdfQ==