import time
import boto3
import json
from botocore.exceptions import ClientError
import urllib.parse
import requests
import json
import os
import re
import xml.etree.ElementTree as ET
from aws_lambda_powertools import Logger, Tracer
import re
tracer = Tracer()
logger = Logger()

bedrock = boto3.client("bedrock-runtime")
dynamodb = boto3.resource('dynamodb')


PRODUCT_TABLE_NAME = os.environ['PRODUCT_TABLE_NAME']
OPEN_FOOD_FACTS_TABLE_NAME = os.environ['OPEN_FOOD_FACTS_TABLE_NAME']

def generate_ingredients_description(ingredients, language):
    language = language.capitalize()
    return f"""Here is a list of ingredients:
<ingredients>
{ingredients}
</ingredients>

Extract each ingredient and generate a description for each ingredient to explain it to a 5 years old child. 
Translate each ingredient name from its original language to {language} and provide the description in {language}.
Skip the preamble and provide only the response in this XML format:
<ingredients>
    <ingredient>
        <name>{{INGREDIENT}}</name>
        <description>{{DESCRIPTION}}</description>
    </ingredient>
</ingredients>
"""



def generate_additives_description(additives, language):
    language = language.capitalize()
    return f"""Here is a list of additives:
<additives>
{additives}
</additives>
Extract each additive and generate a description for each additive to explain it to a 5 years old child. 
Provide the description in {language}, skip the preambule and provide only the response in this XML format:
<additives>
    <additive>
        <name{{ADDITIVE}}</name>
        <description>{{DESCRIPTION}}</description>
    </additive>
</additives>
"""



def clean_xml(text, tag_name):
    """
    Extracts the content of a specified XML tag from the given text.

    Args:
        text (str): The XML text.
        tag_name (str): The name of the XML tag to extract.

    Returns:
        str: The content of the specified XML tag if found; otherwise, returns the original text.
    """

    start_index = text.find('<{}>'.format(tag_name))
    if start_index != -1:        
        return text[start_index:]
    else:
        return text


class APIRequestError(Exception):
    pass

class ProductNotFoundError(Exception):
    pass

@tracer.capture_method
def make_api_request(product_code):
    """
    Makes a GET request to the API endpoint for retrieving product information.

    Args:
        product_code (str): The code of the product to retrieve information for.

    Returns:
        dict or None: A dictionary containing product information if the request is successful,
                      otherwise returns None. The dictionary includes fields like 'ingredients_text',
                      'additives_tags', and 'product_name'.
    """


    api_url = os.environ.get('API_URL')
    url = f'{api_url}/api/v2/product/{product_code}'
    headers = {'Accept': 'application/json'}
    fixed_params = {'fields': 'ingredients_text,additives_tags,product_name'}
    full_url = f'{url}?{urllib.parse.urlencode(fixed_params)}'
    logger.debug("Calling the API to get the product informations")

    try:
        response = requests.get(full_url, headers=headers, timeout=5)
        response.raise_for_status()  # Optional: Raises an exception for 4xx and 5xx status codes.
        json_data = response.json()

        return json_data

    except requests.HTTPError as e:
        if e.response.status_code == 404:
            logger.debug("Product not found")
            # Handle this case gracefully, maybe return a default value or do something else
            raise ProductNotFoundError("Product not found on Open Food Facts API")
        else:
            logger.error("HTTPError", e)
            raise ValueError(e)

    except Exception as e:
        error_message = f"Error in make_api_request: {e}"
        logger.error("Error", e)
        raise Exception(error_message)

def call_claude_haiku(prompt_text):

    prompt_config = {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 4096,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                    "type": "text",
                    "text": prompt_text
                }
                ],
            }
        ],
    }

    body = json.dumps(prompt_config)

    modelId = "anthropic.claude-3-haiku-20240307-v1:0"
    accept = "application/json"
    contentType = "application/json"

    response = bedrock.invoke_model(
        body=body, modelId=modelId, accept=accept, contentType=contentType
    )
    response_body = json.loads(response.get("body").read())

    results = response_body.get("content")[0].get("text")
    return results

