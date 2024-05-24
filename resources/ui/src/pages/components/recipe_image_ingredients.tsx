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
import { on } from "events";
import { FlowItems } from "./flowitems";

interface RecipeImageIngredientsProps {
  img: string;
  language: string;
  onRecipePropositionsDone?: () => void;
}

const RecipeImageIngredients: React.FC<RecipeImageIngredientsProps> = ({
  img,
  language,
  onRecipePropositionsDone,
}) => {
  const currentTranslations = customTranslations[language];
  const [loadingImageIngredients, setLoadingImageIngredients] = useState(true); // Added loading state
  const [imageIngredientsResponse, setImageIngredientsResponse] = useState<
    any[]
  >([]);
  const [responseReceived, setResponseReceived] = useState(false); // Added loading state

  useEffect(() => {
    const fetchData = async () => {
      try {
        setResponseReceived(false);
        const body = {
          list_images_base64: [img],
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
  }, [img, language]);

  return (
    <TextContent>
      {loadingImageIngredients && (
        <div>
          <Alert>
            <strong>{currentTranslations["image_ingredients_loading"]}</strong>
          </Alert>
        </div>
      )}

      {imageIngredientsResponse && imageIngredientsResponse.length > 0 && (
        <div>
          <SpaceBetween direction="vertical" size="m">
            <Container
              footer={
                <TokenGroup
                  items={imageIngredientsResponse.map((item, index) => ({
                    label: item,
                    dismissLabel: `Remove ${item}`,
                  }))}
                  onDismiss={({ detail: { itemIndex } }) => {
                    setImageIngredientsResponse([
                      ...imageIngredientsResponse.slice(0, itemIndex),
                      ...imageIngredientsResponse.slice(itemIndex + 1),
                    ]);
                  }}
                />
              }
              header={
                <Header variant="h2">
                  {currentTranslations["image_ingredients_title"]}
                </Header>
              }
            >
              {/* Content */}
            </Container>

            <RecipePropositions
              language={language}
              ingredients={imageIngredientsResponse}
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
