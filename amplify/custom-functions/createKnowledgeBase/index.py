import boto3
import json

def handler(event, context):
    """
    AWS Lambda function to create an IAM role, a collection, and a knowledge base using AWS services.

    Parameters:
    - event (dict): The event payload containing the following keys under 'arguments':
        - collectionName (str): Name of the collection to be created.
        - collectionDescription (str): Description of the collection.
        - knowledgeBaseName (str): Name of the knowledge base (optional, defaults to 'DefaultKnowledgeBase').
        - description (str): Description of the knowledge base (optional, defaults to 'Default Description').
        - embeddingModelArn (str): ARN of the embedding model used for the knowledge base.
        - vectorIndexName (str): Name of the vector index used for the knowledge base.

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

    # Extract arguments from the event payload, with defaults where applicable
    arguments = event.get('arguments', {})

    # Retrieve collection details
    collection_name = arguments.get('collectionName', 'DefaultCollection')
    collection_description = arguments.get('collectionDescription', 'Default Collection Description')

    # Retrieve knowledge base details
    knowledge_base_name = arguments.get('knowledgeBaseName', 'DefaultKnowledgeBase')
    description = arguments.get('description', 'Default Description')
    embedding_model_arn = arguments.get('embeddingModelArn')  # Required
    vector_index_name = arguments.get('vectorIndexName')  # Required

    try:
        # Step 1: Create an IAM role for Bedrock
        role_name = 'BedrockKnowledgeBaseRole'
        try:
            get_role_response = iam_client.get_role(RoleName=role_name)
            role_arn = get_role_response['Role']['Arn']
        except iam_client.exceptions.NoSuchEntityException:
            assume_role_policy_document = json.dumps({
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Principal": {
                            "Service": "bedrock.amazonaws.com"
                        },
                        "Action": "sts:AssumeRole"
                    }
                ]
            })

            # Create the role
            create_role_response = iam_client.create_role(
                RoleName=role_name,
                AssumeRolePolicyDocument=assume_role_policy_document
            )
            role_arn = create_role_response['Role']['Arn']

            # Attach necessary policies to the role
            policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonBedrockFullAccess"  # Example policy
            iam_client.attach_role_policy(
                RoleName=role_name,
                PolicyArn=policy_arn
            )

        # Step 2: Create a collection in OpenSearch Serverless

        def create_security_policy(opensearch_client, policy_name, resource_arn):
            """
            Create a security policy for OpenSearch Serverless collections.
            """
            try:
                response = opensearch_client.create_security_policy(
                    name=policy_name,
                    policy={
                        "Rules":[
                            {
                                "ResourceType":"collection",
                                "Resource":["*"]
                            }
                        ],
                    },
                    type='ENCRYPTION'
                )
                return response
            except Exception as e:
                raise Exception(f"Failed to create security policy: {str(e)}")
    
        # Create a unique policy name
        policy_name = f"security-policy-{collection_name}"

        # Use the resource ARN or wildcard for the policy
        resource_arn = f"arn:aws:opensearchserverless:ap-northeast-1:471112852670:collection/{collection_name}"

        # Create the security policy
        create_security_policy(opensearch_client, policy_name, resource_arn)

        # Proceed with collection creation
        collection_response = opensearch_client.create_collection(
            clientToken='create-collection-' + collection_name,
            description=collection_description,
            name=collection_name,
            type='VECTORSEARCH'
        )

        # Retrieve the collection ARN from the response
        collection_arn = collection_response['createCollectionDetail']['arn']

        # Step 3: Call the Bedrock API to create a knowledge base
        knowledge_base_response = bedrock_client.create_knowledge_base(
            name=knowledge_base_name,
            description=description,
            roleArn=role_arn,
            knowledgeBaseConfiguration={
                'type': 'VECTOR',
                'vectorKnowledgeBaseConfiguration': {
                    'embeddingModelArn': embedding_model_arn
                }
            },
            storageConfiguration={
                'type': 'OPENSEARCH_SERVERLESS',
                'opensearchServerlessConfiguration': {
                    'collectionArn': collection_arn,
                    'vectorIndexName': vector_index_name,
                    'fieldMapping': {
                        'vectorField': 'embedding',
                        'textField': 'AMAZON_BEDROCK_TEXT_CHUNK',
                        'metadataField': 'AMAZON_BEDROCK_METADATA'
                    }
                }
            }
        )

        # Return a success response with the API's responses
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'IAM role, collection, and knowledge base created successfully.',
                'roleArn': role_arn,
                'collectionResponse': collection_response,
                'knowledgeBaseResponse': knowledge_base_response
            })
        }
    except Exception as e:
        # Catch any exceptions and return an error response with the exception message
        return {
            'statusCode': 500,
            'body': json.dumps({'message': str(e)})
        }