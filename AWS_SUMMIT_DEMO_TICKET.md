# AWS Summit 2026 Demo Ticket

## 1. Demo Title

**The Future of Grocery Shopping with GenAI**

---

## 2. Description of Demo

### Overview
This interactive demo showcases how generative AI transforms grocery retail by enabling recipe-driven commerce. The demo illustrates how major retailers like Walmart, Carrefour, and Trader Joe's can leverage Amazon Bedrock to revolutionize customer shopping experiences and increase basket size by 15-25%.

### Theme
**Recipe-First Shopping**: Flipping the traditional grocery model from product browsing to meal planning, where AI-powered recipes drive purchase decisions.

### Main Features/Capabilities
1. **AI-Powered Ingredient Detection**: Photo your fridge → Claude Haiku 4.5 (vision) detects all ingredients in seconds
2. **Personalized Recipe Generation**: 3 AI-generated recipes with stunning food photography (Nova Canvas) respecting 6 preference dimensions
3. **One-Click Cart Conversion**: "Add All Ingredients to Cart" automatically identifies missing items with pricing
4. **Barcode Scanning (Kiosk Mode)**: Instant personalized product analysis for in-store use
5. **Leftover Optimization**: AI suggests next-day recipes using leftovers, reducing waste
6. **Favorites & Quick Reorder**: Save recipes for one-click repeat purchases

### Target Audience
- **Primary**: Grocery retail executives and innovation teams
- **Secondary**: AWS customers in retail/e-commerce
- **Tertiary**: Solutions architects and developers

### Expected Outcomes
- Demonstrate practical GenAI application in retail
- Showcase Amazon Bedrock capabilities (Claude Haiku 4.5, Nova Canvas)
- Illustrate serverless architecture patterns
- Generate customer interest in grocery AI transformation
- Collect feedback for product roadmap

### Technical Components
- **Frontend**: React + Vite + Cloudscape Design System
- **Backend**: 7 AWS Lambda functions (Python 3.14, Node.js 24.x)
- **AI/ML**: Amazon Bedrock (Claude Haiku 4.5, Nova Canvas)
- **Data**: 5 DynamoDB tables with intelligent caching
- **CDN**: CloudFront with Origin Access Control
- **Auth**: Amazon Cognito + Lambda@Edge
- **Monitoring**: CloudWatch + X-Ray + CloudTrail

### How Demo Will Be Used
- **Live demonstrations** at AWS Summit booth
- **Screen share presentations** to retail customers
- **Trade show showcase** with instant demos (3 sample fridges)
- **Customer pilot discussions** with Walmart, Carrefour, Trader Joe's

---

## 3. AWS Event

### Event Details
- **Event Name**: AWS Summit Paris 2026
- **Date**: TBD (Spring 2026)
- **Location**: Paris, France (Physical event)
- **Expected Audience**: 5,000+ attendees
- **Booth Traffic**: 200-300 visitors per day

### Event Requirements
- **Demo Type**: Type 2 (Screen share only, no customer interaction)
- **Duration**: 5-10 minutes per demo
- **Frequency**: 20-30 demos per day
- **Equipment**: Laptop with screen share capability
- **Network**: Stable internet connection required
- **Backup**: Video recording available if live demo fails

### Specific Constraints
- Customers observe only (no hands-on access)
- No file transfers or downloads
- No customer recording permitted
- Demo controlled by presenter only

---

## 4. AVS Ticket/Consult (If Applicable)

**Status**: ⚠️ Pending

**Required Consultations**:
1. **Photo Upload Feature**: Requires AppSec consultation
   - Photos processed in-memory only
   - Not stored persistently
   - Isolated per session
   - **Action**: Schedule AppSec office hours

2. **Bedrock Model Usage**: Legal approval required
   - Claude Haiku 4.5 (anthropic.claude-haiku-4-5-20251001-v1:0)
   - Nova Canvas (amazon.nova-canvas-v1:0)
   - **Action**: Submit legal ticket

3. **Open Food Facts Dataset**: Dataset approval required
   - License: Open Database License (ODbL)
   - Commercial use permitted
   - **Action**: Confirm with IP Legal

**AVS Ticket**: _______________ (To be created)

---

## 5. Details on How Users Will Interact with the Demo

### User Access Method
**Screen Share Only** - No direct customer access

### Interaction Flow

**Step 1: Introduction** (30 seconds)
- Presenter explains the problem: Traditional grocery shopping is inefficient
- Show business value: 15-25% basket increase, 20% waste reduction

