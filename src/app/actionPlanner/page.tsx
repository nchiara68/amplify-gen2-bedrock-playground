// 1. Import necessary components and hooks
"use client";
import {
    Flex,
    Heading,
    View,
    Button,
    TextField,
    Collection,
    Card,
    Text,
} from "@aws-amplify/ui-react";
import { useState } from "react";
import { useAIGeneration } from "../../client";

export default function ActionPlanner() {
    // 2. Setup state management
    const [taskDescription, setTaskDescription] = useState(""); // State for user input
    const [{ data, isLoading }, generateActionPlan] =
        useAIGeneration("generateActionPlan"); // AI generation hook

    // 3. Handle form submission
    const handleGenerateActionPlan = async () => {
        if (taskDescription.trim() === "") {
            alert("Please enter a task description.");
            return;
        }
        generateActionPlan({
            description: taskDescription,
        });
    };

    // 4. Component render
    return (
        <Flex direction="column" gap="1rem" style={{ width: "100%" }}>
            {/* 5. Header Section */}
            <Flex>
                <Heading level={1}>Action Planner</Heading>
            </Flex>

            <Text>
                Features: Text Generation, Prompt Engineering, Structured Output
            </Text>

            <View
                style={{
                    padding: "1rem",
                    borderRadius: "8px",
                    border: "1px solid #ddd",
                    overflowX: "auto",
                    fontFamily: "monospace",
                    whiteSpace: "pre-wrap",
                }}
            >
                <code>
                    {`The Action Planner is an AI-powered application that helps break down tasks into manageable steps. Here's how it works:

- Input: Enter your task or goal description in the text field
    - The application processes your request using AI
    - You'll receive clear, actionable steps to accomplish your task

The generated action plan includes:

- A task summary
    - Clarifying questions to better understand your needs
    - Step-by-step actions with priorities and time estimates
    - Additional notes and recommendations

Simply click the "Generate Action Plan" button to start organizing your tasks more effectively.
`}
                </code>
            </View>

            {/* 6. Input Section */}
            <View>
                <TextField
                    label="Task Description"
                    placeholder="Enter your task description here"
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    isDisabled={isLoading}
                />
            </View>

            {/* 7. Action Button */}
            <View>
                <Button
                    onClick={handleGenerateActionPlan}
                    isLoading={isLoading}
                >
                    Generate Action Plan
                </Button>
            </View>

            {/* 8. Results Display Section */}
            <View>
                {data && (
                    <Card
                        variation="outlined"
                        style={{
                            padding: "1rem",
                            marginBottom: "1rem",
                            borderRadius: "8px",
                            border: "1px solid #ccc",
                        }}
                    >
                        {/* 9. Task Summary Section */}
                        <Card
                            style={{
                                padding: "1rem",
                                marginBottom: "1rem",
                                borderRadius: "8px",
                            }}
                        >
                            <strong>Task Summary:</strong>
                            <p>{data.taskSummary}</p>
                        </Card>

                        {/* 10. Clarifying Questions Section */}
                        <Collection
                            type="list"
                            items={data.clarifyingQuestions || []}
                            gap="1rem"
                        >
                            {(item, index) => (
                                <Card
                                    key={index}
                                    variation="outlined"
                                    style={{
                                        padding: "1rem",
                                        borderRadius: "8px",
                                        border: "1px solid #ccc",
                                    }}
                                >
                                    <strong>Question {index + 1}:</strong>
                                    <p>
                                        {item?.question ||
                                            "No question provided"}
                                    </p>
                                </Card>
                            )}
                        </Collection>

                        {/* 11. Action Plan Steps Section */}
                        <Collection
                            type="list"
                            items={data.actionPlanSteps || []}
                            gap="1rem"
                        >
                            {(item, index) => (
                                <Card
                                    key={index}
                                    variation="elevated"
                                    style={{
                                        padding: "1rem",
                                        borderRadius: "8px",
                                        boxShadow:
                                            "0 2px 4px rgba(0, 0, 0, 0.1)",
                                    }}
                                >
                                    <strong>
                                        Step {item?.stepNumber || index + 1}:
                                    </strong>
                                    <p>
                                        <strong>Action:</strong>{" "}
                                        {item?.actionItem ||
                                            "No action provided"}
                                    </p>
                                    <p>
                                        <strong>Details:</strong>{" "}
                                        {item?.details || "No details provided"}
                                    </p>
                                    <p>
                                        <strong>Importance:</strong>{" "}
                                        {item?.importance ||
                                            "No importance provided"}
                                    </p>
                                    <p>
                                        <strong>Estimated Time:</strong>{" "}
                                        {item?.estimatedTime ||
                                            "No estimated time provided"}
                                    </p>
                                </Card>
                            )}
                        </Collection>

                        {/* 12. Notes Section (Optional) */}
                        {data.notes && (
                            <Card
                                variation="outlined"
                                style={{
                                    padding: "1rem",
                                    marginTop: "1rem",
                                    borderRadius: "8px",
                                    border: "1px solid #ccc",
                                }}
                            >
                                <strong>Notes:</strong>
                                <p>{data.notes}</p>
                            </Card>
                        )}
                    </Card>
                )}
            </View>
        </Flex>
    );
}
