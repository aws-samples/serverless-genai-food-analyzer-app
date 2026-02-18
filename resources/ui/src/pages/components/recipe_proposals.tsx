import React, { useState, useEffect } from "react";
import Button from "@cloudscape-design/components/button";
import TextContent from "@cloudscape-design/components/text-content";
import Alert from "@cloudscape-design/components/alert";
import { SpaceBetween } from "@cloudscape-design/components";
import { callStreamingAPI, callAPI } from "../../assets/js/custom";
import "../../assets/css/style.css";
import customTranslations from "../../assets/i18n/all";
import Badge from "@cloudscape-design/components/badge";
import ReactMarkdown from "react-markdown";
import { getMockPrice } from "../../utils/ingredient-mapping";
import { LeftoverSuggestion } from "./leftover-suggestion";
import { CartSuccessModal } from "./cart-success-modal";
import { getRandomFunFact } from "../../utils/fun-facts";

interface RecipeProposalProps {
  language: string;
  ingredients: string[];
  recipeContext?: {
    time?: string;
    people?: string;
    equipment?: readonly any[];
    budget?: string;
  };
}

const RecipeItem = ({ label, value }: { label: string; value: string }) => {
  return (
    <p>
      <Badge>{label}:</Badge> <small>{value}</small>
    </p>
  );
};

