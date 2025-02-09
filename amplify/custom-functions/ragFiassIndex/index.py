import os
import json
import logging
import pickle
import tempfile
import traceback
from typing import Any, Dict, List, Optional

import boto3
import faiss
import numpy as np
from botocore.exceptions import ClientError

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
# Adjust these to match your environment and model specifics
# ------------------------------------------------------------------------------
EMBEDDING_DIM: int = 1024  # Must match your embedding model's output dimension

# S3-related constants
FAISS_INDEX_NAME: str = "faiss_index.index"
DOC_IDS_FILENAME: str = "doc_ids.pkl"
FAISS_INDEX_S3_KEY: str = f"faiss_indexes/{FAISS_INDEX_NAME}"
DOC_IDS_S3_KEY: str = f"faiss_indexes/{DOC_IDS_FILENAME}"

# Bedrock Model Configuration
BEDROCK_EMBED_MODEL_ID: str = os.environ.get(
    "BEDROCK_EMBED_MODEL_ID", "cohere.embed-multilingual-v3"
)
BEDROCK_GEN_MODEL_ID: str = os.environ.get(
    "BEDROCK_GEN_MODEL_ID", "anthropic.claude-3-5-sonnet-20240620-v1:0"
)

# Batching for embedding requests
BATCH_SIZE: int = 32

# ------------------------------------------------------------------------------
# Utility / Helper Functions
# ------------------------------------------------------------------------------


def load_faiss_index(
    s3_client: "boto3.client", bucket: str, index_key: str, embedding_dim: int
) -> faiss.Index:
    """
    Loads a FAISS index from S3. If it does not exist, creates a new L2 index.

    :param s3_client: An S3 client for downloading the index.
    :param bucket: Name of the S3 bucket.
    :param index_key: S3 key (path) under which the FAISS index is stored.
    :param embedding_dim: Expected dimensionality of the embedding vectors.
    :return: A FAISS Index instance.
    """
    with tempfile.NamedTemporaryFile(delete=False) as tmp_file:
        try:
            logger.info(
                f"Attempting to download FAISS index from s3://{bucket}/{index_key} ..."
            )
            s3_client.download_file(bucket, index_key, tmp_file.name)
            index = faiss.read_index(tmp_file.name)
            logger.info(
                f"Loaded FAISS index from s3://{bucket}/{index_key} (dim: {index.d})."
            )
        except ClientError as e:
            error_code = e.response["Error"]["Code"]
            if error_code == "NoSuchKey":
                logger.warning(
                    "FAISS index not found in S3. Creating a new IndexFlatL2 index..."
                )
                index = faiss.IndexFlatL2(embedding_dim)
                logger.info(
                    f"Created new FAISS IndexFlatL2 with dimension: {embedding_dim}"
                )
            else:
                logger.error(f"Failed to download FAISS index from S3: {e}")
                raise e
        except Exception as e:
            logger.error(
                f"Unexpected error loading FAISS index: {traceback.format_exc()}"
            )
            raise e
    return index


def load_doc_ids(s3_client: "boto3.client", bucket: str, key: str) -> List[str]:
    """
    Loads a list of document IDs from S3 (via pickle).
    If the file does not exist, returns an empty list.

    :param s3_client: An S3 client for downloading the doc IDs file.
    :param bucket: Name of the S3 bucket.
    :param key: S3 key (path) to the doc IDs pickle file.
    :return: A list of document ID strings.
    """
    try:
        with tempfile.NamedTemporaryFile(delete=False) as tmp_file:
            logger.info(f"Attempting to download doc IDs from s3://{bucket}/{key} ...")
            s3_client.download_file(bucket, key, tmp_file.name)
            with open(tmp_file.name, "rb") as f:
                doc_ids = pickle.load(f)

        logger.info(f"Loaded {len(doc_ids)} document IDs from S3.")
        return list(doc_ids)  # ensure it's a list
    except ClientError as e:
        error_code = e.response["Error"]["Code"]
        if error_code == "NoSuchKey":
            logger.warning("Document IDs not found in S3. Returning an empty list.")
            return []
        else:
            logger.error(
                f"Failed to load document IDs from S3: {traceback.format_exc()}"
            )
            return []
    except Exception as e:
        logger.error(f"Error loading document IDs: {traceback.format_exc()}")
        return []


