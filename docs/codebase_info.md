# Codebase Information

## Project Overview

**Name**: Recipe-First Shopping Assistant  
**Type**: Serverless GenAI Application  
**Purpose**: Grocery retail transformation platform showcasing recipe-driven commerce  
**Target**: Walmart, Carrefour, Trader Joe's, and major grocery chains

## Codebase Statistics

- **Total Files**: 377
- **Prioritized Files**: 56
- **Lines of Code**: 10,544
- **Functions**: 112
- **Classes**: 11
- **Size Category**: Large (L)

## Technology Stack

### Infrastructure
- **IaC**: AWS CDK (TypeScript)
- **Deployment**: CloudFormation
- **Region**: us-east-1 (primary)

### Backend
- **Runtime**: AWS Lambda
  - Python 3.14 (4 functions)
  - Node.js 24.x (2 functions)
  - Lambda@Edge (1 function)
- **AI/ML**: Amazon Bedrock
  - Claude Haiku 4.5 (all text generation)
  - Nova Canvas (image generation)
- **Database**: Amazon DynamoDB (5 tables)
- **Storage**: Amazon S3 (3 buckets)
- **CDN**: Amazon CloudFront
- **Auth**: Amazon Cognito

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **UI Library**: Cloudscape Design System
- **Language**: TypeScript

### Observability
- **Logging**: CloudWatch Logs (7-day retention)
- **Tracing**: AWS X-Ray
- **Monitoring**: CloudWatch Dashboard
- **Audit**: CloudTrail
- **Instrumentation**: AWS Lambda PowerTools

## Key Metrics

### Complexity Hotspots
1. **barcode_ingredients** (650 LOC, 15 functions, score 83.2) - Highest complexity
2. **recipe.tsx** (664 LOC, score 54.8) - Largest frontend
3. **food-analyzer-stack.ts** (823 LOC, score 64.0) - Main infrastructure
4. **recipe_proposals** (362 LOC, 10 functions, score 69.9)
5. **barcode_product_summary** (470 LOC, 9 functions, score 50.6)

### Performance
- **Without cache**: 26 seconds
- **With cache**: 1 second (96% faster)
- **Cost savings**: 99.998% on cache hits

## Security Posture

- ✅ All Lambda URLs: IAM authentication
- ✅ All S3 buckets: Private with BlockPublicAccess
- ✅ Cognito: Self-registration disabled, MFA optional
- ✅ CloudFront: HTTPS enforced, TLS 1.2+
- ✅ Secrets: AWS Secrets Manager
- ✅ Encryption: At rest and in transit
- ✅ Audit: CloudTrail enabled

**Security Score**: 10/10 (Production Ready)

## Deployment

**Current Stack**: FoodAnalyzer  
**URL**: https://d262q0erqq4wd1.cloudfront.net  
**Status**: Production (AWS Summit 2026 ready)  
**Last Updated**: February 18, 2026
