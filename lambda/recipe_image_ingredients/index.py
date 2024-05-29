import time
import boto3
import json
from botocore.exceptions import ClientError
import urllib.request
import urllib.parse
import urllib.error
import json
import os
import re
import xml.etree.ElementTree as ET
from aws_lambda_powertools import Logger, Tracer

bedrock = boto3.client("bedrock-runtime")


tracer = Tracer()
logger = Logger()

def post_process_answer(response:str)->list:
    """
    Extracts the answer from the given response string.

    Args:
        response (str): The response string.

    Returns:
        dict: list of ingredients.
    """
    answer = re.findall(r'<answer>(.*?)</answer>', response, re.DOTALL)
    json_answer = json.loads(answer[0])
    ingredients=[ingredient for ingredients in json_answer.values() for ingredient in ingredients]
    return ingredients

def generate_vision_answer(bedrock_rt:boto3.client,messages:list, model_id:str, claude_config:dict,system_prompt:str, post_process:bool)->str:
    """
    Generates a vision answer using the specified model and configuration.
    
    Parameters:
    - bedrock_rt (boto3.client): The Bedrock runtime client.
    - messages (list): A list of messages.
    - model_id (str): The ID of the model to use.
    - claude_config (dict): The configuration for Claude.
    - system_prompt (str): The system prompt.
    
    Returns:
    - str: The formatted response.
    """
    
    body={'messages': [messages],**claude_config, "system": system_prompt}
    
    response = bedrock_rt.invoke_model(modelId=model_id, body=json.dumps(body))   
    response = json.loads(response['body'].read().decode('utf-8'))
    if post_process:
        formated_response= post_process_answer(response['content'][0]['text'])
    else:
        formated_response= response['content'][0]['text']
    
    return formated_response

def create_message_few_shot_image(list_images_base64:list,  prompt:str)->dict:
    messages = {"role": "user", "content": []}
    for image in list_images_base64:
        logger.debug("image")
        logger.debug(image)
        messages["content"].append({"type": "text", "text": f"Image {list_images_base64.index(image)}:"})
        fmt=image.split(",")[0].split(":")[1].split(";")
        messages["content"].append({"type": "image", "source": {"type": fmt[1], "media_type": fmt[0], "data": image.split(",")[1]}})
    messages["content"].append({"type": "text", "text": prompt})
    logger.debug(messages)
    return messages


@logger.inject_lambda_context(log_event=True)
def handler(event, context):
    logger.info(event)
    
    #-----for prod-----
    body = event.get("body")
    json_body = json.loads(body)
    logger.debug(body)
    language = json_body.get("language")
    list_images_base64 = json_body.get("list_images_base64")
    
    model_id = "anthropic.claude-3-sonnet-20240229-v1:0"
    claude_config = {
        'max_tokens': 2000, 
        'temperature': 0, 
        'anthropic_version': '',  
        'top_p': 1, 
        'stop_sequences': ['Human:']
    }
    system_prompt="You have perfect vision and pay great attention to ingredients in each picture, you are very good at detecting food ingredients on images"
    
    # nosemgrep
    prompt="""
    Follow steps below:
    1. Extract all ingredients from each image and list them inside the following json format in the following language %s:
    ```json
    {
        "image_0": ["ingredient_0", "ingredient_1", "ingredient_2"],
        "image_1": ["ingredient_0", "ingredient_1", "ingredient_2"],
        "image_2": ["ingredient_0", "ingredient_1", "ingredient_2"]
    }
    2. Only focus on food ingredients nothing else.
    3. If there are no ingredients in the image, return an empty list.
    ```
    
    Before answer, think step by step in <thinking> tags and analyze every part of each image. Answer must be in <answer></answer> tags."
    """%(language)
    messages=create_message_few_shot_image(list_images_base64,prompt)
    ingredients= generate_vision_answer(bedrock, messages, model_id, claude_config, system_prompt=system_prompt,post_process=True)
    

    
   # Return JSON response
    return {
        "statusCode": 200,
        "body": json.dumps({"ingredients":ingredients}, ensure_ascii=False),
        "headers": {
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
        },
    }
    