def get_embeddings(
    texts: List[str],
    bedrock_client: "boto3.client",
    model_id: str = BEDROCK_EMBED_MODEL_ID,
) -> List[List[float]]:
    """
    Retrieves embeddings for the given texts using the specified Bedrock embedding model.
    Supports batching if the text list is large.

    :param texts: The list of input texts to embed.
    :param bedrock_client: A Bedrock client capable of calling the 'invoke_model' API.
    :param model_id: The model ID for the embedding model on Bedrock.
    :return: A list of embedding vectors, each matching EMBEDDING_DIM in size.
    """
    logger.info(f"Requesting embeddings for {len(texts)} text(s).")

    embeddings: List[List[float]] = []

    for i in range(0, len(texts), BATCH_SIZE):
        batch_texts = texts[i : i + BATCH_SIZE]
        payload = {"input": batch_texts}  # Adjust to your model’s embed API

        try:
            response = bedrock_client.invoke_model(
                modelId=model_id,
                contentType="application/json",
                body=json.dumps(payload),
            )
            response_body = response["body"].read().decode("utf-8")
            response_payload = json.loads(response_body)

            # The key below ("embeddings") may differ depending on the model's actual response structure.
            batch_embeddings = response_payload.get("embeddings", [])

            if not batch_embeddings:
                logger.warning(
                    f"No embeddings returned for batch {(i // BATCH_SIZE) + 1}."
                )
                embeddings.extend([[0.0] * EMBEDDING_DIM] * len(batch_texts))
            else:
                for emb in batch_embeddings:
                    if len(emb) != EMBEDDING_DIM:
                        logger.warning(
                            f"Embedding dimension mismatch: expected {EMBEDDING_DIM}, got {len(emb)}"
                        )
                embeddings.extend(batch_embeddings)

            logger.info(
                f"Batch {(i // BATCH_SIZE) + 1} / {((len(texts) - 1) // BATCH_SIZE) + 1} processed."
            )

        except ClientError:
            logger.error(
                f"ClientError while retrieving embeddings:\n{traceback.format_exc()}"
            )
            embeddings.extend([[0.0] * EMBEDDING_DIM] * len(batch_texts))
        except Exception:
            logger.error(f"Error during embedding retrieval:\n{traceback.format_exc()}")
            embeddings.extend([[0.0] * EMBEDDING_DIM] * len(batch_texts))

    return embeddings


def parse_assistant_message(response: Dict[str, Any]) -> str:
    """
    Parse the assistant's message from the Bedrock 'converse' API response.

    :param response: The raw response dictionary returned from bedrock.converse(...)
    :return: The text content of the "assistant" role's message, or a default placeholder if none.
    """
    output: Dict[str, Any] = response.get("output", {})
    message: Dict[str, Any] = output.get("message", {})
    if not message:
        return "NO MESSAGE"

    if message.get("role") == "assistant":
        content_list = message.get("content", [])
        if (
            content_list
            and isinstance(content_list, list)
            and "text" in content_list[0]
        ):
            return content_list[0]["text"]

    return "NO ASSISTANT MESSAGE"


def retrieve_documents_from_s3(
    s3_client: "boto3.client", bucket: str, doc_keys: List[str]
) -> List[str]:
    """
    Given a list of S3 object keys, retrieve the document content from each.

    :param s3_client: Boto3 S3 client for downloading objects.
    :param bucket: Name of the S3 bucket.
    :param doc_keys: A list of S3 object keys.
    :return: A list of document contents as strings (in the same order as doc_keys).
    """
    documents: List[str] = []
    for doc_key in doc_keys:
        try:
            with tempfile.NamedTemporaryFile(delete=False) as tmp_file:
                s3_client.download_file(bucket, doc_key, tmp_file.name)
                with open(tmp_file.name, "r", encoding="utf-8") as f:
                    content = f.read()
            documents.append(content)
            logger.info(f"Retrieved document from key: {doc_key}")
        except Exception:
            logger.error(
                f"Failed to retrieve document '{doc_key}' from S3:\n{traceback.format_exc()}"
            )
            # Optionally append an empty string or skip
            documents.append("")
    return documents


