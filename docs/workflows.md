# Key Workflows

## Workflow 1: Recipe Generation (Primary)

1. User uploads fridge photo
2. Lambda@Edge validates JWT, signs request
3. recipe_image_ingredients detects ingredients (Claude Haiku 4.5 vision)
4. Check IngredientCacheTable (cache hit = 0.5s, miss = 8s)
5. recipe_proposals generates 3 recipes (Claude Haiku 4.5)
6. Nova Canvas generates 3 images in parallel
7. Check RecipeCacheTable (cache hit = 0.5s, miss = 18s)
8. Display recipes with "Add All Ingredients to Cart" button

**Performance**: First run 26s, cached 1s (96% faster)

## Workflow 2: Barcode Scanning

1. User scans barcode
2. barcode_ingredients fetches from Open Food Facts
3. Stores in ProductsTable
4. barcode_product_summary generates personalized analysis (streaming)
5. Check ProductsSummaryTable cache
6. Stream response to frontend
7. Optional: barcode_image generates visualization

## Workflow 3: Add to Cart

1. User clicks "Add All Ingredients to Cart"
2. System calculates mock prices for each ingredient
3. Creates CartItem objects with recipe context
4. Stores in localStorage
5. Shows CartSuccessModal
6. User can navigate to cart or continue shopping

## Workflow 4: Checkout

1. User reviews cart (items grouped by recipe)
2. Calculates subtotal + tax
3. Clicks "Checkout"
4. Generates mock order number
5. Shows delivery time (Today 7PM)
6. Clears cart
7. Shows CheckoutSuccess modal

## Workflow 5: Favorites

1. User saves recipe (⭐ button)
2. Stores in localStorage with timestamp
3. Favorites page displays all saved recipes
4. User can quick reorder (add all ingredients to cart)
5. Navigate to cart automatically

## Workflow 6: Leftover Optimization

1. User completes recipe
2. Rates recipe (1-5 stars)
3. System suggests leftover recipe
4. Shows new ingredients needed with pricing
5. User can add to cart or save to favorites
6. Modal stays open for multiple actions

## Workflow 7: Caching Strategy

1. Request arrives
2. Generate cache key (hash of inputs)
3. Check DynamoDB cache
4. Cache hit → Return immediately (0.5s)
5. Cache miss → Call Bedrock (10-20s)
6. Store result with 30-day TTL
7. Return response

**Cache Layers**:
- Level 1: DynamoDB (ingredient, recipe, product)
- Level 2: CloudFront (static assets, 24h)
- Level 3: Browser (LocalStorage)
