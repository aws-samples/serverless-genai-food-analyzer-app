api_fields_recommendation.md

# Open Food Facts API Fields vs User Preferences Analysis

## Executive Summary

The Food Analyzer app compares scanned products against user preferences to generate personalized recommendations. Currently, the app only uses 3 API fields but user preferences are much more comprehensive. This analysis identifies which additional API fields would significantly improve recommendation accuracy.

---

## Current User Preferences (from preferences.tsx)

### 1. Health Goals (Single Selection)
- Weight Loss
- Muscle Gain
- Maintain Weight
- General Health

### 2. Allergies (Multi-select)
- Eggs
- Peanuts
- Tree Nuts
- Milk
- Soy
- Wheat/Gluten
- Fish
- Shellfish
- Sesame

### 3. Dietary Preferences (Multi-select)
- Vegan
- Vegetarian
- Pescatarian
- Keto
- Paleo
- Low Carb
- Low Fat
- Low Sodium

### 4. Religious Requirements (Single Selection)
- None
- Halal
- Kosher
- Hindu

### 5. Disliked Ingredients (Multi-select)
- Cilantro
- Mushrooms
- Olives
- Onions
- Garlic
- Spicy Food

### 6. Favorite Cuisines (Multi-select)
- Italian
- Asian
- Mexican
- Mediterranean
- French
- Indian
- Middle Eastern

---

## Current API Usage

**Currently Requested Fields (3):**
```python
'ingredients_text,additives_tags,product_name'
```

**How They're Used:**
- `ingredients_text` → Parsed by LLM to generate ingredient descriptions
- `additives_tags` → Parsed by LLM to generate additive descriptions
- `product_name` → Displayed to user

**Current Prompt to LLM:**
```
<user_allergies>${userAllergiesString}</user_allergies>
<user_preferences>${userPreferenceString}</user_preferences>
```

The LLM must infer everything from raw ingredient text, which is:
- ❌ Unreliable for allergen detection
- ❌ Cannot determine nutritional values
- ❌ Cannot assess dietary compatibility
- ❌ Cannot evaluate processing level

---

## Gap Analysis: User Preferences vs Available Data

| User Preference Category | Current Data | Missing API Fields | Impact |
|-------------------------|--------------|-------------------|---------|
| **Allergies** | Ingredient text parsing | `allergens_tags` | 🔴 CRITICAL |
| **Health Goals** | None | `nutriments` (calories, macros) | 🔴 CRITICAL |
| **Dietary Prefs (Vegan/Vegetarian)** | Ingredient text parsing | `labels_tags`, `categories` | 🟡 HIGH |
| **Dietary Prefs (Keto/Low Carb)** | None | `nutriments.carbohydrates_100g`, `nutriments.sugars_100g` | 🔴 CRITICAL |
| **Dietary Prefs (Low Fat)** | None | `nutriments.fat_100g`, `nutriments.saturated-fat_100g` | 🔴 CRITICAL |
| **Dietary Prefs (Low Sodium)** | None | `nutriments.salt_100g`, `nutriments.sodium_100g` | 🔴 CRITICAL |
| **Religious (Halal/Kosher)** | Ingredient text parsing | `labels_tags` | 🟡 HIGH |
| **Processing Level** | None | `nova_group` | 🟢 MEDIUM |
| **Overall Quality** | None | `nutriscore_grade` | 🟢 MEDIUM |
| **Disliked Ingredients** | Ingredient text parsing | Better with structured data | 🟢 LOW |
| **Favorite Cuisines** | Not used | `categories` | 🟢 LOW |

---

## Recommended API Fields by Priority

### 🔴 CRITICAL PRIORITY

#### 1. `allergens_tags` 
**Why:** Safety-critical for allergy detection
- **User Preference:** Allergies (9 options)
- **Current Method:** LLM parsing of ingredient text (unreliable)
- **Improvement:** Direct allergen matching
- **Example:** `["en:milk", "en:nuts", "en:soybeans"]`
- **Availability:** ✅ Present in all tested products

#### 2. `nutriments` (Key Sub-fields)
**Why:** Essential for health goals and dietary preferences
- **User Preferences Affected:**
  - Health Goals (weight loss, muscle gain, maintain)
  - Keto/Low Carb
  - Low Fat
  - Low Sodium
  
