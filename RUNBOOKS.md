# Operational Runbooks

## Overview

This document provides step-by-step procedures for common operational tasks and incident response for the Recipe-First Shopping Assistant.

---

## Runbook 1: Application Not Responding

### Symptoms
- Users cannot access https://d262q0erqq4wd1.cloudfront.net
- 502/503 errors from CloudFront
- Timeout errors

### Investigation Steps

**1. Check CloudFront Status**
```bash
aws cloudfront get-distribution \
  --id $(aws cloudformation describe-stacks \
    --stack-name FoodAnalyzer \
    --query 'Stacks[0].Outputs[?OutputKey==`DistributionId`].OutputValue' \
    --output text) \
  --query 'Distribution.Status'
```

**2. Check Lambda Function Health**
```bash
# List all FoodAnalyzer Lambda functions
aws lambda list-functions \
  --query 'Functions[?contains(FunctionName, `FoodAnalyzer`)].FunctionName'

# Check recent errors
aws logs filter-log-events \
  --log-group-name /aws/lambda/FoodAnalyzer-GetImageIngredients* \
  --filter-pattern "ERROR" \
  --start-time $(date -u -d '1 hour ago' +%s)000
```

**3. Check DynamoDB Tables**
```bash
aws dynamodb describe-table \
  --table-name $(aws dynamodb list-tables \
    --query 'TableNames[?contains(@, `FoodAnalyzer-IngredientCache`)]' \
    --output text) \
  --query 'Table.TableStatus'
```

### Resolution Steps

**If CloudFront is degraded**:
```bash
# Invalidate cache
aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/*"
```

**If Lambda is failing**:
```bash
# Check Lambda logs
aws logs tail /aws/lambda/FoodAnalyzer-* --follow

# Rollback if needed
cdk deploy --rollback
```

**If DynamoDB is throttled**:
```bash
# Check metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name UserErrors \
  --dimensions Name=TableName,Value=$TABLE_NAME \
  --start-time $(date -u -d '1 hour ago' +%s) \
  --end-time $(date -u +%s) \
  --period 300 \
  --statistics Sum
```

---

## Runbook 2: High Latency / Slow Responses

### Symptoms
- Recipe generation takes > 30 seconds
- Ingredient detection takes > 10 seconds
- Users complaining about slow performance

### Investigation Steps

**1. Check Cache Hit Rate**
```bash
# Check if caching is working
aws dynamodb scan \
  --table-name FoodAnalyzer-IngredientCacheTable* \
  --select COUNT

aws dynamodb scan \
  --table-name FoodAnalyzer-RecipeCacheTable* \
  --select COUNT
```

**2. Check Lambda Duration**
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=FoodAnalyzer-GenerateRecipe* \
  --start-time $(date -u -d '1 hour ago' +%s) \
  --end-time $(date -u +%s) \
  --period 300 \
  --statistics Average,Maximum
```

**3. Check Bedrock Throttling**
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/Bedrock \
  --metric-name ModelInvocationThrottles \
  --start-time $(date -u -d '1 hour ago' +%s) \
  --end-time $(date -u +%s) \
  --period 300 \
  --statistics Sum
```

### Resolution Steps

**If cache is empty**:
- Warm up cache by running demo fridges
- Verify TTL is set correctly

**If Lambda is slow**:
- Check X-Ray traces for bottlenecks
- Consider increasing memory (but monitor costs)

**If Bedrock is throttled**:
- Request quota increase
- Implement exponential backoff
- Add circuit breaker

---

## Runbook 3: Deployment Failure

### Symptoms
- `cdk deploy` fails
- CloudFormation stack in ROLLBACK state
- Resources not updating

### Investigation Steps

**1. Check Stack Status**
```bash
aws cloudformation describe-stacks \
  --stack-name FoodAnalyzer \
  --query 'Stacks[0].StackStatus'
```

**2. Check Failed Resources**
```bash
aws cloudformation describe-stack-events \
  --stack-name FoodAnalyzer \
  --query 'StackEvents[?ResourceStatus==`CREATE_FAILED` || ResourceStatus==`UPDATE_FAILED`]'
```

**3. Check CloudFormation Logs**
```bash
aws cloudformation describe-stack-events \
  --stack-name FoodAnalyzer \
  --max-items 20
```

