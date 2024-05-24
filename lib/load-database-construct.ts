import {
  Aws,
  aws_stepfunctions as sfn,
  aws_stepfunctions_tasks as tasks,
  aws_dynamodb as dynamodb,
  aws_s3 as s3,
  aws_s3_deployment as s3deploy,
  aws_codebuild as codebuild,
  aws_logs as logs,
  aws_iam as iam,
  RemovalPolicy,
} from "aws-cdk-lib";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { LogLevel } from "aws-cdk-lib/aws-stepfunctions";
import { Construct } from "constructs";

export class LoadDatabase extends Construct {
  constructor(scope: Construct, id: string, tableToLoad: dynamodb.Table, stackName: string) {
    super(scope, id);

    const loadSourceCode = new s3.Bucket(this, "LoadSourceCode", {
      enforceSSL: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicPolicy: true,
        blockPublicAcls: true,
        ignorePublicAcls: true,
        restrictPublicBuckets: true,
      }),
    });

    const codebuildProject = new codebuild.Project(this, "Project", {
      logging: {
        cloudWatch: {
          logGroup: new logs.LogGroup(this, `MyLogGroup`),
        },
      },
      projectName: "CrawlProject" + Aws.STACK_NAME,
      buildSpec: codebuild.BuildSpec.fromObject({
        version: "0.2",
        phases: {
          install: {
            commands: [
              "echo install",
            ],
          },
          pre_build: {
            commands: [
              "echo hello world",
              "exit 0",
              "aws s3 cp --recursive s3://$SOURCE_CODE_BUCKET/ .", 
              "ls"
            ],
          },
          build: {
            commands: [
              "python3 --version", 
              "cd openfoodfacts",
              "pip install -r requirements.txt",
              `python3 db-loader-jsonl.py ${stackName}`,
            ],
          },
        },
      }),
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        computeType: codebuild.ComputeType.X2_LARGE,
      },
    });

    loadSourceCode.grantRead(codebuildProject);

    tableToLoad.grantReadWriteData(codebuildProject)

    new s3deploy.BucketDeployment(this, "DeploySrcCode", {
      sources: [s3deploy.Source.asset("scripts/")],
      destinationBucket: loadSourceCode,
    });

    const loadTask = new tasks.CodeBuildStartBuild(
      this,
      "Load products from OpenFoodFacts",
      {
        project: codebuildProject,
        resultPath: sfn.JsonPath.DISCARD,
        integrationPattern: sfn.IntegrationPattern.RUN_JOB,
        environmentVariablesOverride: {
          SOURCE_CODE_BUCKET: {
            type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
            value: loadSourceCode.bucketName,
          },
          TABLE_TO_LOAD: {
            type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
            value: tableToLoad.tableName,
          },
        },
      }
    );

    const sfnLog = new LogGroup(this, "sfnLog", {
      logGroupName: "/aws/vendedlogs/states/" + Aws.STACK_NAME,
      removalPolicy: RemovalPolicy.DESTROY,
      retention: RetentionDays.ONE_WEEK,
    });

    const stepFunction = new sfn.StateMachine(this, "LoadDatabase", {
      definitionBody: sfn.DefinitionBody.fromChainable(loadTask),
      tracingEnabled: true,
      logs: {
        destination: sfnLog,
        includeExecutionData: true,
        level: LogLevel.ALL,
      },
    });

    codebuildProject.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["cloudformation:DescribeStacks"],
        resources: ["*"],
      })
    )
  }
}