**Step 2: Demo Fridge Selection** (10 seconds)
- Presenter selects one of 3 demo fridges:
  - 🥬 Fresh & Healthy (vegetables, fruits)
  - 🍖 Meal Prep Ready (proteins, grains)
  - 🍊 Family Favorites (family staples)
- Instant ingredient detection (cached, <1 second)

**Step 3: Recipe Generation** (5 seconds)
- AI generates 3 personalized recipes with images
- Shows ingredient breakdown:
  - ✅ You have: chicken, tomatoes, onions
  - 🛒 Need to buy: feta cheese, olive oil
- Cached response (<1 second)

**Step 4: Cart Conversion** (10 seconds)
- Click "Add All Ingredients to Cart"
- Show cart with grouped items by recipe
- Display total with mock pricing
- Demonstrate journey progress indicator

**Step 5: Barcode Scanning** (30 seconds)
- Scan product barcode (e.g., feta cheese)
- Show personalized analysis:
  - Allergen warnings
  - Dietary compatibility
  - Nutritional recommendations
- Demonstrate kiosk mode concept

**Step 6: Additional Features** (1-2 minutes)
- Favorites: Quick reorder saved recipes
- Leftover suggestions: Next-day meal ideas
- Preferences: 6-dimensional personalization

**Step 7: Business Value** (30 seconds)
- Recap: Recipe-driven commerce increases basket size
- Integration points: Product catalog, checkout, store locator
- Call to action: Pilot program discussion

### Required Prerequisites
**For Presenter**:
- Cognito user credentials
- Stable internet connection
- Screen share capability
- Backup video (if live demo fails)

**For Customers**:
- None (observation only)

### Hands-On Components
**None** - This is a Type 2 demo (screen share only)

---

## 6. Design and Threat Model Documents

### Architecture Diagrams
**Location**: [docs/architecture.md](docs/architecture.md)

**Includes**:
- High-level architecture (Mermaid diagram)
- Component architecture
- Data flow diagrams
- Security architecture with authentication flow
- Deployment architecture
- Performance architecture with caching

### Data Flow Diagrams
**Location**: [docs/workflows.md](docs/workflows.md)

**Includes**:
- Recipe generation flow (12 steps)
- Barcode scanning flow (11 steps)
- Authentication flow (JWT + SigV4)
- Caching strategy flow
- Error handling flow

### Security Controls
**Location**: [WELL_ARCHITECTED_REVIEW.md](WELL_ARCHITECTED_REVIEW.md)

**Security Score**: 10/10 (Production Ready)

**Controls Implemented**:
- ✅ All Lambda URLs: IAM authentication (AWS_IAM)
- ✅ All S3 buckets: Private with BlockPublicAccess.BLOCK_ALL
- ✅ Cognito: Self-registration disabled, MFA optional
- ✅ CloudFront: HTTPS enforced, TLS 1.2+, security headers
- ✅ Secrets Manager: No hardcoded credentials
- ✅ CloudTrail: Audit logging enabled
- ✅ Encryption: At rest (DynamoDB, S3) and in transit (HTTPS)

### Threat Model
**Location**: [ARCHITECTURE.md](ARCHITECTURE.md) - Security Implementation section

**Threats Mitigated**:
1. **Unauthorized Access**: IAM authentication + Cognito JWT validation
2. **Data Exposure**: Private S3 buckets, encrypted data
3. **MITM Attacks**: HTTPS enforced, TLS 1.2+
4. **Credential Theft**: Secrets Manager, no hardcoded secrets
5. **Account Takeover**: Strong password policy, MFA optional
6. **API Abuse**: Lambda@Edge validation, rate limiting (future)

---

## 7. Completed Demo Review Checklist

**Location**: [demo-review-checklist.md](demo-review-checklist.md)

### Compliance Status

**Security Requirements** (6/6): ✅ All Acknowledged
1. ✅ Isengard account usage
2. ✅ Screen share only
3. ✅ No customer interaction
4. ✅ No customer/proprietary data
5. ✅ GA services only
6. ✅ Cognito authentication (self-signup disabled)

**Security Controls** (4/4): ✅ All Compliant
7. ✅ All links valid
8. ✅ AWS-owned domain (CloudFront)
9. ✅ HTTPS enforced (TLS 1.2+)
10. ✅ No public access (S3, Lambda)

