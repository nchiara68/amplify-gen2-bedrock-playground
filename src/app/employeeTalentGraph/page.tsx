"use client";

import { useState } from "react";
import { Heading, Text, TextAreaField, Button } from "@aws-amplify/ui-react";

type Graph = {
  nodes: {
    id: string;
    label: string;
    properties: Record<string, any>;
  }[];
  edges: {
    source: string;
    target: string;
    type: string;
    properties: Record<string, any>;
  }[];
};

import { client } from "../../client";

export default function EmployeeTalentGraph() {
  const [graphDescription, setGraphDescription] = useState("");
  const [graph, setGraph] = useState<Graph | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const convertTextToGraph = async () => {
    if (!graphDescription.trim()) {
      setError("Please enter a graph description");
      return;
    }

    setIsLoading(true);
    setError(null);
    setGraph(null);

    try {
      const response = await client.queries.convertTextToGraph({
        text: graphDescription,
      });
      console.log(response);

      const parsedData = JSON.parse(response.data as string);
      console.log(parsedData);
      const { statusCode, body, headers } = parsedData;
      console.log(statusCode, body, headers);

      if (statusCode !== 200) {
        throw new Error(`Failed to generate graph: ${body || "Unknown error"}`);
      }

      const graphData = JSON.parse(parsedData.body);
      console.log(graphData);
      setGraph(graphData);
    } catch (error) {
      console.error(error);
      setError(
        error instanceof Error ? error.message : "Failed to generate graph"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <Heading level={1}>Employee Talent Graph</Heading>
      <Text className="mb-4">
        Features: Graph Generation, Graph Visualization, Graph RAG
      </Text>

      <TextAreaField
        label="Enter a description of the graph you want to generate"
        placeholder="e.g. 'A graph of the talent of the employees in the company'"
        onChange={(e) => setGraphDescription(e.target.value)}
        hasError={!!error}
        errorMessage={error}
        isDisabled={isLoading}
      />

      <Button
        onClick={convertTextToGraph}
        isLoading={isLoading}
        loadingText="Generating graph..."
        className="mt-4"
      >
        Generate Graph
      </Button>

      {graph && (
        <div>
          <Heading level={2}>Generated Graph</Heading>
          <div>
            <pre>{JSON.stringify(graph, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