# ------------------------------------------------------------------------------
# Lambda Handler
# ------------------------------------------------------------------------------


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    AWS Lambda entrypoint for a Retrieve-Augment-Generate (RAG) workflow using:
      1. A FAISS index stored in S3 for retrieval
      2. An embedding model on Bedrock
      3. A generative model on Bedrock (via 'converse') for final answer.

    Expects the following in 'event["arguments"]':
      - s3_bucket (str): The S3 bucket name containing the FAISS index and documents.
      - query (str): The user’s query/question.
      - k (int, optional): Number of documents to retrieve from the index. Default is 5.

    :param event: The event dictionary passed in by AWS Lambda.
    :param context: Lambda context object (unused in this sample).
    :return: A dictionary with "statusCode" (int) and "body" (JSON string).
    """
    arguments = event.get("arguments", {})

    # Required parameters from the event
    s3_bucket: Optional[str] = arguments.get("s3_bucket")
    query: Optional[str] = arguments.get("query")
    k: int = arguments.get("k", 5)

    # Validate parameters
    if not s3_bucket:
        error_msg = "Parameter 's3_bucket' is missing or empty."
        logger.error(error_msg)
        return {
            "statusCode": 400,
            "body": json.dumps({"status": "error", "message": error_msg}),
        }

    if not query:
        error_msg = "Parameter 'query' is missing or empty."
        logger.error(error_msg)
        return {
            "statusCode": 400,
            "body": json.dumps({"status": "error", "message": error_msg}),
        }

    try:
        k = int(k)
        if k <= 0:
            raise ValueError("Parameter 'k' must be a positive integer.")
    except ValueError as ve:
        logger.error(f"Invalid 'k' value: {ve}")
        return {
            "statusCode": 400,
            "body": json.dumps(
                {"status": "error", "message": f"Invalid 'k' value: {ve}"}
            ),
        }

    # Initialize AWS clients
    s3_client = boto3.client("s3", region_name="ap-northeast-1")
    bedrock_client = boto3.client("bedrock-runtime", region_name="ap-northeast-1")

    # ------------------------------------------------------------------------------
    # 1. Load FAISS index and document IDs
    # ------------------------------------------------------------------------------
    try:
        index = load_faiss_index(
            s3_client, s3_bucket, FAISS_INDEX_S3_KEY, EMBEDDING_DIM
        )
        doc_ids = load_doc_ids(s3_client, s3_bucket, DOC_IDS_S3_KEY)
        logger.info(f"Number of loaded doc IDs: {len(doc_ids)}")
    except Exception as e:
        error_trace = traceback.format_exc()
        logger.error(f"Failed to load FAISS index or doc IDs. Error:\n{error_trace}")
        return {
            "statusCode": 500,
            "body": json.dumps(
                {
                    "status": "error",
                    "message": "Failed to load FAISS index or doc IDs from S3.",
                    "details": error_trace,
                }
            ),
        }

    # ------------------------------------------------------------------------------
    # 2. Get the embedding for the user query
    # ------------------------------------------------------------------------------
    try:
        embeddings = get_embeddings([query], bedrock_client, BEDROCK_EMBED_MODEL_ID)
        if not embeddings:
            raise RuntimeError("No embeddings returned from Bedrock.")
        query_embedding = np.array(embeddings, dtype=np.float32)
        logger.info(f"Query embedding shape: {query_embedding.shape}")
    except Exception as e:
        error_trace = traceback.format_exc()
        logger.error(f"Failed to retrieve embeddings. Error:\n{error_trace}")
        return {
            "statusCode": 500,
            "body": json.dumps(
                {
                    "status": "error",
                    "message": "Error during embedding retrieval.",
                    "details": error_trace,
                }
            ),
        }

    # Validate embedding dimension
    if query_embedding.shape[1] != EMBEDDING_DIM:
        error_msg = (
            f"Embedding dimension mismatch. "
            f"Expected: {EMBEDDING_DIM}, but got: {query_embedding.shape[1]}"
        )
        logger.error(error_msg)
        return {
            "statusCode": 500,
            "body": json.dumps({"status": "error", "message": error_msg}),
        }

    # ------------------------------------------------------------------------------
    # 3. FAISS similarity search
    # ------------------------------------------------------------------------------
    try:
        distances, indices = index.search(query_embedding, k)
        logger.info(f"Top {k} documents found by FAISS search.")
        logger.debug(f"Indices: {indices}, Distances: {distances}")
    except Exception as e:
        error_trace = traceback.format_exc()
        logger.error(f"Error during FAISS search:\n{error_trace}")
        return {
            "statusCode": 500,
            "body": json.dumps(
                {
                    "status": "error",
                    "message": "Error during FAISS retrieval.",
                    "details": error_trace,
                }
            ),
        }

    # ------------------------------------------------------------------------------
    # 4. Retrieve the actual documents from S3
    # ------------------------------------------------------------------------------
    valid_indices = [idx for idx in indices[0] if 0 <= idx < len(doc_ids)]
    doc_keys = [doc_ids[idx] for idx in valid_indices]
    if not doc_keys:
        error_msg = "No valid doc keys returned by FAISS search."
        logger.error(error_msg)
        return {
            "statusCode": 200,
            "body": json.dumps(
                {
                    "status": "success",
                    "message": error_msg,
                    "answer": "",
                    "retrieved_docs": [],
                }
            ),
        }

    retrieved_docs = retrieve_documents_from_s3(s3_client, s3_bucket, doc_keys)
    logger.info(f"Successfully retrieved {len(retrieved_docs)} documents from S3.")

    # If all retrieved docs are empty or invalid
    if all(not doc for doc in retrieved_docs):
        error_msg = "Could not retrieve any non-empty documents."
        logger.error(error_msg)
        return {
            "statusCode": 200,
            "body": json.dumps(
                {
                    "status": "success",
                    "message": error_msg,
                    "answer": "",
                    "retrieved_docs": [],
                }
            ),
        }

    # ------------------------------------------------------------------------------
    # 5. Construct conversation + call the generative model via 'converse'
    # ------------------------------------------------------------------------------
    system = [
        {
            "text": (
                "You are an intelligent assistant tasked with answering questions "
                "based on the provided documents. Use the information from the documents "
                "to construct a clear, concise, and accurate answer. If the documents "
                "do not contain the necessary info, state that it’s not available.\n"
            )
        }
    ]

    user_content_blocks = []
    # Include both the document text and its name (the S3 key)
    for i, (doc_text, doc_key) in enumerate(zip(retrieved_docs, doc_keys), 1):
        user_content_blocks.append(
            {"text": f"Document {i} (source: {doc_key}):\n{doc_text}\n"}
        )

    # Finally, append the user’s question
    user_content_blocks.append({"text": f"Question: {query}\n"})

    messages = [{"role": "user", "content": user_content_blocks}]

    inference_config = {"maxTokens": 500, "temperature": 0.7, "topP": 0.8}

    try:
        response = bedrock_client.converse(
            modelId=BEDROCK_GEN_MODEL_ID,
            messages=messages,
            system=system,
            inferenceConfig=inference_config,
        )
        logger.info("Bedrock 'converse' call succeeded. Parsing the response...")
        answer = parse_assistant_message(response)
        logger.info("Answer successfully parsed from the model response.")
    except ClientError as e:
        error_trace = traceback.format_exc()
        logger.error(f"Failed to call Bedrock generative model:\n{error_trace}")
        return {
            "statusCode": 500,
            "body": json.dumps(
                {
                    "status": "error",
                    "message": "Failed to generate an answer via the Bedrock model.",
                    "details": error_trace,
                }
            ),
        }
    except Exception as e:
        error_trace = traceback.format_exc()
        logger.error(f"Error during answer generation:\n{error_trace}")
        return {
            "statusCode": 500,
            "body": json.dumps(
                {
                    "status": "error",
                    "message": "Error during answer generation.",
                    "details": error_trace,
                }
            ),
        }

    # Final success return
    return {
        "statusCode": 200,
        "body": json.dumps(
            {
                "status": "success",
                "query": query,
                "answer": answer,
                "retrieved_docs": {
                    i: {"doc_key": doc_key, "doc_text": doc_text}
                    for i, (doc_key, doc_text) in enumerate(
                        zip(doc_keys, retrieved_docs)
                    )
                },
            }
        ),
    }
