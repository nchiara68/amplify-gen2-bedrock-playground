import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { virtualCompanyStorage } from "./storage/resource";
import { createFaissIndexFunctionHandler } from "./custom-functions/createFaissIndex/resource";
import { ragFaissIndexFunctionHandler } from "./custom-functions/ragFiassIndex/resource";
import { createOpenSearchServerlessCollectionFunctionHandler } from "./custom-functions/createOpenSearchServerlessCollection/resource";
import { deleteOpenSearchServerlessCollectionFunctionHandler } from "./custom-functions/deleteOpenSearchServerlessCollection/resource";
import { createKnowledgeBaseFunctionHandler } from "./custom-functions/createKnowledgeBase/resource";
import { deleteKnowledgeBaseFunctionHandler } from "./custom-functions/deleteKnowledgeBase/resource";
import { convertTextToNodeRelationJsonFunctionHandler } from "./custom-functions/convertTextToNodeRelationJson/resource";
import { convertNodeRelationJsonToOpenCypherQueryFunctionHandler } from "./custom-functions/convertNodeRelationJsonToOpenCypherQuery/resource";
import { executeOpenCypherQueryForNeptuneFunctionHandler } from "./custom-functions/executeOpenCypherQueryForNeptune/resource";
import { converseSystemPromptFunctionHandler } from "./custom-functions/converseSystemPrompt/resource";
import * as iam from "aws-cdk-lib/aws-iam";

const backend = defineBackend({
    auth,
    data,
    virtualCompanyStorage,
    createFaissIndexFunctionHandler,
    ragFaissIndexFunctionHandler,
    createOpenSearchServerlessCollectionFunctionHandler,
    deleteOpenSearchServerlessCollectionFunctionHandler,
    createKnowledgeBaseFunctionHandler,
    deleteKnowledgeBaseFunctionHandler,
    convertTextToNodeRelationJsonFunctionHandler,
    convertNodeRelationJsonToOpenCypherQueryFunctionHandler,
    executeOpenCypherQueryForNeptuneFunctionHandler,
    converseSystemPromptFunctionHandler,
});

const statementCreateFaissIndex = new iam.PolicyStatement({
    actions: ["s3:*", "bedrock:*"],
    resources: ["*"],
});
const createFaissIndexFunctionHandlerLambda =
    backend.createFaissIndexFunctionHandler.resources.lambda;
createFaissIndexFunctionHandlerLambda.addToRolePolicy(
    statementCreateFaissIndex
);

const statementRagFaissIndex = new iam.PolicyStatement({
    actions: ["s3:*", "bedrock:*"],
    resources: ["*"],
});
const ragFaissIndexFunctionHandlerLambda =
    backend.ragFaissIndexFunctionHandler.resources.lambda;
ragFaissIndexFunctionHandlerLambda.addToRolePolicy(statementRagFaissIndex);

// Creating, listing, and deleting Amazon OpenSearch Serverless collections
// https://docs.aws.amazon.com/ja_jp/opensearch-service/latest/developerguide/serverless-manage.html
const statementCreateOpenSearchServerlessCollection = new iam.PolicyStatement({
    actions: [
        "aoss:CreateCollection",
        "aoss:ListCollections",
        "aoss:BatchGetCollection",
        "aoss:UpdateCollection",
        "aoss:DeleteCollection",
        "aoss:CreateAccessPolicy",
        "aoss:CreateSecurityPolicy",
        "iam:CreateServiceLinkedRole",
    ],
    resources: ["*"],
});

const createOpenSearchServerlessCollectionFunctionHandlerLambda =
    backend.createOpenSearchServerlessCollectionFunctionHandler.resources
        .lambda;

createOpenSearchServerlessCollectionFunctionHandlerLambda.addToRolePolicy(
    statementCreateOpenSearchServerlessCollection
);

const deleteOpenSearchServerlessCollectionFunctionHandlerLambda =
    backend.deleteOpenSearchServerlessCollectionFunctionHandler.resources
        .lambda;

deleteOpenSearchServerlessCollectionFunctionHandlerLambda.addToRolePolicy(
    statementCreateOpenSearchServerlessCollection
);

// Grant access to Bedrock - Create Knowledge Base
const statementCreateKnowledgeBase = new iam.PolicyStatement({
    actions: [
        "bedrock:CreateKnowledgeBase",
        "bedrock:ListKnowledgeBases",
        "iam:CreateRole",
        "iam:GetRole",
        "iam:AttachRolePolicy",
        "aoss:CreateCollection",
        "aoss:ListCollections",
        "aoss:BatchGetCollection",
        "aoss:UpdateCollection",
        "aoss:DeleteCollection",
        "aoss:CreateAccessPolicy",
        "aoss:CreateSecurityPolicy",
    ],
    resources: ["*"],
});

const createKnowledgeBaseFunctionHandlerLambda =
    backend.createKnowledgeBaseFunctionHandler.resources.lambda;

createKnowledgeBaseFunctionHandlerLambda.addToRolePolicy(
    statementCreateKnowledgeBase
);

// Grant access to Bedrock - Delete Knowledge Base
const statementDeleteKnowledgeBase = new iam.PolicyStatement({
    actions: ["bedrock:DeleteKnowledgeBase"],
    resources: ["*"],
});

const deleteKnowledgeBaseFunctionHandlerLambda =
    backend.deleteKnowledgeBaseFunctionHandler.resources.lambda;

deleteKnowledgeBaseFunctionHandlerLambda.addToRolePolicy(
    statementDeleteKnowledgeBase
);

// Grant access to Bedrock - Convert Text to Graph
const statementConvertTextToGraph = new iam.PolicyStatement({
    actions: ["bedrock:*"],
    resources: ["*"],
});

const convertTextToNodeRelationJsonFunctionHandlerLambda =
    backend.convertTextToNodeRelationJsonFunctionHandler.resources.lambda;

convertTextToNodeRelationJsonFunctionHandlerLambda.addToRolePolicy(
    statementConvertTextToGraph
);

// Grant access to Bedrock - Convert Node Relation Json to OpenCypher Query
const statementConvertNodeRelationJsonToOpenCypherQuery =
    new iam.PolicyStatement({
        actions: ["bedrock:*"],
        resources: ["*"],
    });

const convertNodeRelationJsonToOpenCypherQueryFunctionHandlerLambda =
    backend.convertNodeRelationJsonToOpenCypherQueryFunctionHandler.resources
        .lambda;

convertNodeRelationJsonToOpenCypherQueryFunctionHandlerLambda.addToRolePolicy(
    statementConvertNodeRelationJsonToOpenCypherQuery
);

// Grant access to Bedrock - Execute Open Cypher Query for Neptune
const statementExecuteOpenCypherQueryForNeptune = new iam.PolicyStatement({
    actions: ["neptune-db:*", "ec2:*"],
    resources: ["*"],
});

const executeOpenCypherQueryForNeptuneFunctionHandlerLambda =
    backend.executeOpenCypherQueryForNeptuneFunctionHandler.resources.lambda;

executeOpenCypherQueryForNeptuneFunctionHandlerLambda.addToRolePolicy(
    statementExecuteOpenCypherQueryForNeptune
);

// Grant access to Bedrock - Converse System Prompt
const statementConverseSystemPrompt = new iam.PolicyStatement({
    actions: ["bedrock:*"],
    resources: ["*"],
});

const converseSystemPromptFunctionHandlerLambda =
    backend.converseSystemPromptFunctionHandler.resources.lambda;

converseSystemPromptFunctionHandlerLambda.addToRolePolicy(
    statementConverseSystemPrompt
);