def clean_text_in_brackets(text):
    """
    Removes text enclosed within parentheses, square brackets, or curly braces from the given text.
    Extracts the remaining text.

    Args:
        text (str): The text to be cleaned.

    Returns:
        str: The extracted text without any enclosed text within parentheses, square brackets, or curly braces.
    """
    # Initialize a counter to keep track of the depth of nested brackets
    bracket_depth = 0
    cleaned_text = ''

    # Iterate over each character in the text
    for char in text:
        if char == '(' or char == '[' or char == '{':
            # If we encounter an opening bracket, increase the depth counter
            bracket_depth += 1
        elif char == ')' or char == ']' or char == '}':
            # If we encounter a closing bracket, decrease the depth counter
            bracket_depth -= 1
        elif bracket_depth == 0:
            # If we are not inside any bracketed expression, add the character to the cleaned text
            cleaned_text += char
    
    # Remove any extra spaces and return the result
    cleaned_text = ' '.join(cleaned_text.split())

    words = cleaned_text.split()  # Split the text into words
    if words:
        words[0] = words[0].capitalize()  # Capitalize the first word
    cleaned_text = ' '.join(words)  # Join the words back together
    
    return cleaned_text


def parse_ingredients_description(ingredients, language):
    """
    Parses the ingredients' descriptions from the provided XML format and returns a dictionary.

    Args:
        ingredients (list): A list of ingredients.

    Returns:
        dict: A dictionary containing ingredient names as keys and their descriptions as values.
    """
    try:
        xml_ingredients = call_claude_haiku(generate_ingredients_description(ingredients, language))
        ingredients_and_descriptions = {}

        root = ET.fromstring(xml_ingredients)
        for ingredient in root.iter('ingredient'):
            name = clean_text_in_brackets(ingredient.find('name').text)
            description = ingredient.find('description').text
            ingredients_and_descriptions[name] = description
        return ingredients_and_descriptions

    except Exception as e:
        logger.error("Impossible to generate ingrediens descriptions", e)
        return None
    

def parse_additives_description(additives, language):
    """
    Parses the additives' descriptions from the provided XML format and returns a dictionary.

    Args:
        additives (list): A list of additives.

    Returns:
        dict: A dictionary containing additive names as keys and their descriptions as values.
    """
    try:
        xml_additives= call_claude_haiku(generate_additives_description(additives, language))
        additives_and_descriptions = {}
        root = ET.fromstring(xml_additives)

        for additive in root.iter('additive'):
            name = clean_text_in_brackets(additive.find('name').text)
            description = additive.find('description').text
            additives_and_descriptions[name] = description

        
        return additives_and_descriptions
    except Exception as e:
        logger.error("Impossible to generate additives descriptions", e)
        return None

@tracer.capture_method
def get_product_from_db(product_code, language):
    """
    Retrieves product information from the database using the provided product code.

    Args:
        product_code (str): The code of the product to retrieve information for.

    Returns:
        tuple: A tuple containing product name, ingredients, and additives if the product is found in the database;
               otherwise, returns (None, None, None).
    """

    table = dynamodb.Table(PRODUCT_TABLE_NAME)
    try:
        response = table.get_item(
            Key={
                'product_code': product_code,
                'language' : language
            }
        )
        if 'Item' in response:

            item = response['Item']
            
            product_name = item.get('product_name')
            ingredients = item.get('ingredients')
            additives = item.get('additives')
            
            # Check if either ingredients or additives don't exist, then return None
            if ingredients is None or additives is None:
                return None, None, None
            return product_name, ingredients, additives
        else:
            return None, None, None
    except Exception as e:
        logger.error("Error while getting the Product from database", e)
        return None, None, None

@tracer.capture_method
def write_product_to_db(product_code, language, product_name, ingredients, additives):
    """
    Writes product information product table.

    Args:
        product_code (str): The code of the product.
        product_name (str): The name of the product.
        ingredients (list): The list of ingredients of the product.
        additives (list): The list of additives of the product.

    Returns:
        None
    """    
    
    table = dynamodb.Table(PRODUCT_TABLE_NAME)

    try:
        item = {
        'product_code': product_code,
        'language': language,
        'product_name': product_name
        }

        if additives is not None:
            item['additives'] = additives

        if ingredients is not None:
            item['ingredients'] = ingredients

        # Write item to DynamoDB table
        response = table.put_item(Item=item)
        
        # Check if write was successful
        if response['ResponseMetadata']['HTTPStatusCode'] == 200:
            logger.debug("Product written successfully to Product Table")

        else:
            logger.debug("Product written successfully to Product Table")

    except Exception as e:
        logger.error("Error while saving the Product into database", e)
        raise Exception("Error while saving the Product into database")



