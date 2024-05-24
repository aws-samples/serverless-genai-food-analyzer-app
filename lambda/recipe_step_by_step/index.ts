import { Tracer } from "@aws-lambda-powertools/tracer";
import { Logger } from "@aws-lambda-powertools/logger";
import { APIGatewayProxyEventV2, Handler, Context } from 'aws-lambda';
import { createHash } from 'crypto';
import { BedrockRuntimeClient, InvokeModelWithResponseStreamCommand } from "@aws-sdk/client-bedrock-runtime";

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


const MODEL_ID = "anthropic.claude-3-haiku-20240307-v1:0"

const tracer = new Tracer();
const logger = new Logger();



const bedrockRuntimeClient = new BedrockRuntimeClient({ region: process.env.REGION || 'us-east-1' });




async function generateRecipeSteps(language: string, recipe, responseStream) {

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
                    
                    const text = decoded_event.delta.text;
                    console.log("text="+text)

                    //responseStream.write(decoded_event.delta.text)
                    //accumulatedChunks += text;
                    logger.info(decoded_event.delta.text);
                    completion += decoded_event.delta.text;

                    if(accumulating){
                        accumulatedChunks += text;
                        console.log("accumulatedChunks="+accumulatedChunks)
                        if (accumulatedChunks.includes('</thinking>')) {
                            console.log("tag found")
                            accumulating = false;
                            const startIndex = accumulatedChunks.indexOf("</thinking>") + "</thinking>".length;
                            const remainingText = accumulatedChunks.substring(startIndex);
                            logger.info(remainingText);
                            responseStream.write(remainingText);
                          }

                      }else{
                        console.log("responseStream write text="+text)
                        responseStream.write(text)
                      }

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



async function messageHandler (event, responseStream) {

    try {
        logger.info(event as any);

        const body = event.body ? JSON.parse(event.body) : {};
        const language = body.language;
        const recipe = body.recipe;
        const recipeSteps = await generateRecipeSteps(language, recipe, responseStream);
        //await putProductSummaryToDynamoDB(productCode, hashValue, productSummary);
        
    } catch (error) {
        console.error("Error:", error);
    }
    responseStream.end();
}

export const handler = awslambda.streamifyResponse(messageHandler);