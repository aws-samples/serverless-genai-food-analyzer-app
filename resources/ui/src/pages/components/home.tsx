import { Button, SpaceBetween } from "@cloudscape-design/components";
import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { LanguageContext } from "../app";
import customTranslations from "../../assets/i18n/all";

export function Home() {
  const navigate = useNavigate();
  const language = useContext(LanguageContext);
  const currentTranslations = customTranslations[language];

  return (
    <div style={{
      maxWidth: "600px",
      margin: "0 auto",
      padding: "16px",
    }}>
      <SpaceBetween size="m">
        {/* Welcome Message - Compact */}
        <div style={{
          textAlign: "center",
          padding: "8px 0",
        }}>
          <h2 style={{
            fontSize: "1.2rem",
            fontWeight: "600",
            color: "#333",
            margin: "0",
          }}>
            👋 {currentTranslations.home_title || "Welcome!"}
          </h2>
        </div>

        {/* Primary Actions - Compact Cards */}
        <div
          onClick={() => navigate("/recipe")}
          style={{
            background: "linear-gradient(135deg, #00C853 0%, #64DD17 100%)",
            borderRadius: "12px",
            padding: "20px 16px",
            cursor: "pointer",
            boxShadow: "0 4px 16px rgba(0, 200, 83, 0.2)",
            transition: "transform 0.2s, box-shadow 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 6px 20px rgba(0, 200, 83, 0.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 4px 16px rgba(0, 200, 83, 0.2)";
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ fontSize: "2rem" }}>📸</div>
            <div style={{ flex: 1 }}>
              <h3 style={{
                fontSize: "1.1rem",
                fontWeight: "700",
                color: "#fff",
                margin: "0 0 4px 0",
              }}>
                {currentTranslations.menu_recipe || "Recipe Generator"}
              </h3>
              <p style={{
                color: "rgba(255, 255, 255, 0.9)",
                fontSize: "0.85rem",
                margin: "0",
                lineHeight: "1.3",
              }}>
                Snap fridge → Get recipes
              </p>
            </div>
          </div>
        </div>

        <div
          onClick={() => navigate("/barcode")}
          style={{
            background: "linear-gradient(135deg, #00C853 0%, #64DD17 100%)",
            borderRadius: "12px",
            padding: "20px 16px",
            cursor: "pointer",
            boxShadow: "0 4px 16px rgba(0, 200, 83, 0.2)",
            transition: "transform 0.2s, box-shadow 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 6px 20px rgba(0, 200, 83, 0.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 4px 16px rgba(0, 200, 83, 0.2)";
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ fontSize: "2rem" }}>🔍</div>
            <div style={{ flex: 1 }}>
              <h3 style={{
                fontSize: "1.1rem",
                fontWeight: "700",
                color: "#fff",
                margin: "0 0 4px 0",
              }}>
                {currentTranslations.menu_scan || "Scan Product"}
              </h3>
              <p style={{
                color: "rgba(255, 255, 255, 0.9)",
                fontSize: "0.85rem",
                margin: "0",
                lineHeight: "1.3",
              }}>
                Check nutrition & allergens
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "12px",
          padding: "16px 0",
        }}>
          <div
            onClick={() => navigate("/favorites")}
            style={{
              background: "#fff",
              borderRadius: "12px",
              padding: "20px 16px",
              cursor: "pointer",
              boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
              border: "1px solid #e0e0e0",
              textAlign: "center",
              transition: "transform 0.2s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
            onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
          >
            <div style={{ fontSize: "2rem", marginBottom: "8px" }}>⭐</div>
            <div style={{ fontSize: "0.9rem", fontWeight: "600", color: "#333" }}>
              Favorites
            </div>
            <div style={{ fontSize: "0.75rem", color: "#999" }}>
              {(() => {
                const favs = JSON.parse(localStorage.getItem("favoriteRecipes") || "[]");
                return `${favs.length} recipes`;
              })()}
            </div>
          </div>

          <div
            onClick={() => navigate("/cart")}
            style={{
              background: "#fff",
              borderRadius: "12px",
              padding: "20px 16px",
              cursor: "pointer",
              boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
              border: "1px solid #e0e0e0",
              textAlign: "center",
              transition: "transform 0.2s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
            onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
          >
            <div style={{ fontSize: "2rem", marginBottom: "8px" }}>🛒</div>
            <div style={{ fontSize: "0.9rem", fontWeight: "600", color: "#333" }}>
              Cart
            </div>
            <div style={{ fontSize: "0.75rem", color: "#999" }}>
              {(() => {
                const cart = JSON.parse(localStorage.getItem("shoppingCart") || "[]");
                return `${cart.length} items`;
              })()}
            </div>
          </div>
        </div>

        {/* Settings Link */}
        <div style={{
          textAlign: "center",
          padding: "16px",
          borderTop: "1px solid #e0e0e0",
        }}>
          <Button
            variant="link"
            onClick={() => navigate("/preference")}
          >
            ⚙️ {currentTranslations.menu_preferences || "Preferences"}
          </Button>
        </div>
      </SpaceBetween>
    </div>
  );
}
