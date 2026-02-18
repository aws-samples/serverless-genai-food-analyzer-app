# Interfaces and APIs

## Lambda Function URLs (6 endpoints)

All require **IAM authentication** via SigV4 signing.

### 1. /fetchIngredients/{barcode}
**Lambda**: barcode_ingredients  
**Method**: GET  
**Response**: Product data with ingredient descriptions

### 2. /fetchSummary
**Lambda**: barcode_product_summary  
**Method**: POST  
**Streaming**: Yes  
**Response**: Personalized product summary

### 3. /fetchImage
**Lambda**: barcode_image  
**Method**: POST  
**Response**: S3 URL for product image

### 4. /fetchImageIngredients
**Lambda**: recipe_image_ingredients  
**Method**: POST  
**Input**: Base64 images  
**Response**: Array of detected ingredients

### 5. /fetchRecipePropositions
**Lambda**: recipe_proposals  
**Method**: POST  
**Input**: Ingredients + 6 preferences  
**Response**: 3 recipes with images

### 6. /stepsRecipe
**Lambda**: recipe_step_by_step  
**Method**: POST  
**Streaming**: Yes  
**Response**: Markdown cooking instructions

## Data Models

### UserPreferences (LocalStorage)
```typescript
{
  allergies: Array<{value, label}>,
  dietaryPrefs: Array<{value, label}>,
  healthGoal: {value, label},
  religion: {value, label},
  dislikedIngredients: Array<{value, label}>,
  favoriteCuisines: Array<{value, label}>
}
```

### CartItem (LocalStorage)
```typescript
{
  ingredient: string,
  price: number,
  recipeTitle: string,
  recipeId: string
}
```

### Recipe
```typescript
{
  recipe_id: string,
  recipe_title: string,
  description: string,
  difficulty: "easy" | "medium" | "hard",
  preparation_time: number,
  cooking_time: number,
  ingredients: string[],
  optional_ingredients: string[],
  image_url: string
}
```

## External APIs

**Open Food Facts**: `https://world.openfoodfacts.org/api/v0/product/{barcode}.json`

## Authentication Flow

1. User authenticates with Cognito
2. Receives JWT token
3. Frontend includes token in Authorization header
4. Lambda@Edge validates JWT
5. Signs request with SigV4
6. Lambda executes with IAM authorization
