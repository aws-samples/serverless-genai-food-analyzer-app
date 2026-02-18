# System Architecture

## High-Level Architecture

**Serverless Stack**:
- 7 AWS Lambda functions (Python 3.14, Node.js 24.x)
- 5 DynamoDB tables (on-demand, with TTL)
- 3 S3 buckets (private with OAC)
- 1 CloudFront distribution (caching enabled)
- 1 Cognito user pool (MFA optional)

**AI Models**:
- Claude Haiku 4.5 (all text generation)
- Nova Canvas (image generation)

## Component Flow

```
User → CloudFront → Lambda@Edge (auth) → Lambda Functions → Bedrock/DynamoDB → Response
```

## Security Architecture

**Authentication**: Cognito JWT → Lambda@Edge validates → SigV4 signs → Lambda executes

**Data Protection**:
- S3: Private with BlockPublicAccess.BLOCK_ALL
- Lambda URLs: IAM authentication (AWS_IAM)
- DynamoDB: Encrypted at rest
- CloudFront: HTTPS enforced, TLS 1.2+

## Caching Architecture

**3-Layer Caching**:
1. DynamoDB (ingredient, recipe, product summary)
2. CloudFront (static assets, 24h TTL)
3. Browser (LocalStorage for user data)

**Performance**: 26s → 1s (96% improvement)

## Data Architecture

**5 DynamoDB Tables**:
- OpenFoodFactsTable (PK: product_code)
- ProductsTable (PK: product_code, SK: language)
- ProductsSummaryTable (PK: product_code, SK: params_hash, TTL: 30d)
- IngredientCacheTable (PK: image_hash, TTL: 30d)
- RecipeCacheTable (PK: ingredients_hash, SK: params_hash, TTL: 30d)

See [ARCHITECTURE.md](../ARCHITECTURE.md) in root for detailed diagrams.