def get_product_from_open_food_facts_db(product_code):
    """
    Fetch an item from a DynamoDB table by its primary key.

    Parameters:
    table_name (str): The name of the DynamoDB table.
    primary_key_name (str): The name of the primary key attribute.
    primary_key_value (str): The value of the primary key to search for.

    Returns:
    dict: The item from the table if found, otherwise an error message.
    """
    
    # Reference to the DynamoDB table
    table = dynamodb.Table(OPEN_FOOD_FACTS_TABLE_NAME)
    
    try:
        # Get the item from the table
        response = table.get_item(Key={"product_code": product_code})
        # Check if the item exists in the response
        if 'Item' in response:
            logger.debug("Product found in local database")
            return response['Item']
        else:
            return None
    except Exception as e:
        logger.error("Error while getting the Product from get_product_from_open_food_facts_db table", e)
        return None
    
def fetch_new_product(product_code, language):
    """
    Fetches product information from the local table, if not found call the API using the provided product code.

    Args:
        product_code (str): The code of the product to fetch.

    Returns:
        tuple: A tuple containing dictionaries of ingredients and additives, along with the product name,
               if the product information is successfully fetched from the API; otherwise, returns (None, None, None, None).
    """

    response_data = get_product_from_open_food_facts_db(product_code)
    if response_data is None:
        logger.debug("Product not found in local table, trying the API")
        response_data = make_api_request(product_code)

    if response_data is not None:

        additives=[]
        if 'product' not in response_data or 'ingredients_text' not in response_data['product']:
            raise ValueError("Missing ingredients in Open Food Facts API. Unable to generate a personalized summary for this product.")

        ingredients=response_data['product']['ingredients_text']
        product_name=response_data['product']['product_name']
        if not ingredients:
            raise ValueError("Missing ingredients in Open Food Facts API. Unable to generate a personalized summary for this product.")
        response_ingredients = parse_ingredients_description(ingredients, language)

        if 'product' in response_data and 'additives_tags' in response_data['product'] and response_data['product']['additives_tags']:
            additives = response_data['product']['additives_tags']

        response_additives = additives
        if additives:
            response_additives = parse_additives_description(additives, language)

        return response_ingredients, response_additives, product_name

    else:
        return None, None, None

@logger.inject_lambda_context(log_event=True)
@tracer.capture_lambda_handler
def handler(event, context):
    logger.info(event)
    try:
        fields = event["rawPath"].split("/")
        product_code = fields[1]
        language = fields[2]
        logger.debug("ProductCode="+product_code)
        product_name, response_ingredients, response_additives = get_product_from_db(product_code, language)
        
        if product_name is not None:        
            logger.debug("Product found in the database")
        else:
            logger.debug("Product not found in the database")

            response_ingredients, response_additives, product_name = fetch_new_product(product_code, language)
            
            
            if  response_ingredients is not None:
                write_product_to_db(product_code, language, product_name, response_ingredients, response_additives)

            if(response_ingredients is None):
                response_ingredients = {"Ingredients Generation Error": "Description Generation Unavailable"}                


        response = {
                "ingredients_description": response_ingredients,
                "additives_description": response_additives,
                "product_name": product_name,
        }

        logger.debug("Response", extra=response)

        # Return JSON response
        return {
            "statusCode": 200,
            "body": json.dumps(response),
            "headers": {
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
            },
        }
    except ProductNotFoundError as e:
        return {
            "statusCode": 404,
            "body": json.dumps({"error": "NOT_FOUND"}),
            "headers": {
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
            },
        }

    except Exception as e:
            logger.error("Error", e)
            return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)}),
            "headers": {
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
            },
        }