# Phase 2 Implementation Plan

## Overview
Phase 2 adds dietary and religious requirement fields from Open Food Facts API and refines prompts for better recommendations.

---

## Goals

### Primary
- Add `labels_tags` for vegan/vegetarian/halal/kosher detection
- Add `categories` for better product classification
- Refine LLM prompts with structured dietary data
- Improve religious requirement matching

### Secondary
- Reduce LLM hallucination with structured data
- Better dietary restriction compliance
- Enhanced product context

---

## API Fields to Add

### 1. `labels_tags` (HIGH PRIORITY)
**Purpose:** Direct matching for dietary and religious requirements

**Examples:**
- `"en:vegetarian"`, `"en:vegan"`
- `"en:halal"`, `"en:kosher"`
- `"en:no-gluten"`, `"en:organic"`

**User Preferences Affected:**
- Vegan/Vegetarian
- Halal/Kosher
- Gluten-free

**Availability:** ~50% of products

### 2. `categories` (HIGH PRIORITY)
**Purpose:** Better context for dietary compatibility

**Examples:**
- `"Plant-based foods,Fruits,Tropical fruits,Bananas"`
- `"Meats,Poultry"`
- `"Dairies,Cheeses"`

**User Preferences Affected:**
- Vegan/Vegetarian
- Pescatarian
- Favorite Cuisines

**Availability:** ~100% of products

---

## Implementation Steps

### Step 1: Update API Request
**File:** `lambda/barcode_ingredients/index.py`

**Change:**
```python
# Before
fixed_params = {'fields': 'ingredients_text,additives_tags,product_name,allergens_tags,nutriments'}

# After
fixed_params = {'fields': 'ingredients_text,additives_tags,product_name,allergens_tags,nutriments,labels_tags,categories'}
```

### Step 2: Update Database Functions
**File:** `lambda/barcode_ingredients/index.py`

**Functions to update:**
- `get_product_from_db()` - Add labels_tags, categories to return
- `write_product_to_db()` - Add labels_tags, categories to storage
- `fetch_new_product()` - Extract labels_tags, categories from API
- `handler()` - Add labels_tags, categories to response

### Step 3: Update Response Structure
**File:** `lambda/barcode_ingredients/index.py`

```python
response = {
    "ingredients_description": response_ingredients,
    "additives_description": response_additives,
    "product_name": product_name,
    "allergens_tags": allergens,
    "nutriments": nutriments,
    "labels_tags": labels,        # NEW
    "categories": categories       # NEW
}
```

### Step 4: Update TypeScript Interface
**File:** `lambda/barcode_product_summary/index.ts`

```typescript
interface ProductItem {
    product_code: string;
    language: string;
    product_name?: string;
    ingredients?: string;
    additives?: string;
    allergens_tags?: string[];
    nutriments?: any;
    labels_tags?: string[];    // NEW
    categories?: string;       // NEW
}
```

### Step 5: Enhance LLM Prompt
**File:** `lambda/barcode_product_summary/index.ts`

**Add to prompt:**
```xml
<product_labels>
${labels_tags.join(', ')}
</product_labels>

<product_categories>
${categories}
</product_categories>

<user_religious_requirement>
${userReligion}
</user_religious_requirement>
```

**Update instructions:**
- Check if product labels match dietary preferences (vegan, vegetarian)
- Check if product labels match religious requirements (halal, kosher)
- Use categories to provide better context
- Prioritize label data over ingredient text parsing

---

## Prompt Refinement

### Current Prompt Structure
```xml
<product_allergens>...</product_allergens>
<nutrition_per_100g>...</nutrition_per_100g>
<user_allergies>...</user_allergies>
<user_health_goal>...</user_health_goal>
<user_dietary_preferences>...</user_dietary_preferences>
```

