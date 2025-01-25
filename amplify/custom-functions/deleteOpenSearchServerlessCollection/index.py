import boto3 

# Creating, listing, and deleting Amazon OpenSearch Serverless collections
# https://docs.aws.amazon.com/ja_jp/opensearch-service/latest/developerguide/serverless-manage.html

def handler(event, context):

    arguments = event.get("arguments", {})
    collectionName = arguments.get("collectionName", 'test')

    # Create a Boto3 client for Amazon Bedrock
    opensearch_client = boto3.client('opensearchserverless')

    # https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/opensearchserverless/client/list_collections.html
    response = opensearch_client.list_collections(
        collectionFilters={
            'name': collectionName,
        },
    )

    if not response['collectionSummaries']:
        return {
            'status': 'FAILED',
            'message': f"No collection found with name: {collectionName}"
        }
    collectionId = response['collectionSummaries'][0]['id']

    # https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/opensearchserverless/client/delete_collection.html
    response_delete_collection = opensearch_client.delete_collection(
        id=collectionId,
    )

    # https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/opensearchserverless/client/delete_security_policy.html
    response_delete_policy = opensearch_client.delete_security_policy(
        name=f'{collectionName}-security-policy',
        type='encryption'
    )

    return {
        'status': 'SUCCESS',
        'message': f"Collection {collectionName} and its security policy deleted successfully.",
        'deleteCollectionResponse': response_delete_collection,
        'deletePolicyResponse': response_delete_policy
    }
