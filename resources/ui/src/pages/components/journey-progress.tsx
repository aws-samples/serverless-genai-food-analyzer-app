import React from "react";

interface JourneyProgressProps {
  currentStep: "photo" | "recipe" | "cart" | "checkout" | "complete";
}

export const JourneyProgress: React.FC<JourneyProgressProps> = ({ currentStep }) => {
  const steps = [
    { id: "photo", label: "Photo", icon: "📸" },
    { id: "recipe", label: "Recipe", icon: "👨‍🍳" },
    { id: "cart", label: "Cart", icon: "🛒" },
    { id: "checkout", label: "Checkout", icon: "✅" },
  ];

  const currentIndex = steps.findIndex(s => s.id === currentStep);

  return (
    <div style={{
      background: "#fff",
      borderRadius: "12px",
      padding: "16px",
      marginBottom: "20px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      border: "1px solid #e0e0e0",
    }}>
      <div style={{ fontSize: "0.85rem", color: "#666", marginBottom: "12px", fontWeight: "600" }}>
        Your Journey:
      </div>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "8px",
      }}>
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              flex: 1,
            }}>
              <div style={{
                fontSize: "1.5rem",
                marginBottom: "4px",
                opacity: index <= currentIndex ? 1 : 0.3,
              }}>
                {index < currentIndex ? "✓" : step.icon}
              </div>
              <div style={{
                fontSize: "0.75rem",
                color: index <= currentIndex ? "#00C853" : "#999",
                fontWeight: index === currentIndex ? "600" : "400",
              }}>
                {step.label}
              </div>
            </div>
            {index < steps.length - 1 && (
              <div style={{
                flex: 0.5,
                height: "2px",
                background: index < currentIndex ? "#00C853" : "#e0e0e0",
                marginBottom: "20px",
              }} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
