"use client";

import {
    View,
    Heading,
    SelectField,
    Button,
    TextField,
    TextAreaField,
    Text,
    Alert,
} from "@aws-amplify/ui-react";
import { AIConversation } from "@aws-amplify/ui-react-ai";
import { useState, useEffect } from "react";
import { client, useAIConversation } from "../../client";

interface PromptData {
    id: string;
    name: string;
    systemPrompt: string;
    createdAt: string;
    updatedAt: string;
}

interface Message {
    role: "user" | "assistant";
    content: [
        {
            text: string;
        }
    ];
}

export default function SystemPromptSelector() {
    const [systemPrompts, setSystemPrompts] = useState<PromptData[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [selectedPrompt, setSelectedPrompt] = useState<string>("");
    const [isCreatingNewPrompt, setIsCreatingNewPrompt] =
        useState<boolean>(false);
    const [newPromptName, setNewPromptName] = useState<string>("");
    const [newPromptSystemPrompt, setNewPromptSystemPrompt] =
        useState<string>("");
    const [isDeletingPrompt, setIsDeletingPrompt] = useState<boolean>(false);
    const [deletingPromptId, setDeletingPromptId] = useState<string>("");
    const [deletingPrompt, setDeletingPrompt] = useState<string>("");
    const [userMessage, setUserMessage] = useState<string>("");
    const [messages, setMessages] = useState<Message[]>([]);

    // Clear messages after 5 seconds
    useEffect(() => {
        if (error || success) {
            const timer = setTimeout(() => {
                setError(null);
                setSuccess(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [error, success]);

    // Fetch System Prompt from Database
    const fetchSystemPrompts = async () => {
        try {
            setLoading(true);
            setError(null);
            const { data, errors } = await client.models.systemPrompts.list();
            console.log("[SystemPromptSelector] Fetched system prompts:", {
                data,
                errors,
            });

            if (errors?.length) {
                const errorMessage =
                    errors[0]?.message || "Failed to fetch system prompts";
                console.error(
                    "[SystemPromptSelector] Error fetching prompts:",
                    errors
                );
                setError(errorMessage);
                return;
            }

            if (!data || data.length === 0) {
                console.log("[SystemPromptSelector] No prompts found");
            }

            setSystemPrompts(data || []);
        } catch (err) {
            const errorMessage =
                err instanceof Error
                    ? err.message
                    : "An unexpected error occurred";
            console.error(
                "[SystemPromptSelector] Exception fetching prompts:",
                err
            );
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // Reflect Immediately
    useEffect(() => {
        fetchSystemPrompts();
    }, []);

    // Create New Prompt
    const createSystemPrompt = async (
        newPromptName: string,
        newPromptSystemPrompt: string
    ) => {
        try {
            if (!newPromptName.trim() || !newPromptSystemPrompt.trim()) {
                setError("Name and system prompt are required");
                return;
            }

            setLoading(true);
            setError(null);

            const { data, errors } = await client.models.systemPrompts.create({
                name: newPromptName,
                systemPrompt: newPromptSystemPrompt,
            });

            console.log("[SystemPromptSelector] Created system prompt:", {
                data,
                errors,
            });

            if (errors?.length) {
                const errorMessage =
                    errors[0]?.message || "Failed to create system prompt";
                console.error(
                    "[SystemPromptSelector] Error creating prompt:",
                    errors
                );
                setError(errorMessage);
                return;
            }

            setSystemPrompts((prevPrompts) => [
                ...prevPrompts,
                data as PromptData,
            ]);
            setSuccess("Prompt created successfully");
            setIsCreatingNewPrompt(false);
            setNewPromptName("");
            setNewPromptSystemPrompt("");
        } catch (err) {
            const errorMessage =
                err instanceof Error
                    ? err.message
                    : "An unexpected error occurred";
            console.error(
                "[SystemPromptSelector] Exception creating prompt:",
                err
            );
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // Delete Prompt
    const deleteSystemPrompt = async (promptId: string) => {
        try {
            if (!promptId) {
                setError("No prompt selected for deletion");
                return;
            }

            setLoading(true);
            setError(null);

            const { data, errors } = await client.models.systemPrompts.delete({
                id: promptId,
            });

            console.log("[SystemPromptSelector] Deleted system prompt:", {
                data,
                errors,
            });

            if (errors?.length) {
                const errorMessage =
                    errors[0]?.message || "Failed to delete system prompt";
                console.error(
                    "[SystemPromptSelector] Error deleting prompt:",
                    errors
                );
                setError(errorMessage);
                return;
            }

            setSystemPrompts((prevPrompts) =>
                prevPrompts.filter((prompt) => prompt.id !== promptId)
            );
            setSuccess("Prompt deleted successfully");
            setIsDeletingPrompt(false);
            setDeletingPromptId("");
        } catch (err) {
            const errorMessage =
                err instanceof Error
                    ? err.message
                    : "An unexpected error occurred";
            console.error(
                "[SystemPromptSelector] Exception deleting prompt:",
                err
            );
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // AI Converse
    const handleConverse = async () => {
        try {
            messages.push({
                role: "user",
                content: [
                    {
                        text: userMessage,
                    },
                ],
            });

            // Convert to JSON string to pass to the Lambda function
            const formattedUserMessage = JSON.stringify(messages);

            const response = await client.queries.converseSystemPrompt({
                systemPrompt: selectedPrompt,
                Messages: formattedUserMessage,
            });

            const data = JSON.parse(response.data as string);
            const statusCode = data.statusCode;
            const body = JSON.parse(data.body);
            const response_message = body.messages[0];

            messages.push(response_message);

            console.log(messages);

            // Clear user message input
            setUserMessage("");
        } catch (err) {
            console.error("Error in conversation:", err);
            setError("Failed to get response from AI");
        }
    };

    const clearConversation = async () => {
        setMessages([]);
        setUserMessage("");
    };

    return (
        <View padding="2rem">
            <Heading level={1}>System Prompt Selector</Heading>

            {error && (
                <Alert
                    variation="error"
                    isDismissible={true}
                    onDismiss={() => setError(null)}
                >
                    {error}
                </Alert>
            )}

            {success && (
                <Alert
                    variation="success"
                    isDismissible={true}
                    onDismiss={() => setSuccess(null)}
                >
                    {success}
                </Alert>
            )}

            <SelectField
                label="Select a system prompt"
                placeholder="Select a system prompt"
                onChange={(e) => setSelectedPrompt(e.target.value)}
                isDisabled={loading}
            >
                {systemPrompts.map((prompt) => (
                    <option key={prompt.id} value={prompt.systemPrompt}>
                        {prompt.name}
                    </option>
                ))}
            </SelectField>
            {selectedPrompt && (
                <Text
                    as="pre"
                    fontFamily="monospace"
                    backgroundColor="var(--amplify-colors-background-secondary)"
                    padding="1rem"
                    whiteSpace="pre-wrap"
                >
                    {selectedPrompt}
                </Text>
            )}

            <View>
                <Heading level={2}>System Prompt</Heading>
                <Button
                    onClick={() => setIsCreatingNewPrompt(true)}
                    isDisabled={loading}
                >
                    Create New Prompt
                </Button>
                <Button
                    onClick={() => setIsDeletingPrompt(true)}
                    isDisabled={loading}
                >
                    Delete Prompt
                </Button>
            </View>

            {isCreatingNewPrompt && (
                <View>
                    <Heading level={2}>Create New Prompt</Heading>
                    <TextField
                        label="Name"
                        onChange={(e) => setNewPromptName(e.target.value)}
                        isDisabled={loading}
                        required
                    />
                    <TextAreaField
                        label="System Prompt"
                        onChange={(e) =>
                            setNewPromptSystemPrompt(e.target.value)
                        }
                        isDisabled={loading}
                        required
                    />
                    <Button
                        onClick={() =>
                            createSystemPrompt(
                                newPromptName,
                                newPromptSystemPrompt
                            )
                        }
                        isDisabled={loading}
                        isLoading={loading}
                    >
                        Register
                    </Button>
                </View>
            )}

            {isDeletingPrompt && (
                <View>
                    <Heading level={2}>Delete Prompt</Heading>
                    <SelectField
                        label="Select a prompt to delete"
                        placeholder="Select a prompt to delete"
                        onChange={(e) => setDeletingPromptId(e.target.value)}
                        isDisabled={loading}
                        required
                    >
                        {systemPrompts.map((prompt) => (
                            <option key={prompt.id} value={prompt.id}>
                                {prompt.name}
                            </option>
                        ))}
                    </SelectField>
                    <Text>{deletingPrompt}</Text>
                    <Button
                        onClick={() => deleteSystemPrompt(deletingPromptId)}
                        isDisabled={loading || !deletingPromptId}
                        isLoading={loading}
                    >
                        Delete
                    </Button>
                </View>
            )}

            <View>
                <Heading level={2}>Chat</Heading>
                <TextAreaField
                    label="Test Chat"
                    onChange={(e) => setUserMessage(e.target.value)}
                    value={userMessage}
                />
                <Button onClick={() => handleConverse()}>Converse</Button>

                <Button onClick={() => clearConversation()}>Clear</Button>
            </View>

            <View padding="1rem">
                {messages.map((message, index) => (
                    <Text
                        key={index}
                        as="pre"
                        fontFamily="monospace"
                        backgroundColor="var(--amplify-colors-background-secondary)"
                        padding="1rem"
                        whiteSpace="pre-wrap"
                    >
                        {message.role === "user"
                            ? "User: " + message.content[0].text
                            : "AI: " + message.content[0].text}
                    </Text>
                ))}
            </View>
        </View>
    );
}
