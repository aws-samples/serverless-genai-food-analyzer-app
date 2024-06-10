import {
  Stack,
  aws_lambda as lambda,
  aws_s3 as s3,
  aws_dynamodb as dynamodb,
  aws_cloudfront_origins as origins,
  aws_cloudfront as cloudfront,
  aws_iam as iam,
  CfnOutput,
  Duration,
  Aws,
  aws_s3_deployment as s3deploy,
  aws_lambda_nodejs as nodejs,
  Fn,
  aws_secretsmanager as secretsmanager,
  SecretValue,
  StackProps,  
  DockerImage,
} from "aws-cdk-lib";
import { IFunction, Tracing } from "aws-cdk-lib/aws-lambda";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { IUserPool } from "aws-cdk-lib/aws-cognito";
import { Construct } from "constructs";
import * as path from "path";
import { HttpOrigin } from "aws-cdk-lib/aws-cloudfront-origins";
import { AddBehaviorOptions } from "aws-cdk-lib/aws-cloudfront";
import * as cdk from "aws-cdk-lib";
import { FoodAnalyzerDashBoard } from "./dashboard";
import { Auth } from "./auth";
import { TableEncryption } from "aws-cdk-lib/aws-dynamodb";
import { LoadDatabase } from "./load-database-construct";
import {
  ExecSyncOptionsWithBufferEncoding,
  execSync,
} from "node:child_process";
import { Utils } from "./utils";

export class FoodAnalyzerStack extends Stack {
  public userPool: IUserPool;
  public generateImage: IFunction;
  public generateRecipe: IFunction;
  public getImageIngredients: IFunction;
  public getIngredients: IFunction;
  public getStepsRecipe: IFunction;
  public productSummary: IFunction;
  constructor(scope: Construct, id: string, stage: string, props: StackProps) {
    super(scope, id, props);

    const powerToolsLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      "powertools-layer",
      `arn:aws:lambda:${
        Stack.of(this).region
      }:017000801446:layer:AWSLambdaPowertoolsPythonV2:56`
    );

