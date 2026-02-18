import React, { useState, useEffect } from "react";
import Button from "@cloudscape-design/components/button";
import TextContent from "@cloudscape-design/components/text-content";
import Alert from "@cloudscape-design/components/alert";
import { Badge, Container, TokenGroup } from "@cloudscape-design/components";
import Header from "@cloudscape-design/components/header";
import { SpaceBetween } from "@cloudscape-design/components";
import { callAPI } from "../../assets/js/custom";
import "../../assets/css/style.css";
import customTranslations from "../../assets/i18n/all";
import RecipePropositions from "./recipe_proposals";
import { FlowItems } from "./flowitems";
import { JourneyProgress } from "./journey-progress";
import { getRandomFunFact } from "../../utils/fun-facts";

interface RecipeImageIngredientsProps {
  images: string[];
  language: string;
  recipeContext?: {
    time?: string;
    people?: string;
    equipment?: readonly any[];
    budget?: string;
  };
  onRecipePropositionsDone?: () => void;
}

const RecipeImageIngredients: React.FC<RecipeImageIngredientsProps> = ({
  images,
  language,
  recipeContext,
  onRecipePropositionsDone,
}) => {
  const currentTranslations = customTranslations[language];
  const [loadingImageIngredients, setLoadingImageIngredients] = useState(true);
  const [imageIngredientsResponse, setImageIngredientsResponse] = useState<
    any[]
  >([]);
  const [responseReceived, setResponseReceived] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [funFact, setFunFact] = useState("");

  useEffect(() => {
    // Simulate loading steps
    if (loadingImageIngredients) {
      const steps = [0, 1, 2, 3];
      let currentStep = 0;
      const interval = setInterval(() => {
        if (currentStep < steps.length) {
          setLoadingStep(steps[currentStep]);
          currentStep++;
        }
      }, 800);
      
      // Set random fun fact
      setFunFact(getRandomFunFact());
      
      return () => clearInterval(interval);
    }
  }, [loadingImageIngredients]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setResponseReceived(false);
        const body = {
          list_images_base64: images,
          language: language,
        };

        const response = await callAPI(`fetchImageIngredients`, "POST", body);

        setImageIngredientsResponse(response.ingredients);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoadingImageIngredients(false);
        setResponseReceived(true);
        if (onRecipePropositionsDone) {
          onRecipePropositionsDone();
        }
      }
    };

    fetchData();
  }, [images, language]);

  return (
    <TextContent>
      {loadingImageIngredients && (
        <div style={{
          background: "#fff",
          borderRadius: "16px",
          padding: "32px 24px",
          boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
          maxWidth: "500px",
          margin: "0 auto",
        }}>
          <div style={{ textAlign: "center", marginBottom: "24px" }}>
            <div style={{ fontSize: "3rem", marginBottom: "12px" }}>🤖</div>
            <h3 style={{ fontSize: "1.3rem", color: "#333", margin: "0 0 8px 0" }}>
              AI is working its magic
            </h3>
            <p style={{ color: "#666", fontSize: "0.9rem", margin: 0 }}>
              Analyzing your fridge...
            </p>
          </div>

          {/* Progress Steps */}
          <div style={{
            background: "#f5f5f5",
            borderRadius: "12px",
            padding: "16px",
            marginBottom: "20px",
          }}>
            <SpaceBetween size="xs">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "1.2rem" }}>{loadingStep >= 0 ? "✅" : "⏳"}</span>
                <span style={{ color: loadingStep >= 0 ? "#00C853" : "#999" }}>
                  Analyzing ingredients
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "1.2rem" }}>{loadingStep >= 1 ? "✅" : "⏳"}</span>
                <span style={{ color: loadingStep >= 1 ? "#00C853" : "#999" }}>
                  Matching to recipes
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "1.2rem" }}>{loadingStep >= 2 ? "✅" : "⏳"}</span>
                <span style={{ color: loadingStep >= 2 ? "#00C853" : "#999" }}>
                  Checking your preferences
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "1.2rem" }}>{loadingStep >= 3 ? "✅" : "⏳"}</span>
                <span style={{ color: loadingStep >= 3 ? "#00C853" : "#999" }}>
                  Optimizing for your goals
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

      {imageIngredientsResponse && imageIngredientsResponse.length > 0 && (
        <div>
          <SpaceBetween direction="vertical" size="m">
            {/* Journey Progress */}
            <JourneyProgress currentStep="recipe" />

            {/* Categorized Ingredients Display */}
            <div style={{
              background: "#fff",
              borderRadius: "16px",
              padding: "20px",
              boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
              border: "1px solid #e0e0e0",
            }}>
              <div style={{
                background: "#E8F5E9",
                borderRadius: "12px",
                padding: "12px 16px",
                marginBottom: "20px",
                textAlign: "center",
              }}>
                <h3 style={{ fontSize: "1.1rem", margin: 0, color: "#00C853" }}>
                  ✅ Found in your fridge ({imageIngredientsResponse.length} items)
                </h3>
              </div>

              {(() => {
                // Categorize ingredients
                const vegetables = ["broccoli", "carrots", "kale", "bell peppers", "bell pepper", "onions", "onion", "tomatoes", "tomato", "cauliflower", "lettuce", "spinach", "mushrooms", "mushroom", "zucchini", "cucumber", "garlic", "potato", "potatoes"];
                const proteins = ["salmon", "fish", "sausages", "sausage", "chickpeas", "chicken", "beef", "pork", "eggs", "egg", "meatballs"];
                const dairy = ["milk", "yogurt", "cheese", "butter", "cream"];
                const fruits = ["apple", "apples", "banana", "bananas", "orange", "oranges", "lemon", "lemons", "strawberries", "strawberry", "grapes", "grape"];
                
                const categorized = {
                  vegetables: imageIngredientsResponse.filter((ing: string) => 
                    vegetables.some(v => ing.toLowerCase().includes(v))
                  ),
                  proteins: imageIngredientsResponse.filter((ing: string) => 
                    proteins.some(p => ing.toLowerCase().includes(p))
                  ),
                  dairy: imageIngredientsResponse.filter((ing: string) => 
                    dairy.some(d => ing.toLowerCase().includes(d))
                  ),
                  fruits: imageIngredientsResponse.filter((ing: string) => 
                    fruits.some(f => ing.toLowerCase().includes(f))
                  ),
                  other: imageIngredientsResponse.filter((ing: string) => {
                    const lower = ing.toLowerCase();
                    return !vegetables.some(v => lower.includes(v)) &&
                           !proteins.some(p => lower.includes(p)) &&
                           !dairy.some(d => lower.includes(d)) &&
                           !fruits.some(f => lower.includes(f));
                  }),
                };

                return (
                  <SpaceBetween size="m">
                    {categorized.vegetables.length > 0 && (
                      <div>
                        <h4 style={{ fontSize: "0.95rem", margin: "0 0 8px 0", color: "#666" }}>
                          🥦 Vegetables:
                        </h4>
                        <p style={{ fontSize: "0.9rem", color: "#333", margin: 0, lineHeight: "1.6" }}>
                          {categorized.vegetables.join(", ")}
                        </p>
                      </div>
                    )}
                    {categorized.proteins.length > 0 && (
                      <div>
                        <h4 style={{ fontSize: "0.95rem", margin: "0 0 8px 0", color: "#666" }}>
                          🥩 Proteins:
                        </h4>
                        <p style={{ fontSize: "0.9rem", color: "#333", margin: 0, lineHeight: "1.6" }}>
                          {categorized.proteins.join(", ")}
                        </p>
                      </div>
                    )}
                    {categorized.dairy.length > 0 && (
                      <div>
                        <h4 style={{ fontSize: "0.95rem", margin: "0 0 8px 0", color: "#666" }}>
                          🥛 Dairy:
                        </h4>
                        <p style={{ fontSize: "0.9rem", color: "#333", margin: 0, lineHeight: "1.6" }}>
                          {categorized.dairy.join(", ")}
                        </p>
                      </div>
                    )}
                    {categorized.fruits.length > 0 && (
                      <div>
                        <h4 style={{ fontSize: "0.95rem", margin: "0 0 8px 0", color: "#666" }}>
                          🍎 Fruits:
                        </h4>
                        <p style={{ fontSize: "0.9rem", color: "#333", margin: 0, lineHeight: "1.6" }}>
                          {categorized.fruits.join(", ")}
                        </p>
                      </div>
                    )}
                    {categorized.other.length > 0 && (
                      <div>
                        <h4 style={{ fontSize: "0.95rem", margin: "0 0 8px 0", color: "#666" }}>
                          🌾 Other:
                        </h4>
                        <p style={{ fontSize: "0.9rem", color: "#333", margin: 0, lineHeight: "1.6" }}>
                          {categorized.other.join(", ")}
                        </p>
                      </div>
                    )}
                  </SpaceBetween>
                );
              })()}
            </div>

            <RecipePropositions
              language={language}
              ingredients={imageIngredientsResponse}
              recipeContext={recipeContext}
            ></RecipePropositions>
          </SpaceBetween>
        </div>
      )}

      {responseReceived &&
        imageIngredientsResponse &&
        imageIngredientsResponse.length === 0 && (
          <div>
            <Alert statusIconAriaLabel="Success" type="success">
              {currentTranslations["image_ingredients_not_found"]}
            </Alert>
          </div>
        )}
    </TextContent>
  );
};

export default RecipeImageIngredients;
