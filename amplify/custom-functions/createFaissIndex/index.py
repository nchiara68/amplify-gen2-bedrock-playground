# FAISS Vector Store without LangChain - Best Practices Implementation

import boto3
import os
import faiss
import pickle
import json
import logging
import tempfile
import numpy as np
from botocore.exceptions import ClientError
from typing import List, Dict, Any

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Constants and Configuration
FAISS_INDEX_NAME = "faiss_index.index"
DOC_IDS_FILENAME = "doc_ids.pkl"
FAISS_INDEX_S3_KEY = "faiss_indexes/" + FAISS_INDEX_NAME
DOC_IDS_S3_KEY = "faiss_indexes/" + DOC_IDS_FILENAME
EMBEDDING_DIM = 1024  # Adjust based on the embedding model's output
BEDROCK_MODEL_ID = "cohere.embed-multilingual-v3"  # Update as necessary
BATCH_SIZE = 32  # Number of texts per batch for embedding

def get_embeddings(texts: List[str], model_id: str = BEDROCK_MODEL_ID) -> List[List[float]]:
    """
    Obtain embeddings for a list of texts using AWS Bedrock.

    Args:
        texts (List[str]): List of text strings to embed.
        model_id (str): The Bedrock model ID to use for embedding.

    Returns:
        List[List[float]]: List of embedding vectors.
    """
    bedrock = boto3.client('bedrock-runtime')
    embeddings = []

    logger.info(f"Obtaining embeddings for {len(texts)} texts using Bedrock model {model_id}.")

    # Batch processing to optimize API calls
    for i in range(0, len(texts), BATCH_SIZE):
        batch_texts = texts[i:i+BATCH_SIZE]
        payload = {"text": batch_texts}  # Adjust payload structure as per model requirements

        try:
            response = bedrock.invoke_model(
                modelId=model_id,
                contentType='application/json',
                body=json.dumps(payload)
            )
            response_payload = json.loads(response['body'].read())
            batch_embeddings = response_payload.get('embeddings', [])  # Adjust key based on model response
            embeddings.extend(batch_embeddings)
            logger.info(f"Processed batch {i//BATCH_SIZE + 1}: Obtained {len(batch_embeddings)} embeddings.")
        except ClientError as e:
            logger.error(f"Bedrock model invocation failed: {e}")
            # Append zero vectors or handle as per requirements
            embeddings.extend([[0.0] * EMBEDDING_DIM] * len(batch_texts))

    return embeddings

def load_faiss_index(index_path: str, embedding_dim: int) -> faiss.Index:
    """
    Load or create a FAISS index.

    Args:
        index_path (str): Path to the FAISS index file.
        embedding_dim (int): Dimension of the embedding vectors.

    Returns:
        faiss.Index: Loaded or newly created FAISS index.
    """
    if os.path.exists(index_path):
        try:
            index = faiss.read_index(index_path)
            logger.info(f"FAISS index loaded from {index_path}.")
        except Exception as e:
            logger.error(f"Failed to load FAISS index: {e}")
            index = faiss.IndexFlatL2(embedding_dim)
            logger.info("Created a new FAISS index.")
    else:
        index = faiss.IndexFlatL2(embedding_dim)
        logger.info("Created a new FAISS index.")
    return index

def save_faiss_index(index: faiss.Index, index_path: str) -> None:
    """
    Save the FAISS index to disk.

    Args:
        index (faiss.Index): The FAISS index to save.
        index_path (str): Path where the index will be saved.
    """
    try:
        faiss.write_index(index, index_path)
        logger.info(f"FAISS index saved to {index_path}.")
    except Exception as e:
        logger.error(f"Failed to save FAISS index: {e}")

