import logging
import json
import boto3
import os

# ------------------------------------------------------------------------------
# Logging Configuration
# ------------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
    handlers=[logging.StreamHandler()],
)
logger = logging.getLogger(__name__)

# ------------------------------------------------------------------------------
# Constants and Configuration
# ------------------------------------------------------------------------------


def handler(event, context):
    try:
        logger.info(f"Received event: {event}")
        logger.info(f"Received context: {context}")

        # Validate input
        if not isinstance(event, dict) or "arguments" not in event:
            raise ValueError("Invalid event structure: 'arguments' field is required")

        arguments = event.get("arguments", {})
        nodeRelationJson = arguments.get("nodeRelationJson")

        if not nodeRelationJson:
            raise ValueError("Node Relation Json input is required")

        # Parse the stringified JSON input
        nodeRelationJson = json.loads(nodeRelationJson)

        # Initialize the Bedrock client
        bedrock_client = boto3.client("bedrock-runtime")

        # Define the system prompt
        system_prompt_text = """You are an expert in graph databases and OpenCypher query language. Your task is to convert the provided JSON graph structure into equivalent OpenCypher queries that will actually work.

Requirements:
1. Generate CREATE statements for all nodes first
2. Follow with CREATE statements for all relationships
3. Use parameters where appropriate (e.g., $properties)
4. Include proper indexing/constraints for key properties
5. Ensure proper escaping of special characters
6. Handle array properties appropriately
7. Maintain data types (string, number, boolean)
8. Your response must contain ONLY the OpenCypher query statements, with no additional text.

Expected Output Format:
1. Constraint/Index creation (if needed)
2. Node creation statements
3. Relationship creation statements
4. Each statement should end with a semicolon
5. Include comments for clarity

Additional Guidelines:
- Use MERGE instead of CREATE where uniqueness is important
- Group similar operations together
- Follow Neo4j best practices for naming conventions
- Ensure proper handling of null values
- Consider batch operations for large datasets

Example Input:
{
  "nodes": [
    // node objects
  ],
  "edges": [
    // edge objects
  ]
}

Example Output:
CREATE CONSTRAINT IF NOT EXISTS FOR (n:Label) REQUIRE n.id IS UNIQUE;
MERGE (n:Label {id: '1', name: 'Test'});
CREATE (a)-[:RELATION]->(b);

Please generate clear, efficient, and properly formatted OpenCypher queries ONLY."""

        system_prompt = [{"text": system_prompt_text}]

        # Use json.dumps to safely serialize the JSON for the prompt
        prompt = (
            "Convert the following JSON into a OpenCypher query.\nNode Relation Json to analyze: "
            + json.dumps(nodeRelationJson)
        )

        response = bedrock_client.converse(
            modelId="anthropic.claude-3-5-sonnet-20240620-v1:0",
            system=system_prompt,
            messages=[{"role": "user", "content": [{"text": prompt}]}],
            inferenceConfig={
                "maxTokens": 4096,
                "temperature": 0.0,
                "topP": 0.0,
            },
        )

        response_text = response["output"]["message"]["content"][0]["text"]
        logger.info(f"Response Text: {response_text}")

        return {
            "statusCode": 200,
            "body": json.dumps(response_text, ensure_ascii=False),
            "headers": {"Content-Type": "application/json; charset=utf-8"},
        }

    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        return {
            "statusCode": 500,
            "body": json.dumps(
                {"error": str(e), "type": type(e).__name__}, ensure_ascii=False
            ),
            "headers": {"Content-Type": "application/json; charset=utf-8"},
        }
