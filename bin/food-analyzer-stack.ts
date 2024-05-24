#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { FoodAnalyzerStack} from '../lib/food-analyzer-stack';
import { CfnGuardValidator } from '@cdklabs/cdk-validator-cfnguard';

const deploymentStage = process.env.STAGE || "dev"

const app = new cdk.App({
  policyValidationBeta1: [
    new CfnGuardValidator({
      //controlTowerRulesEnabled: false,      
      disabledRules: [
        'ct-cloudfront-pr-10',  /* OAC not supported in CDK yet https://github.com/aws/aws-cdk/issues/21771 */
        'ct-cloudfront-pr-4',  /* Demo UI, no need for failover */
        'ct-cloudfront-pr-5',  /* Demo UI, logging enabled no needed*/
        'ct-cloudfront-pr-6',  /* Demo UI, no need for custom certificate*/
        'ct-cloudfront-pr-7',  /* Demo UI, no custom certificate*/
        'ct-cloudfront-pr-9',  /* Demo UI, no custom certificate*/
        'ct-dynamodb-pr-1',  /* Temporary data, no need for PITR*/
        'ct-dynamodb-pr-2',  /* Temporary data, no need for PITR*/
        'ct-lambda-pr-3',  /* The stack does not contain a VPC*/
        'ct-s3-pr-10',  /* S3 managed encryption set*/
        'ct-s3-pr-9',  /* No need for object lock*/
        'ct-s3-pr-6',  /* No need for lifecycle, only hosting buckets*/
        'ct-s3-pr-4',  /* No need for event notifications*/
        'ct-s3-pr-2',  /* No need for server access logging, hosting buckets, demo purposes only*/
        'ct-s3-pr-11',  /* No need for versioning, hosting buckets, demo purposes only*/
        'ct-cloudwatch-pr-3', /* no need to encrypted logs, sample code here */
        'ct-cloudwatch-pr-2' /* no need to retain logs for one year, sample code here */
      ]
    })
  ],
});

const foodAnalyzer = new FoodAnalyzerStack(app, `FoodAnalyzer`,  deploymentStage,
  {
  crossRegionReferences: true,
  description: 'FoodAnalyzer Stack (uksb-jvil23fpqp)',
  env: {
    region: process.env.CDK_DEFAULT_REGION,
    account: process.env.CDK_DEFAULT_ACCOUNT
  }
});

cdk.Tags.of(foodAnalyzer).add("project", "foodAnalyzer");
cdk.Tags.of(foodAnalyzer).add("stage", deploymentStage);


