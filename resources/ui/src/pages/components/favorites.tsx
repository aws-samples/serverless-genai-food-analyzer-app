import React, { useState, useEffect, useContext } from "react";
import { SpaceBetween, Button, Badge } from "@cloudscape-design/components";
import { useNavigate } from "react-router-dom";
import { LanguageContext } from "../app";
import customTranslations from "../../assets/i18n/all";
import { getMockPrice } from "../../utils/ingredient-mapping";

export function Favorites() {
  const navigate = useNavigate();
  const language = useContext(LanguageContext);
  const currentTranslations = customTranslations[language];
  const [favorites, setFavorites] = useState<any[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("favoriteRecipes");
    if (stored) {
      setFavorites(JSON.parse(stored));
    }
  }, []);

  const removeFromFavorites = (recipeId: string) => {
    const updated = favorites.filter(f => f.recipe_id !== recipeId);
    setFavorites(updated);
    localStorage.setItem("favoriteRecipes", JSON.stringify(updated));
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px" }}>
      <SpaceBetween size="l">
        {/* Header */}
        <div style={{
          background: "linear-gradient(135deg, #00C853 0%, #64DD17 100%)",
          borderRadius: "16px",
          padding: "20px 16px",
          boxShadow: "0 4px 16px rgba(0, 200, 83, 0.2)",
          textAlign: "center",
        }}>
          <h1 style={{
            fontSize: "clamp(1.3rem, 4vw, 2rem)",
            fontWeight: "700",
            color: "#fff",
            marginBottom: "6px",
            lineHeight: "1.2",
          }}>
            ⭐ Your Favorite Recipes
          </h1>
          <p style={{
            color: "rgba(255, 255, 255, 0.95)",
            fontSize: "clamp(0.85rem, 2.5vw, 0.95rem)",
            marginBottom: "0",
            lineHeight: "1.3",
          }}>
            {favorites.length} saved recipes - Quick reorder anytime
          </p>
        </div>

        {/* Favorites List */}
        {favorites.length === 0 ? (
          <div style={{
            background: "#fff",
            borderRadius: "16px",
            padding: "40px 24px",
            textAlign: "center",
            boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
          }}>
            <div style={{ fontSize: "3rem", marginBottom: "16px" }}>⭐</div>
            <h3 style={{ color: "#666", marginBottom: "12px" }}>No favorites yet</h3>
            <p style={{ color: "#999", marginBottom: "20px" }}>
              Save recipes you love for quick access
            </p>
            <Button variant="primary" onClick={() => navigate("/recipe")}>
              📸 Find Recipes
            </Button>
          </div>
        ) : (
          <SpaceBetween size="m">
            {favorites.map((recipe, index) => (
              <div
                key={recipe.recipe_id || index}
                style={{
                  background: "#fff",
                  borderRadius: "16px",
                  padding: "16px",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                  border: "1px solid #e0e0e0",
                }}
              >
                <div style={{ display: "flex", gap: "16px" }}>
                  {/* Recipe Image */}
                  <img
                    src={recipe.image_url?.startsWith('http') ? recipe.image_url : `https://d262q0erqq4wd1.cloudfront.net${recipe.image_url}`}
                    alt={recipe.recipe_title}
                    style={{
                      width: "100px",
                      height: "100px",
                      objectFit: "cover",
                      borderRadius: "12px",
                    }}
                  />

                  {/* Recipe Details */}
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: "1.2rem", margin: "0 0 8px 0", color: "#333" }}>
                      {recipe.recipe_title}
                    </h3>
                    <p style={{ fontSize: "0.85rem", color: "#666", marginBottom: "8px" }}>
                      Saved {new Date(recipe.savedAt).toLocaleDateString()}
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
                      <Badge color="blue">
                        ⏱️ {(recipe.preparation_time || 0) + (recipe.cooking_time || 0)} min
                      </Badge>
                      <Badge>{recipe.difficulty}</Badge>
                      <Badge color="green">⭐ Favorite</Badge>
                    </div>

                    {/* Missing ingredients */}
                    {recipe.optional_ingredients?.length > 0 && (
                      <div style={{
                        fontSize: "0.85rem",
                        color: "#FF6B6B",
                        marginBottom: "12px",
                        padding: "8px",
                        background: "#FFF5F5",
                        borderRadius: "6px",
                      }}>
                        <strong>🛒 Missing:</strong> {recipe.optional_ingredients.join(", ")}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {recipe.optional_ingredients?.length > 0 ? (
                        <Button
                          variant="primary"
                          onClick={() => {
                            const cart = JSON.parse(localStorage.getItem("shoppingCart") || "[]");
                            
                            // Add ALL ingredients
                            const allIngredients = [
                              ...recipe.ingredients,
                              ...(recipe.optional_ingredients || [])
                            ];
                            
                            allIngredients.forEach((ing: string) => {
                              const mockPrice = getMockPrice(ing);
                              cart.push({
                                ingredient: ing,
                                price: parseFloat(mockPrice.toFixed(2)),
                                recipeTitle: recipe.recipe_title,
                                recipeId: recipe.recipe_id,
                              });
                            });
                            
                            localStorage.setItem("shoppingCart", JSON.stringify(cart));
                            alert(`✅ Added ${allIngredients.length} items to cart!`);
                          }}
                        >
                          🛒 Add to Cart
                        </Button>
                      ) : (
                        <Button
                          variant="primary"
                          onClick={() => {
                            const cart = JSON.parse(localStorage.getItem("shoppingCart") || "[]");
                            
                            // Add all ingredients even if no optional ones
                            recipe.ingredients.forEach((ing: string) => {
                              const mockPrice = getMockPrice(ing);
                              cart.push({
                                ingredient: ing,
                                price: parseFloat(mockPrice.toFixed(2)),
                                recipeTitle: recipe.recipe_title,
                                recipeId: recipe.recipe_id,
                              });
                            });
                            
                            localStorage.setItem("shoppingCart", JSON.stringify(cart));
                            alert(`✅ Added ${recipe.ingredients.length} items to cart!`);
                          }}
                        >
                          🛒 Add to Cart
                        </Button>
                      )}
                      <Button
                        variant="normal"
                        onClick={() => {
                          const recipeCard = document.getElementById(`recipe-details-${recipe.recipe_id}`);
                          if (recipeCard) {
                            recipeCard.style.display = recipeCard.style.display === 'none' ? 'block' : 'none';
                          }
                        }}
                      >
                        📖 View
                      </Button>
                      <Button
                        variant="normal"
                        iconName="remove"
                        onClick={() => removeFromFavorites(recipe.recipe_id)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Expandable Recipe Details */}
                <div
                  id={`recipe-details-${recipe.recipe_id}`}
                  style={{ display: "none", marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #e0e0e0" }}
                >
                  {/* Ingredients */}
                  <div style={{
                    background: "#f9f9f9",
                    borderRadius: "12px",
                    padding: "16px",
                    marginBottom: "16px",
                  }}>
                    <h4 style={{ margin: "0 0 12px 0", fontSize: "1rem", color: "#333" }}>
                      📝 Ingredients
                    </h4>
                    <div style={{ fontSize: "0.9rem", lineHeight: "1.8" }}>
                      {recipe.ingredients?.map((ing: string, i: number) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ color: "#00C853" }}>✅</span>
                          <span>{ing}</span>
                        </div>
                      ))}
                      {recipe.optional_ingredients?.map((ing: string, i: number) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ color: "#999" }}>○</span>
                          <span style={{ color: "#666" }}>{ing} (optional)</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Description */}
                  <div style={{
                    background: "#fff",
                    borderRadius: "12px",
                    padding: "16px",
                    border: "1px solid #e0e0e0",
                  }}>
                    <h4 style={{ margin: "0 0 12px 0", fontSize: "1rem", color: "#333" }}>
                      📖 About This Recipe
                    </h4>
                    <p style={{ fontSize: "0.9rem", color: "#666", lineHeight: "1.6", margin: 0 }}>
                      {recipe.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </SpaceBetween>
        )}
      </SpaceBetween>
    </div>
  );
}
