# Data Models

## Frontend Models (TypeScript)

### UserPreferences
```typescript
interface UserPreferences {
  allergies: Array<{value: string, label: string}>;
  dietaryPrefs: Array<{value: string, label: string}>;
  healthGoal: {value: string, label: string};
  religion: {value: string, label: string};
  dislikedIngredients: Array<{value: string, label: string}>;
  favoriteCuisines: Array<{value: string, label: string}>;
}
```

### CartItem
```typescript
interface CartItem {
  ingredient: string;
  price: number;
  recipeTitle: string;
  recipeId: string;
}
```

### Recipe
```typescript
interface Recipe {
  recipe_id: string;
  recipe_title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  preparation_time: number;
  cooking_time: number;
  ingredients: string[];
  optional_ingredients: string[];
  image_url: string;
}
```

### FavoriteRecipe
```typescript
interface FavoriteRecipe extends Recipe {
  savedAt: string;
  rating?: number;
}
```

## Backend Models (Python)

### ProductItem (DynamoDB)
```python
class ProductItem:
    product_code: str           # PK
    language: str              # SK
    product_name: str
    ingredients: str
    allergens_tags: List[str]
    nutriments: dict
    labels_tags: List[str]
    categories: str
```

### ProductSummaryItem (DynamoDB)
```python
class ProductSummaryItem:
    product_code: str          # PK
    params_hash: str          # SK
    summary: str
    timestamp: int
    ttl: int                  # 30 days
```

### IngredientCacheItem (DynamoDB)
```python
class IngredientCacheItem:
    image_hash: str           # PK
    ingredients: str          # JSON array
    timestamp: int
    ttl: int                  # 30 days
```

### RecipeCacheItem (DynamoDB)
```python
class RecipeCacheItem:
    ingredients_hash: str     # PK
    params_hash: str         # SK
    recipes: str             # JSON array
    timestamp: int
    ttl: int                 # 30 days
```

## Cache Key Generation

### Ingredient Cache
```python
image_hash = MD5(sorted(list_images_base64))
```

### Recipe Cache
```python
ingredients_hash = MD5(sorted(ingredients))
params_hash = MD5({
    ingredients, allergies, preferences, 
    health_goal, religion, disliked_ingredients,
    favorite_cuisines, language
})
```

### Product Summary Cache
```typescript
params_hash = SHA256(
    product_code + allergies + preferences + 
    health_goal + religion + language
)
```

## AI Model I/O

### Claude Haiku 4.5 Input
```json
{
  "messages": [{
    "role": "user",
    "content": "..."
  }],
  "max_tokens": 2000,
  "temperature": 0
}
```

### Nova Canvas Input
```json
{
  "taskType": "TEXT_IMAGE",
  "textToImageParams": {
    "text": "Professional food photography...",
    "negativeText": "text, words, letters..."
  },
  "imageGenerationConfig": {
    "numberOfImages": 1,
    "quality": "premium",
    "height": 1024,
    "width": 1024
  }
}
```