### Resolution Steps

**If Lambda deployment fails**:
```bash
# Clean and rebuild
rm -rf cdk.out/ lib/*.js
npm run build
cdk deploy --force
```

**If CloudFront update fails**:
```bash
# Wait for CloudFront to finish previous update
aws cloudfront wait distribution-deployed \
  --id $DISTRIBUTION_ID
```

**If rollback needed**:
```bash
# Rollback to previous version
git checkout previous-commit
cdk deploy
```

---

## Runbook 4: Cache Invalidation

### When to Use
- After frontend deployment
- After updating static assets
- After changing API responses

### Steps

**1. Invalidate CloudFront Cache**
```bash
DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
  --stack-name FoodAnalyzer \
  --query 'Stacks[0].Outputs[?contains(OutputKey,`distribution`)].OutputValue' \
  --output text)

aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/*"
```

**2. Clear DynamoDB Cache (if needed)**
```bash
# Clear ingredient cache
aws dynamodb scan \
  --table-name FoodAnalyzer-IngredientCacheTable* \
  --attributes-to-get image_hash \
  --query 'Items[].image_hash.S' \
  --output text | \
  xargs -I {} aws dynamodb delete-item \
    --table-name FoodAnalyzer-IngredientCacheTable* \
    --key '{"image_hash":{"S":"{}"}}'

# Clear recipe cache
aws dynamodb scan \
  --table-name FoodAnalyzer-RecipeCacheTable* \
  --attributes-to-get ingredients_hash,params_hash \
  --query 'Items[].[ingredients_hash.S,params_hash.S]' \
  --output text | \
  while read hash params; do
    aws dynamodb delete-item \
      --table-name FoodAnalyzer-RecipeCacheTable* \
      --key "{\"ingredients_hash\":{\"S\":\"$hash\"},\"params_hash\":{\"S\":\"$params\"}}"
  done
```

---

## Runbook 5: Cost Spike Investigation

### Symptoms
- Unexpected AWS bill increase
- Cost anomaly alert triggered
- High Bedrock usage

### Investigation Steps

**1. Check Lambda Invocations**
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=FoodAnalyzer-* \
  --start-time $(date -u -d '24 hours ago' +%s) \
  --end-time $(date -u +%s) \
  --period 3600 \
  --statistics Sum
```

**2. Check Bedrock Usage**
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/Bedrock \
  --metric-name Invocations \
  --start-time $(date -u -d '24 hours ago' +%s) \
  --end-time $(date -u +%s) \
  --period 3600 \
  --statistics Sum
```

**3. Check Cache Hit Rate**
```bash
# Low cache hit rate = high Bedrock costs
aws dynamodb describe-table \
  --table-name FoodAnalyzer-RecipeCacheTable* \
  --query 'Table.ItemCount'
```

### Resolution Steps

**If Lambda invocations are high**:
- Check for infinite loops
- Verify CloudFront caching is enabled
- Add rate limiting

**If Bedrock usage is high**:
- Verify caching is working
- Check for cache misses
- Implement request throttling

**If DynamoDB costs are high**:
- Check for hot partitions
- Verify TTL is working
- Consider reserved capacity

---

## Runbook 6: Security Incident Response

### Symptoms
- Unauthorized access attempts
- GuardDuty findings
- Unusual API activity

### Investigation Steps

**1. Check CloudTrail Logs**
```bash
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=AssumeRole \
  --start-time $(date -u -d '1 hour ago' +%s) \
  --max-results 50
```

**2. Check Cognito User Activity**
```bash
aws cognito-idp list-users \
  --user-pool-id $(aws cloudformation describe-stacks \
    --stack-name FoodAnalyzer \
    --query 'Stacks[0].Outputs[?contains(OutputKey,`UserPool`)].OutputValue' \
    --output text)
```

**3. Check Lambda Execution Logs**
```bash
aws logs filter-log-events \
  --log-group-name /aws/lambda/FoodAnalyzer-* \
  --filter-pattern "ERROR" \
  --start-time $(date -u -d '1 hour ago' +%s)000
```

### Resolution Steps

