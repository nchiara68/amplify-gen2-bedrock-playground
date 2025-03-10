import logging
import json
import boto3
import os
from botocore.config import Config

# ------------------------------------------------------------------------------
# Added import for specific boto exceptions for more granular error handling
# ------------------------------------------------------------------------------
from botocore.exceptions import ClientError, BotoCoreError, ConnectTimeoutError

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
        openCypherQuery = arguments.get("openCypherQuery")
        neptuneEndpoint = arguments.get("neptuneEndpoint")

        if not openCypherQuery:
            raise ValueError("Open Cypher Query input is required")
        if not neptuneEndpoint:
            raise ValueError("Neptune Endpoint input is required")

        logger.info(f"Attempting to connect to Neptune endpoint: {neptuneEndpoint}")

        # Ensure the endpoint URL has the correct format
        # if not neptuneEndpoint.startswith("https://"):
        #     neptuneEndpoint = f"https://{neptuneEndpoint}"
        # if "/opencypher" not in neptuneEndpoint:
        #     neptuneEndpoint = f"{neptuneEndpoint}/opencypher"

        logger.info(f"Using formatted Neptune endpoint: {neptuneEndpoint}")

        # Create a client configuration with shorter timeouts to fail fast if the endpoint is unreachable
        neptune_config = Config(
            connect_timeout=300,
            read_timeout=300,
        )

        # Initialize the Neptune client with the custom configuration
        neptune_client = boto3.client(
            "neptunedata",
            region_name="ap-northeast-1",
            endpoint_url=neptuneEndpoint,
            config=neptune_config,
        )

        logger.info(f"Executing OpenCypher query: {openCypherQuery}")
        response = neptune_client.execute_open_cypher_query(
            openCypherQuery=openCypherQuery,
            # parameters={},
        )

        results = response.get("results", [])
        logger.info(f"Results: {results}")

        return {
            "statusCode": 200,
            "body": json.dumps(results),
            "headers": {"Content-Type": "application/json; charset=utf-8"},
        }

    # Catch input and validation related errors
    except ValueError as ve:
        logger.exception("Validation error occurred:")
        return {
            "statusCode": 400,
            "body": json.dumps(
                {"error": str(ve), "type": type(ve).__name__}, ensure_ascii=False
            ),
            "headers": {"Content-Type": "application/json; charset=utf-8"},
        }
    # Catch connection timeout errors specifically
    except ConnectTimeoutError as timeout_err:
        logger.exception("Connection to Neptune endpoint timed out:")
        return {
            "statusCode": 504,  # 504 indicates a gateway timeout
            "body": json.dumps(
                {
                    "error": "Connection timed out. Check Neptune endpoint connectivity and VPC settings.",
                    "type": "ConnectTimeoutError",
                },
                ensure_ascii=False,
            ),
            "headers": {"Content-Type": "application/json; charset=utf-8"},
        }
    # Catch Neptune client specific errors (connectivity, query execution, etc.)
    except (ClientError, BotoCoreError) as client_err:
        logger.exception("Neptune client error occurred:")
        return {
            "statusCode": 502,
            "body": json.dumps(
                {"error": str(client_err), "type": type(client_err).__name__},
                ensure_ascii=False,
            ),
            "headers": {"Content-Type": "application/json; charset=utf-8"},
        }
    # Catch any other unexpected errors
    except Exception as e:
        logger.exception("Unexpected error occurred:")
        return {
            "statusCode": 500,
            "body": json.dumps(
                {"error": str(e), "type": type(e).__name__}, ensure_ascii=False
            ),
            "headers": {"Content-Type": "application/json; charset=utf-8"},
        }
