// Educational fun facts for loading screens
// Grocery and nutrition focused

export const funFacts = [
  {
    ingredient: "salmon",
    fact: "Salmon is rich in Omega-3 fatty acids which support heart health and brain function. Your family will get 2,000mg in tonight's meal!",
  },
  {
    ingredient: "broccoli",
    fact: "Broccoli contains more vitamin C than an orange! One cup provides 135% of your daily needs and helps boost your immune system.",
  },
  {
    ingredient: "chicken",
    fact: "Chicken breast is one of the leanest proteins available. A 3oz serving has 26g of protein and only 3g of fat!",
  },
  {
    ingredient: "eggs",
    fact: "Eggs are a complete protein source with all 9 essential amino acids. They're also one of the most affordable proteins at about $0.20 per egg!",
  },
  {
    ingredient: "tomatoes",
    fact: "Tomatoes are packed with lycopene, a powerful antioxidant. Cooking tomatoes actually increases lycopene absorption by 35%!",
  },
  {
    ingredient: "carrots",
    fact: "Carrots get their orange color from beta-carotene, which your body converts to vitamin A for healthy vision and immune function.",
  },
  {
    ingredient: "garlic",
    fact: "Garlic has been used medicinally for over 5,000 years! It contains allicin, which has antibacterial and anti-inflammatory properties.",
  },
  {
    ingredient: "honey",
    fact: "Honey never spoils! Archaeologists found 3,000-year-old honey in Egyptian tombs that was still edible. It's nature's perfect preservative.",
  },
  {
    ingredient: "spinach",
    fact: "Spinach is loaded with iron and folate. Pairing it with vitamin C (like lemon juice) increases iron absorption by up to 300%!",
  },
  {
    ingredient: "yogurt",
    fact: "Yogurt contains probiotics that support gut health. Greek yogurt has twice the protein of regular yogurt - about 17g per cup!",
  },
];

// Get a random fun fact, optionally filtered by detected ingredients
export const getRandomFunFact = (detectedIngredients?: string[]): string => {
  if (detectedIngredients && detectedIngredients.length > 0) {
    // Try to find a fact matching detected ingredients
    const matchingFacts = funFacts.filter(fact =>
      detectedIngredients.some(ing => ing.toLowerCase().includes(fact.ingredient))
    );
    
    if (matchingFacts.length > 0) {
      const randomFact = matchingFacts[Math.floor(Math.random() * matchingFacts.length)];
      return randomFact.fact;
    }
  }
  
  // Fallback to random fact
  const randomFact = funFacts[Math.floor(Math.random() * funFacts.length)];
  return randomFact.fact;
};