### Enhanced Prompt Structure (Phase 2)
```xml
<product_allergens>...</product_allergens>
<product_labels>vegetarian, no-gluten, organic</product_labels>
<product_categories>Plant-based foods, Fruits</product_categories>
<nutrition_per_100g>...</nutrition_per_100g>

<user_allergies>...</user_allergies>
<user_health_goal>...</user_health_goal>
<user_dietary_preferences>vegan, low carb</user_dietary_preferences>
<user_religious_requirement>halal</user_religious_requirement>
```

### Instruction Refinements

**Add:**
1. **Dietary Label Matching:**
   - If user is vegan, check for "vegan" label
   - If user is vegetarian, check for "vegetarian" label
   - If no label, analyze categories and ingredients

2. **Religious Requirement Matching:**
   - If user requires halal, check for "halal" label
   - If user requires kosher, check for "kosher" label
   - If no label, note uncertainty

3. **Category Context:**
   - Use categories to understand product type
   - Better recommendations based on food category
   - Identify pescatarian compatibility from categories

---

## Testing Plan

### Test Cases

#### Test 1: Vegan Product Detection
**Product:** Plant-based milk (has "vegan" label)
**User:** Vegan preference
**Expected:** Confirm vegan compatibility from label

#### Test 2: Vegetarian Product Detection
**Product:** Cheese (has "vegetarian" label)
**User:** Vegetarian preference
**Expected:** Confirm vegetarian compatibility

#### Test 3: Halal Product Detection
**Product:** Halal-certified meat
**User:** Halal requirement
**Expected:** Confirm halal certification

#### Test 4: Category-Based Detection
**Product:** No labels, but categories show "Plant-based foods"
**User:** Vegan preference
**Expected:** Infer vegan compatibility from categories

#### Test 5: Missing Labels Fallback
**Product:** No labels_tags field
**User:** Vegetarian preference
**Expected:** Fall back to ingredient analysis

---

## Database Schema Changes

### DynamoDB Item Structure
```python
{
    'product_code': '3017620422003',
    'language': 'english',
    'product_name': 'Nutella',
    'ingredients': {...},
    'additives': {...},
    'allergens_tags': ['en:milk', 'en:nuts'],
    'nutriments': {...},
    'labels_tags': ['en:no-gluten'],           # NEW
    'categories': 'Spreads,Sweet spreads'      # NEW
}
```

---

## Expected Improvements

### Accuracy
- ✅ Direct vegan/vegetarian detection (no parsing)
- ✅ Reliable halal/kosher identification
- ✅ Better dietary restriction compliance

### User Experience
- ✅ More confident recommendations
- ✅ Reduced "may contain" uncertainty
- ✅ Better religious requirement support

### Technical
- ✅ Reduced LLM hallucination
- ✅ Structured data over text parsing
- ✅ Faster processing (less LLM inference)

---

## Rollout Strategy

### Phase 2A: Backend Implementation
1. Update API request
2. Update database functions
3. Update response structure
4. Deploy and test

### Phase 2B: Prompt Enhancement
1. Update TypeScript interface
2. Enhance LLM prompt
3. Refine instructions
4. Deploy and test

### Phase 2C: Validation
1. Test with vegan products
2. Test with halal products
3. Test with products missing labels
4. Verify fallback behavior

---

## Success Metrics

- ✅ labels_tags field present in API response
- ✅ categories field present in API response
- ✅ Vegan products correctly identified
- ✅ Halal products correctly identified
- ✅ Graceful handling of missing labels
- ✅ No regression in Phase 1 features

---

## Timeline

**Estimated Effort:** 1-2 days

- Backend changes: 2-3 hours
- Prompt refinement: 1-2 hours
- Testing: 2-3 hours
- Documentation: 1 hour

---

## Next: Phase 3 Preview

Phase 3 will add quality indicators:
- `nova_group` (processing level: 1-4)
- `nutriscore_grade` (quality score: A-E)
- `brands` (product identification)
- UI enhancements (badges, visual indicators)