def load_doc_ids(s3_client: boto3.client, bucket: str, key: str) -> set:
    """
    Load document IDs from S3.

    Args:
        s3_client (boto3.client): Boto3 S3 client.
        bucket (str): S3 bucket name.
        key (str): S3 object key for document IDs.

    Returns:
        set: Set of document IDs.
    """
    try:
        with tempfile.NamedTemporaryFile(delete=False) as tmp_file:
            s3_client.download_file(bucket, key, tmp_file.name)
            with open(tmp_file.name, 'rb') as f:
                doc_ids = pickle.load(f)
            logger.info(f"Loaded {len(doc_ids)} document IDs from S3.")
            return doc_ids
    except ClientError as e:
        if e.response['Error']['Code'] == 'NoSuchKey':
            logger.info("No existing document IDs found in S3. Starting fresh.")
            return set()
        else:
            logger.error(f"Failed to load document IDs from S3: {e}")
            return set()
    except Exception as e:
        logger.error(f"Error loading document IDs: {e}")
        return set()

def save_doc_ids(s3_client: boto3.client, bucket: str, key: str, doc_ids: set) -> None:
    """
    Save document IDs to S3.

    Args:
        s3_client (boto3.client): Boto3 S3 client.
        bucket (str): S3 bucket name.
        key (str): S3 object key for document IDs.
        doc_ids (set): Set of document IDs to save.
    """
    try:
        with tempfile.NamedTemporaryFile(delete=False) as tmp_file:
            with open(tmp_file.name, 'wb') as f:
                pickle.dump(doc_ids, f)
            s3_client.upload_file(tmp_file.name, bucket, key)
        logger.info(f"Saved {len(doc_ids)} document IDs to S3.")
    except ClientError as e:
        logger.error(f"Failed to save document IDs to S3: {e}")
    except Exception as e:
        logger.error(f"Error saving document IDs: {e}")

def list_s3_files(s3_client: boto3.client, bucket: str, prefix: str) -> set:
    """
    List all file keys in an S3 bucket with the given prefix.

    Args:
        s3_client (boto3.client): Boto3 S3 client.
        bucket (str): S3 bucket name.
        prefix (str): S3 prefix to filter objects.

    Returns:
        set: Set of S3 object keys.
    """
    try:
        paginator = s3_client.get_paginator('list_objects_v2')
        page_iterator = paginator.paginate(Bucket=bucket, Prefix=prefix)
        keys = set()
        for page in page_iterator:
            contents = page.get('Contents', [])
            for obj in contents:
                key = obj['Key']
                if not key.endswith('/'):
                    keys.add(key)
        logger.info(f"Found {len(keys)} files in S3 bucket {bucket} with prefix {prefix}.")
        return keys
    except ClientError as e:
        logger.error(f"Failed to list S3 objects: {e}")
        return set()

def download_file(s3_client: boto3.client, bucket: str, key: str, download_path: str) -> bool:
    """
    Download a file from S3 to a local path.

    Args:
        s3_client (boto3.client): Boto3 S3 client.
        bucket (str): S3 bucket name.
        key (str): S3 object key.
        download_path (str): Local file path to save the downloaded file.

    Returns:
        bool: True if download succeeds, False otherwise.
    """
    try:
        s3_client.download_file(bucket, key, download_path)
        logger.info(f"Downloaded {key} to {download_path}.")
        return True
    except ClientError as e:
        logger.error(f"Failed to download {key} from S3: {e}")
        return False

def upload_file(s3_client: boto3.client, bucket: str, key: str, file_path: str) -> bool:
    """
    Upload a local file to S3.

    Args:
        s3_client (boto3.client): Boto3 S3 client.
        bucket (str): S3 bucket name.
        key (str): S3 object key.
        file_path (str): Local file path to upload.

    Returns:
        bool: True if upload succeeds, False otherwise.
    """
    try:
        s3_client.upload_file(file_path, bucket, key)
        logger.info(f"Uploaded {file_path} to s3://{bucket}/{key}.")
        return True
    except ClientError as e:
        logger.error(f"Failed to upload {file_path} to S3: {e}")
        return False

