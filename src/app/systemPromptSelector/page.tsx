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
import { useState, useEffect } from "react";
import { client, useAIConversation } from "../../client";

// Defines the structure of a system prompt from the database
interface PromptData {
    id: string;
    name: string;
    systemPrompt: string;
    createdAt: string;
    updatedAt: string;
}

// Defines the structure of chat messages between user and AI
interface Message {
    role: "user" | "assistant";
    content: [
        {
            text: string;
        }
    ];
}

export default function SystemPromptSelector() {
    // State management for system prompts
    const [systemPrompts, setSystemPrompts] = useState<PromptData[]>([]);
    const [selectedPrompt, setSelectedPrompt] = useState<string>("");

    // UI state management
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // New prompt creation state
    const [isCreatingNewPrompt, setIsCreatingNewPrompt] =
        useState<boolean>(false);
    const [newPromptName, setNewPromptName] = useState<string>("");
    const [newPromptSystemPrompt, setNewPromptSystemPrompt] =
        useState<string>("");

    // Prompt deletion state
    const [isDeletingPrompt, setIsDeletingPrompt] = useState<boolean>(false);
    const [deletingPromptId, setDeletingPromptId] = useState<string>("");
    const [deletingPrompt, setDeletingPrompt] = useState<string>("");

    // Chat interaction state
    const [userMessage, setUserMessage] = useState<string>("");
    const [messages, setMessages] = useState<Message[]>([]);

    // Auto-clear status messages after 5 seconds
    useEffect(() => {
        if (error || success) {
            const timer = setTimeout(() => {
                setError(null);
                setSuccess(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [error, success]);

    // Fetches all system prompts from the database
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

    // Load prompts on component mount
    useEffect(() => {
        fetchSystemPrompts();
    }, []);

    // Creates a new system prompt in the database
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

    // Deletes a system prompt from the database
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

    // Handles conversation with AI using selected system prompt
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
            setUserMessage("");
        } catch (err) {
            console.error("Error in conversation:", err);
            setError("Failed to get response from AI");
        }
    };

    // Clears the current conversation history
    const clearConversation = async () => {
        setMessages([]);
        setUserMessage("");
    };

    // Component UI render
    return (
        // Main container with padding
        <View padding="2rem">
            {/* Main title of the component */}
            <Heading level={1}>System Prompt Selector</Heading>

            {/* Error alert message - displays when there's an error state */}
            {error && (
                <Alert
                    variation="error"
                    isDismissible={true}
                    onDismiss={() => setError(null)}
                >
                    {error}
                </Alert>
            )}

            {/* Success alert message - displays when an action is successful */}
            {success && (
                <Alert
                    variation="success"
                    isDismissible={true}
                    onDismiss={() => setSuccess(null)}
                >
                    {success}
                </Alert>
            )}

            {/* Dropdown field for selecting existing system prompts */}
            <SelectField
                label="Select a system prompt"
                placeholder="Select a system prompt"
                onChange={(e) => setSelectedPrompt(e.target.value)}
                isDisabled={loading}
            >
                {/* Maps through available prompts to create dropdown options */}
                {systemPrompts.map((prompt) => (
                    <option key={prompt.id} value={prompt.systemPrompt}>
                        {prompt.name}
                    </option>
                ))}
            </SelectField>

            {/* Display selected prompt content in a pre-formatted box */}
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

            {/* System Prompt Management Section */}
            <View>
                <Heading level={2}>System Prompt</Heading>
                {/* Button to show the create prompt form */}
                <Button
                    onClick={() => setIsCreatingNewPrompt(true)}
                    isDisabled={loading}
                >
                    Create New Prompt
                </Button>
                {/* Button to show the delete prompt form */}
                <Button
                    onClick={() => setIsDeletingPrompt(true)}
                    isDisabled={loading}
                >
                    Delete Prompt
                </Button>
            </View>

            {/* Create New Prompt Form - shown when isCreatingNewPrompt is true */}
            {isCreatingNewPrompt && (
                <View>
                    <Heading level={2}>Create New Prompt</Heading>
                    {/* Input field for prompt name */}
                    <TextField
                        label="Name"
                        onChange={(e) => setNewPromptName(e.target.value)}
                        isDisabled={loading}
                        required
                    />
                    {/* Text area for prompt content */}
                    <TextAreaField
                        label="System Prompt"
                        onChange={(e) =>
                            setNewPromptSystemPrompt(e.target.value)
                        }
                        isDisabled={loading}
                        required
                    />
                    {/* Submit button for creating new prompt */}
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

            {/* Delete Prompt Form - shown when isDeletingPrompt is true */}
            {isDeletingPrompt && (
                <View>
                    <Heading level={2}>Delete Prompt</Heading>
                    {/* Dropdown to select prompt for deletion */}
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
                    {/* Button to confirm prompt deletion */}
                    <Button
                        onClick={() => deleteSystemPrompt(deletingPromptId)}
                        isDisabled={loading || !deletingPromptId}
                        isLoading={loading}
                    >
                        Delete
                    </Button>
                </View>
            )}

            {/* Chat Interface Section */}
            <View>
                <Heading level={2}>Chat</Heading>
                {/* Text area for user input */}
                <TextAreaField
                    label="Test Chat"
                    onChange={(e) => setUserMessage(e.target.value)}
                    value={userMessage}
                />
                {/* Buttons for chat actions */}
                <Button onClick={() => handleConverse()}>Converse</Button>
                <Button onClick={() => clearConversation()}>Clear</Button>
            </View>

            {/* Chat Message Display Section */}
            <View padding="1rem">
                {/* Maps through conversation messages and displays them */}
                {messages.map((message, index) => (
                    <Text
                        key={index}
                        as="pre"
                        fontFamily="monospace"
                        backgroundColor="var(--amplify-colors-background-secondary)"
                        padding="1rem"
                        whiteSpace="pre-wrap"
                    >
                        {/* Formats message differently based on sender (user/AI) */}
                        {message.role === "user"
                            ? "User: " + message.content[0].text
                            : "AI: " + message.content[0].text}
                    </Text>
                ))}
            </View>
        </View>
    );
}
