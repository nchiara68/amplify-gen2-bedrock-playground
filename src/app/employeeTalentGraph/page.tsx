"use client";

import { useState } from "react";
import {
  Heading,
  Text,
  TextField,
  TextAreaField,
  Button,
  View,
} from "@aws-amplify/ui-react";

type Graph = {
  nodes: {
    label: string;
    properties: Record<string, string | number | boolean>;
  }[];
  edges: {
    source: string;
    target: string;
    type: string;
    properties: Record<string, string | number | boolean>;
  }[];
};

import { client } from "../../client";

export default function EmployeeTalentGraph() {
  const graphDescriptionDefault = `番号,氏名,役職,専門分野,プロフィール
1,佐藤 翔太,代表取締役社長,経営戦略、ITビジネスコンサルティング,大手コンサルティングファームで戦略立案や組織改革プロジェクトを多数手掛けたのち独立し、NextVision Consultingを設立。幅広い業界のクライアントを対象に、経営戦略からシステム導入支援まで一貫したコンサルティングを提供。
2,山田 彩香,取締役 CTO (最高技術責任者),クラウドインフラ、アプリケーションアーキテクチャ、セキュリティ,外資系IT企業の基盤チームでクラウド導入やセキュリティ強化を多数経験。NextVision設立メンバーとして、最新技術を活用したソリューション開発をリード。
3,中村 大輔,データサイエンティスト / チームリーダー,機械学習、データ分析基盤構築、AIアルゴリズム開発,大学院で統計学を専攻し、大手メーカー研究職を経てNextVisionに参画。様々な業界のデータ分析やAI導入プロジェクトを牽引し、顧客課題を定量的に解決する。
4,鈴木 夏希,シニアコンサルタント / PMO,プロジェクトマネジメント、業務改善、RPA導入,RPAツール導入支援や業務フロー改善のコンサルを得意とし、製造業やサービス業でのBPR（業務改革）プロジェクトを成功に導く。現在は複数案件でのプロジェクトマネジメント全般を担当。
5,小林 拓也,テックリード / ソリューションエンジニア,アプリケーション開発、システムアーキテクチャ、マイクロサービス設計,スタートアップや大手企業の案件でフロントエンドからバックエンドまで幅広い開発に携わる。効率的かつスケーラブルなシステム設計を推進し、技術選定の要として活躍。`;
  const [graphDescription, setGraphDescription] = useState(
    graphDescriptionDefault
  );
  const graphDefault = `{
  "nodes": [
    {
      "labels": [
        "Employee"
      ],
      "properties": {
        "id": "1",
        "name": "佐藤 翔太",
        "position": "代表取締役社長",
        "specialization": "経営戦略、ITビジネスコンサルティング"
      }
    },
    {
      "labels": [
        "Employee"
      ],
      "properties": {
        "id": "2",
        "name": "山田 彩香",
        "position": "取締役 CTO (最高技術責任者)",
        "specialization": "クラウドインフラ、アプリケーションアーキテクチャ、セキュリティ"
      }
    },
    {
      "labels": [
        "Employee"
      ],
      "properties": {
        "id": "3",
        "name": "中村 大輔",
        "position": "データサイエンティスト / チームリーダー",
        "specialization": "機械学習、データ分析基盤構築、AIアルゴリズム開発"
      }
    },
    {
      "labels": [
        "Employee"
      ],
      "properties": {
        "id": "4",
        "name": "鈴木 夏希",
        "position": "シニアコンサルタント / PMO",
        "specialization": "プロジェクトマネジメント、業務改善、RPA導入"
      }
    },
    {
      "labels": [
        "Employee"
      ],
      "properties": {
        "id": "5",
        "name": "小林 拓也",
        "position": "テックリード / ソリューションエンジニア",
        "specialization": "アプリケーション開発、システムアーキテクチャ、マイクロサービス設計"
      }
    },
    {
      "labels": [
        "Company"
      ],
      "properties": {
        "name": "NextVision Consulting"
      }
    }
  ],
  "edges": [
    {
      "source": {
        "labels": [
          "Employee"
        ],
        "properties": {
          "id": "1"
        }
      },
      "target": {
        "labels": [
          "Company"
        ],
        "properties": {
          "name": "NextVision Consulting"
        }
      },
      "type": "FOUNDED",
      "properties": {}
    },
    {
      "source": {
        "labels": [
          "Employee"
        ],
        "properties": {
          "id": "2"
        }
      },
      "target": {
        "labels": [
          "Company"
        ],
        "properties": {
          "name": "NextVision Consulting"
        }
      },
      "type": "FOUNDING_MEMBER",
      "properties": {}
    },
    {
      "source": {
        "labels": [
          "Employee"
        ],
        "properties": {
          "id": "3"
        }
      },
      "target": {
        "labels": [
          "Company"
        ],
        "properties": {
          "name": "NextVision Consulting"
        }
      },
      "type": "WORKS_FOR",
      "properties": {}
    },
    {
      "source": {
        "labels": [
          "Employee"
        ],
        "properties": {
          "id": "4"
        }
      },
      "target": {
        "labels": [
          "Company"
        ],
        "properties": {
          "name": "NextVision Consulting"
        }
      },
      "type": "WORKS_FOR",
      "properties": {}
    },
    {
      "source": {
        "labels": [
          "Employee"
        ],
        "properties": {
          "id": "5"
        }
      },
      "target": {
        "labels": [
          "Company"
        ],
        "properties": {
          "name": "NextVision Consulting"
        }
      },
      "type": "WORKS_FOR",
      "properties": {}
    }
  ]
}`;
  const [graph, setGraph] = useState<Graph>(JSON.parse(graphDefault));
  const openCypherQueryDefault = `// Create constraints
CREATE CONSTRAINT IF NOT EXISTS FOR (e:Employee) REQUIRE e.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (c:Company) REQUIRE c.name IS UNIQUE;

// Create Employee nodes
MERGE (e1:Employee {id: '1'})
SET e1.name = '佐藤 翔太',
    e1.position = '代表取締役社長',
    e1.specialization = '経営戦略、ITビジネスコンサルティング';

MERGE (e2:Employee {id: '2'})
SET e2.name = '山田 彩香',
    e2.position = '取締役 CTO (最高技術責任者)',
    e2.specialization = 'クラウドインフラ、アプリケーションアーキテクチャ、セキュリティ';

MERGE (e3:Employee {id: '3'})
SET e3.name = '中村 大輔',
    e3.position = 'データサイエンティスト / チームリーダー',
    e3.specialization = '機械学習、データ分析基盤構築、AIアルゴリズム開発';

MERGE (e4:Employee {id: '4'})
SET e4.name = '鈴木 夏希',
    e4.position = 'シニアコンサルタント / PMO',
    e4.specialization = 'プロジェクトマネジメント、業務改善、RPA導入';

MERGE (e5:Employee {id: '5'})
SET e5.name = '小林 拓也',
    e5.position = 'テックリード / ソリューションエンジニア',
    e5.specialization = 'アプリケーション開発、システムアーキテクチャ、マイクロサービス設計';

// Create Company node
MERGE (c:Company {name: 'NextVision Consulting'});

// Create relationships
MATCH (e:Employee {id: '1'}), (c:Company {name: 'NextVision Consulting'})
MERGE (e)-[:FOUNDED]->(c);

MATCH (e:Employee {id: '2'}), (c:Company {name: 'NextVision Consulting'})
MERGE (e)-[:FOUNDING_MEMBER]->(c);

MATCH (e:Employee {id: '3'}), (c:Company {name: 'NextVision Consulting'})
MERGE (e)-[:WORKS_FOR]->(c);

MATCH (e:Employee {id: '4'}), (c:Company {name: 'NextVision Consulting'})
MERGE (e)-[:WORKS_FOR]->(c);

MATCH (e:Employee {id: '5'}), (c:Company {name: 'NextVision Consulting'})
MERGE (e)-[:WORKS_FOR]->(c);`;
  const [openCypherQuery, setOpenCypherQuery] = useState<string>(
    openCypherQueryDefault
  );
  const [neptuneEndpoint, setNeptuneEndpoint] = useState<string>("");
  const [neptuneQueryResult, setNeptuneQueryResult] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const convertTextToNodeRelationJson = async () => {
    if (!graphDescription.trim()) {
      setError("Please enter a graph description");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await client.queries.convertTextToNodeRelationJson({
        text: graphDescription,
      });
      console.log("response", response);
      console.log("response.data", typeof response.data, response.data);

      const parsedData = JSON.parse(JSON.parse(response.data as string));
      console.log("parsedData", typeof parsedData, parsedData);
      console.log("parsedData.body", typeof parsedData.body, parsedData.body);
      const graphData = JSON.parse(parsedData.body);
      console.log("graphData", typeof graphData, graphData);
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

  const convertNodeRelationJsonToOpenCypherQuery = async () => {
    if (!graph) {
      setError("Please generate a graph first");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const graphJson = JSON.stringify(graph);
      console.log("graphJson", graphJson);
      const response =
        await client.queries.convertNodeRelationJsonToOpenCypherQuery({
          nodeRelationJson: graphJson,
        });

      const parsedData = JSON.parse(response.data as string);
      const { statusCode, body } = parsedData;

      if (statusCode !== 200) {
        throw new Error(
          `Failed to generate OpenCypher query: ${body || "Unknown error"}`
        );
      }
      setOpenCypherQuery(JSON.parse(body));
    } catch (error) {
      console.error(error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to generate OpenCypher query"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const executeOpenCypherQueryForNeptune = async () => {
    console.log("openCypherQuery", openCypherQuery);
    console.log("neptuneEndpoint", neptuneEndpoint);

    if (!openCypherQuery.trim() || !neptuneEndpoint.trim()) {
      setError("Please enter an OpenCypher query and Neptune endpoint");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await client.queries.executeOpenCypherQueryForNeptune({
        openCypherQuery: openCypherQuery,
        neptuneEndpoint: neptuneEndpoint,
      });
      console.log("response", response);

      const parsedData = JSON.parse(response.data as string);
      console.log("parsedData", typeof parsedData, parsedData);
      const { statusCode, body } = parsedData;
      console.log("statusCode", statusCode);
      console.log("body", body);

      if (statusCode !== 200) {
        throw new Error(
          `Failed to execute OpenCypher query: ${body || "Unknown error"}`
        );
      }
      setNeptuneQueryResult(JSON.parse(body));
    } catch (error) {
      console.error(error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to execute OpenCypher query"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="p-4 max-w-4xl mx-auto">
      <Heading level={1}>Employee Talent Graph</Heading>
      <Text className="mb-4">
        Features: Graph Generation, Graph Visualization, Graph RAG
      </Text>

      <TextAreaField
        label="Enter a description of the graph you want to generate"
        placeholder="e.g. 'A graph of the talent of the employees in the company'"
        defaultValue={graphDescriptionDefault}
        onChange={(e) => setGraphDescription(e.target.value)}
        hasError={!!error}
        errorMessage={error}
        isDisabled={isLoading}
        resize="vertical"
        rows={10}
      />

      <Button
        onClick={convertTextToNodeRelationJson}
        isLoading={isLoading}
        loadingText="Generating graph..."
        className="mt-4"
      >
        Generate Graph
      </Button>

      {graph && (
        <View>
          <Heading level={2}>Generated Graph</Heading>
          <View>
            <pre>{JSON.stringify(graph, null, 2)}</pre>
          </View>
        </View>
      )}

      {/* {graph && ( */}
      <View className="mt-4">
        <Button
          onClick={convertNodeRelationJsonToOpenCypherQuery}
          isLoading={isLoading}
          loadingText="Generating OpenCypher query..."
          className="mt-4"
        >
          Generate OpenCypher Query
        </Button>

        {openCypherQuery && (
          <View>
            <Heading level={2}>Generated OpenCypher Query</Heading>
            <View>
              <pre>{openCypherQuery}</pre>
            </View>
          </View>
        )}
      </View>
      {/* )} */}

      <TextField
        label="Neptune Endpoint"
        onChange={(e) => setNeptuneEndpoint(e.target.value)}
      />

      <Button
        onClick={executeOpenCypherQueryForNeptune}
        isLoading={isLoading}
        loadingText="Executing OpenCypher query..."
      >
        Execute OpenCypher Query
      </Button>

      {neptuneQueryResult && (
        <View>
          <Heading level={2}>Neptune Query Result</Heading>
          <View>
            <pre>{JSON.stringify(neptuneQueryResult, null, 2)}</pre>
          </View>
        </View>
      )}
    </View>
  );
}
