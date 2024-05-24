import { Construct } from "constructs";
import { CfnOutput, Duration, SecretValue, Stack, Stage } from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as cdk from "aws-cdk-lib";
import * as cognitoIdentityPool from "@aws-cdk/aws-cognito-identitypool-alpha";

export class Auth extends Construct {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly identityPool: cognitoIdentityPool.IdentityPool;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    const userPool = new cognito.UserPool(this, "FoodAnalyzerUserPool", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      selfSignUpEnabled: false,
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
        tempPasswordValidity: Duration.days(3),
      },
      autoVerify: { email: true, phone: true },
      signInAliases: {
        email: true,
      },
      advancedSecurityMode: cognito.AdvancedSecurityMode.ENFORCED,
    });

    new CfnOutput(this, "UserPool", {
      value: userPool.userPoolId
    });

    const userPoolClient = userPool.addClient("UserPoolClient", {
      generateSecret: false,
      authFlows: {
        adminUserPassword: true,
        userPassword: true,
        userSrp: true,
      },
    });

    const identityPool = new cognitoIdentityPool.IdentityPool(
      this,
      "IdentityPool",
      {
        authenticationProviders: {
          userPools: [
            new cognitoIdentityPool.UserPoolAuthenticationProvider({
              userPool,
              userPoolClient,
            }),
          ],
        },
      }
    );

    this.userPool = userPool;
    this.userPoolClient = userPoolClient;
    this.identityPool = identityPool;
  }
}