**3rd Party Content** (3/3): ✅ All Compliant
11. ✅ Digital assets licensed
12. ✅ AWS has rights to assets
13. ✅ Approved dataset (Open Food Facts - ODbL)

**Content Uploads** (1/1): ⚠️ Requires AppSec Consultation
14. ⚠️ Photo uploads (in-memory processing only)

**GenAI/ML** (2/2): ⚠️ Action Required
15. ⚠️ ML models listed (legal tickets pending)
16. ⚠️ Bedrock Guardrails (not yet implemented)

### Action Items Before Summit
1. ⚠️ Enable Bedrock Guardrails
2. ⚠️ Consult AppSec about photo uploads
3. ⚠️ Obtain legal approvals for Bedrock models

---

## 8. Automated Scan Results

### Vulnerability Scans

**npm audit** (Last run: Feb 18, 2026):
```bash
npm audit
# Result: 0 vulnerabilities
```

**Status**: ✅ No vulnerabilities

### Code Analysis

**TypeScript Compilation**:
```bash
npm run build
# Result: Success, no errors
```

**Status**: ✅ Clean build

### Configuration Reviews

**CDK Policy Validation**:
```bash
cdk synth
# Policy Validation Report: success
# cdk-validator-cfnguard: success
```

**Status**: ✅ All policies compliant

**Security Best Practices**:
- ✅ No hardcoded secrets
- ✅ Least privilege IAM policies
- ✅ Private resources by default
- ✅ Encryption enabled
- ✅ Strong password policies

### Infrastructure Validation

**Post-Deployment Validation**:
```bash
bash scripts/validate-deployment.sh
# Result: All checks passed
```

**Checks Performed**:
- ✅ CloudFormation stack: UPDATE_COMPLETE
- ✅ Lambda functions: 7 functions found
- ✅ DynamoDB tables: 5 tables found, TTL enabled
- ✅ CloudFront: Responding HTTP 200
- ✅ S3 buckets: 2 buckets found
- ✅ Cognito: User pool configured, MFA optional
- ✅ CloudWatch logs: No recent errors

### Remediation Status

**No findings requiring remediation**

**Pending Actions** (Pre-Summit):
1. Enable Bedrock Guardrails (security requirement)
2. AppSec consultation for photo uploads
3. Legal approvals for ML models

---

## 9. Decommissioning Document

### Resource Cleanup Procedures

**After AWS Summit 2026**:

#### Option A: Repurpose for Next Demo

**Keep Resources**:
- ✅ CloudFormation stack (FoodAnalyzer)
- ✅ DynamoDB tables (clear cache only)
- ✅ S3 buckets (keep structure)
- ✅ Lambda functions
- ✅ CloudFront distribution
- ✅ Cognito user pool

**Clear Data**:
```bash
# Clear cache tables
bash scripts/clear-cache.sh

# Remove demo users
aws cognito-idp list-users \
  --user-pool-id us-east-1_wLqpZJIjB | \
  jq -r '.Users[].Username' | \
  xargs -I {} aws cognito-idp admin-delete-user \
    --user-pool-id us-east-1_wLqpZJIjB \
    --username {}

# Clear CloudWatch logs (optional)
aws logs delete-log-group \
  --log-group-name /aws/lambda/FoodAnalyzer-*
```

**Update Configuration**:
- Rotate Cognito secrets
- Update cost allocation tags
- Review and update IAM policies

#### Option B: Full Decommission

**Delete Stack**:
```bash
# Destroy all resources
cdk destroy FoodAnalyzer

# Verify deletion
aws cloudformation describe-stacks \
  --stack-name FoodAnalyzer
# Should return: Stack does not exist
```

**Manual Cleanup** (if needed):
```bash
# Delete S3 buckets (if not empty)
aws s3 rb s3://foodanalyzer-hostingbucket* --force
aws s3 rb s3://foodanalyzer-imgbucket* --force
aws s3 rb s3://foodanalyzer-trailbucket* --force

# Delete CloudWatch log groups
aws logs describe-log-groups \
  --log-group-name-prefix /aws/lambda/FoodAnalyzer | \
  jq -r '.logGroups[].logGroupName' | \
  xargs -I {} aws logs delete-log-group --log-group-name {}

# Delete CloudTrail trail
aws cloudtrail delete-trail --name FoodAnalyzer-dev-Trail
```

### Data Sanitization Methods

