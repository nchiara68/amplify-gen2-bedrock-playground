import boto3 

# Creating, listing, and deleting Amazon OpenSearch Serverless collections
# https://docs.aws.amazon.com/ja_jp/opensearch-service/latest/developerguide/serverless-manage.html

def handler(event, context):

    arguments = event.get("arguments", {})
    collectionName = arguments.get("collectionName", 'test')
    description = arguments.get("description", 'test')

    # Create a Boto3 client for Amazon Bedrock
    opensearch_client = boto3.client('opensearchserverless')

    # Create security policy
    # https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/opensearchserverless/client/create_security_policy.html
    try:
        response_security_policy = opensearch_client.create_security_policy(
            name=f'{collectionName}-security-policy',
            policy="""
                {
                    \"Rules\":[
                        {
                            \"ResourceType\":\"collection\",
                            \"Resource\":[
                                \"collection\/*\"
                            ]
                        }
                    ],
                    \"AWSOwnedKey\":true
                }
            """,
            type='encryption'
        )
    except Exception as e:
        return {
            'status': 'FAILED',
            'message': 'Failed to create security policy',
            'error': str(e)
        }

    # Create collection
    # https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/opensearchserverless/client/create_collection.html
    try:
        response_collection = opensearch_client.create_collection(
            name=collectionName,
            standbyReplicas='DISABLED',
            type='VECTORSEARCH'
        )
    except Exception as e:
        return {
            'status': 'FAILED',
            'message': 'Failed to create collection',
            'error': str(e)
        }

    # Return success response
    return {
        'status': 'SUCCESS',
        'message': f"Collection '{collectionName}' and security policy created successfully.",
        'securityPolicyResponse': response_security_policy,
        'collectionResponse': response_collection
    }