import boto3
import json
import logging
import os
import requests
import gzip
from tqdm import tqdm
import shutil
import json
import sys

logger = logging.getLogger(__name__)

def describe_stack_output(stack_name, output_key):
    # Create CloudFormation client
    cf_client = boto3.client('cloudformation', region_name=os.getenv('AWS_REGION'))

    try:
        # Describe stack outputs
        response = cf_client.describe_stacks(StackName=stack_name)
        if 'Stacks' in response and len(response['Stacks']) > 0:
            stack_outputs = response['Stacks'][0].get('Outputs', [])
            for output in stack_outputs:
                if output['OutputKey'] == output_key:
                    return output['OutputValue']
        else:
            print("No stacks found with the given name.")
    except Exception as e:
        print("An error occurred:", e)

def download_file(url, filename):
    # Stream=True ensures that the file is not downloaded all at once into memory
    response = requests.get(url, stream=True)
    total_size = int(response.headers.get('content-length', 0))
    block_size = 1024*1000  # 1 Mb
    progress_bar = tqdm(total=total_size, unit='B', unit_scale=True)

    with open(filename, 'wb') as f:
        for data in response.iter_content(block_size):
            progress_bar.update(len(data))
            f.write(data)
    progress_bar.close()

def unzip_file(gz_file):
    with gzip.open(gz_file, 'rb') as f_in:
        with open(gz_file[:-3], 'wb') as f_out:
            shutil.copyfileobj(f_in, f_out)

def delete_file(file_path):
    os.remove(file_path)

        
def fill_table(table_name, file):
    index = 0
    skipped_index = 0
    dynamodb = boto3.resource('dynamodb', region_name=os.getenv('AWS_REGION'))
    table = dynamodb.Table(table_name)
    items = []
    batch_size = 0
    product_code_batch = []
    for product in tqdm(file, desc="Loading data", unit=" products", unit_scale=1):
        product_json = json.loads(product)
        product_code = product_json.get('code', None)
        if product_code:
            if product_code in product_code_batch:
                print('same product code found in this batch {}'.format(product_code))
                continue
            product_code_batch.append(product_code)
            items.append({
                'PutRequest':{
                    'Item': {
                        'product': {
                            'product_name':product_json.get('product_name', ''),
                            'additives_tags':product_json.get('additives_tags', []),
                            'ingredients_text':product_json.get('ingredients_text')
                        },
                        'product_code':product_code,
                        
                    }
                }
            })
            index += 1
            batch_size += 1
            if batch_size % 25 == 0:
                dynamodb.batch_write_item(RequestItems={table_name: items})
                items = []
                product_code_batch = []
        else:
            skipped_index += 1
        logger.info("Loaded data into table %s.", table.name)

    return index, skipped_index

if __name__ == "__main__":
    url = 'https://static.openfoodfacts.org/data/openfoodfacts-products.jsonl.gz'

    print("Downloading the file.")
    gz_filename = "openfoodfacts-products.jsonl.gz"
    download_file(url, gz_filename)
    print("Download complete.")

    print('unzipping the file')
    unzip_file(gz_filename)
    print("Unzipping complete.")

    print("Deleting gz file.")
    delete_file(gz_filename)
    print("Deleted gz file.")

    stack_name = sys.argv[1]
    output_key = 'openFoodFactsProductsTableNameOutput'

    # Retrieve the value for the specified output key
    table_name = describe_stack_output(stack_name, output_key)
    if table_name:
        with open(gz_filename[:-3]) as f:
            try:
                uploaded, skipped = fill_table(table_name, f)
                print(f"Uploaded {uploaded} products to the table.")
                print(f"Skipped {skipped} products.")
            except Exception as e:
                print("An error occurred:", e)

