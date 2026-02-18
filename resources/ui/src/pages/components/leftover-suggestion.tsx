import React, { useState } from "react";
import { Button, SpaceBetween, Badge } from "@cloudscape-design/components";
import { useNavigate } from "react-router-dom";
import { getMockPrice } from "../../utils/ingredient-mapping";

interface LeftoverSuggestionProps {
  originalRecipe: any;
  language: string;
  onDismiss: () => void;
}

export const LeftoverSuggestion: React.FC<LeftoverSuggestionProps> = ({
  originalRecipe,
  language,
  onDismiss,
}) => {
  const navigate = useNavigate();
  const [rating, setRating] = useState(0);
  const currencySymbol = ['french', 'spanish', 'italian'].includes(language) ? '€' : '$';

  // Mock leftover recipe based on original
  const leftoverRecipe = {
    recipe_title: `${originalRecipe.recipe_title} Wrap`,
    description: "Quick lunch using yesterday's leftovers",
    preparation_time: 8,
    cooking_time: 0,
    difficulty: "easy",
    leftover_ingredient: originalRecipe.ingredients[0] || "chicken",
    leftover_amount: "1.5 cups",
    new_ingredients: ["romaine lettuce", "caesar dressing", "tortillas"],
    image_url: originalRecipe.image_url,
  };

  const totalCost = leftoverRecipe.new_ingredients.reduce((sum, ing) => sum + getMockPrice(ing), 0);

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      padding: "20px",
    }}>
      <div style={{
        background: "#fff",
        borderRadius: "16px",
        maxWidth: "500px",
        width: "100%",
        maxHeight: "90vh",
        overflow: "auto",
        boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
      }}>
        <SpaceBetween size="l">
          {/* Rating Section */}
          <div style={{
            background: "linear-gradient(135deg, #00C853 0%, #64DD17 100%)",
            padding: "24px",
            textAlign: "center",
          }}>
            <h2 style={{ fontSize: "1.5rem", color: "#fff", margin: "0 0 16px 0" }}>
              🎉 Recipe Complete!
            </h2>
            <p style={{ color: "rgba(255, 255, 255, 0.95)", marginBottom: "16px" }}>
              How was {originalRecipe.recipe_title}?
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginBottom: "16px" }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  onClick={() => setRating(star)}
                  style={{
                    fontSize: "2rem",
                    cursor: "pointer",
                    color: star <= rating ? "#FFD700" : "rgba(255, 255, 255, 0.5)",
                  }}
                >
                  ⭐
                </span>
              ))}
            </div>
            <Button
              variant="primary"
              onClick={() => {
                const favorites = JSON.parse(localStorage.getItem("favoriteRecipes") || "[]");
                const recipe = { ...originalRecipe, savedAt: new Date().toISOString(), rating };
                if (!favorites.find((f: any) => f.recipe_id === recipe.recipe_id)) {
                  favorites.push(recipe);
                  localStorage.setItem("favoriteRecipes", JSON.stringify(favorites));
                  alert("✅ Recipe saved to favorites!");
                } else {
                  alert("ℹ️ Recipe already in favorites");
                }
              }}
            >
              ⭐ Save to Favorites
            </Button>
          </div>

          {/* Leftover Suggestion */}
          <div style={{ padding: "0 24px 24px 24px" }}>
            <div style={{
              background: "#FFF9E6",
              borderRadius: "12px",
              padding: "16px",
              marginBottom: "16px",
              border: "1px solid #FFE082",
            }}>
              <h3 style={{ fontSize: "1.2rem", margin: "0 0 8px 0", color: "#333" }}>
                💡 Tomorrow's Lunch Idea
              </h3>
              <p style={{ fontSize: "0.9rem", color: "#666", margin: 0 }}>
                You'll have leftover {leftoverRecipe.leftover_ingredient} (est. {leftoverRecipe.leftover_amount})
              </p>
            </div>

            <img
              src={`https://d262q0erqq4wd1.cloudfront.net${leftoverRecipe.image_url}`}
              alt={leftoverRecipe.recipe_title}
              style={{
                width: "100%",
                height: "200px",
                objectFit: "cover",
                borderRadius: "12px",
                marginBottom: "16px",
              }}
            />

            <h4 style={{ fontSize: "1.2rem", margin: "0 0 8px 0", color: "#333" }}>
              {leftoverRecipe.recipe_title}
            </h4>
            <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
              <Badge color="blue">⏱️ {leftoverRecipe.preparation_time} min prep</Badge>
              <Badge color="green">💰 {currencySymbol}0 (leftovers!)</Badge>
            </div>

            <div style={{
              background: "#f5f5f5",
              borderRadius: "8px",
              padding: "12px",
              marginBottom: "16px",
            }}>
              <div style={{ fontSize: "0.85rem", color: "#00C853", marginBottom: "8px" }}>
                <strong>✅ You have:</strong> Leftover {leftoverRecipe.leftover_ingredient}
              </div>
              <div style={{ fontSize: "0.85rem", color: "#FF6B6B" }}>
                <strong>🛒 Need to buy:</strong>
                <ul style={{ margin: "8px 0 0 0", paddingLeft: "20px" }}>
                  {leftoverRecipe.new_ingredients.map((ing, idx) => (
                    <li key={idx}>
                      {ing} ({currencySymbol}{getMockPrice(ing).toFixed(2)})
                    </li>
                  ))}
                </ul>
              </div>
              <div style={{
                fontSize: "0.9rem",
                fontWeight: "600",
                color: "#333",
                marginTop: "12px",
                paddingTop: "12px",
                borderTop: "1px solid #ddd",
              }}>
                Total: {currencySymbol}{totalCost.toFixed(2)}
              </div>
            </div>

            <SpaceBetween size="s">
              <div style={{ display: "flex", gap: "8px" }}>
                <Button
                  variant="primary"
                  onClick={() => {
                    const cart = JSON.parse(localStorage.getItem("shoppingCart") || "[]");
                    leftoverRecipe.new_ingredients.forEach((ing: string) => {
                      cart.push({
                        ingredient: ing,
                        price: getMockPrice(ing),
                        recipeTitle: leftoverRecipe.recipe_title,
                        recipeId: `leftover-${Date.now()}`,
                      });
                    });
                    localStorage.setItem("shoppingCart", JSON.stringify(cart));
                    onDismiss();
                    navigate("/cart");
                  }}
                >
                  🛒 Add to Cart
                </Button>
                <Button
                  variant="normal"
                  onClick={() => {
                    const favorites = JSON.parse(localStorage.getItem("favoriteRecipes") || "[]");
                    favorites.push({
                      ...leftoverRecipe,
                      recipe_id: `leftover-${Date.now()}`,
                      savedAt: new Date().toISOString(),
                    });
                    localStorage.setItem("favoriteRecipes", JSON.stringify(favorites));
                    alert(`✅ ${leftoverRecipe.recipe_title} saved to favorites! Quick reorder anytime from your Favorites page.`);
                  }}
                >
                  💾 Save
                </Button>
              </div>
              <Button
                variant="link"
                onClick={onDismiss}
              >
                ✕ Close
              </Button>
            </SpaceBetween>
          </div>
        </SpaceBetween>
      </div>
    </div>
  );
};
