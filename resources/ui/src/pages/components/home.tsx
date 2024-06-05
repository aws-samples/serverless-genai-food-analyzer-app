import { Button, SpaceBetween } from "@cloudscape-design/components";
import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { LanguageContext } from "../app";
import customTranslations from "../../assets/i18n/all";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";

export function Home() {
  const navigate = useNavigate();
  const language = useContext(LanguageContext);

  return (
    <div
      style={{
        textAlign: "center",
        height: "100%",
        justifyContent: "center",
        alignItems: "center",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <SpaceBetween
          direction="vertical"
          size="xxl"
        >
      <h1>{customTranslations[language].home_title}</h1>
      <Container footer={customTranslations[language].home_subtitle}>
        <SpaceBetween
          direction="vertical"
          size="xxl"
          alignItems="center"
        >
          <Button variant="primary" onClick={() => navigate("/barcode")}>
            {customTranslations[language].menu_scan}
          </Button>
          <Button variant="primary" onClick={() => navigate("/recipe")}>
            {customTranslations[language].menu_recipe}
          </Button>
          <Button variant="primary" onClick={() => navigate("/preference")}>
            {customTranslations[language].menu_preferences}
          </Button>
        </SpaceBetween>
      </Container>
      </SpaceBetween>
    </div>
  );
}
