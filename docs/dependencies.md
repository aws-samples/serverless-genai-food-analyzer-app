# Dependencies

## Backend Dependencies

### Python 3.14
- **boto3** - AWS SDK (Bedrock, DynamoDB, S3)
- **aws-lambda-powertools** - Logging, tracing
- **requests** - HTTP client (Open Food Facts)
- Standard library: json, hashlib, time, base64, uuid, re, xml, concurrent.futures

### Node.js 24.x
- **@aws-sdk/client-bedrock-runtime** - Bedrock API
- **@aws-sdk/client-dynamodb** - DynamoDB API
- **@aws-sdk/client-secrets-manager** - Secrets Manager
- **@aws-sdk/signature-v4** - SigV4 signing
- **@aws-lambda-powertools** - Logging, tracing
- **jose** - JWT verification
- **axios** - HTTP client

## Frontend Dependencies

### Core
- **react** (^18.3.1)
- **react-dom** (^18.3.1)
- **react-router-dom** (^7.1.3)

### UI
- **@cloudscape-design/components** (^3.0.1000)
- **@cloudscape-design/global-styles** (^1.0.37)

### AWS
- **aws-amplify** (^6.11.4)
- **@aws-amplify/ui-react** (^6.6.5)

### Utilities
- **react-markdown** (^9.0.2)
- **react-webcam** (^7.2.0)
- **html5-qrcode** (^2.3.8)

### Build
- **vite** (^7.1.11)
- **typescript** (^5.7.3)

## Infrastructure Dependencies

- **aws-cdk-lib** (^2.133.0)
- **constructs** (^10.0.0)
- **@aws-cdk/aws-cognito-identitypool-alpha** (^2.139.1-alpha.0)

## External Services

### Amazon Bedrock Models
- **Claude Haiku 4.5** (`anthropic.claude-haiku-4-5-20251001-v1:0`)
  - All text generation tasks
  - Vision capability for fridge photos
  - Streaming support
  
- **Nova Canvas** (`amazon.nova-canvas-v1:0`)
  - Recipe image generation
  - Product visualization

### Open Food Facts API
- **Base URL**: https://world.openfoodfacts.org
- **License**: Open Database License (ODbL)
- **Purpose**: Product nutritional data

## AWS Services

- AWS Lambda (7 functions)
- Amazon Bedrock (2 models)
- Amazon DynamoDB (5 tables)
- Amazon S3 (3 buckets)
- Amazon CloudFront (1 distribution)
- Amazon Cognito (1 user pool)
- AWS Secrets Manager
- Amazon CloudWatch
- AWS X-Ray
- AWS CloudTrail

## Version Requirements

- **Node.js**: 18+ (Lambda: 24.x)
- **Python**: Lambda 3.14
- **AWS CLI**: 2+
- **Docker**: Required for Lambda bundling
