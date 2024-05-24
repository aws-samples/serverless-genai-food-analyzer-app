import React, { useState, useEffect } from "react";
import { Container } from "@cloudscape-design/components";
import Header from "@cloudscape-design/components/header";
import Alert from "@cloudscape-design/components/alert";
import { SpaceBetween } from "@cloudscape-design/components";
import { callStreamingAPI } from "../../assets/js/custom";
import customTranslations from "../../assets/i18n/all";
import ReactMarkdown from "react-markdown";
import { callAPI } from "../../assets/js/custom";
import "./styles.css";
import { ColumnLayout } from "@cloudscape-design/components";

interface BarcodeProductSummaryProps {
  productCode: string;
  language: string;
}

const BarcodeProductSummary: React.FC<BarcodeProductSummaryProps> = ({
  productCode,
  language,
}) => {
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [summaryLoaded, setSummaryLoaded] = useState(false);
  const [recommendation, setRecommendation] = useState("");
  const [summaryError, setSummaryError] = useState("");
  const [loadingImage, setLoadingImage] = useState(true);
  const [image, setImage] = useState<string | null>(null);
  const [imageError, setImageError] = useState("");
  const [hostingDomain, setHostingDomain] = useState("");

  const currentTranslations =
    customTranslations[language] || customTranslations["english"];

  function getPreference() {
    const preferencesString = localStorage.getItem("personalPrefCustom");
    if (preferencesString) {
      return JSON.parse(preferencesString);
    } else {
      return {}; // Return an empty object if the item is not found
    }
  }

  function getAllergies() {
    const allergiesString = localStorage.getItem("personalPrefAllergies");
    if (allergiesString) {
      return JSON.parse(allergiesString);
    } else {
      return {}; // Return an empty object if the item is not found
    }
  }

  useEffect(() => {
    // Make a new API call using the result from the first API call
    const fetchData = async () => {
      const result = await fetch("/aws-exports.json");
      const awsExports = await result.json();
      setHostingDomain(awsExports.domainName);
      setImage(null);

      try {
        const body = {
          productCode,
          language,
          preferences: getPreference(),
          allergies: getAllergies(),
        };

        const response = await callAPI(`fetchImage`, "POST", body);
        if (response.error) {
          setImageError(response.error);
        } else {
          setImage(response.imageUrl);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setImageError("Image: Error fetching data: " + error);
      } finally {
        setLoadingImage(false); // Set loading to false whether the API call was successful or not
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoadingSummary(true);
      setSummaryLoaded(false);
      try {
        const body = {
          productCode: productCode,
          language: language,
          preferences: JSON.parse(
            localStorage.getItem("personalPrefCustom") || "{}"
          ),
          allergies: JSON.parse(
            localStorage.getItem("personalPrefAllergies") || "{}"
          ),
        };

        const response = await callStreamingAPI("fetchSummary", "POST", body);

        // Process the streaming response
        const reader = response.body.getReader();
        let accumulatedContent = "";
        while (true) {
          setLoadingSummary(false);
          const { done, value } = await reader.read();
          if (done) {
            // Stream finished
            break;
          }

          // Convert the chunk to a string (assuming it's text data)
          const chunkString = new TextDecoder().decode(value);
          accumulatedContent += chunkString;
          setRecommendation(accumulatedContent);
        }
        setSummaryLoaded(true);
      } catch (error) {
        console.error("Error fetching data:", error);
        setSummaryError("Summary: Error fetching data: " + error);
      } finally {
        setLoadingSummary(false);
      }
    };

    fetchData();
  }, [productCode, language]);

  return (
    <div>
      {loadingSummary && (
        <div>
          <Alert>
            <strong>Loading Summary of Ingredients...</strong>
          </Alert>
        </div>
      )}{" "}
      {summaryError ? (
        <Alert statusIconAriaLabel="Error" type="error">
          <strong>{summaryError}</strong>
        </Alert>
      ) : (
        <>
          {recommendation && (
            <div>
              <SpaceBetween direction="vertical" size="m">
              <ColumnLayout columns={2}>
                
                <Container
                  header={
                    <Header variant="h2">
                      {currentTranslations["summary_title"]}
                    </Header>
                  }
                  
                >
                  <ReactMarkdown children={recommendation}></ReactMarkdown>
                </Container>
                <Container
                  
                  media={{
                    position: "top",
                    content: (
                      <div className={image ? "" : "pulsate"}>
                        <img
                          src={
                            image
                              ? `${hostingDomain}${image}`
                              : "image-placeholder.png"
                          }
                          alt={currentTranslations['image_title']}
                        />
                      </div>
                    ),
                    height: "100%",
                  }}
                >
                  {currentTranslations['image_title']}
                </Container>

                </ColumnLayout>
              </SpaceBetween>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BarcodeProductSummary;
