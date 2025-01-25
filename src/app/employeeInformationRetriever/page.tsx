"use client";

import { useState } from "react";
import { client } from "../../client";

import outputs from "../../../amplify_outputs.json";
import {
    Flex,
    Heading,
    Text,
    Button,
    TextField,
    Loader,
    Table,
    TableHead,
    TableCell,
    TableRow,
    TableBody,
} from "@aws-amplify/ui-react";

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

export default function EmployeeInformationRetriever() {
    // S3 Bucket and Folder Prefix
    const s3_bucket = outputs.storage.bucket_name;
    const s3_folder_prefix = "datasets/";

    // State for FAISS Index Creation
    const [
        createFaissIndexResponseMessage,
        setCreateFaissIndexResponseMessage,
    ] = useState<string>("");
    const [
        createFaissIndexResponseStatusCode,
        setCreateFaissIndexResponseStatusCode,
    ] = useState<number>(0);
    const [isCreatingFaissIndex, setIsCreatingFaissIndex] =
        useState<boolean>(false);

    // State for RAG Query
    const [query, setQuery] = useState<string>("");
    const [k, setK] = useState<number>(5);
    const [ragResponse, setRagResponse] = useState<string>("");
    const [isProcessingRag, setIsProcessingRag] = useState<boolean>(false);
    const [ragError, setRagError] = useState<string>("");
    interface RetrievedDoc {
        doc_key: string;
        doc_text: string;
    }
    type RetrievedDocs = Record<string, RetrievedDoc>;
    const [retrievedDocs, setRetrievedDocs] = useState<RetrievedDocs>({});

    return (
        <Flex direction="column" alignItems="center" padding="1rem" gap="1rem">
            <Heading level={1}>Employee Information Retriever</Heading>
            <Text>Features: RAG (Retrieve-Augment-Generate), FAISS</Text>
            <StorageBrowser />

            <FileUploader
                acceptedFileTypes={["*"]}
                path={s3_folder_prefix}
                maxFileCount={1}
                isResumable
            />

            {/* Create FAISS Index Button */}
            <Button
                onClick={async () => {
                    setIsCreatingFaissIndex(true);
                    setCreateFaissIndexResponseStatusCode(0);
                    setCreateFaissIndexResponseMessage("");
                    try {
                        const response = await client.queries.createFaissIndex({
                            s3_bucket: s3_bucket,
                            s3_key: s3_folder_prefix,
                        });
                        const data = JSON.parse(response.data as string);
                        const statusCode = data.statusCode;
                        const message = data.message;
                        console.log(statusCode);
                        console.log(message);
                        setCreateFaissIndexResponseStatusCode(statusCode);
                        setCreateFaissIndexResponseMessage(message);
                    } catch (error: any) {
                        console.error("Error creating FAISS index:", error);
                        setCreateFaissIndexResponseStatusCode(500);
                        setCreateFaissIndexResponseMessage(
                            "Failed to create FAISS index."
                        );
                    } finally {
                        setIsCreatingFaissIndex(false);
                    }
                }}
                isLoading={isCreatingFaissIndex}
                loadingText="Creating FAISS Index..."
            >
                Create FAISS Index
            </Button>

            <Table
                caption="FAISS Index Traget Data Location"
                highlightOnHover={false}
                variation="bordered"
            >
                <TableBody>
                    <TableCell>S3 Bucket</TableCell>
                    <TableCell>{s3_bucket}</TableCell>
                </TableBody>
                <TableBody>
                    <TableCell>S3 Key</TableCell>
                    <TableCell>{s3_folder_prefix}</TableCell>
                </TableBody>
            </Table>
            
            {createFaissIndexResponseStatusCode !== 0 && (
                <Flex direction="column" alignItems="center" gap="0.5rem">
                    <Text>
                        Status Code: {createFaissIndexResponseStatusCode}
                    </Text>
                    <Text>Message: {createFaissIndexResponseMessage}</Text>
                </Flex>
            )}

            {/* Divider */}
            <Flex width="100%" height="1px" backgroundColor="lightgray" />

            {/* RAG Query Section */}
            <Flex
                direction="column"
                alignItems="center"
                gap="0.5rem"
                width="100%"
                maxWidth="600px"
            >
                <Heading level={2}>
                    Retrieve-Augment-Generate (RAG) Query
                </Heading>
                <TextField
                    label="Your Query"
                    placeholder="Enter your question here..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    isRequired
                    width="100%"
                />
                <TextField
                    label="Number of Similar Documents (k)"
                    placeholder="e.g., 5"
                    type="number"
                    value={k}
                    onChange={(e) => setK(parseInt(e.target.value) || 5)}
                    width="100%"
                    min={1}
                />
                <Button
                    onClick={async () => {
                        // Basic validation
                        if (!query.trim()) {
                            setRagError("Query cannot be empty.");
                            return;
                        }
                        setIsProcessingRag(true);
                        setRagResponse("");
                        setRagError("");

                        try {
                            // Invoke the Lambda query
                            const response = await client.queries.ragFaissIndex(
                                {
                                    s3_bucket: s3_bucket,
                                    query: query,
                                    k: k,
                                }
                            );
                            console.log("Raw response from API: ", response);

                            // 'response.data' should be the stringified JSON returned by your Lambda
                            const data = JSON.parse(response.data as string);
                            console.log("Parsed top-level data: ", data);

                            // Expected structure: { statusCode: number, body: string }
                            const { statusCode, body } = data;
                            if (!body) {
                                // If for some reason 'body' is missing, treat it as an error
                                setRagError("No response body found.");
                                return;
                            }

                            // Body itself is another JSON string: { status: ..., message: ..., query: ..., answer: ... }
                            const parsedBody = JSON.parse(body);
                            console.log("Parsed response body: ", parsedBody);

                            // Check statusCode first
                            if (statusCode !== 200) {
                                // Non-200 from Lambda: treat as an error
                                const maybeMessage =
                                    parsedBody?.message || "Request failed.";
                                setRagError(
                                    `Error ${statusCode}: ${maybeMessage}`
                                );
                                return;
                            }

                            // If statusCode is 200, also check 'parsedBody.status'
                            if (parsedBody?.status === "error") {
                                // The Lambda returned success at HTTP level but an internal error response
                                const errorMessage =
                                    parsedBody?.message ||
                                    "An unknown error occurred.";
                                setRagError(errorMessage);
                                return;
                            }

                            // Otherwise, assume success
                            // 'answer' is typically in parsedBody.answer
                            const answer = parsedBody?.answer || "";
                            console.log("Final Answer: ", answer);
                            setRagResponse(answer);
                            setRetrievedDocs(
                                parsedBody?.retrieved_docs as RetrievedDocs
                            );
                        } catch (error: any) {
                            console.error("Error processing RAG query:", error);
                            setRagError(
                                "Failed to generate an answer (client error)."
                            );
                        } finally {
                            setIsProcessingRag(false);
                        }
                    }}
                    isLoading={isProcessingRag}
                    loadingText="Processing..."
                >
                    Get Answer
                </Button>

                {/* Display any error that occurred */}
                {ragError && <Text color="red">{ragError}</Text>}

                {/* Display the retrieved answer, if any */}
                {ragResponse && (
                    <Flex
                        direction="column"
                        alignItems="center"
                        gap="0.5rem"
                        marginTop="1rem"
                    >
                        <Heading level={3}>Answer:</Heading>
                        <Text>{ragResponse}</Text>
                    </Flex>
                )}

                {Object.entries(retrievedDocs).length > 0 && (
                    <Flex
                        direction="column"
                        alignItems="flex-start"
                        marginTop="1rem"
                        gap="0.5rem"
                    >
                        <Heading level={4}>Retrieved Documents</Heading>
                        {Object.entries(retrievedDocs).map(([idx, doc]) => (
                            <Flex
                                key={idx}
                                direction="column"
                                padding="0.5rem"
                                border="1px solid #ccc"
                            >
                                <Text fontWeight="bold">
                                    Doc Key: {doc.doc_key}
                                </Text>
                                <Text>Doc Text: {doc.doc_text}</Text>
                            </Flex>
                        ))}
                    </Flex>
                )}
            </Flex>
        </Flex>
    );
}
