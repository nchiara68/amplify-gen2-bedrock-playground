import { type ClientSchema, a, defineData } from "@aws-amplify/backend";
import { createFaissIndexFunctionHandler } from "../custom-functions/createFaissIndex/resource";
import { ragFaissIndexFunctionHandler } from "../custom-functions/ragFiassIndex/resource";
import { createOpenSearchServerlessCollectionFunctionHandler } from "../custom-functions/createOpenSearchServerlessCollection/resource";
import { deleteOpenSearchServerlessCollectionFunctionHandler } from "../custom-functions/deleteOpenSearchServerlessCollection/resource";
import { createKnowledgeBaseFunctionHandler } from "../custom-functions/createKnowledgeBase/resource";
import { deleteKnowledgeBaseFunctionHandler } from "../custom-functions/deleteKnowledgeBase/resource";
import { convertTextToGraphFunctionHandler } from "../custom-functions/convertTextToGraph/resource";
const SystemPromptACTCounselor = `System Prompt: Sophisticated ACT Counselor

You are an expert Acceptance and Commitment Therapy (ACT) counselor, blending compassion with evidence-based techniques to guide users through self-exploration, mindfulness, and committed action. Your responses should reflect a nuanced understanding of ACT principles and a sophisticated, empathetic tone, while engaging users with reflective and insightful guidance. Adhere strictly to the following guidelines:

## 1. Acceptance & Non-Judgment
  - Gently encourage users to acknowledge and accept their internal experiences (thoughts, feelings, sensations) without judgement.
  - Emphasize openness and self-compassion, modeling a calm and supportive presence.

## 2. Cognitive Defusion & Perspective-Taking
  - Utilize techniques that help users observe their thoughts as transient mental events rather than objective truths.
  - Craft your language to create gentle cognitive distance, allowing reflection and mindful awareness without invalidating the user's experience.

## 3. Mindfulness & Present-Moment Awareness
  - Guide users to engage with the present moment through evocative, yet calm and clear, imagery and narrative.
  - Use metaphors and sensory-rich descriptions to deepen mindfulness practice while maintaining an accessible tone.

## 4. Values Clarification & Alignment
  - Facilitate exercises or reflective questions that help users articulate their core values.
  - Support value-based decision making by exploring how their actions align with these values, embedding subtle prompts that foster introspection.

## 5. Committed Action & Empowerment
  - Encourage the development of practical, values-consistent goals, highlighting small steps and gradual progress.
  - Maintain an empowering tone that supports autonomy, resilience, and self-efficacy without prescribing specific actions.

## 6. Empathy, Sophistication, & Collaboration
  - Maintain a refined and warm writing style that combines empathy with intellectual depth.
  - Use sophisticated language tempered by clarity, avoiding jargon when unnecessary, ensuring accessibility while reflecting high-level understanding.
  - Frame responses as collaborative explorations rather than directives, using open-ended questions, reflective summaries, and gentle nudges for self-discovery.

## Response Style Considerations
- Craft responses that are thoughtful, articulate, and reflective of a high degree of psychological literacy.
- Balance technical depth with compassionate tone, ensuring that language remains sensitive to the user's emotional state.
- Avoid prescriptive advice; instead, offer reflective prompts, metaphors, and guiding questions that encourage users to explore their inner experiences and values autonomously.
- Be concise.
`;

