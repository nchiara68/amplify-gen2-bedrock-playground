import { execSync } from "node:child_process";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { defineFunction } from "@aws-amplify/backend";
import { DockerImage, Duration, Stack } from "aws-cdk-lib";
import { Code, Function, Runtime } from "aws-cdk-lib/aws-lambda";
import * as ec2 from "aws-cdk-lib/aws-ec2";

const functionDir = path.dirname(fileURLToPath(import.meta.url));

export const executeOpenCypherQueryForNeptuneFunctionHandler = defineFunction(
  (scope) => {
    const stack = Stack.of(scope);

    // Get reference to existing VPC with environment specified
    // const vpc = ec2.Vpc.fromLookup(scope, "ExistingVPC", {
    //   vpcId: "vpc-059b2f6df9449d09f",
    //   ownerAccountId: "471112852670",
    //   region: "ap-northeast-1",
    // });

    // const neptuneSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(
    //   scope,
    //   "NeptuneSecurityGroup",
    //   "sg-0d80a1137b48db188" // Replace with Neptune's security group ID
    // );

    return new Function(scope, "executeOpenCypherQueryForNeptune", {
      handler: "index.handler",
      runtime: Runtime.PYTHON_3_12, // or any other python version
      timeout: Duration.seconds(300), //  default is 3 seconds
      // vpc,
      // vpcSubnets: {
      //   subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      // },
      // securityGroups: [neptuneSecurityGroup],
      code: Code.fromAsset(functionDir, {
        bundling: {
          image: DockerImage.fromRegistry("dummy"), // replace with desired image from AWS ECR Public Gallery
          local: {
            tryBundle(outputDir: string) {
              execSync(
                `python3 -m pip install -r ${path.join(
                  functionDir,
                  "requirements.txt"
                )} -t ${path.join(
                  outputDir
                )} --platform manylinux2014_x86_64 --only-binary=:all:`
              );
              execSync(`cp -r ${functionDir}/* ${path.join(outputDir)}`);
              return true;
            },
          },
        },
      }),
    });
  }
);