**Required Sub-fields:**
```python
'nutriments.energy-kcal_100g'      # Calories
'nutriments.carbohydrates_100g'    # For keto/low carb
'nutriments.sugars_100g'           # For health goals
'nutriments.fat_100g'              # For low fat
'nutriments.saturated-fat_100g'    # For health goals
'nutriments.salt_100g'             # For low sodium
'nutriments.sodium_100g'           # For low sodium
'nutriments.proteins_100g'         # For muscle gain
'nutriments.fiber_100g'            # For general health
```
- **Availability:** ✅ Present in all products (varying completeness)

### 🟡 HIGH PRIORITY

#### 3. `labels_tags`
**Why:** Direct matching for dietary and religious requirements
- **User Preferences Affected:**
  - Vegan/Vegetarian
  - Halal/Kosher
  - Gluten-free (wheat allergy)
- **Example:** `["en:vegetarian", "en:no-gluten", "en:halal"]`
- **Availability:** ⚠️ Present in 50% of tested products
- **Fallback:** Continue using ingredient text parsing

#### 4. `categories`
**Why:** Better context for dietary compatibility
- **User Preferences Affected:**
  - Vegan/Vegetarian (e.g., "Plant-based foods")
  - Pescatarian (e.g., "Fish")
  - Favorite Cuisines
- **Example:** `"Plant-based foods,Fruits,Tropical fruits,Bananas"`
- **Availability:** ✅ Present in all tested products

### 🟢 MEDIUM PRIORITY

#### 5. `nova_group`
**Why:** Food processing level awareness
- **User Preferences Affected:** General Health
- **Values:** 1 (unprocessed) to 4 (ultra-processed)
- **Use Case:** Warn users about ultra-processed foods
- **Availability:** ✅ Present in all tested products

#### 6. `nutriscore_grade`
**Why:** Quick nutritional quality indicator
- **User Preferences Affected:** General Health
- **Values:** A (best) to E (worst)
- **Use Case:** Display badge, factor into recommendations
- **Availability:** ⚠️ Present in 75% of tested products

#### 7. `brands`
**Why:** Better product identification
- **User Preferences Affected:** None directly
- **Use Case:** Improve UI, product recognition
- **Availability:** ✅ Present in all tested products

---

## Implementation Recommendations

### Phase 1: Critical Safety & Health (Immediate)

**Add to API Request:**
```python
fixed_params = {
    'fields': 'ingredients_text,additives_tags,product_name,allergens_tags,nutriments'
}
```

**Filter Nutriments to:**
```python
nutrient_keys = [
    'energy-kcal_100g',
    'carbohydrates_100g',
    'sugars_100g',
    'fat_100g',
    'saturated-fat_100g',
    'salt_100g',
    'sodium_100g',
    'proteins_100g',
    'fiber_100g'
]
```

**Update LLM Prompt to Include:**
```xml
<allergens>${allergens_tags}</allergens>
<nutrition>
  Calories: ${energy-kcal_100g} kcal/100g
  Carbs: ${carbohydrates_100g}g/100g
  Sugars: ${sugars_100g}g/100g
  Fat: ${fat_100g}g/100g
  Saturated Fat: ${saturated-fat_100g}g/100g
  Salt: ${salt_100g}g/100g
  Protein: ${proteins_100g}g/100g
  Fiber: ${fiber_100g}g/100g
</nutrition>
<user_health_goal>${healthGoal}</user_health_goal>
```

**Benefits:**
- ✅ Accurate allergy detection (safety)
- ✅ Precise dietary compatibility (keto, low carb, low fat, low sodium)
- ✅ Personalized health goal recommendations
- ✅ Quantitative analysis instead of guessing

### Phase 2: Dietary & Religious (Next Sprint)

**Add to API Request:**
```python
fixed_params = {
    'fields': 'ingredients_text,additives_tags,product_name,allergens_tags,nutriments,labels_tags,categories'
}
```

**Update LLM Prompt to Include:**
```xml
<labels>${labels_tags}</labels>
<categories>${categories}</categories>
<user_religious_requirement>${religion}</user_religious_requirement>
```

