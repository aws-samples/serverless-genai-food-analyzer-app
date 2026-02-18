# System Components

## Lambda Functions (7 total)

### 1. barcode_ingredients (Python 3.14)
**Complexity**: 650 LOC, 15 functions, score 83.2 (Highest)  
**Purpose**: Fetch product data from Open Food Facts, generate ingredient descriptions  
**Model**: Claude Haiku 4.5  
**Caching**: Product data by product_code + language

### 2. barcode_product_summary (Node.js 24.x)
**Complexity**: 470 LOC, 9 functions, score 50.6  
**Purpose**: Generate personalized product summaries (streaming)  
**Model**: Claude Haiku 4.5  
**Caching**: Summaries by product_code + params_hash

### 3. barcode_image (Python 3.14)
**Complexity**: 403 LOC, 13 functions, score 58.9  
**Purpose**: Generate AI product visualizations  
**Model**: Nova Canvas  
**Output**: S3 URL

### 4. recipe_image_ingredients (Python 3.14)
**Complexity**: 205 LOC, 8 functions, score 47.7  
**Purpose**: Extract ingredients from fridge photos (vision)  
**Model**: Claude Haiku 4.5  
**Caching**: Ingredients by image_hash  
**Performance**: 8s → 0.5s with cache

### 5. recipe_proposals (Python 3.14)
**Complexity**: 362 LOC, 10 functions, score 69.9  
**Purpose**: Generate 3 personalized recipes with images  
**Models**: Claude Haiku 4.5 + Nova Canvas  
**Caching**: Recipes by ingredients_hash + params_hash  
**Performance**: 18s → 0.5s with cache

### 6. recipe_step_by_step (Node.js 24.x)
**Complexity**: 176 LOC, 2 functions, score 17.0  
**Purpose**: Stream cooking instructions  
**Model**: Claude Haiku 4.5  
**Streaming**: Yes

### 7. auth (Lambda@Edge, Node.js 24.x)
**Complexity**: 217 LOC, 3 functions, score 26.1  
**Purpose**: Validate Cognito JWT, sign Lambda URL requests  
**Special**: Runs at CloudFront edge

## Frontend Components (8 core pages)

1. **recipe.tsx** (664 LOC) - Recipe generation page
2. **recipe_proposals.tsx** (559 LOC) - Recipe display
3. **preferences.tsx** (606 LOC) - 6-dimensional personalization
4. **barcode_ingredients.tsx** (388 LOC) - Product details
5. **recipe_image_ingredients.tsx** (300 LOC) - Fridge analysis
6. **favorites.tsx** (260 LOC) - Saved recipes
7. **cart.tsx** (234 LOC) - Shopping cart
8. **barcode.tsx** (230 LOC) - Barcode scanner

## Infrastructure Components

**FoodAnalyzerStack** (823 LOC, score 64.0):
- Creates all AWS resources
- Configures security
- Sets up monitoring

**Supporting Constructs**:
- Auth (71 LOC) - Cognito
- Dashboard (224 LOC) - CloudWatch
- LoadDatabase (123 LOC) - Open Food Facts loader