def process_files(s3_client: boto3.client, bucket: str, keys: set, index: faiss.Index, doc_ids: set) -> None:
    """
    Process new files: download, extract texts, obtain embeddings, and add to FAISS index.

    Args:
        s3_client (boto3.client): Boto3 S3 client.
        bucket (str): S3 bucket name.
        keys (set): Set of S3 object keys to process.
        index (faiss.Index): FAISS index to update.
        doc_ids (set): Set of already processed document IDs.
    """
    new_keys = keys - doc_ids
    logger.info(f"Processing {len(new_keys)} new files.")

    for s3_key in new_keys:
        with tempfile.TemporaryDirectory() as tmp_dir:
            local_file_path = os.path.join(tmp_dir, os.path.basename(s3_key))
            if not download_file(s3_client, bucket, s3_key, local_file_path):
                continue

            try:
                with open(local_file_path, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
                texts = [line.strip() for line in lines if line.strip()]
                if not texts:
                    logger.warning(f"No valid lines found in {s3_key}. Skipping.")
                    continue

                embeddings = get_embeddings(texts)
                embeddings_array = np.array(embeddings).astype('float32')

                # Check embedding dimensions
                if embeddings_array.shape[1] != EMBEDDING_DIM:
                    logger.error(f"Embedding dimension mismatch for {s3_key}. Expected {EMBEDDING_DIM}, got {embeddings_array.shape[1]}.")
                    continue

                index.add(embeddings_array)
                doc_ids.add(s3_key)
                logger.info(f"Added {len(embeddings)} embeddings from {s3_key} to FAISS index.")
            except Exception as e:
                logger.error(f"Failed to process {s3_key}: {e}")

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    AWS Lambda handler function to create and update FAISS index.

    Args:
        event (Dict[str, Any]): Lambda event data.
        context (Any): Lambda context.

    Returns:
        Dict[str, Any]: Response containing status and message.
    """
    # Initialize S3 client
    s3 = boto3.client("s3")

    # Extract parameters from event
    arguments = event.get("arguments", {})
    s3_bucket = arguments.get("s3_bucket")
    s3_prefix = arguments.get("s3_prefix", "datasets/")

    if not s3_bucket:
        logger.error("s3_bucket parameter is missing.")
        return {"status": "error", "message": "s3_bucket parameter is required."}

    # List S3 files
    s3_keys = list_s3_files(s3, s3_bucket, s3_prefix)
    if not s3_keys:
        logger.error("No files found in the specified S3 bucket and prefix.")
        return {"status": "error", "message": "No files found in the specified folder."}

    # Setup temporary directory for processing
    with tempfile.TemporaryDirectory() as tmp_dir:
        faiss_index_path = os.path.join(tmp_dir, FAISS_INDEX_NAME)
        doc_ids_path = os.path.join(tmp_dir, DOC_IDS_FILENAME)

        # Download existing FAISS index from S3 if it exists
        if not download_file(s3, s3_bucket, FAISS_INDEX_S3_KEY, faiss_index_path):
            # If download fails because the file doesn't exist, initialize a new index
            logger.info("Initializing a new FAISS index.")
            index = faiss.IndexFlatL2(EMBEDDING_DIM)
        else:
            # Load existing FAISS index
            index = load_faiss_index(faiss_index_path, EMBEDDING_DIM)

        # Load existing document IDs from S3
        current_doc_ids = load_doc_ids(s3, s3_bucket, DOC_IDS_S3_KEY)

        # Identify and remove documents that no longer exist in S3
        docs_to_remove = current_doc_ids - s3_keys
        if docs_to_remove:
            logger.info(f"Found {len(docs_to_remove)} documents to remove from FAISS index.")
            # FAISS does not support deletion. Rebuild the index without the removed documents.
            # This requires maintaining a mapping from document IDs to FAISS IDs.
            # For simplicity, this step is omitted. Consider using other index types or methods if deletion is required.

        # Process and add new files to FAISS index
        process_files(s3, s3_bucket, s3_keys, index, current_doc_ids)

        # Save the updated FAISS index locally
        save_faiss_index(index, faiss_index_path)

        # Upload the updated FAISS index back to S3
        if not upload_file(s3, s3_bucket, FAISS_INDEX_S3_KEY, faiss_index_path):
            return {"status": "error", "message": "Failed to upload FAISS index to S3."}

        # Save and upload updated document IDs
        save_doc_ids(s3, s3_bucket, DOC_IDS_S3_KEY, current_doc_ids)

    logger.info("FAISS index successfully created/updated and stored in S3.")
    return {
        "statusCode": 200,
        "message": f"FAISS index successfully created and stored at s3://{s3_bucket}/{FAISS_INDEX_S3_KEY}/"
    }