const RecipeProposal: React.FC<RecipeProposalProps> = ({
  language,
  ingredients,
  recipeContext,
}) => {
  const currentTranslations = customTranslations[language];
  const currencySymbol = ['french', 'spanish', 'italian'].includes(language) ? '€' : '$';

  const [loadingRecipePropositions, setLoadingRecipePropositions] = useState(true);
  const [loadingStates, setLoadingStates] = useState(Array(3).fill(false));
  const [recipePropositionsResponse, setRecipePropositionsResponse] = useState<any[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [recipeContents, setRecipeContents] = useState(Array(3).fill(null));
  const [hostingDomain, setHostingDomain] = useState("");
  const [recipeLoadingStep, setRecipeLoadingStep] = useState(0);
  const [showLeftoverSuggestion, setShowLeftoverSuggestion] = useState(false);
  const [completedRecipe, setCompletedRecipe] = useState<any>(null);
  const [showCartSuccess, setShowCartSuccess] = useState(false);
  const [cartSuccessData, setCartSuccessData] = useState<any>(null);
  const [funFact, setFunFact] = useState("");

  // Animate loading steps for recipe generation
  useEffect(() => {
    if (loadingRecipePropositions) {
      const steps = [0, 1, 2];
      let currentStep = 0;
      const interval = setInterval(() => {
        if (currentStep < steps.length) {
          setRecipeLoadingStep(steps[currentStep]);
          currentStep++;
        }
      }, 1000);
      
      // Set random fun fact based on ingredients
      setFunFact(getRandomFunFact(ingredients));
      
      return () => clearInterval(interval);
    }
  }, [loadingRecipePropositions, ingredients]);

  // Make a new API call using the result from the first API call
  const fetchStepsRecipe = async (item: any, index: number) => {
    console.log("*** fetchStepsRecipe");
    setLoadingStates((prevLoadingStates) => {
      const updatedLoadingStates = [...prevLoadingStates];
      updatedLoadingStates[index] = true; // Set loading to true for the specified index
      return updatedLoadingStates;
    });
    setSelectedRecipe(item);

    try {
      const body = {
        language: language,
        recipe: item,
      };

      const response = await callStreamingAPI("stepsRecipe", "POST", body);

      // Process the streaming response
      const reader = response.body.getReader();
      let accumulatedContent = "";
      setLoadingStates((prevLoadingStates) => {
        const updatedLoadingStates = [...prevLoadingStates];
        updatedLoadingStates[index] = false; // Set loading to false for the specified index
        return updatedLoadingStates;
      });
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          // Stream finished
          break;
        }

        // Convert the chunk to a string (assuming it's text data)
        const chunkString = new TextDecoder().decode(value);
        console.log(chunkString); // Display the chunk
        accumulatedContent += chunkString;
        setRecipeContents((prevRecipeContents) => {
          const updatedRecipeContents = [...prevRecipeContents];
          updatedRecipeContents[index] = accumulatedContent;
          return updatedRecipeContents;
        });
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoadingStates((prevLoadingStates) => {
        const updatedLoadingStates = [...prevLoadingStates];
        updatedLoadingStates[index] = false; // Set loading to false for the specified index
        return updatedLoadingStates;
      });
    }
  };

  useEffect(() => {
    // Make a new API call using the result from the first API call
    const fetchData = async () => {
      const result = await fetch("/aws-exports.json");
      const awsExports = await result.json();
      setHostingDomain(awsExports.domainName);

      try {
        // Get full user preferences
        const userPreferences = JSON.parse(
          localStorage.getItem("userPreferences") || "{}"
        );
        
        // Extract allergies and dietary preferences as arrays of values
        const allergiesArray = (userPreferences.allergies || []).map((a: any) => a.value);
        const preferencesArray = (userPreferences.dietaryPrefs || []).map((d: any) => d.value);
        const dislikedArray = (userPreferences.dislikedIngredients || []).map((d: any) => d.value);
        const cuisinesArray = (userPreferences.favoriteCuisines || []).map((c: any) => c.value);
        
        const body = {
          language: language,
          allergies: allergiesArray,
          preferences: preferencesArray,
          healthGoal: userPreferences.healthGoal?.value || null,
          religion: userPreferences.religion?.value || null,
          dislikedIngredients: dislikedArray,
          favoriteCuisines: cuisinesArray,
          ingredients: ingredients,
          recipeContext: recipeContext || {},
        };

        setLoadingRecipePropositions(true);
        const response = await callAPI(`fetchRecipePropositions`, "POST", body);
        setRecipePropositionsResponse(response.recipes);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoadingRecipePropositions(false);
      }
    };

    fetchData();
  }, [language]);

  const anyLoading = loadingStates.some((state) => state);

  return (
    <TextContent>
      {loadingRecipePropositions && (
        <div style={{
          background: "#fff",
          borderRadius: "16px",
          padding: "32px 24px",
          boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
          maxWidth: "500px",
          margin: "0 auto",
        }}>
          <div style={{ textAlign: "center", marginBottom: "24px" }}>
            <div style={{ fontSize: "3rem", marginBottom: "12px" }}>👨‍🍳</div>
            <h3 style={{ fontSize: "1.3rem", color: "#333", margin: "0 0 8px 0" }}>
              Creating your recipes
            </h3>
            <p style={{ color: "#666", fontSize: "0.9rem", margin: 0 }}>
              Personalizing based on your preferences...
            </p>
          </div>

          <div style={{
            background: "#f5f5f5",
            borderRadius: "12px",
            padding: "16px",
            marginBottom: "20px",
          }}>
            <SpaceBetween size="xs">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "1.2rem" }}>{recipeLoadingStep >= 0 ? "✅" : "⏳"}</span>
                <span style={{ color: recipeLoadingStep >= 0 ? "#00C853" : "#999" }}>
                  Matching ingredients to recipes
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "1.2rem" }}>{recipeLoadingStep >= 1 ? "✅" : "⏳"}</span>
                <span style={{ color: recipeLoadingStep >= 1 ? "#00C853" : "#999" }}>
                  Applying your preferences
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "1.2rem" }}>{recipeLoadingStep >= 2 ? "✅" : "⏳"}</span>
                <span style={{ color: recipeLoadingStep >= 2 ? "#00C853" : "#999" }}>
                  Generating AI images
                </span>
              </div>
            </SpaceBetween>
          </div>

          {/* Fun Fact */}
          <div style={{
            background: "#FFF9E6",
            borderRadius: "12px",
            padding: "16px",
            border: "1px solid #FFE082",
          }}>
            <h4 style={{ fontSize: "0.9rem", margin: "0 0 8px 0", color: "#F57C00", fontWeight: "600" }}>
              💡 Did you know?
            </h4>
            <p style={{
              color: "#666",
              fontSize: "0.85rem",
              margin: 0,
              lineHeight: "1.5",
            }}>
              {funFact}
            </p>
          </div>
        </div>
      )}

      {recipePropositionsResponse && recipePropositionsResponse.length > 0 && (
        <div>
          <SpaceBetween direction="vertical" size="l">
            {/* Featured Recipe */}
            {recipePropositionsResponse[0] && (
              <div style={{
                background: "#fff",
                borderRadius: "16px",
                overflow: "hidden",
                boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
                border: "2px solid #00C853",
              }}>
                <div style={{
                  background: "linear-gradient(135deg, #00C853 0%, #64DD17 100%)",
                  padding: "8px 16px",
                  textAlign: "center",
                }}>
                  <span style={{ color: "#fff", fontWeight: "700", fontSize: "0.9rem" }}>
                    🥇 RECOMMENDED
                  </span>
                </div>

                <img
                  src={`${hostingDomain}${recipePropositionsResponse[0].image_url}`}
                  alt={recipePropositionsResponse[0].recipe_title}
                  style={{
                    width: "100%",
                    height: "250px",
                    objectFit: "cover",
                  }}
                />

                <div style={{ padding: "20px" }}>
                  <h3 style={{ fontSize: "1.3rem", margin: "0 0 12px 0", color: "#333" }}>
                    {recipePropositionsResponse[0].recipe_title}
                  </h3>
                  <p style={{ color: "#666", fontSize: "0.95rem", marginBottom: "16px", lineHeight: "1.4" }}>
                    {recipePropositionsResponse[0].description}
                  </p>

                  <div style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "12px",
                    marginBottom: "16px",
                  }}>
                    <Badge color="blue">
                      ⏱️ {recipePropositionsResponse[0].preparation_time + recipePropositionsResponse[0].cooking_time} min
                    </Badge>
                    <Badge>
                      👨‍👩‍👧‍👦 {recipeContext?.people || 4} people
                    </Badge>
                    <Badge color="green">
                      {recipePropositionsResponse[0].difficulty}
                    </Badge>
                  </div>

                  <div style={{
                    background: "#f5f5f5",
                    borderRadius: "8px",
                    padding: "12px",
                    marginBottom: "16px",
                  }}>
                    <div style={{ fontSize: "0.85rem", color: "#666", marginBottom: "8px" }}>
                      <strong>✅ You have:</strong> {recipePropositionsResponse[0].ingredients.join(", ")}
                    </div>
                    {recipePropositionsResponse[0].optional_ingredients?.length > 0 && (
                      <div style={{ fontSize: "0.85rem", color: "#FF6B6B", marginTop: "8px" }}>
                        <strong>🛒 Need to buy:</strong> {recipePropositionsResponse[0].optional_ingredients.join(", ")}
                      </div>
                    )}
                  </div>

                  {(!recipeContents[0] || loadingStates[0]) && (
                    <SpaceBetween size="s">
                      <div style={{ display: "flex", gap: "8px" }}>
                        <Button
                          variant="primary"
                          onClick={() => fetchStepsRecipe(recipePropositionsResponse[0], 0)}
                          disabled={anyLoading}
                        >
                          👨‍🍳 Start Cooking
                        </Button>
                        <Button
                          variant="normal"
                          iconName="star"
                          onClick={() => {
                            const favorites = JSON.parse(localStorage.getItem("favoriteRecipes") || "[]");
                            const recipe = { ...recipePropositionsResponse[0], savedAt: new Date().toISOString() };
                            if (!favorites.find((f: any) => f.recipe_id === recipe.recipe_id)) {
                              favorites.push(recipe);
                              localStorage.setItem("favoriteRecipes", JSON.stringify(favorites));
                              alert("✅ Recipe saved to favorites!");
                            } else {
                              alert("ℹ️ Recipe already in favorites");
                            }
                          }}
                        >
                          ⭐
                        </Button>
                      </div>
                      <Button
                        variant="primary"
                        fullWidth
                        onClick={() => {
                          const cart = JSON.parse(localStorage.getItem("shoppingCart") || "[]");
                          const recipe = recipePropositionsResponse[0];
                          const allIngredients = [...recipe.ingredients, ...(recipe.optional_ingredients || [])];
                          const totalCost = allIngredients.reduce((sum, ing) => sum + getMockPrice(ing), 0);
                          
                          allIngredients.forEach((ing: string) => {
                            cart.push({
                              ingredient: ing,
                              price: getMockPrice(ing),
                              recipeTitle: recipe.recipe_title,
                              recipeId: recipe.recipe_id,
                            });
                          });
                          localStorage.setItem("shoppingCart", JSON.stringify(cart));
                          
                          setCartSuccessData({
                            recipe,
                            itemCount: allIngredients.length,
                            totalCost,
                          });
                          setShowCartSuccess(true);
                        }}
                      >
                        🛒 Add All Ingredients to Cart
                      </Button>
                    </SpaceBetween>
                  )}
                  {loadingStates[0] && (
                    <div style={{ marginTop: "12px" }}>
                      <Alert>
                        <strong>{currentTranslations["recipe_loading_guide"]}</strong>
                      </Alert>
                    </div>
                  )}
                  {recipeContents[0] && !loadingStates[0] && (
                    <div style={{ marginTop: "20px", borderTop: "2px solid #e0e0e0", paddingTop: "20px" }}>
                      <div style={{
                        background: "#f9f9f9",
                        borderRadius: "12px",
                        padding: "16px",
                        marginBottom: "20px",
                      }}>
                        <h4 style={{ margin: "0 0 12px 0", fontSize: "1.1rem", color: "#333" }}>
                          📝 Ingredients
                        </h4>
                        <div style={{ fontSize: "0.9rem", lineHeight: "1.8" }}>
                          {recipePropositionsResponse[0].ingredients.map((ing: string, i: number) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span style={{ color: "#00C853", fontSize: "1.1rem" }}>✅</span>
                              <span>{ing}</span>
                            </div>
                          ))}
                          {recipePropositionsResponse[0].optional_ingredients?.map((ing: string, i: number) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span style={{ color: "#999", fontSize: "1.1rem" }}>○</span>
                              <span style={{ color: "#666" }}>{ing} (optional)</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div style={{
                        background: "#fff",
                        borderRadius: "12px",
                        padding: "16px",
                        border: "1px solid #e0e0e0",
                      }}>
                        <h4 style={{ margin: "0 0 16px 0", fontSize: "1.1rem", color: "#333" }}>
                          📖 Instructions
                        </h4>
                        <div style={{ fontSize: "0.95rem", lineHeight: "1.6", color: "#333" }}>
                          <ReactMarkdown children={recipeContents[0]} />
                        </div>
                        <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #e0e0e0" }}>
                          <Button
                            variant="primary"
                            fullWidth
                            onClick={() => {
                              setCompletedRecipe(recipePropositionsResponse[0]);
                              setShowLeftoverSuggestion(true);
                            }}
                          >
                            ✅ Mark as Complete
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Alternative Recipes */}
            {recipePropositionsResponse.length > 1 && (
              <div>
                <h4 style={{ color: "#666", fontSize: "1rem", marginBottom: "12px" }}>
                  ▼ More Options ({recipePropositionsResponse.length - 1})
                </h4>
                <SpaceBetween size="m">
                  {recipePropositionsResponse.slice(1).map((item, idx) => {
                    const index = idx + 1;
                    return (
                      <div
                        key={index}
                        style={{
                          background: "#fff",
                          borderRadius: "12px",
                          padding: "16px",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                          border: "1px solid #e0e0e0",
                        }}
                      >
                        <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
                          <img
                            src={`${hostingDomain}${item.image_url}`}
                            alt={item.recipe_title}
                            style={{
                              width: "80px",
                              height: "80px",
                              objectFit: "cover",
                              borderRadius: "8px",
                            }}
                          />
                          <div style={{ flex: 1 }}>
                            <h4 style={{ fontSize: "1.1rem", margin: "0 0 8px 0", color: "#333" }}>
                              {item.recipe_title}
                            </h4>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", fontSize: "0.8rem" }}>
                              <Badge color="blue">⏱️ {item.preparation_time + item.cooking_time} min</Badge>
                              <Badge>{item.difficulty}</Badge>
                            </div>
                          </div>
                        </div>

                        {(!recipeContents[index] || loadingStates[index]) && (
                          <div style={{ display: "flex", gap: "8px" }}>
                            <Button
                              variant="normal"
                              onClick={() => fetchStepsRecipe(item, index)}
                              disabled={anyLoading}
                            >
                              View Details
                            </Button>
                            <Button
                              variant="normal"
                              iconName="star"
                              onClick={() => {
                                const favorites = JSON.parse(localStorage.getItem("favoriteRecipes") || "[]");
                                const recipe = { ...item, savedAt: new Date().toISOString() };
                                if (!favorites.find((f: any) => f.recipe_id === recipe.recipe_id)) {
                                  favorites.push(recipe);
                                  localStorage.setItem("favoriteRecipes", JSON.stringify(favorites));
                                  alert("✅ Recipe saved to favorites!");
                                } else {
                                  alert("ℹ️ Recipe already in favorites");
                                }
                              }}
                            >
                              ⭐
                            </Button>
                          </div>
                        )}
                        {loadingStates[index] && (
                          <div style={{ marginTop: "12px" }}>
                            <Alert>
                              <strong>{currentTranslations["recipe_loading_guide"]}</strong>
                            </Alert>
                          </div>
                        )}
                        {recipeContents[index] && !loadingStates[index] && (
                          <div style={{ marginTop: "12px", borderTop: "1px solid #e0e0e0", paddingTop: "12px" }}>
                            <ReactMarkdown children={recipeContents[index]} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </SpaceBetween>
              </div>
            )}
          </SpaceBetween>
        </div>
      )}

      {/* Leftover Suggestion Modal */}
      {showLeftoverSuggestion && completedRecipe && (
        <LeftoverSuggestion
          originalRecipe={completedRecipe}
          language={language}
          onDismiss={() => setShowLeftoverSuggestion(false)}
        />
      )}

      {/* Cart Success Modal */}
      {showCartSuccess && cartSuccessData && (
        <CartSuccessModal
          recipe={cartSuccessData.recipe}
          itemCount={cartSuccessData.itemCount}
          totalCost={cartSuccessData.totalCost}
          language={language}
          recipeContext={recipeContext}
          onDismiss={() => setShowCartSuccess(false)}
        />
      )}
    </TextContent>
  );
};

export default RecipeProposal;
