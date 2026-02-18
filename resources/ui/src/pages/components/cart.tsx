import React, { useState, useEffect, useContext } from "react";
import { SpaceBetween, Button, Badge } from "@cloudscape-design/components";
import { useNavigate } from "react-router-dom";
import { LanguageContext } from "../app";
import customTranslations from "../../assets/i18n/all";
import { getBarcode } from "../../utils/ingredient-mapping";
import { CheckoutSuccess } from "./checkout-success";
import { JourneyProgress } from "./journey-progress";

interface CartItem {
  ingredient: string;
  price: number;
  recipeTitle: string;
  recipeId: string;
}

export function Cart() {
  const navigate = useNavigate();
  const language = useContext(LanguageContext);
  const currentTranslations = customTranslations[language];
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const currencySymbol = ['french', 'spanish', 'italian'].includes(language) ? '€' : '$';
  const [showCheckoutSuccess, setShowCheckoutSuccess] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("shoppingCart");
    if (stored) {
      setCartItems(JSON.parse(stored));
    }
  }, []);

  const removeItem = (index: number) => {
    const updated = cartItems.filter((_, i) => i !== index);
    setCartItems(updated);
    localStorage.setItem("shoppingCart", JSON.stringify(updated));
  };

  const clearCart = () => {
    setCartItems([]);
    localStorage.removeItem("shoppingCart");
  };

  const subtotal = cartItems.reduce((sum, item) => sum + item.price, 0);
  const tax = subtotal * 0.08; // 8% tax
  const total = subtotal + tax;

  // Group items by recipe
  const itemsByRecipe = cartItems.reduce((acc, item) => {
    if (!acc[item.recipeTitle]) {
      acc[item.recipeTitle] = [];
    }
    acc[item.recipeTitle].push(item);
    return acc;
  }, {} as Record<string, CartItem[]>);

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "20px" }}>
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
            🛒 Your Shopping Cart
          </h1>
          <p style={{
            color: "rgba(255, 255, 255, 0.95)",
            fontSize: "clamp(0.85rem, 2.5vw, 0.95rem)",
            marginBottom: "0",
            lineHeight: "1.3",
          }}>
            {cartItems.length} items - Ready for checkout
          </p>
        </div>

        {/* Journey Progress */}
        {cartItems.length > 0 && (
          <JourneyProgress currentStep="cart" />
        )}

        {/* Cart Items */}
        {cartItems.length === 0 ? (
          <div style={{
            background: "#fff",
            borderRadius: "16px",
            padding: "40px 24px",
            textAlign: "center",
            boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
          }}>
            <div style={{ fontSize: "3rem", marginBottom: "16px" }}>🛒</div>
            <h3 style={{ color: "#666", marginBottom: "12px" }}>Your cart is empty</h3>
            <p style={{ color: "#999", marginBottom: "20px" }}>
              Generate recipes and add missing ingredients
            </p>
            <Button variant="primary" onClick={() => navigate("/recipe")}>
              📸 Find Recipes
            </Button>
          </div>
        ) : (
          <>
            {/* Items grouped by recipe */}
            {Object.entries(itemsByRecipe).map(([recipeTitle, items]) => (
              <div key={recipeTitle} style={{
                background: "#fff",
                borderRadius: "16px",
                padding: "20px",
                boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                border: "1px solid #e0e0e0",
              }}>
                <h4 style={{ fontSize: "1rem", color: "#666", marginBottom: "16px" }}>
                  For: {recipeTitle}
                </h4>
                <SpaceBetween size="s">
                  {items.map((item, idx) => {
                    const barcode = getBarcode(item.ingredient);
                    return (
                      <div
                        key={idx}
                        style={{
                          padding: "12px",
                          background: "#f9f9f9",
                          borderRadius: "8px",
                        }}
                      >
                        <div style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: barcode ? "8px" : "0",
                        }}>
                          <span style={{ fontSize: "0.95rem", color: "#333" }}>
                            {item.ingredient}
                          </span>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <span style={{ fontSize: "1rem", fontWeight: "600", color: "#00C853" }}>
                              {currencySymbol}{item.price.toFixed(2)}
                            </span>
                            <Button
                              variant="icon"
                              iconName="close"
                              onClick={() => removeItem(cartItems.indexOf(item))}
                              ariaLabel="Remove"
                            />
                          </div>
                        </div>
                        {barcode && (
                          <Button
                            variant="inline-link"
                            onClick={() => navigate(`/barcode?code=${barcode}`)}
                          >
                            ℹ️ Product Info
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </SpaceBetween>
              </div>
            ))}

            {/* Total */}
            <div style={{
              background: "#fff",
              borderRadius: "16px",
              padding: "20px",
              boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
              border: "1px solid #e0e0e0",
            }}>
              <SpaceBetween size="s">
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.95rem" }}>
                  <span>Subtotal:</span>
                  <span>{currencySymbol}{subtotal.toFixed(2)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.95rem" }}>
                  <span>Tax (est.):</span>
                  <span>{currencySymbol}{tax.toFixed(2)}</span>
                </div>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "1.2rem",
                  fontWeight: "700",
                  paddingTop: "12px",
                  borderTop: "2px solid #e0e0e0",
                }}>
                  <span>Total:</span>
                  <span style={{ color: "#00C853" }}>{currencySymbol}{total.toFixed(2)}</span>
                </div>
              </SpaceBetween>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: "12px" }}>
              <Button variant="normal" onClick={() => navigate("/recipe")}>
                Continue Shopping
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setShowCheckoutSuccess(true);
                }}
              >
                Checkout →
              </Button>
            </div>
          </>
        )}

        {/* Checkout Success Modal */}
        {showCheckoutSuccess && (
          <CheckoutSuccess
            totalCost={total}
            itemCount={cartItems.length}
            language={language}
            onDismiss={() => {
              setShowCheckoutSuccess(false);
              clearCart();
            }}
          />
        )}
      </SpaceBetween>
    </div>
  );
}
