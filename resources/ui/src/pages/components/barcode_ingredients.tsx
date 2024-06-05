import React, { useState, useEffect } from "react";
import IngredientsSummary from "./barcode_product_summary";

import Popover from "@cloudscape-design/components/popover";
import Button from "@cloudscape-design/components/button";
import TextContent from "@cloudscape-design/components/text-content";
import Spinner from "@cloudscape-design/components/spinner";
import Alert from "@cloudscape-design/components/alert";
import { ColumnLayout, Container } from "@cloudscape-design/components";
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

  const fetchData = async () => {
    console.log(
      `call backend with scannedCode: ${productCode} and language: ${language}`
    );
    setApiResponse(null);
    setLoading(true);

    try {
      const response = await callAPI(
        `fetchIngredients/${productCode}/${language}`,
        "GET",
        null
      );

      if (!response.error) {
        console.log("response=" + JSON.stringify(response));
        const keyValueArray = Object.entries(response.ingredients_description);
        const newIngredients = keyValueArray.map(([key, value]) => ({
          label: key,
          description: value,
        }));
        console.log(newIngredients);

        setIngredients(newIngredients);

        setProductName(response.product_name);

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
          <SpaceBetween direction="vertical" size="xs">
            <Alert statusIconAriaLabel="Info" type="info">
              <strong>{currentTranslations["scan_scanned_label"]}:</strong>{" "}
              {productCode} | <Spinner />
              <strong>{currentTranslations["scan_scanning_label"]}...</strong>
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
                <SpaceBetween direction="vertical" size="m">
                  <div>
                    <SpaceBetween direction="vertical" size="xs">
                      <Alert statusIconAriaLabel="Success" type="success">
                        {currentTranslations["scan_scanned_label"]}:{" "}
                        <strong>{productCode} </strong> |{" "}
                        {currentTranslations["product_name_label"]}:{" "}
                        <strong>{productName}</strong>
                      </Alert>
                    </SpaceBetween>
                  </div>
                  <ColumnLayout columns={2}>
                    <Container
                      footer={
                        <FlowItems
                          items={ingredients.map((item, index) => ({
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
                      }
                      header={
                        <Header variant="h2">
                          {currentTranslations["ingredients_title1"]}
                        </Header>
                      }
                    >
                      <p className="hint_font">
                        {" "}
                        {currentTranslations["ingredients_desc_ingredient"]}
                      </p>
                    </Container>

                    {additives && (
                      <Container
                        footer={
                          additives.length > 0 ? (
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
                          ) : null
                        }
                        header={
                          <Header variant="h2">
                            {currentTranslations["ingredients_title2"]}
                          </Header>
                        }
                      >
                        {additives.length > 0 ? (
                          <p className="hint_font">
                            {currentTranslations["ingredients_desc_additive"]}
                          </p>
                        ) : (
                          <p>The product does not have additives</p>
                        )}

                      </Container>
                    )}
                  </ColumnLayout>
                </SpaceBetween>

                <IngredientsSummary
                  productCode={productCode}
                  language={language}
                ></IngredientsSummary>
              </SpaceBetween>
            </div>
          )}
        </>
      )}
    </TextContent>
  );
};

export default BarcodeIngredients;
