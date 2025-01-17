"use client";
// Ensures this file is treated as client-side code in a Next.js application.

import { useState, useEffect } from "react";
// React hooks for managing component state and side effects.

import {
    AccountSettings,
    Divider,
    Heading,
    View,
    Text,
    Button,
    Input,
    Table,
    TableCell,
    TableBody,
    TableHead,
    TableRow,
    useTheme,
} from "@aws-amplify/ui-react";
// AWS Amplify UI React components for building the UI.

import {
    fetchUserAttributes,
    updateUserAttribute,
    confirmUserAttribute,
    // sendUserAttributeVerificationCode,
    type VerifiableUserAttributeKey,
} from "aws-amplify/auth";
// Amplify Auth utilities for managing user attributes and authentication flows.

export default function AccountSettingsPage() {
    // ==================== State Management ====================
    const [userAttributes, setUserAttributes] = useState<
        Record<string, string>
    >({});
    // Stores user attributes fetched from the backend.

    const [newEmail, setNewEmail] = useState(""); // Tracks the input value for updating email.
    const [newName, setNewName] = useState(""); // Tracks the input value for updating name.
    const [confirmationCode, setConfirmationCode] = useState(""); // Tracks the confirmation code input for email verification.
    const [currentAttributeKey, setCurrentAttributeKey] = useState<
        string | null
    >(null);
    // Tracks the attribute (e.g., email) being verified.

    const [loading, setLoading] = useState(false); // Tracks loading state for async operations.
    const [globalMessage, setGlobalMessage] = useState<{
        type: "success" | "error";
        text: string;
    } | null>(null);
    // Displays global messages, like errors or success notifications.

    const [emailMessage, setEmailMessage] = useState<string | null>(null); // Displays email-specific messages.
    const [nameMessage, setNameMessage] = useState<string | null>(null); // Displays name-specific messages.
    const [passwordMessage, setPasswordMessage] = useState<string | null>(null); // Displays password-specific messages.

    const { tokens } = useTheme(); // Retrieves theme tokens for consistent styling.

    // ==================== Event Handlers ====================
    // Fetches user attributes from AWS Cognito.
    const fetchAttributes = async () => {
        setLoading(true);
        setGlobalMessage(null);
        try {
            const data = await fetchUserAttributes(); // Fetch attributes from the backend.
            const attributes = Object.entries(data || {}).reduce<
                Record<string, string>
            >((acc, [key, value]) => {
                if (value !== undefined && value !== null) {
                    acc[key] = String(value); // Convert attribute values to strings.
                }
                return acc;
            }, {});
            setUserAttributes(attributes); // Update the state with fetched attributes.
        } catch (error) {
            console.error("Error fetching user attributes:", error);
            setGlobalMessage({
                type: "error",
                text: "Failed to fetch user attributes.",
            });
        } finally {
            setLoading(false);
        }
    };

    // Updates a user attribute (e.g., email or name).
    const handleUpdateAttribute = async (
        key: string,
        value: string,
        setMessage: React.Dispatch<React.SetStateAction<string | null>>
    ) => {
        if (!value.trim()) {
            setMessage(`${key} cannot be empty.`);
            return;
        }
        setLoading(true);
        setMessage(null);
        try {
            const result = await updateUserAttribute({
                userAttribute: { attributeKey: key, value },
            });
            if (
                result.nextStep.updateAttributeStep ===
                "CONFIRM_ATTRIBUTE_WITH_CODE"
            ) {
                setCurrentAttributeKey(key); // If confirmation is required, track the attribute key.
                setMessage(
                    `A confirmation code has been sent to your ${key}. Please enter it below.`
                );
            } else {
                setMessage(`${key} updated successfully.`);
            }
            fetchAttributes(); // Refresh user attributes.
        } catch (error) {
            setMessage(`Failed to update ${key}. ${error}`);
        } finally {
            setLoading(false);
        }
    };

    // Confirms a user attribute using a verification code.
    const handleConfirmAttribute = async () => {
        if (!currentAttributeKey || !confirmationCode.trim()) {
            setEmailMessage("Confirmation code is required.");
            return;
        }
        setLoading(true);
        setEmailMessage(null);
        try {
            await confirmUserAttribute({
                userAttributeKey:
                    currentAttributeKey as VerifiableUserAttributeKey,
                confirmationCode,
            });
            setEmailMessage(`${currentAttributeKey} confirmed successfully.`);
            setCurrentAttributeKey(null); // Reset the current attribute key after confirmation.
            setConfirmationCode(""); // Clear the confirmation code input.
            fetchAttributes(); // Refresh user attributes.
        } catch (error) {
            setEmailMessage(`Failed to confirm attribute. ${error}`);
        } finally {
            setLoading(false);
        }
    };

    // Handles password update success.
    const handleUpdatePassword = async () => {
        setPasswordMessage("Your password has been updated successfully.");
    };

    // ==================== Lifecycle ====================
    useEffect(() => {
        fetchAttributes(); // Fetch user attributes when the component mounts.
    }, []);

    // ==================== Render ====================
    return (
        <main>
            <Heading level={1}>Account Settings</Heading>

            {/* Display global messages */}
            {globalMessage && <Text>{globalMessage.text}</Text>}
            {loading && <Text>Loading...</Text>}

            {/* Display user attributes in a table */}
            <View>
                <Heading level={2}>User Attributes</Heading>
                <Table variation="bordered">
                    <TableHead>
                        <TableRow>
                            <TableCell as="th">Attribute</TableCell>
                            <TableCell as="th">Value</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {Object.entries(userAttributes).map(([key, value]) => (
                            <TableRow key={key}>
                                <TableCell>{key}</TableCell>
                                <TableCell>{value}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </View>

            <Divider
                orientation="horizontal"
                style={{ margin: `${tokens.space.large} 0` }}
            />

            {/* Update Email Section */}
            <Heading level={2}>Update Email</Heading>
            <View>
                <Input
                    type="email"
                    placeholder="New Email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                />
                <Button
                    onClick={() =>
                        handleUpdateAttribute(
                            "email",
                            newEmail,
                            setEmailMessage
                        )
                    }
                    isDisabled={loading}
                >
                    Update Email
                </Button>
                {emailMessage && <Text>{emailMessage}</Text>}
            </View>

            <Divider
                orientation="horizontal"
                style={{ margin: `${tokens.space.large} 0` }}
            />

            {/* Update Name Section */}
            <Heading level={2}>Update Name</Heading>
            <View>
                <Input
                    type="text"
                    placeholder="New Name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                />
                <Button
                    onClick={() =>
                        handleUpdateAttribute("name", newName, setNameMessage)
                    }
                    isDisabled={loading}
                >
                    Update Name
                </Button>
                {nameMessage && <Text>{nameMessage}</Text>}
            </View>

            {/* Confirm Attribute Section */}
            {currentAttributeKey && (
                <View>
                    <Heading level={3}>Confirm {currentAttributeKey}</Heading>
                    <Input
                        type="text"
                        placeholder="Enter confirmation code"
                        value={confirmationCode}
                        onChange={(e) => setConfirmationCode(e.target.value)}
                    />
                    <Button
                        onClick={handleConfirmAttribute}
                        isDisabled={loading}
                    >
                        Confirm
                    </Button>
                    {emailMessage && <Text>{emailMessage}</Text>}
                </View>
            )}

            <Divider
                orientation="horizontal"
                style={{ margin: `${tokens.space.large} 0` }}
            />

            {/* Update Password Section */}
            <Heading level={2}>Update Password</Heading>
            <View>
                <AccountSettings.ChangePassword
                    onSuccess={handleUpdatePassword}
                />
                {passwordMessage && <Text>{passwordMessage}</Text>}
            </View>

            <Divider
                orientation="horizontal"
                style={{ margin: `${tokens.space.large} 0` }}
            />

            {/* Delete User Section */}
            <Heading level={2}>Delete Account</Heading>
            <AccountSettings.DeleteUser />
        </main>
    );
}
