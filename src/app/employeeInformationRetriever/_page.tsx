"use client";

import { useState } from "react";
import { client } from "../../client";

import outputs from "../../../amplify_outputs.json";
import { Flex, Heading, Text, Button, TextField } from "@aws-amplify/ui-react";

// Amplify Configuration
import { Amplify } from "aws-amplify";
import config from "../../../amplify_outputs.json";
Amplify.configure(config);

// StorageBrowser
import {
    createAmplifyAuthAdapter,
    createStorageBrowser,
} from "@aws-amplify/ui-react-storage/browser";
export const { StorageBrowser } = createStorageBrowser({
    config: createAmplifyAuthAdapter(),
});

// File Uploader
import { FileUploader } from "@aws-amplify/ui-react-storage";
import { Json } from "@aws-amplify/data-schema";

export default function EmployeeInformationRetriever() {
    const s3_bucket = outputs.storage.bucket_name;
    const s3_region = outputs.storage.aws_region;
    const s3_folder_prefix = "datasets/";
    const s3_index_key = `faiss_indexes/${s3_folder_prefix}.faiss`;
    const bedrock_region = s3_region;
    const metadata_key = `faiss_indexes/${s3_folder_prefix}_metadata.json`;

    // State for Knowledge Base with default values
    const [collectionName, setCollectionName] = useState("default-collection");
    const [collectionDescription, setCollectionDescription] = useState(
        "Default description for the collection."
    );
    const [knowledgeBaseName, setKnowledgeBaseName] = useState(
        "default-knowledge-base"
    );
    const [description, setDescription] = useState(
        "This is the default knowledge base description."
    );
    const [embeddingModelArn, setEmbeddingModelArn] = useState(
        // "arn:aws:bedrock:region:account-id:model-name"
        "arn:aws:bedrock:ap-northeast-1:471112852670:cohere.embed-multilingual-v3"
    );
    const [vectorIndexName, setVectorIndexName] =
        useState("DefaultVectorIndex");
    const [roleName, setRoleName] = useState("DefaultRoleName");
    const [statusMessage, setStatusMessage] = useState("");

    // Handler for creating a knowledge base
    const createKnowledgeBase = async () => {
        try {
            setStatusMessage("Creating Knowledge Base...");
            const response = await client.queries.createKnowledgeBase({
                collectionName,
                collectionDescription,
                knowledgeBaseName,
                description,
                embeddingModelArn,
                vectorIndexName,
            });

            console.log("Create Response:", response);
            const data = response.data as string;
            console.log("Create Response Data:", data);
            const body = JSON.parse(data).body;
            console.log("Create Response Data Body:", body);
            const statusCode = JSON.parse(data).statusCode;
            console.log("Create Response Data Body Status Code:", statusCode);
            const message = JSON.parse(body).message;
            console.log("Create Response Data Body Message:", message);

            if (statusCode == 200) {
                setStatusMessage(
                    `Knowledge Base created successfully.\nstatusCode: ${statusCode}\nMessage: ${message}`
                );
                console.log("Knowledge Base created successfully.");
                console.log("statusCode:", statusCode);
                console.log("Message:", message);
            } else {
                setStatusMessage(`Error creating knowledge base: ${message}`);
                console.error("Error creating knowledge base:", message);
            }
        } catch (error) {
            console.error("Error creating knowledge base:", error);
            setStatusMessage(`Error creating knowledge base: ${error}`);
        }
    };

    // Handler for deleting a knowledge base
    const deleteKnowledgeBase = async () => {
        try {
            setStatusMessage("Deleting Knowledge Base...");
            const response = await client.queries.deleteKnowledgeBase({
                collectionName,
                knowledgeBaseName,
                roleName,
            });

            console.log("Delete Response:", response);
            const data = response.data as string;
            console.log("Delete Response Data:", data);
            const body = JSON.parse(data).body;
            console.log("Delete Response Data Body:", body);
            const statusCode = JSON.parse(data).statusCode;
            console.log("Delete Response Data Body Status Code:", statusCode);
            const message = JSON.parse(body).message;
            console.log("Delete Response Data Body Message:", message);

            if (statusCode == 200) {
                setStatusMessage(
                    `Knowledge Base deleted successfully.\nstatusCode: ${statusCode}\nMessage: ${message}`
                );
                console.log("Knowledge Base Deleted successfully.");
                console.log("statusCode:", statusCode);
                console.log("Message:", message);
            } else {
                setStatusMessage(`Error deleting knowledge base: ${message}`);
                console.error("Error deleting knowledge base:", message);
            }
        } catch (error) {
            console.error("Error deleting knowledge base:", error);
            setStatusMessage(`Error deleting knowledge base: ${error}`);
        }
    };

    return (
        <Flex direction="column" gap="1rem" style={{ width: "100%" }}>
            <Flex>
                <Heading level={1}>ACT Counselor</Heading>
            </Flex>
            <Text>Features: RAG</Text>
            <StorageBrowser />
            <FileUploader
                acceptedFileTypes={["*"]}
                path={s3_folder_prefix}
                maxFileCount={1}
                isResumable
            />

            <Flex direction="column" gap="0.5rem" style={{ marginTop: "2rem" }}>
                <Heading level={2}>Knowledge Base Management</Heading>
                <TextField
                    label="Collection Name"
                    placeholder="Enter the collection name"
                    value={collectionName}
                    onChange={(e) => setCollectionName(e.target.value)}
                />
                <TextField
                    label="Collection Description"
                    placeholder="Enter a description for the collection"
                    value={collectionDescription}
                    onChange={(e) => setCollectionDescription(e.target.value)}
                />
                <TextField
                    label="Knowledge Base Name"
                    placeholder="Enter the knowledge base name"
                    value={knowledgeBaseName}
                    onChange={(e) => setKnowledgeBaseName(e.target.value)}
                />
                <TextField
                    label="Description"
                    placeholder="Enter a description for the knowledge base"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                />
                <TextField
                    label="Embedding Model ARN"
                    placeholder="Enter the embedding model ARN"
                    value={embeddingModelArn}
                    onChange={(e) => setEmbeddingModelArn(e.target.value)}
                />
                <TextField
                    label="Vector Index Name"
                    placeholder="Enter the vector index name"
                    value={vectorIndexName}
                    onChange={(e) => setVectorIndexName(e.target.value)}
                />
                <TextField
                    label="Role Name (For Deletion)"
                    placeholder="Enter the role name for deletion"
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                />

                <Flex gap="1rem">
                    <Button onClick={createKnowledgeBase} variation="primary">
                        Create Knowledge Base
                    </Button>
                    <Button
                        onClick={deleteKnowledgeBase}
                        variation="destructive"
                    >
                        Delete Knowledge Base
                    </Button>
                </Flex>

                {statusMessage && (
                    <Text as="div" variation="info">
                        {statusMessage}
                    </Text>
                )}
            </Flex>
        </Flex>
    );
}
