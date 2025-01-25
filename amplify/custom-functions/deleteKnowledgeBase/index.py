import boto3
import json

def handler(event, context):
    """
    AWS Lambda function to delete an IAM role, a collection, and a knowledge base using AWS services.

    Parameters:
    - event (dict): The event payload containing the following keys under 'arguments':
        - collectionName (str): Name of the collection to be deleted.
        - knowledgeBaseName (str): Name of the knowledge base to be deleted.
        - roleName (str): Name of the IAM role to be deleted.

    - context (LambdaContext): AWS Lambda context object (not used in this implementation).

    Returns:
    - dict: A response object containing a status code and body message:
        - statusCode (int): HTTP status code indicating success (200) or failure (500).
        - body (str): JSON-formatted message with details about the operation result.
    """
    # Initialize the clients for OpenSearch, Bedrock, and IAM
    opensearch_client = boto3.client('opensearchserverless', region_name='ap-northeast-1')
    bedrock_client = boto3.client('bedrock', region_name='ap-northeast-1')
    iam_client = boto3.client('iam')

    # Extract arguments from the event payload
    arguments = event.get('arguments', {})

    # Retrieve resource details
    collection_name = arguments.get('collectionName')
    knowledge_base_name = arguments.get('knowledgeBaseName')
    role_name = arguments.get('roleName')

    if not collection_name or not knowledge_base_name or not role_name:
        return {
            'statusCode': 400,
            'body': json.dumps({'message': 'collectionName, knowledgeBaseName, and roleName are required.'})
        }

    try:
        # Step 1: Delete the collection in OpenSearch Serverless
        opensearch_client.delete_collection(
            clientToken='delete-collection-' + collection_name,
            name=collection_name
        )

        # Step 2: Delete the knowledge base in Bedrock
        bedrock_client.delete_knowledge_base(
            name=knowledge_base_name
        )

        # Step 3: Detach policies and delete the IAM role
        attached_policies = iam_client.list_attached_role_policies(
            RoleName=role_name
        )
        for policy in attached_policies['AttachedPolicies']:
            iam_client.detach_role_policy(
                RoleName=role_name,
                PolicyArn=policy['PolicyArn']
            )

        # Finally, delete the IAM role
        iam_client.delete_role(
            RoleName=role_name
        )

        # Return a success response
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'IAM role, collection, and knowledge base deleted successfully.',
                'deletedCollection': collection_name,
                'deletedKnowledgeBase': knowledge_base_name,
                'deletedRole': role_name
            })
        }
    except Exception as e:
        # Catch any exceptions and return an error response with the exception message
        return {
            'statusCode': 500,
            'body': json.dumps({'message': str(e)})
        }