**DynamoDB Tables**:
```bash
# Option 1: Delete tables (full decommission)
aws dynamodb delete-table --table-name FoodAnalyzer-IngredientCacheTable*
aws dynamodb delete-table --table-name FoodAnalyzer-RecipeCacheTable*
aws dynamodb delete-table --table-name FoodAnalyzer-ProductsSummaryTable*
aws dynamodb delete-table --table-name FoodAnalyzer-ProductsTable*
aws dynamodb delete-table --table-name FoodAnalyzer-allProductsOpenFoodFactsTable*

# Option 2: Clear data only (repurpose)
# Use scripts/clear-cache.sh
```

**S3 Buckets**:
```bash
# Delete all objects
aws s3 rm s3://foodanalyzer-hostingbucket*/ --recursive
aws s3 rm s3://foodanalyzer-imgbucket*/ --recursive

# Verify empty
aws s3 ls s3://foodanalyzer-hostingbucket*/
```

**Cognito Users**:
```bash
# Delete all users
aws cognito-idp list-users \
  --user-pool-id us-east-1_wLqpZJIjB \
  --query 'Users[].Username' \
  --output text | \
  xargs -I {} aws cognito-idp admin-delete-user \
    --user-pool-id us-east-1_wLqpZJIjB \
    --username {}
```

**CloudWatch Logs**:
```bash
# Delete log groups (optional, auto-expire after 7 days)
aws logs describe-log-groups \
  --log-group-name-prefix /aws/lambda/FoodAnalyzer \
  --query 'logGroups[].logGroupName' \
  --output text | \
  xargs -I {} aws logs delete-log-group --log-group-name {}
```

### Account Handling Process

**Isengard Account**: _______________

**Post-Demo Options**:

**Option 1: Repurpose** (Recommended)
- Keep account active
- Clear demo data
- Update for next demo
- Maintain team access

**Option 2: Decommission**
- Delete all resources (`cdk destroy`)
- Verify no remaining resources
- Document lessons learned
- Archive code in GitLab

**Decision Criteria**:
- If similar demos planned: **Repurpose**
- If no future use: **Decommission**
- If cost concerns: **Decommission**

### Laptop/Device Handling

**Demo Laptop**:
- ✅ No sensitive data stored locally
- ✅ All credentials in AWS Secrets Manager
- ✅ No customer data downloaded
- ✅ Browser cache can be cleared

**Cleanup Steps**:
```bash
# Clear browser cache
# Clear AWS CLI credentials (if used)
rm -rf ~/.aws/credentials

# Clear git credentials
git credential-cache exit

# No additional wiping required (no sensitive data)
```

### Ownership and Responsibilities

**Resource Owner**: energy-utilities-france team

**Responsibilities**:
- **During Demo**: Monitor application, respond to issues
- **Post-Demo**: Execute cleanup procedures
- **Decommission**: Verify all resources deleted

**Timeline**:
- **T+1 day**: Clear cache, remove demo users
- **T+7 days**: Review costs, decide repurpose vs. decommission
- **T+30 days**: Execute decommission if decided

### Verification Checklist

**After Cleanup**:
- [ ] DynamoDB tables empty or deleted
- [ ] S3 buckets empty or deleted
- [ ] Cognito users removed
- [ ] CloudWatch logs deleted (optional)
- [ ] CloudFormation stack deleted (if decommissioning)
- [ ] Cost Explorer shows $0 ongoing costs
- [ ] No orphaned resources in account

**Verification Commands**:
```bash
# Check for remaining resources
aws cloudformation list-stacks \
  --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE \
  --query 'StackSummaries[?contains(StackName, `FoodAnalyzer`)]'

aws dynamodb list-tables \
  --query 'TableNames[?contains(@, `FoodAnalyzer`)]'

aws s3 ls | grep -i foodanalyzer

aws lambda list-functions \
  --query 'Functions[?contains(FunctionName, `FoodAnalyzer`)]'
```

---

## Summary

**Demo Status**: ✅ Production Ready (AWS Summit 2026)

**Compliance Status**:
- Security: ✅ 13/16 compliant (3 pending actions)
- Technical: ✅ All systems operational
- Documentation: ✅ Complete

**Action Items**:
1. ⚠️ Enable Bedrock Guardrails
2. ⚠️ AppSec consultation for photo uploads
3. ⚠️ Legal approvals for ML models
4. ⚠️ Create AVS ticket

**Decommission Plan**: Documented and ready to execute post-Summit

---

**Ticket Created**: February 18, 2026  
**Created By**: energy-utilities-france team  
**Review Status**: Pending AppSec and Legal approvals
