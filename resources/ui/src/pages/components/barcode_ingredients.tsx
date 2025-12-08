import React, { useState, useEffect } from "react";
import IngredientsSummary from "./barcode_product_summary";

import Popover from "@cloudscape-design/components/popover";
import Button from "@cloudscape-design/components/button";
import TextContent from "@cloudscape-design/components/text-content";
import Spinner from "@cloudscape-design/components/spinner";
import Alert from "@cloudscape-design/components/alert";
import { Container, Tabs, Box, ColumnLayout } from "@cloudscape-design/components";
import Header from "@cloudscape-design/components/header";
import { SpaceBetween } from "@cloudscape-design/components";
import { callAPI } from "../../assets/js/custom";
import "../../assets/css/style.css";
import customTranslations from "../../assets/i18n/all";
import { FlowItems } from "./flowitems";

interface BarcodeIngredientsProps {
  productCode: string;
  language: string;
}

interface Additive {
  label: string;
  description: any;
}

const BarcodeIngredients: React.FC<BarcodeIngredientsProps> = ({
  productCode,
  language,
}) => {
  const currentTranslations = customTranslations[language];

  // State to hold the API response
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [additives, setAdditives] = useState<any[]>([]);
  const [apiResponse, setApiResponse] = useState(null);
  const [loading, setLoading] = useState(true); // Added loading state
  const [productName, setProductName] = useState(true); // Added loading state
  const [ingredientsError, setIngredientsError] = useState("");
  const [nutriments, setNutriments] = useState<any>(null);
  const [allergensTags, setAllergensTags] = useState<string[]>([]);

  // Check if ingredient matches user allergens
  const isAllergen = (ingredientLabel: string): boolean => {
    const stored = localStorage.getItem("userPreferences");
    if (!stored) return false;
    
    try {
      const prefs = JSON.parse(stored);
      const userAllergies = prefs.allergies || [];
      
      // Check if ingredient label contains any user allergen
      const lowerLabel = ingredientLabel.toLowerCase();
      
      // Common allergen keywords in multiple languages
      const allergenKeywords: Record<string, string[]> = {
        milk: ["milk", "lait", "leche", "latte"],
        eggs: ["egg", "oeuf", "huevo", "uovo"],
        peanuts: ["peanut", "arachide", "cacahuete", "arachidi"],
        tree_nuts: ["nut", "noix", "nuez", "noci", "almond", "amande", "cashew", "cajou"],
        soy: ["soy", "soja", "soia"],
        wheat: ["wheat", "blé", "trigo", "grano"],
        fish: ["fish", "poisson", "pescado", "pesce"],
        shellfish: ["shellfish", "crustacé", "marisco", "crostacei", "shrimp", "crevette"],
        sesame: ["sesame", "sésame", "sésamo", "sesamo"]
      };
      
      return userAllergies.some((allergy: any) => {
        const allergyValue = allergy.value.toLowerCase();
        const keywords = allergenKeywords[allergyValue] || [allergyValue];
        return keywords.some(keyword => lowerLabel.includes(keyword));
      });
    } catch {
      return false;
    }
  };

  const fetchData = async () => {

    setApiResponse(null);
    setLoading(true);

    try {
      const response = await callAPI(
        `fetchIngredients/${productCode}/${language}`,
        "GET",
        null
      );

      if (!response.error) {
        const keyValueArray = Object.entries(response.ingredients_description);
        const newIngredients = keyValueArray.map(([key, value]) => ({
          label: key,
          description: value,
        }));

        setIngredients(newIngredients);

        setProductName(response.product_name);
        setNutriments(response.nutriments || null);
        setAllergensTags(response.allergens_tags || []);

        const myAdditives:Additive [] = [];
        for (const key in response.additives_description) {
          if (response.additives_description.hasOwnProperty(key)) {
            const value = response.additives_description[key];
            myAdditives.push({
              label: key,
              description: value,
            });
          }
        }

        setAdditives(myAdditives);
        setApiResponse(response);
      } else {
        setIngredientsError(
          response.error === "NOT_FOUND"
            ? currentTranslations["ingredients_not_found"]
            : response.error
        );
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setIngredientsError("Ingredients: Error fetching data: " + error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setIngredientsError("");
    fetchData();
  }, [productCode, language]);

  return (
    <TextContent>
      {loading && (
        <div>
          <SpaceBetween direction="vertical" size="m">
            <Alert statusIconAriaLabel="Info" type="info">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "20px" }}>✓</span>
                <strong>{currentTranslations["scan_scanned_label"]}:</strong>{" "}
                {productCode}
              </div>
            </Alert>
            <Alert statusIconAriaLabel="Loading" type="info">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Spinner />
                <strong>{currentTranslations["scan_scanning_label"]}...</strong>
              </div>
            </Alert>
          </SpaceBetween>
        </div>
      )}

      {ingredientsError ? (
        <Alert statusIconAriaLabel="Error" type="error">
          <strong>{ingredientsError}</strong>
        </Alert>
      ) : (
        <>
          {/* Display loading message or spinner */}
          {apiResponse && (
            <div>
              <SpaceBetween direction="vertical" size="m">
                {/* Product Header Card */}
                <Container>
                  <SpaceBetween size="m">
                    <div style={{ padding: "8px 0" }}>
                      <h2 style={{ 
                        margin: "0 0 4px 0", 
                        fontSize: "20px", 
                        fontWeight: "600",
                        color: "#1f2937"
                      }}>
                        {productName}
                      </h2>
                      <p style={{ 
                        margin: 0, 
                        fontSize: "14px", 
                        color: "#6b7280" 
                      }}>
                        {currentTranslations["scan_scanned_label"]}: {productCode}
                      </p>
                    </div>

                    {/* Nutritional Info Cards */}
                    {nutriments && (
                      <div style={{ 
                        display: "flex", 
                        justifyContent: "space-around", 
                        gap: "8px",
                        padding: "8px 0"
                      }}>
                        <div style={{ textAlign: "center", flex: 1 }}>
                          <div style={{ fontSize: "18px" }}>🔥</div>
                          <div style={{ fontSize: "14px", fontWeight: "600", color: "#1f2937" }}>
                            {nutriments["energy-kcal_100g"] || "N/A"}
                          </div>
                          <div style={{ fontSize: "10px", color: "#6b7280" }}>kcal</div>
                        </div>
                        <div style={{ textAlign: "center", flex: 1 }}>
                          <div style={{ fontSize: "18px" }}>🧂</div>
                          <div style={{ fontSize: "14px", fontWeight: "600", color: "#1f2937" }}>
                            {nutriments["salt_100g"] ? `${nutriments["salt_100g"]}g` : "N/A"}
                          </div>
                          <div style={{ fontSize: "10px", color: "#6b7280" }}>Salt</div>
                        </div>
                        <div style={{ textAlign: "center", flex: 1 }}>
                          <div style={{ fontSize: "18px" }}>🍬</div>
                          <div style={{ fontSize: "14px", fontWeight: "600", color: "#1f2937" }}>
                            {nutriments["sugars_100g"] ? `${nutriments["sugars_100g"]}g` : "N/A"}
                          </div>
                          <div style={{ fontSize: "10px", color: "#6b7280" }}>Sugar</div>
                        </div>
                        <div style={{ textAlign: "center", flex: 1 }}>
                          <div style={{ fontSize: "18px" }}>💪</div>
                          <div style={{ fontSize: "14px", fontWeight: "600", color: "#1f2937" }}>
                            {nutriments["proteins_100g"] ? `${nutriments["proteins_100g"]}g` : "N/A"}
                          </div>
                          <div style={{ fontSize: "10px", color: "#6b7280" }}>Protein</div>
                        </div>
                      </div>
                    )}

                    {/* Allergen Warning */}
                    {allergensTags && allergensTags.length > 0 && (
                      <Alert type="error">
                        <strong>⚠️ {currentTranslations["allergen_warning_title"]}</strong>
                        <br />
                        {currentTranslations["allergen_warning_message"]} {allergensTags.map(tag => tag.replace("en:", "")).join(", ")}
                      </Alert>
                    )}
                  </SpaceBetween>
                </Container>

                {/* Tabs for Ingredients, Additives, and AI Summary */}
                <Tabs
                  tabs={[
                    {
                      label: currentTranslations["tab_ai_summary"],
                      id: "summary",
                      content: (
                        <IngredientsSummary
                          productCode={productCode}
                          language={language}
                        />
                      ),
                    },
                    {
                      label: currentTranslations["tab_ingredients"],
                      id: "ingredients",
                      content: (
                        <Container>
                          <SpaceBetween size="m">
                            <p className="hint_font">
                              {currentTranslations["ingredients_desc_ingredient"]}
                            </p>
                            <FlowItems
                              items={ingredients.map((item, index) => {
                                const isAllergenItem = isAllergen(item.label);
                                return {
                                  id: `${item.id}`,
                                  content: (
                                    <Popover
                                      dismissButton={false}
                                      position="top"
                                      size="small"
                                      triggerType="custom"
                                      content={item.description}
                                    >
                                      <div style={isAllergenItem ? {
                                        display: "inline-block",
                                        padding: "1px",
                                        borderRadius: "20px",
                                        background: "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)"
                                      } : {}}>
                                        <Button>
                                          {isAllergenItem && "⚠️ "}
                                          {item.label}
                                        </Button>
                                      </div>
                                    </Popover>
                                  ),
                                };
                              })}
                            />
                          </SpaceBetween>
                        </Container>
                      ),
                    },
                    {
                      label: currentTranslations["tab_additives"],
                      id: "additives",
                      content: (
                        <Container>
                          <SpaceBetween size="m">
                            {additives.length > 0 ? (
                              <>
                                <p className="hint_font">
                                  {currentTranslations["ingredients_desc_additive"]}
                                </p>
                                <FlowItems
                                  items={additives.map((item, index) => ({
                                    id: `${item.id}`,
                                    content: (
                                      <Popover
                                        dismissButton={false}
                                        position="top"
                                        size="small"
                                        triggerType="custom"
                                        content={item.description}
                                      >
                                        <Button>{item.label}</Button>
                                      </Popover>
                                    ),
                                  }))}
                                />
                              </>
                            ) : (
                              <p>The product does not have additives</p>
                            )}
                          </SpaceBetween>
                        </Container>
                      ),
                    },
                  ]}
                />
              </SpaceBetween>
            </div>
          )}
        </>
      )}
    </TextContent>
  );
};

export default BarcodeIngredients;