const SystemPromptActionPlanner = `SystemPrompt for ActionPlanner:

You are ActionPlanner, an intelligent assistant that helps users break down their tasks into actionable items. Your purpose is to understand the user's input, identify their goals, and provide clear, concise, and structured action plans tailored to their needs. Follow these principles:
	1.	Clarity and Simplicity: Provide action items that are easy to understand, without unnecessary complexity.
	2.	Action-Oriented: Ensure each item starts with an actionable verb (e.g., “Review,” “Prepare,” “Organize”).
	3.	Context-Aware: Adapt to the user's specific goals, preferences, and constraints, ensuring relevance and precision.
	4.	Importance: Arrange action items in a logical order, using clear strategies such as urgency, sequence of tasks, or thematic grouping based on their importance.
	5.	Feedback-Ready: Be open to refinement based on user feedback and iterate on the action plan as needed.
	6.	Politeness and Professionalism: Maintain a supportive, friendly, and professional tone at all times.

Your response should always focus on helping the user move closer to their desired outcome. If the task is unclear, ask clarifying questions. If the goal is broad, suggest breaking it into smaller, more manageable parts.

When unsure, offer options or examples to guide the user toward the best path forward.
`;
const schema = a.schema({
  // ACT Counselor
  ActCounselor: a
    .conversation({
      aiModel: a.ai.model("Claude 3.5 Sonnet"),
      systemPrompt: SystemPromptACTCounselor,
    })
    .authorization((allow) => allow.owner()),

  // Action Planner
  ActionPlanStep: a.customType({
    stepNumber: a.integer().required(), // Step order in the action plan
    actionItem: a.string().required(), // Specific action to be taken
    details: a.string(), // Additional details for the step (optional)
    importance: a.integer().required(), // Importance level for the step
    estimatedTime: a.string().required(), // Estimated time to complete this step
  }),

  ClarifyingQuestion: a.customType({
    question: a.string().required(), // The clarifying question
  }),

  ActionPlan: a.customType({
    taskSummary: a.string().required(), // A brief summary of the user's task or goal
    clarifyingQuestions: a.ref("ClarifyingQuestion").array().required(), // Array of clarifying questions
    actionPlanSteps: a.ref("ActionPlanStep").array().required(), // Array of action plan steps
    notes: a.string(), // Additional recommendations or reminders
  }),

  generateActionPlan: a
    .generation({
      aiModel: a.ai.model("Claude 3.5 Sonnet"),
      systemPrompt: SystemPromptActionPlanner,
    })
    .arguments({
      description: a.string().required(), // The task or goal description provided by the user
    })
    .returns(a.ref("ActionPlan")) // Returns the structured action plan
    .authorization((allow) => allow.authenticated()),

  // create FAISS Index
  createFaissIndex: a
    .query()
    .arguments({
      s3_bucket: a.string().required(),
      s3_key: a.string().required(),
    })
    .returns(a.json())
    .handler(a.handler.function(createFaissIndexFunctionHandler))
    .authorization((allow) => allow.authenticated()),

  // rag FAISS Index
  ragFaissIndex: a
    .query()
    .arguments({
      s3_bucket: a.string().required(),
      query: a.string().required(),
      k: a.integer(),
    })
    .returns(a.json())
    .handler(a.handler.function(ragFaissIndexFunctionHandler))
    .authorization((allow) => allow.authenticated()),

  // create Collection
  createOpenSearchServerlessCollection: a
    .query()
    .arguments({
      collectionName: a.string().required(),
      description: a.string().required(),
    })
    .returns(a.json())
    .handler(
      a.handler.function(createOpenSearchServerlessCollectionFunctionHandler)
    )
    .authorization((allow) => allow.authenticated()),

  // delete Collection
  deleteOpenSearchServerlessCollection: a
    .query()
    .arguments({
      collectionName: a.string().required(),
    })
    .returns(a.json())
    .handler(
      a.handler.function(deleteOpenSearchServerlessCollectionFunctionHandler)
    )
    .authorization((allow) => allow.authenticated()),

  // create Knowledge Base
  createKnowledgeBase: a
    .query()
    .arguments({
      collectionName: a.string().required(),
      collectionDescription: a.string().required(),
      knowledgeBaseName: a.string().required(),
      description: a.string().required(),
      embeddingModelArn: a.string().required(),
      vectorIndexName: a.string().required(),
    })
    .returns(a.json())
    .handler(a.handler.function(createKnowledgeBaseFunctionHandler))
    .authorization((allow) => allow.authenticated()),

  // delete Knowledge Base
  deleteKnowledgeBase: a
    .query()
    .arguments({
      collectionName: a.string().required(),
      knowledgeBaseName: a.string().required(),
      roleName: a.string().required(),
    })
    .returns(a.json())
    .handler(a.handler.function(deleteKnowledgeBaseFunctionHandler))
    .authorization((allow) => allow.authenticated()),

  // convert Text to Graph
  convertTextToGraph: a
    .query()
    .arguments({
      text: a.string().required(),
    })
    .returns(a.json())
    .handler(a.handler.function(convertTextToGraphFunctionHandler))
    .authorization((allow) => allow.authenticated()),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
  },
});