    const powerToolsTypeScriptLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      "powertools-layer-ts",
      `arn:aws:lambda:${
        Stack.of(this).region
      }:094274105915:layer:AWSLambdaPowertoolsTypeScriptV2:2`
    );

    const boto3Layer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      "boto3-layer",
      `arn:aws:lambda:${
        Stack.of(this).region
      }:770693421928:layer:Klayers-p312-boto3:5`
    );

    const requestsLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      "requests-layer",
      `arn:aws:lambda:${
        Stack.of(this).region
      }:770693421928:layer:Klayers-p38-requests-html:23`
    );

    const openFoodFactsProductsTable = new dynamodb.Table(this, "allProductsOpenFoodFactsTable", {
      partitionKey: {
        name: "product_code",
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: TableEncryption.DEFAULT,
    });

    new CfnOutput(this, "openFoodFactsProductsTableNameOutput", {
      value: openFoodFactsProductsTable.tableName,
    });
    

    const productsTable = new dynamodb.Table(this, "ProductsTable", {
      partitionKey: {
        name: "product_code",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: { name: "language", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: TableEncryption.DEFAULT,
    });

    const productsSummaryTable = new dynamodb.Table(
      this,
      "ProductsSummaryTable",
      {
        partitionKey: {
          name: "product_code",
          type: dynamodb.AttributeType.STRING,
        },
        sortKey: { name: "params_hash", type: dynamodb.AttributeType.STRING },
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        encryption: TableEncryption.DEFAULT,
      }
    );

    const myResponseHeadersPolicy = new cloudfront.ResponseHeadersPolicy(
      this,
      "ResponseHeadersPolicy",
      {
        responseHeadersPolicyName:
          "ResponseHeadersPolicy" + Aws.STACK_NAME + "-" + Aws.REGION,
        comment: "ResponseHeadersPolicy" + Aws.STACK_NAME + "-" + Aws.REGION,
        securityHeadersBehavior: {
          contentTypeOptions: { override: true },
          frameOptions: {
            frameOption: cloudfront.HeadersFrameOption.DENY,
            override: true,
          },
          referrerPolicy: {
            referrerPolicy:
              cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
            override: false,
          },
          strictTransportSecurity: {
            accessControlMaxAge: Duration.seconds(31536000),
            includeSubdomains: true,
            override: true,
          },
          xssProtection: { protection: true, modeBlock: true, override: true },
        },
      }
    );

    const hostingBucket = new s3.Bucket(this, "HostingBucket", {
      enforceSSL: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicPolicy: true,
        blockPublicAcls: true,
        ignorePublicAcls: true,
        restrictPublicBuckets: true,
      }),
    });

    const imgBucket = new s3.Bucket(this, "ImgBucket", {
      enforceSSL: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicPolicy: true,
        blockPublicAcls: true,
        ignorePublicAcls: true,
        restrictPublicBuckets: true,
      }),
    });

    const hostingOrigin = new origins.S3Origin(hostingBucket);
    const s3ImgOrigin = new origins.S3Origin(imgBucket);

    const customImgBehaviour: cloudfront.BehaviorOptions = {
      origin: s3ImgOrigin,
      responseHeadersPolicy: myResponseHeadersPolicy,
      cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED, //imgCachePolicy,
      allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    };

    const changeUri = new cloudfront.Function(this, "ChangeUri", {
      code: cloudfront.FunctionCode.fromFile({
        filePath: "lambda/url_rewrite/index.js",
      }),
      comment: "URL Rewrite function",
    });

    const distribution = new cloudfront.Distribution(this, "distribution", {
      comment: "FoodAnalyzer UI",
      defaultRootObject: "index.html",
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      defaultBehavior: {
        origin: hostingOrigin,
        responseHeadersPolicy: myResponseHeadersPolicy,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED, //defaultCachePolicy,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        functionAssociations: [
          {
            function: changeUri,
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
          },
        ],
      },
      additionalBehaviors: {
        "/img/*": customImgBehaviour,
      },
    });

    const auth = new Auth(this, "Authentication");

    new CfnOutput(this, "domainName", {
      value: distribution.distributionDomainName,
    });

    const lambdaRole = new iam.Role(this, "LambdaRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
    });

    const basicLambdaRole = new iam.Role(this, "BasicLambdaRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
    });

    const barcodeIngredientsFunction = new lambda.Function(
      this,
      "GetIngredients",
      {
        runtime: lambda.Runtime.PYTHON_3_12,
        handler: "index.handler",
        code: lambda.Code.fromAsset("lambda/barcode_ingredients"),
        memorySize: 10240,
        role: lambdaRole,
        layers: [powerToolsLayer, boto3Layer, requestsLayer],
        tracing: Tracing.ACTIVE,
        timeout: Duration.minutes(5),
        logRetention: RetentionDays.ONE_WEEK,
        retryAttempts: 0,
        environment: {
          POWERTOOLS_SERVICE_NAME: "food-lens",
          POWERTOOLS_LOG_LEVEL: "DEBUG",
          API_URL: "https://world.openfoodfacts.org",
          LANGUAGE: "French",
          PRODUCT_TABLE_NAME: productsTable.tableName,
          OPEN_FOOD_FACTS_TABLE_NAME: openFoodFactsProductsTable.tableName,
        },
      }
    );


    this.getIngredients = barcodeIngredientsFunction;

    productsTable.grantReadWriteData(barcodeIngredientsFunction);
    openFoodFactsProductsTable.grantReadData(barcodeIngredientsFunction)

    barcodeIngredientsFunction.metricInvocations();
    barcodeIngredientsFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ],
        resources: ["arn:aws:logs:*:*:*"],
      })
    );

    barcodeIngredientsFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["bedrock:InvokeModel"],
        resources: [
          `arn:${Aws.PARTITION}:bedrock:${Aws.REGION}::foundation-model/*`,
        ],
      })
    );

    const ingredientsFunctionUrl = barcodeIngredientsFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.AWS_IAM,
      invokeMode: lambda.InvokeMode.BUFFERED,
    });

    const recipeImageIngredientsFunction = new lambda.Function(
      this,
      "GetImageIngredients",
      {
        runtime: lambda.Runtime.PYTHON_3_12,
        handler: "index.handler",
        code: lambda.Code.fromAsset("lambda/recipe_image_ingredients"),
        memorySize: 10240,
        role: lambdaRole,
        layers: [powerToolsLayer, boto3Layer],
        tracing: Tracing.ACTIVE,
        timeout: Duration.minutes(5),
        logRetention: RetentionDays.ONE_WEEK,
        retryAttempts: 0,
        environment: {
          POWERTOOLS_SERVICE_NAME: "food-lens",
          POWERTOOLS_LOG_LEVEL: "DEBUG",
        },
      }
    );

    this.getImageIngredients = recipeImageIngredientsFunction;

    recipeImageIngredientsFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ],
        resources: ["arn:aws:logs:*:*:*"],
      })
    );

    recipeImageIngredientsFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["bedrock:InvokeModel"],
        resources: [
          `arn:${Aws.PARTITION}:bedrock:${Aws.REGION}::foundation-model/*`,
        ],
      })
    );

    const recipeProposalsFunction = new lambda.Function(
      this,
      "GenerateRecipe",
      {
        runtime: lambda.Runtime.PYTHON_3_12,
        handler: "index.handler",
        code: lambda.Code.fromAsset("lambda/recipe_proposals"),
        memorySize: 10240,
        role: lambdaRole,
        layers: [powerToolsLayer, boto3Layer],
        tracing: Tracing.ACTIVE,
        timeout: Duration.minutes(5),
        logRetention: RetentionDays.ONE_WEEK,
        retryAttempts: 0,
        environment: {
          POWERTOOLS_SERVICE_NAME: "food-lens",
          POWERTOOLS_LOG_LEVEL: "DEBUG",
          S3_BUCKET_NAME: imgBucket.bucketName,
        },
      }
    );
    this.generateRecipe = recipeProposalsFunction;

    imgBucket.grantWrite(recipeProposalsFunction);

    recipeProposalsFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ],
        resources: ["arn:aws:logs:*:*:*"],
      })
    );

    recipeProposalsFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["bedrock:InvokeModel"],
        resources: [
          `arn:${Aws.PARTITION}:bedrock:${Aws.REGION}::foundation-model/*`,
        ],
      })
    );

    const barcodeImageFunction = new lambda.Function(this, "GenerateImage", {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: "index.handler",
      code: lambda.Code.fromAsset("lambda/barcode_image"),
      memorySize: 10240, // 10240 MB
      timeout: Duration.minutes(5),
      role: basicLambdaRole,
      layers: [powerToolsLayer, boto3Layer],
      environment: {
        POWERTOOLS_SERVICE_NAME: "food-lens",
        POWERTOOLS_LOG_LEVEL: "DEBUG",
        S3_BUCKET_NAME: imgBucket.bucketName,
        PRODUCT_SUMMARY_TABLE_NAME: productsSummaryTable.tableName,
        PRODUCT_TABLE_NAME: productsTable.tableName,
      },
    });

    this.generateImage = barcodeImageFunction;

    imgBucket.grantWrite(barcodeImageFunction);

    barcodeImageFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ],
        resources: ["arn:aws:logs:*:*:*"],
      })
    );

    const barcodeProductSummaryFunction = new nodejs.NodejsFunction(
      this,
      "GetProductSummaryLambda",
      {
        entry: path.join(
          __dirname,
          "../lambda/barcode_product_summary/index.ts"
        ),
        runtime: lambda.Runtime.NODEJS_20_X,
        role: basicLambdaRole,
        timeout: Duration.minutes(10),
        layers: [powerToolsTypeScriptLayer],
        environment: {
          POWERTOOLS_SERVICE_NAME: "food-lens",
          POWERTOOLS_LOG_LEVEL: "DEBUG",
          PRODUCT_TABLE_NAME: productsTable.tableName,
          PRODUCT_SUMMARY_TABLE_NAME: productsSummaryTable.tableName,
        },
        bundling: {
          minify: false,
          externalModules: ["@aws-sdk/client-bedrock-runtime", "aws-lambda"],
        },
      }
    );

    this.productSummary = barcodeProductSummaryFunction;

    const recipeStepByStepFunction = new nodejs.NodejsFunction(
      this,
      "recipeStepByStepFunction",
      {
        entry: path.join(__dirname, "../lambda/recipe_step_by_step/index.ts"),
        runtime: lambda.Runtime.NODEJS_20_X,
        role: basicLambdaRole,
        timeout: Duration.minutes(10),
        layers: [powerToolsTypeScriptLayer],
        environment: {
          POWERTOOLS_SERVICE_NAME: "food-lens",
          POWERTOOLS_LOG_LEVEL: "DEBUG",
        },
        bundling: {
          minify: false,
          externalModules: ["@aws-sdk/client-bedrock-runtime", "aws-lambda"],
        },
      }
    );

    this.getStepsRecipe = recipeStepByStepFunction;

    recipeStepByStepFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ],
        resources: ["arn:aws:logs:*:*:*"],
      })
    );

    recipeStepByStepFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream",
        ],
        resources: [
          `arn:${Aws.PARTITION}:bedrock:${Aws.REGION}::foundation-model/*`,
        ],
      })
    );

    productsTable.grantReadData(barcodeProductSummaryFunction);
    productsSummaryTable.grantReadWriteData(barcodeProductSummaryFunction);

    barcodeProductSummaryFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ],
        resources: ["arn:aws:logs:*:*:*"],
      })
    );

    barcodeProductSummaryFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["bedrock:InvokeModel"],
        resources: [
          `arn:${Aws.PARTITION}:bedrock:${Aws.REGION}::foundation-model/*`,
        ],
      })
    );

    const barcodeProductSummaryFunctionUrl =
      barcodeProductSummaryFunction.addFunctionUrl({
        authType: lambda.FunctionUrlAuthType.AWS_IAM,
        invokeMode: lambda.InvokeMode.RESPONSE_STREAM,
      });

    const barcodeImageFunctionUrl = barcodeImageFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.AWS_IAM,
    });

    const recipeImageIngredientsFunctionUrl =
      recipeImageIngredientsFunction.addFunctionUrl({
        authType: lambda.FunctionUrlAuthType.AWS_IAM,
      });

    const recipeProposalsFunctionUrl = recipeProposalsFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.AWS_IAM,
    });

    const getStepsRecipeeFunctionUrl = recipeStepByStepFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.AWS_IAM,
      invokeMode: lambda.InvokeMode.RESPONSE_STREAM,
    });

    const authFunction = new cloudfront.experimental.EdgeFunction(
      this,
      `AuthFunctionAtEdge`,
      {
        handler: "index.handler",
        runtime: lambda.Runtime.NODEJS_20_X,
        code: lambda.Code.fromAsset(path.join(__dirname, "../lambda/auth")),
      }
    );

    authFunction.addToRolePolicy(
      new iam.PolicyStatement({
        sid: "AllowInvokeFunctionUrl",
        effect: iam.Effect.ALLOW,
        actions: ["lambda:InvokeFunctionUrl"],
        resources: [
          ingredientsFunctionUrl.functionArn,
          recipeImageIngredientsFunctionUrl.functionArn,
          barcodeProductSummaryFunctionUrl.functionArn,
          barcodeImageFunctionUrl.functionArn,
          recipeImageIngredientsFunctionUrl.functionArn,
          recipeProposalsFunctionUrl.functionArn,
          getStepsRecipeeFunctionUrl.functionArn,
        ],
        conditions: {
          StringEquals: { "lambda:FunctionUrlAuthType": "AWS_IAM" },
        },
      })
    );

    authFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["secretsmanager:GetSecretValue"],
        resources: [
          `arn:aws:secretsmanager:${Stack.of(this).region}:${
            Stack.of(this).account
          }:secret:FoodAnalyzerSecret*`,
        ],
      })
    );

    const cachePolicy = new cloudfront.CachePolicy(
      this,
      "CachingDisabledButWithAuth",
      {
        defaultTtl: Duration.minutes(0),
        minTtl: Duration.minutes(0),
        maxTtl: Duration.minutes(1),
        headerBehavior:
          cloudfront.CacheHeaderBehavior.allowList("Authorization"),
      }
    );

    const commonBehaviorOptions: AddBehaviorOptions = {
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
      cachePolicy: cachePolicy,
      originRequestPolicy: cloudfront.OriginRequestPolicy.CORS_CUSTOM_ORIGIN,
      responseHeadersPolicy:
        cloudfront.ResponseHeadersPolicy
          .CORS_ALLOW_ALL_ORIGINS_WITH_PREFLIGHT_AND_SECURITY_HEADERS,
    };

    const getBehaviorOptions: AddBehaviorOptions = {
      ...commonBehaviorOptions,
      edgeLambdas: [
        {
          functionVersion: authFunction.currentVersion,
          eventType: cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST,
          includeBody: true,
        },
      ],
      allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
    };

    distribution.addBehavior(
      "/fetchIngredients/*",
      new HttpOrigin(Fn.select(2, Fn.split("/", ingredientsFunctionUrl.url))),
      getBehaviorOptions
    );

    distribution.addBehavior(
      "/fetchSummary",
      new HttpOrigin(
        Fn.select(2, Fn.split("/", barcodeProductSummaryFunctionUrl.url))
      ),
      getBehaviorOptions
    );

    distribution.addBehavior(
      "/fetchImage",
      new HttpOrigin(Fn.select(2, Fn.split("/", barcodeImageFunctionUrl.url))),
      getBehaviorOptions
    );

    distribution.addBehavior(
      "/fetchImageIngredients",
      new HttpOrigin(
        Fn.select(2, Fn.split("/", recipeImageIngredientsFunctionUrl.url))
      ),
      getBehaviorOptions
    );

    distribution.addBehavior(
      "/fetchRecipePropositions",
      new HttpOrigin(
        Fn.select(2, Fn.split("/", recipeProposalsFunctionUrl.url))
      ),
      getBehaviorOptions
    );

    distribution.addBehavior(
      "/stepsRecipe",
      new HttpOrigin(
        Fn.select(2, Fn.split("/", getStepsRecipeeFunctionUrl.url))
      ),

      getBehaviorOptions
    );

    const secret = new secretsmanager.Secret(this, "FoodAnalyserSecrets", {
      secretName: "FoodAnalyzerSecretConfig",
      secretObjectValue: {
        ClientID: SecretValue.unsafePlainText(
          auth.userPoolClient.userPoolClientId
        ),
        UserPoolID: SecretValue.unsafePlainText(auth.userPool.userPoolId),
      },
    });

    const exportsAsset = s3deploy.Source.jsonData("aws-exports.json", {
      domainName: "https://" + distribution.domainName,
      region: cdk.Aws.REGION,
      Auth: {
        Cognito: {
          userPoolClientId: auth.userPoolClient.userPoolClientId,
          userPoolId: auth.userPool.userPoolId,
          identityPoolId: auth.identityPool.identityPoolId,
        },
      },
    });

    const appPath = path.join(__dirname, "..", "resources", "ui");
    const buildPath = path.join(appPath, "dist");

    const asset = s3deploy.Source.asset(appPath, {
      bundling: {
        image: DockerImage.fromRegistry(
          "public.ecr.aws/sam/build-nodejs20.x:latest"
        ),
        command: [
          "sh",
          "-c",
          [
            "npm --cache /tmp/.npm install",
            `npm --cache /tmp/.npm run build`,
            "cp -aur /asset-input/dist/* /asset-output/",
          ].join(" && "),
        ],
        local: {
          tryBundle(outputDir: string) {
            try {
              const options: ExecSyncOptionsWithBufferEncoding = {
                stdio: "inherit",
                env: {
                  ...process.env,
                },
              };

              execSync(`npm --silent --prefix "${appPath}" ci`, options);
              execSync(`npm --silent --prefix "${appPath}" run build`, options);
              Utils.copyDirRecursive(buildPath, outputDir);
            } catch (e) {
              console.error(e);
              return false;
            }
            return true;
          },
        },
      },
    });

    new s3deploy.BucketDeployment(this, "DeployWebsite", {
      sources: [asset, exportsAsset],
      destinationBucket: hostingBucket,
      memoryLimit: 512,
    });
    new FoodAnalyzerDashBoard(this, "Dashboard", {
      stage: stage,
      functionList: [
        this.generateImage,
        this.getImageIngredients,
        this.getIngredients,
        this.getStepsRecipe,
        this.productSummary,
        this.generateRecipe,
      ],
    });



  const loadDatabase = new LoadDatabase(this, "LoadSF", openFoodFactsProductsTable, this.stackName);

  }

  /**
   * Extracts the domain from a Lambda URL
   *
   * Example: https://my-lambda.execute-api.us-east-1.amazonaws.com/ -> my-lambda.execute-api.us-east-1.amazonaws.com
   */
  getURLDomain(lambdaUrl: lambda.FunctionUrl) {
    return Fn.select(2, Fn.split("/", lambdaUrl.url));
  }


}