**Benefits:**
- ✅ Direct vegan/vegetarian/halal/kosher matching
- ✅ Better dietary restriction compliance
- ✅ Reduced LLM hallucination

### Phase 3: Quality Indicators (Future Enhancement)

**Add to API Request:**
```python
fixed_params = {
    'fields': 'ingredients_text,additives_tags,product_name,allergens_tags,nutriments,labels_tags,categories,nova_group,nutriscore_grade,brands'
}
```

**Update UI to Display:**
- Nutri-Score badge (A-E color-coded)
- NOVA group indicator with explanation
- Brand information

**Benefits:**
- ✅ Visual quality indicators
- ✅ Processing level awareness
- ✅ Better product identification

---

## Expected Impact on User Experience

### Before (Current State)
```
User: "I'm allergic to milk and trying to lose weight"
App: Scans product, sends ingredient text to LLM
LLM: Tries to parse "LAIT écrémé en poudre" → May miss it
LLM: Guesses if product is good for weight loss based on ingredient names
Result: ⚠️ Potentially unsafe, inaccurate recommendations
```

### After (Phase 1)
```
User: "I'm allergic to milk and trying to lose weight"
App: Scans product, gets allergens_tags and nutriments
App: Detects "en:milk" in allergens_tags → ⚠️ ALERT
App: Sees 539 kcal/100g, 56.3g sugar/100g
LLM: "This product contains MILK (allergen alert). With 539 calories and 56g sugar per 100g, it's not suitable for weight loss."
Result: ✅ Safe, accurate, personalized
```

---

## Database Schema Changes

### DynamoDB Table: PRODUCT_TABLE_NAME

**Add Fields:**
```python
{
    'product_code': str,
    'language': str,
    'product_name': str,
    'ingredients': dict,
    'additives': dict,
    'allergens_tags': list,        # NEW
    'nutriments': dict,            # NEW
    'labels_tags': list,           # NEW (Phase 2)
    'categories': str,             # NEW (Phase 2)
    'nova_group': int,             # NEW (Phase 3)
    'nutriscore_grade': str,       # NEW (Phase 3)
    'brands': str                  # NEW (Phase 3)
}
```

### Lambda Response Changes

**barcode_ingredients/index.py:**
```python
response = {
    "ingredients_description": response_ingredients,
    "additives_description": response_additives,
    "product_name": product_name,
    "allergens": allergens_tags,           # NEW
    "nutriments": filtered_nutrients,      # NEW
    "labels": labels_tags,                 # NEW (Phase 2)
    "categories": categories,              # NEW (Phase 2)
    "nova_group": nova_group,              # NEW (Phase 3)
    "nutriscore": nutriscore_grade,        # NEW (Phase 3)
    "brands": brands                       # NEW (Phase 3)
}
```

---

## Cost-Benefit Analysis

### Development Effort
- **Phase 1:** 2-3 days (API change, DB schema, prompt update, testing)
- **Phase 2:** 1-2 days (Additional fields, prompt refinement)
- **Phase 3:** 1-2 days (UI enhancements, badges)

### User Impact
- **Safety:** 🔴 Critical improvement (accurate allergen detection)
- **Accuracy:** 🔴 Critical improvement (quantitative vs qualitative)
- **Personalization:** 🟡 High improvement (health goals, dietary prefs)
- **Trust:** 🟡 High improvement (data-driven recommendations)

### Technical Debt
- **Current:** High (relying on LLM to parse everything)
- **After Phase 1:** Low (structured data, reduced hallucination)

---

## Conclusion

**Immediate Action Required:** Implement Phase 1 (allergens_tags + nutriments)

This addresses:
- ✅ 9/9 allergy preferences (CRITICAL for safety)
- ✅ 4/4 health goals (weight loss, muscle gain, maintain, general)
- ✅ 4/8 dietary preferences (keto, low carb, low fat, low sodium)

**ROI:** High impact, low effort, critical for app credibility and user safety.

**Next Steps:**
1. Update `barcode_ingredients/index.py` API request
2. Filter and store nutriments in DynamoDB
3. Update `barcode_product_summary/index.ts` prompt
4. Add allergen alert logic in frontend
5. Test with products containing common allergens