**If unauthorized access detected**:
1. Disable compromised user
2. Rotate credentials
3. Review IAM policies
4. Enable MFA if not already enabled

**If API abuse detected**:
1. Add WAF rate limiting
2. Block offending IPs
3. Implement API throttling

---

## Runbook 7: Bedrock Model Unavailable

### Symptoms
- "ModelNotFound" errors
- "ThrottlingException" errors
- Recipe generation fails

### Investigation Steps

**1. Check Bedrock Service Health**
```bash
# Check recent errors
aws logs filter-log-events \
  --log-group-name /aws/lambda/FoodAnalyzer-GenerateRecipe* \
  --filter-pattern "bedrock" \
  --start-time $(date -u -d '1 hour ago' +%s)000
```

**2. Check Model Availability**
```bash
aws bedrock list-foundation-models \
  --query 'modelSummaries[?contains(modelId, `claude-3-sonnet`)].modelId'
```

### Resolution Steps

**If model is throttled**:
- Return cached responses
- Implement exponential backoff
- Request quota increase

**If model is unavailable**:
- Fallback to alternative model (Claude 3 Haiku)
- Show graceful error message to users
- Enable circuit breaker

---

## Runbook 8: DynamoDB Throttling

### Symptoms
- "ProvisionedThroughputExceededException"
- Slow cache reads/writes
- Failed Lambda executions

### Investigation Steps

**1. Check Throttled Requests**
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name UserErrors \
  --dimensions Name=TableName,Value=FoodAnalyzer-RecipeCacheTable* \
  --start-time $(date -u -d '1 hour ago' +%s) \
  --end-time $(date -u +%s) \
  --period 300 \
  --statistics Sum
```

**2. Check Table Capacity**
```bash
aws dynamodb describe-table \
  --table-name FoodAnalyzer-RecipeCacheTable* \
  --query 'Table.BillingModeSummary'
```

### Resolution Steps

**For on-demand tables**:
- Verify billing mode is PAY_PER_REQUEST
- Check for hot partitions
- Implement exponential backoff in Lambda

**If persistent throttling**:
- Consider provisioned capacity
- Implement caching at application level
- Add DynamoDB DAX

---

## Runbook 9: Rollback Deployment

### When to Use
- Deployment introduced bugs
- Performance degradation after deployment
- Security issue discovered

### Steps

**1. Identify Last Good Commit**
```bash
git log --oneline -10
```

**2. Rollback Code**
```bash
git checkout <last-good-commit>
```

**3. Deploy Previous Version**
```bash
rm -rf cdk.out/
npm run build
cdk deploy
```

**4. Verify Rollback**
```bash
# Test endpoints
curl https://d262q0erqq4wd1.cloudfront.net

# Check Lambda versions
aws lambda list-versions-by-function \
  --function-name FoodAnalyzer-GenerateRecipe*
```

**5. Invalidate CloudFront Cache**
```bash
aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/*"
```

---

## Runbook 10: Monitoring Dashboard Access

### CloudWatch Dashboard

**Access**:
```bash
# Get dashboard URL
echo "https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=FoodAnalyzer-Dashboard"
```

**Key Metrics**:
- Lambda invocations (all functions)
- Lambda errors and throttles
- Lambda duration (p50, p90, p99)
- Bedrock model invocations
- DynamoDB read/write capacity
- Cache hit rates

### X-Ray Traces

**Access**:
```bash
# View traces
echo "https://console.aws.amazon.com/xray/home?region=us-east-1#/traces"
```

**Filter by**:
- Function name
- Error status
- Duration > 30s

---

## Emergency Contacts

**On-Call**: Check PagerDuty rotation  
**Escalation**: energy-utilities-france team  
**AWS Support**: Enterprise Support case

---

## Maintenance Windows

**Recommended**:
- Weekly: Sunday 2:00-4:00 AM UTC
- Monthly: First Sunday of month

**Pre-Maintenance Checklist**:
- [ ] Notify users
- [ ] Backup DynamoDB tables
- [ ] Test in staging
- [ ] Prepare rollback plan

**Post-Maintenance Checklist**:
- [ ] Verify all endpoints
- [ ] Check CloudWatch metrics
- [ ] Test demo fridges
- [ ] Confirm cache is working
