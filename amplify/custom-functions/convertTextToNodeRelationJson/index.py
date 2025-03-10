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
    logger.info(f"Received event: {event}")
    logger.info(f"Received context: {context}")
    arguments = event.get("arguments", {})
    text = arguments.get("text", "")

    if not text:
        return json.dumps(
            {"statusCode": 400, "body": json.dumps({"error": "Text input is required"})}
        )

    # Initialize the Bedrock client
    bedrock_client = boto3.client("bedrock-runtime")

    structured_output_schema = {
        "nodes": [
            {
                "labels": [
                    "STRING"
                ],  # Node labels in OpenCypher format (e.g., Person, Company)
                "properties": {"key": "value"},  # Properties
            }
        ],
        "edges": [
            {
                "source": {  # Source node matcher
                    "labels": ["STRING"],
                    "properties": {"key": "value"},
                },
                "target": {  # Target node matcher
                    "labels": ["STRING"],
                    "properties": {"key": "value"},
                },
                "type": "STRING",  # Relationship type in uppercase with underscores
                "properties": {"key": "value"},  # Relationship properties
            }
        ],
    }

    sample_output = {
        "nodes": [
            {"labels": ["Person"], "properties": {"name": "Alice"}},
            {"labels": ["Company"], "properties": {"name": "TechCorp"}},
            {"labels": ["Company"], "properties": {"name": "DataSoft"}},
        ],
        "edges": [
            {
                "source": {"labels": ["Person"], "properties": {"name": "Alice"}},
                "target": {"labels": ["Company"], "properties": {"name": "TechCorp"}},
                "type": "WORKS_AS",
                "properties": {"role": "CEO"},
            },
            {
                "source": {"labels": ["Person"], "properties": {"name": "Alice"}},
                "target": {"labels": ["Company"], "properties": {"name": "DataSoft"}},
                "type": "WORKED_AT",
                "properties": {"from": "2015", "to": "2020"},
            },
        ],
    }

    # Define the system prompt
    system_prompt_text = f"""You are an expert in graph database modeling and OpenCypher query generation. Your task is to:
1. Analyze Input Text:
  - Identify entities (nodes) and their relationships (edges).
  - Extract relevant properties for each entity and relationship.

2. Generate a Structured Graph Representation:
  - Nodes: Unique labels with essential properties (e.g., id, name).
  - Edges: Clear, meaningful relationships with direction and attributes.

3. Ensure Graph Consistency:
  - Each node must have a unique id.
  - Relationships must reference valid node types.
  - Properties must have the correct data types.
  - Maintain schema integrity (e.g., required fields, uniqueness).

4. Output Format:
  - Provide only valid JSON (no extra text).
  - Follow this strict schema:
{json.dumps(structured_output_schema, indent=2)}

5. Additional Considerations:
  - Support multilingual text, including Japanese characters.
  - Preserve contextual meaning (e.g., "CEO of Company X" → (:Person)-[:WORKS_AS]->(:Company)).
  - No extra explanations or formatting—output only the JSON object.

Example:
- Input: 'Alice is the CEO of TechCorp. She previously worked at DataSoft from 2015 to 2020.'
-Output: 
{json.dumps(sample_output, indent=2)}

Key Optimizations:
- Explicit Task Breakdown: Clearly defines each step (analysis, graph structure, consistency, output format).
- Strict JSON Schema Enforcement: Ensures all outputs conform to a structured format.
- Multilingual Support: Handles non-English (e.g., Japanese) text.
- Context Preservation: Translates relationships correctly.
- Zero Extraneous Output: Avoids unnecessary text, ensuring valid JSON.
"""

    system_prompt = [{"text": system_prompt_text}]

    prompt = f"""Convert the following text into a graph structure. 
Text to analyze: {text}"""

    try:
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
        graph_json = json.loads(response_text)
        logger.info(f"Graph JSON: {graph_json}")

        return json.dumps(
            {
                "statusCode": 200,
                "body": json.dumps(graph_json, ensure_ascii=False),
                "headers": {"Content-Type": "application/json; charset=utf-8"},
            }
        )

    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        return json.dumps(
            {
                "statusCode": 500,
                "body": json.dumps({"error": str(e)}, ensure_ascii=False),
                "headers": {"Content-Type": "application/json; charset=utf-8"},
            }
        )
