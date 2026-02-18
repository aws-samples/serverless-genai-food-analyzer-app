import React from "react";
import { Button, SpaceBetween } from "@cloudscape-design/components";
import { useNavigate } from "react-router-dom";

interface CartSuccessModalProps {
  recipe: any;
  itemCount: number;
  totalCost: number;
  language: string;
  recipeContext?: any;
  onDismiss: () => void;
}

export const CartSuccessModal: React.FC<CartSuccessModalProps> = ({
  recipe,
  itemCount,
  totalCost,
  language,
  recipeContext,
  onDismiss,
}) => {
  const navigate = useNavigate();
  const currencySymbol = ['french', 'spanish', 'italian'].includes(language) ? '€' : '$';
  const budget = recipeContext?.budget ? parseInt(recipeContext.budget) : 15;
  const isUnderBudget = totalCost < budget;

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
        maxWidth: "450px",
        width: "100%",
        boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        overflow: "hidden",
      }}>
        {/* Success Header */}
        <div style={{
          background: "linear-gradient(135deg, #00C853 0%, #64DD17 100%)",
          padding: "24px",
          textAlign: "center",
        }}>
          <div style={{ fontSize: "3rem", marginBottom: "8px" }}>🎉</div>
          <h2 style={{ fontSize: "1.5rem", color: "#fff", margin: "0" }}>
            You're all set!
          </h2>
        </div>

        <div style={{ padding: "24px" }}>
          <SpaceBetween size="m">
            {/* Recipe Preview */}
            <div style={{ textAlign: "center" }}>
              <img
                src={`https://d262q0erqq4wd1.cloudfront.net${recipe.image_url}`}
                alt={recipe.recipe_title}
                style={{
                  width: "100%",
                  height: "150px",
                  objectFit: "cover",
                  borderRadius: "12px",
                  marginBottom: "12px",
                }}
              />
              <h3 style={{ fontSize: "1.2rem", margin: "0 0 8px 0", color: "#333" }}>
                {recipe.recipe_title}
              </h3>
              <p style={{ fontSize: "0.9rem", color: "#666", margin: 0 }}>
                Ready to cook tonight
              </p>
            </div>

            {/* Success Metrics */}
            <div style={{
              background: "#E8F5E9",
              borderRadius: "12px",
              padding: "16px",
            }}>
              <SpaceBetween size="xs">
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ color: "#00C853", fontSize: "1.2rem" }}>✓</span>
                  <span style={{ fontSize: "0.9rem", color: "#2E7D32" }}>
                    {itemCount} ingredients added to cart
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ color: "#00C853", fontSize: "1.2rem" }}>✓</span>
                  <span style={{ fontSize: "0.9rem", color: "#2E7D32" }}>
                    Total: {currencySymbol}{totalCost.toFixed(2)} {isUnderBudget ? "(under budget!)" : ""}
                  </span>
                </div>
                {recipe.preparation_time + recipe.cooking_time <= 30 && (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ color: "#00C853", fontSize: "1.2rem" }}>✓</span>
                    <span style={{ fontSize: "0.9rem", color: "#2E7D32" }}>
                      Quick meal (under 30 min)
                    </span>
                  </div>
                )}
              </SpaceBetween>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: "8px" }}>
              <Button
                variant="primary"
                onClick={() => {
                  onDismiss();
                  navigate("/cart");
                }}
              >
                View Cart
              </Button>
              <Button
                variant="normal"
                onClick={onDismiss}
              >
                Keep Shopping
              </Button>
            </div>
          </SpaceBetween>
        </div>
      </div>
    </div>
  );
};
