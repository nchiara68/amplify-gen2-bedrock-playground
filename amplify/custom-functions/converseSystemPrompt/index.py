import logging
import json
import boto3
from botocore.exceptions import BotoCoreError, ClientError
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def handler(event, context):
    """
    AWS Lambda handler to interface with Anthropic's Claude model via Amazon Bedrock's `converse` API.
    """
    # Initialize AWS Bedrock client
    try:
        bedrock = boto3.client(service_name="bedrock-runtime")
    except Exception as e:
        logger.error(f"Failed to initialize Bedrock client: {e}")
        return {
            "statusCode": 500,
            "body": json.dumps(
                {"error": "Internal server error during client initialization"}
            ),
        }

    # Configuration using environment variables
    model_id = "anthropic.claude-3-5-sonnet-20241022-v2:0"
    # model_id = "anthropic.claude-3-haiku-20240307-v1:0"

    if not model_id:
        logger.error("Environment variable 'BEDROCK_MODEL_ID' is not set.")
        return {
            "statusCode": 500,
            "body": json.dumps({"error": "Model ID configuration error"}),
        }

    # Validate the request
    arguments = event.get("arguments")
    if not isinstance(arguments, dict):
        logger.error("Invalid or missing 'arguments' in the event.")
        return {
            "statusCode": 400,
            "body": json.dumps({"error": "Invalid or missing 'arguments'"}),
        }

    system_prompt = arguments.get("systemPrompt", "You are a helpful AI assistant.")
    messages = arguments.get("Messages")

    if not isinstance(messages, str) or not messages.strip():
        logger.error("Invalid or missing 'userMessage'.")
        return {
            "statusCode": 400,
            "body": json.dumps({"error": "Invalid or missing 'userMessage'"}),
        }

    # Parse the user message which is now a JSON string
    # Try to parse as JSON first (new format)
    messages = json.loads(messages)

    # Prepare inference configuration
    inference_config = {
        "maxTokens": 4096,
        "temperature": 1,
        "topP": 0.999,
        "stopSequences": [],
    }

    try:
        # Call AWS Bedrock `converse` API
        response = bedrock.converse(
            modelId=model_id,
            messages=messages,
            inferenceConfig=inference_config,
            system=[{"text": system_prompt}],
        )

        # Parse response
        response_body = (
            response.get("output", {})
            .get("message", {})
            .get("content", [{}])[0]
            .get("text", "")
        )
        if not response_body:
            logger.error("Received empty response from Claude.")
            return {
                "statusCode": 502,
                "body": json.dumps({"error": "Empty response from Claude"}),
            }

        # Log the successful interaction
        logger.info(f"Claude response: {response_body}")

        # Return the model's response
        return {
            "statusCode": 200,
            "body": json.dumps(
                {
                    "messages": [
                        {"role": "assistant", "content": [{"text": response_body}]}
                    ]
                }
            ),
        }

    except (BotoCoreError, ClientError) as e:
        logger.error(f"AWS Bedrock service error: {e}")
        return {
            "statusCode": 502,
            "body": json.dumps({"error": f"AWS Bedrock service error: {e}"}),
        }
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return {
            "statusCode": 500,
            "body": json.dumps({"error": "Internal server error"}),
        }
