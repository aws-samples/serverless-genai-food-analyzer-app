import React, { useState, useEffect } from "react";
import Button from "@cloudscape-design/components/button";
import TextContent from "@cloudscape-design/components/text-content";
import Alert from "@cloudscape-design/components/alert";
import { Container } from "@cloudscape-design/components";
import { SpaceBetween } from "@cloudscape-design/components";
import { ColumnLayout } from "@cloudscape-design/components";

import { callStreamingAPI, callAPI } from "../../assets/js/custom";
import "../../assets/css/style.css";
import customTranslations from "../../assets/i18n/all";
import Badge from "@cloudscape-design/components/badge";
import ReactMarkdown from "react-markdown";

interface RecipeProposalProps {
  language: string;
  ingredients: string[];
}

const RecipeItem = ({ label, value }: { label: string; value: string }) => {
  return (
    <p>
      <Badge>{label}:</Badge> <small>{value}</small>
    </p>
  );
};

const RecipeProposal: React.FC<RecipeProposalProps> = ({
  language,
  ingredients,
}) => {
  const currentTranslations = customTranslations[language];

  const [loadingRecipePropositions, setLoadingRecipePropositions] =
    useState(true); // Added loading state
  const [loadingStates, setLoadingStates] = useState(Array(3).fill(false));
  const [recipePropositionsResponse, setRecipePropositionsResponse] = useState<
    any[]
  >([]);

  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [recipeContents, setRecipeContents] = useState(Array(3).fill(null));
  const [hostingDomain, setHostingDomain] = useState("");

  // Make a new API call using the result from the first API call
  const fetchStepsRecipe = async (item: any, index: number) => {
    console.log("*** fetchStepsRecipe");
    setLoadingStates((prevLoadingStates) => {
      const updatedLoadingStates = [...prevLoadingStates];
      updatedLoadingStates[index] = true; // Set loading to true for the specified index
      return updatedLoadingStates;
    });
    setSelectedRecipe(item);

    try {
      const body = {
        language: language,
        recipe: item,
      };

      const response = await callStreamingAPI("stepsRecipe", "POST", body);

      // Process the streaming response
      const reader = response.body.getReader();
      let accumulatedContent = "";
      setLoadingStates((prevLoadingStates) => {
        const updatedLoadingStates = [...prevLoadingStates];
        updatedLoadingStates[index] = false; // Set loading to false for the specified index
        return updatedLoadingStates;
      });
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          // Stream finished
          break;
        }

        // Convert the chunk to a string (assuming it's text data)
        const chunkString = new TextDecoder().decode(value);
        console.log(chunkString); // Display the chunk
        accumulatedContent += chunkString;
        setRecipeContents((prevRecipeContents) => {
          const updatedRecipeContents = [...prevRecipeContents];
          updatedRecipeContents[index] = accumulatedContent;
          return updatedRecipeContents;
        });
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoadingStates((prevLoadingStates) => {
        const updatedLoadingStates = [...prevLoadingStates];
        updatedLoadingStates[index] = false; // Set loading to false for the specified index
        return updatedLoadingStates;
      });
    }
  };

  useEffect(() => {
    // Make a new API call using the result from the first API call
    const fetchData = async () => {
      const result = await fetch("/aws-exports.json");
      const awsExports = await result.json();
      setHostingDomain(awsExports.domainName);

      try {
        const body = {
          language: language,
          allergies: JSON.parse(
            localStorage.getItem("personalPrefAllergies") || "{}"
          ),
          preferences: JSON.parse(
            localStorage.getItem("personalPrefCustom") || "{}"
          ),
          ingredients: ingredients,
        };

        setLoadingRecipePropositions(true);
        const response = await callAPI(`fetchRecipePropositions`, "POST", body);
        setRecipePropositionsResponse(response.recipes);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoadingRecipePropositions(false);
      }
    };

    fetchData();
  }, [language]);

  const anyLoading = loadingStates.some((state) => state);

  return (
    <TextContent>
      {loadingRecipePropositions && (
        <div>
          <Alert>
            <strong>{currentTranslations["recipe_loading_recipe"]}</strong>
          </Alert>
        </div>
      )}

      {recipePropositionsResponse && recipePropositionsResponse.length > 0 && (
        <div>
          <SpaceBetween direction="vertical" size="m">
            <h2>{currentTranslations["recipe_proposal_title"]}</h2>
            <ColumnLayout columns={2}>
            {recipePropositionsResponse.map((item, index) => (
              
               
              <Container
                key={index}
                media={{
                  content: (
                    <img
                      src={`${hostingDomain}${item.image_url}`}
                      alt={item.recipe_title}
                    />
                  ),
                  position: "top",
                  height: "100%",
                }}
                footer={
                  !loadingStates[index] &&
                  recipeContents[index] && (
                    // Render the content if the loading state is false and the recipeContent is not null
                    <ReactMarkdown children={recipeContents[index]} />
                  )
                }
              >
                <h3>{item.recipe_title}</h3>
                <SpaceBetween direction="vertical" size="l">
                  <h4>{item.description}</h4>
                  <div>
                    <SpaceBetween direction="vertical" size="xxs">
                      <RecipeItem
                        label={currentTranslations["recipe_difficulty"]}
                        value={item.difficulty}
                      />
                      <RecipeItem
                        label={currentTranslations["recipe_preparation_time"]}
                        value={item.preparation_time}
                      />
                      <RecipeItem
                        label={currentTranslations["recipe_cooking_time"]}
                        value={item.cooking_time}
                      />
                      <RecipeItem
                        label={
                          currentTranslations["recipe_optional_ingredients"]
                        }
                        value={item.optional_ingredients.join(", ")}
                      />
                      <RecipeItem
                        label={currentTranslations["recipe_ingredients"]}
                        value={item.ingredients.join(", ")}
                      />
                    </SpaceBetween>
                  </div>
                  {(!recipeContents[index] || loadingStates[index]) && (
                    <Button
                      disabled={anyLoading}
                      onClick={() => fetchStepsRecipe(item, index)}
                    >
                      {currentTranslations["recipe_button_guide"]}
                    </Button>
                  )}
                  {loadingStates[index] && (
                    <Alert>
                      <strong>
                        {currentTranslations["recipe_loading_guide"]}
                      </strong>
                    </Alert>
                  )}
                </SpaceBetween>
                {/* Display loading indicator if loading state is true */}
              </Container>
              
              
            ))}
            </ColumnLayout>
          </SpaceBetween>
        </div>
      )}
    </TextContent>
  );
};

export default RecipeProposal;
