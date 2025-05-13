import React, { useContext, useEffect, useState } from "react";
import {
  Container,
  ColumnLayout,
  Checkbox,
  SpaceBetween,
  Toggle,
} from "@cloudscape-design/components";

import customTranslations from "../../assets/i18n/all";
import { DevModeContext, LanguageContext } from "../app";

interface Translations {
  [key: string]: string;
}

interface MultiLanguageData {
  [key: string]: Translations;
}

const Preferences: React.FC = () => {
  const allergensList: MultiLanguageData = {
    Eggs: {
      english: "Eggs",
      french: "Œufs",
      italian: "Uova",
      spanish: "Huevos",
      arabic: "بيض",
    },
    Peanuts: {
      english: "Peanuts",
      french: "Arachides",
      italian: "Arachidi",
      spanish: "Maní",
      arabic: "فول سوداني",
    },
    Milk: {
      english: "Milk",
      french: "Lait",
      italian: "Latte",
      spanish: "Leche",
      arabic: "حليب",
    },
    Soy: {
      english: "Soy",
      french: "Soja",
      italian: "Soia",
      spanish: "Soja",
      arabic: "صويا",
    },
    Wheat: {
      english: "Wheat",
      french: "Blé",
      italian: "Frumento",
      spanish: "Trigo",
      arabic: "قمح",
    },
    Fish: {
      english: "Fish",
      french: "Poisson",
      italian: "Pesce",
      spanish: "Pescado",
      arabic: "سمك",
    },
    Mustard: {
      english: "Mustard",
      french: "Moutarde",
      italian: "Senape",
      spanish: "Mostaza",
      arabic: "خردل",
    },
    Sulfites: {
      english: "Sulfites",
      french: "Sulfites",
      italian: "Solfiti",
      spanish: "Sulfitos",
      arabic: "سولفيت",
    },
    Mollusks: {
      english: "Mollusks",
      french: "Mollusques",
      italian: "Molluschi",
      spanish: "Moluscos",
      arabic: "رخويات",
    },
    Corn: {
      english: "Corn",
      french: "Maïs",
      italian: "Mais",
      spanish: "Maíz",
      arabic: "ذرة",
    },
    Shellfish: {
      english: "Shellfish",
      french: "Crustacés",
      italian: "Crostacei",
      spanish: "Mariscos",
      arabic: "قشريات",
    },
    Celery: {
      english: "Celery",
      french: "Céleri",
      italian: "Sedano",
      spanish: "Apio",
      arabic: "كرفس",
    },
  };
  
  const preferencesList: MultiLanguageData = {
    Vegan: {
      english: "Vegan",
      french: "Végétalien",
      italian: "Vegano",
      spanish: "Vegano",
      arabic: "نباتي",
    },
    Vegetarian: {
      english: "Vegetarian",
      french: "Végétarien",
      italian: "Vegetariano",
      spanish: "Vegetariano",
      arabic: "نباتي",
    },
    "Dairy-Free": {
      english: "Dairy-Free",
      french: "Sans produits laitiers",
      italian: "Senza latticini",
      spanish: "Sin lácteos",
      arabic: "خالي من منتجات الألبان",
    },
    "Less salt": {
      english: "Less salt",
      french: "Moins de sel",
      italian: "Meno sale",
      spanish: "Menos sal",
      arabic: "ملح أقل",
    },

  
  };

  const language = useContext(LanguageContext);
  const { devMode, setDevMode } = useContext(DevModeContext);
  const [checkedAllergiesItems, setCheckedAllergiesItems] =
    React.useState<MultiLanguageData>({});
  const [checkedPreferencesItems, setCheckedPreferencesItems] =
    React.useState<MultiLanguageData>({});
  //const [devMode, setDevMode] = useState(currentDevMode);

  const currentTranslations = customTranslations[language];

  useEffect(() => {
    localStorage.setItem("devMode", devMode ? "true" : "false");
  }, [devMode]);

  useEffect(() => {
    // Retrieve personal preferences from localStorage
    const storedPersonalPrefCustom = localStorage.getItem("personalPrefCustom");
    const storedPersonalPrefAllergies = localStorage.getItem(
      "personalPrefAllergies"
    );

    if (storedPersonalPrefCustom) {
      const parsedPersonalPrefCustom = JSON.parse(storedPersonalPrefCustom);
      setCheckedPreferencesItems(parsedPersonalPrefCustom || {});
    }
    if (storedPersonalPrefAllergies) {
      const parsedPersonalPrefAllergies = JSON.parse(
        storedPersonalPrefAllergies
      );
      setCheckedAllergiesItems(parsedPersonalPrefAllergies || {});
    }
  }, []);

  const handleAllergiesChange =
    (allergen: any) =>
    ({ detail }: { detail: { checked: boolean } }) => {
      setCheckedAllergiesItems((prevcheckedAllergiesItems) => {
        const updatedCheckedAllergiesItems = {
          ...prevcheckedAllergiesItems,
          [allergen]: detail.checked,
        };

        // Update localStorage with the new values
        localStorage.setItem(
          "personalPrefAllergies",
          JSON.stringify(updatedCheckedAllergiesItems)
        );

        return updatedCheckedAllergiesItems;
      });
    };

  const handlePreferencesChange =
    (preference: any) =>
    ({ detail }: { detail: { checked: boolean } }) => {
      setCheckedPreferencesItems((prevCheckedPreferencesItems) => {
        const updatedCheckedPreferencesItems = {
          ...prevCheckedPreferencesItems,
          [preference]: detail.checked,
        };

        // Update localStorage with the new values
        localStorage.setItem(
          "personalPrefCustom",
          JSON.stringify(updatedCheckedPreferencesItems)
        );

        return updatedCheckedPreferencesItems;
      });
    };

  return (
    <Container>
      <h2>{customTranslations[language].menu_preferences}</h2>
      <hr></hr>
      <h3>{currentTranslations["preference_title_allergies"]}</h3>
      <SpaceBetween direction="vertical" size="xs">
        <ColumnLayout columns={4}>
          {Object.keys(allergensList).map((allergen) => (
            <Checkbox
              key={allergen}
              onChange={handleAllergiesChange(allergen)}
              checked={!!checkedAllergiesItems[allergen]}
            >
              {allergensList[allergen][language]}
            </Checkbox>
          ))}
        </ColumnLayout>

        <h3>{currentTranslations["preference_title_other"]}</h3>
        <ColumnLayout columns={4}>
          {Object.keys(preferencesList).map((preference) => (
            <Checkbox
              key={preference}
              onChange={handlePreferencesChange(preference)}
              checked={!!checkedPreferencesItems[preference]}
            >
              {preferencesList[preference][language]}
            </Checkbox>
          ))}
        </ColumnLayout>
        <h3>{currentTranslations["dev_mode_title"]}</h3>
        <Toggle
          onChange={({ detail }) => setDevMode(detail.checked)}
          checked={devMode}
        >
          {currentTranslations["dev_mode_label"]}
        </Toggle>
      </SpaceBetween>
    </Container>
  );
};

export default Preferences;
