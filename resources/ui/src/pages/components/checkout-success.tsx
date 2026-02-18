import React from "react";
import { Button, SpaceBetween } from "@cloudscape-design/components";
import { useNavigate } from "react-router-dom";

interface CheckoutSuccessProps {
  totalCost: number;
  itemCount: number;
  language: string;
  onDismiss: () => void;
}

export const CheckoutSuccess: React.FC<CheckoutSuccessProps> = ({
  totalCost,
  itemCount,
  language,
  onDismiss,
}) => {
  const navigate = useNavigate();
  const currencySymbol = ['french', 'spanish', 'italian'].includes(language) ? '€' : '$';
  
  // Mock order details
  const orderNumber = Math.floor(10000 + Math.random() * 90000);
  const deliveryTime = new Date();
  deliveryTime.setHours(19, 0, 0); // 7:00 PM
  const cookingReminder = new Date();
  cookingReminder.setHours(18, 15, 0); // 6:15 PM

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
          padding: "32px 24px",
          textAlign: "center",
        }}>
          <div style={{ fontSize: "4rem", marginBottom: "12px" }}>✅</div>
          <h2 style={{ fontSize: "1.6rem", color: "#fff", margin: "0 0 8px 0" }}>
            Order Confirmed!
          </h2>
          <p style={{ color: "rgba(255, 255, 255, 0.95)", fontSize: "1rem", margin: 0 }}>
            Your ingredients are on the way
          </p>
        </div>

        <div style={{ padding: "24px" }}>
          <SpaceBetween size="l">
            {/* Delivery Info */}
            <div style={{
              background: "#E8F5E9",
              borderRadius: "12px",
              padding: "16px",
            }}>
              <SpaceBetween size="s">
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "1.5rem" }}>📦</span>
                  <div>
                    <div style={{ fontSize: "0.9rem", fontWeight: "600", color: "#333" }}>
                      Delivery: Today by {deliveryTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "#666" }}>
                      📍 Your local grocery store
                    </div>
                  </div>
                </div>
              </SpaceBetween>
            </div>

            {/* Order Summary */}
            <div style={{
              background: "#f9f9f9",
              borderRadius: "12px",
              padding: "16px",
            }}>
              <div style={{ fontSize: "0.85rem", color: "#666", marginBottom: "8px" }}>
                Order #{orderNumber}
              </div>
              <div style={{ fontSize: "1.2rem", fontWeight: "700", color: "#00C853" }}>
                Total: {currencySymbol}{totalCost.toFixed(2)}
              </div>
              <div style={{ fontSize: "0.85rem", color: "#666", marginTop: "4px" }}>
                {itemCount} items
              </div>
            </div>

            {/* Cooking Reminder */}
            <div style={{
              background: "#FFF9E6",
              borderRadius: "12px",
              padding: "16px",
              border: "1px solid #FFE082",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "1.5rem" }}>🔔</span>
                <div style={{ fontSize: "0.9rem", color: "#666" }}>
                  We'll remind you at {cookingReminder.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} to start cooking
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: "8px" }}>
              <Button
                variant="primary"
                onClick={() => {
                  onDismiss();
                  navigate("/recipe");
                }}
              >
                👨‍🍳 View Recipe
              </Button>
              <Button
                variant="normal"
                onClick={() => {
                  onDismiss();
                  navigate("/");
                }}
              >
                🏠 Home
              </Button>
            </div>
          </SpaceBetween>
        </div>
      </div>
    </div>
  );
};
