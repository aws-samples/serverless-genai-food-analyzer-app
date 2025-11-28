import React, { useContext, useEffect, useState } from "react";
import {
  Container,
  Header,
  SpaceBetween,
  FormField,
  Multiselect,
  Select,
  Toggle,
  Cards,
  Box,
  ColumnLayout,
} from "@cloudscape-design/components";
import customTranslations from "../../assets/i18n/all";
import { DevModeContext, LanguageContext } from "../app";

const Preferences: React.FC = () => {
  const language = useContext(LanguageContext);
  const { devMode, setDevMode } = useContext(DevModeContext);
  const currentTranslations = customTranslations[language];

  const [healthGoal, setHealthGoal] = useState<any>(null);
  const [allergies, setAllergies] = useState<readonly any[]>([]);
  const [dietaryPrefs, setDietaryPrefs] = useState<readonly any[]>([]);
  const [religion, setReligion] = useState<any>(null);
  const [dislikedIngredients, setDislikedIngredients] = useState<readonly any[]>([]);
  const [favoriteCuisines, setFavoriteCuisines] = useState<readonly any[]>([]);

  const healthGoals: Record<string, any> = {
    english: [
      { label: "Weight Loss", value: "weight_loss" },
      { label: "Muscle Gain", value: "muscle_gain" },
      { label: "Maintain Weight", value: "maintain" },
      { label: "General Health", value: "general" },
    ],
    french: [
      { label: "Perte de Poids", value: "weight_loss" },
      { label: "Gain Musculaire", value: "muscle_gain" },
      { label: "Maintenir le Poids", value: "maintain" },
      { label: "Santé Générale", value: "general" },
    ],
    spanish: [
      { label: "Pérdida de Peso", value: "weight_loss" },
      { label: "Ganancia Muscular", value: "muscle_gain" },
      { label: "Mantener Peso", value: "maintain" },
      { label: "Salud General", value: "general" },
    ],
    italian: [
      { label: "Perdita di Peso", value: "weight_loss" },
      { label: "Aumento Muscolare", value: "muscle_gain" },
      { label: "Mantenere il Peso", value: "maintain" },
      { label: "Salute Generale", value: "general" },
    ],
    arabic: [
      { label: "فقدان الوزن", value: "weight_loss" },
      { label: "زيادة العضلات", value: "muscle_gain" },
      { label: "الحفاظ على الوزن", value: "maintain" },
      { label: "الصحة العامة", value: "general" },
    ],
  };

  const allergyOptions: Record<string, any> = {
    english: [
      { label: "Eggs", value: "eggs" },
      { label: "Peanuts", value: "peanuts" },
      { label: "Tree Nuts", value: "tree_nuts" },
      { label: "Milk", value: "milk" },
      { label: "Soy", value: "soy" },
      { label: "Wheat/Gluten", value: "wheat" },
      { label: "Fish", value: "fish" },
      { label: "Shellfish", value: "shellfish" },
      { label: "Sesame", value: "sesame" },
    ],
    french: [
      { label: "Œufs", value: "eggs" },
      { label: "Arachides", value: "peanuts" },
      { label: "Noix", value: "tree_nuts" },
      { label: "Lait", value: "milk" },
      { label: "Soja", value: "soy" },
      { label: "Blé/Gluten", value: "wheat" },
      { label: "Poisson", value: "fish" },
      { label: "Crustacés", value: "shellfish" },
      { label: "Sésame", value: "sesame" },
    ],
    spanish: [
      { label: "Huevos", value: "eggs" },
      { label: "Maní", value: "peanuts" },
      { label: "Nueces", value: "tree_nuts" },
      { label: "Leche", value: "milk" },
      { label: "Soja", value: "soy" },
      { label: "Trigo/Gluten", value: "wheat" },
      { label: "Pescado", value: "fish" },
      { label: "Mariscos", value: "shellfish" },
      { label: "Sésamo", value: "sesame" },
    ],
    italian: [
      { label: "Uova", value: "eggs" },
      { label: "Arachidi", value: "peanuts" },
      { label: "Noci", value: "tree_nuts" },
      { label: "Latte", value: "milk" },
      { label: "Soia", value: "soy" },
      { label: "Grano/Glutine", value: "wheat" },
      { label: "Pesce", value: "fish" },
      { label: "Crostacei", value: "shellfish" },
      { label: "Sesamo", value: "sesame" },
    ],
    arabic: [
      { label: "بيض", value: "eggs" },
      { label: "فول سوداني", value: "peanuts" },
      { label: "مكسرات", value: "tree_nuts" },
      { label: "حليب", value: "milk" },
      { label: "صويا", value: "soy" },
      { label: "قمح/غلوتين", value: "wheat" },
      { label: "سمك", value: "fish" },
      { label: "محار", value: "shellfish" },
      { label: "سمسم", value: "sesame" },
    ],
  };

  const dietaryOptions: Record<string, any> = {
    english: [
      { label: "Vegan", value: "vegan" },
      { label: "Vegetarian", value: "vegetarian" },
      { label: "Pescatarian", value: "pescatarian" },
      { label: "Keto", value: "keto" },
      { label: "Paleo", value: "paleo" },
      { label: "Low Carb", value: "low_carb" },
      { label: "Low Fat", value: "low_fat" },
      { label: "Low Sodium", value: "low_sodium" },
    ],
    french: [
      { label: "Végétalien", value: "vegan" },
      { label: "Végétarien", value: "vegetarian" },
      { label: "Pescatarien", value: "pescatarian" },
      { label: "Keto", value: "keto" },
      { label: "Paléo", value: "paleo" },
      { label: "Faible en Glucides", value: "low_carb" },
      { label: "Faible en Gras", value: "low_fat" },
      { label: "Faible en Sodium", value: "low_sodium" },
    ],
    spanish: [
      { label: "Vegano", value: "vegan" },
      { label: "Vegetariano", value: "vegetarian" },
      { label: "Pescetariano", value: "pescatarian" },
      { label: "Keto", value: "keto" },
      { label: "Paleo", value: "paleo" },
      { label: "Bajo en Carbohidratos", value: "low_carb" },
      { label: "Bajo en Grasa", value: "low_fat" },
      { label: "Bajo en Sodio", value: "low_sodium" },
    ],
    italian: [
      { label: "Vegano", value: "vegan" },
      { label: "Vegetariano", value: "vegetarian" },
      { label: "Pescetariano", value: "pescatarian" },
      { label: "Keto", value: "keto" },
      { label: "Paleo", value: "paleo" },
      { label: "Basso Contenuto di Carboidrati", value: "low_carb" },
      { label: "Basso Contenuto di Grassi", value: "low_fat" },
      { label: "Basso Contenuto di Sodio", value: "low_sodium" },
    ],
    arabic: [
      { label: "نباتي صرف", value: "vegan" },
      { label: "نباتي", value: "vegetarian" },
      { label: "نباتي سمكي", value: "pescatarian" },
      { label: "كيتو", value: "keto" },
      { label: "باليو", value: "paleo" },
      { label: "منخفض الكربوهيدرات", value: "low_carb" },
      { label: "منخفض الدهون", value: "low_fat" },
      { label: "منخفض الصوديوم", value: "low_sodium" },
    ],
  };

  const religionOptions: Record<string, any> = {
    english: [
      { label: "None", value: "none" },
      { label: "Halal", value: "halal" },
      { label: "Kosher", value: "kosher" },
      { label: "Hindu", value: "hindu" },
    ],
    french: [
      { label: "Aucun", value: "none" },
      { label: "Halal", value: "halal" },
      { label: "Casher", value: "kosher" },
      { label: "Hindou", value: "hindu" },
    ],
    spanish: [
      { label: "Ninguno", value: "none" },
      { label: "Halal", value: "halal" },
      { label: "Kosher", value: "kosher" },
      { label: "Hindú", value: "hindu" },
    ],
    italian: [
      { label: "Nessuno", value: "none" },
      { label: "Halal", value: "halal" },
      { label: "Kosher", value: "kosher" },
      { label: "Indù", value: "hindu" },
    ],
    arabic: [
      { label: "لا شيء", value: "none" },
      { label: "حلال", value: "halal" },
      { label: "كوشر", value: "kosher" },
      { label: "هندوسي", value: "hindu" },
    ],
  };

  const commonDislikes: Record<string, any> = {
    english: [
      { label: "Cilantro", value: "cilantro" },
      { label: "Mushrooms", value: "mushrooms" },
      { label: "Olives", value: "olives" },
      { label: "Onions", value: "onions" },
      { label: "Garlic", value: "garlic" },
      { label: "Spicy Food", value: "spicy" },
    ],
    french: [
      { label: "Coriandre", value: "cilantro" },
      { label: "Champignons", value: "mushrooms" },
      { label: "Olives", value: "olives" },
      { label: "Oignons", value: "onions" },
      { label: "Ail", value: "garlic" },
      { label: "Nourriture Épicée", value: "spicy" },
    ],
    spanish: [
      { label: "Cilantro", value: "cilantro" },
      { label: "Champiñones", value: "mushrooms" },
      { label: "Aceitunas", value: "olives" },
      { label: "Cebollas", value: "onions" },
      { label: "Ajo", value: "garlic" },
      { label: "Comida Picante", value: "spicy" },
    ],
    italian: [
      { label: "Coriandolo", value: "cilantro" },
      { label: "Funghi", value: "mushrooms" },
      { label: "Olive", value: "olives" },
      { label: "Cipolle", value: "onions" },
      { label: "Aglio", value: "garlic" },
      { label: "Cibo Piccante", value: "spicy" },
    ],
    arabic: [
      { label: "كزبرة", value: "cilantro" },
      { label: "فطر", value: "mushrooms" },
      { label: "زيتون", value: "olives" },
      { label: "بصل", value: "onions" },
      { label: "ثوم", value: "garlic" },
      { label: "طعام حار", value: "spicy" },
    ],
  };

  const cuisineOptions: Record<string, any> = {
    english: [
      { label: "Italian", value: "italian" },
      { label: "Asian", value: "asian" },
      { label: "Mexican", value: "mexican" },
      { label: "Mediterranean", value: "mediterranean" },
      { label: "French", value: "french" },
      { label: "Indian", value: "indian" },
      { label: "Middle Eastern", value: "middle_eastern" },
    ],
    french: [
      { label: "Italienne", value: "italian" },
      { label: "Asiatique", value: "asian" },
      { label: "Mexicaine", value: "mexican" },
      { label: "Méditerranéenne", value: "mediterranean" },
      { label: "Française", value: "french" },
      { label: "Indienne", value: "indian" },
      { label: "Moyen-Orient", value: "middle_eastern" },
    ],
    spanish: [
      { label: "Italiana", value: "italian" },
      { label: "Asiática", value: "asian" },
      { label: "Mexicana", value: "mexican" },
      { label: "Mediterránea", value: "mediterranean" },
      { label: "Francesa", value: "french" },
      { label: "India", value: "indian" },
      { label: "Medio Oriente", value: "middle_eastern" },
    ],
    italian: [
      { label: "Italiana", value: "italian" },
      { label: "Asiatica", value: "asian" },
      { label: "Messicana", value: "mexican" },
      { label: "Mediterranea", value: "mediterranean" },
      { label: "Francese", value: "french" },
      { label: "Indiana", value: "indian" },
      { label: "Medio Orientale", value: "middle_eastern" },
    ],
    arabic: [
      { label: "إيطالية", value: "italian" },
      { label: "آسيوية", value: "asian" },
      { label: "مكسيكية", value: "mexican" },
      { label: "متوسطية", value: "mediterranean" },
      { label: "فرنسية", value: "french" },
      { label: "هندية", value: "indian" },
      { label: "شرق أوسطية", value: "middle_eastern" },
    ],
  };

  useEffect(() => {
    const stored = localStorage.getItem("userPreferences");
    if (stored) {
      const prefs = JSON.parse(stored);
      setHealthGoal(prefs.healthGoal || null);
      setAllergies(prefs.allergies || []);
      setDietaryPrefs(prefs.dietaryPrefs || []);
      setReligion(prefs.religion || null);
      setDislikedIngredients(prefs.dislikedIngredients || []);
      setFavoriteCuisines(prefs.favoriteCuisines || []);
    }
  }, []);

  const savePreferences = () => {
    const prefs = {
      healthGoal,
      allergies,
      dietaryPrefs,
      religion,
      dislikedIngredients,
      favoriteCuisines,
    };
    localStorage.setItem("userPreferences", JSON.stringify(prefs));
    
    // Legacy format for backward compatibility
    const legacyAllergies: any = {};
    allergies.forEach(a => legacyAllergies[a.value] = true);
    localStorage.setItem("personalPrefAllergies", JSON.stringify(legacyAllergies));
    
    const legacyPrefs: any = {};
    dietaryPrefs.forEach(d => legacyPrefs[d.value] = true);
    localStorage.setItem("personalPrefCustom", JSON.stringify(legacyPrefs));
  };

  useEffect(() => {
    savePreferences();
  }, [healthGoal, allergies, dietaryPrefs, religion, dislikedIngredients, favoriteCuisines]);

  return (
    <SpaceBetween size="l">
      <Container header={<Header variant="h2">{currentTranslations["pref_health_goals"]}</Header>}>
        <FormField label={currentTranslations["pref_health_goal_label"]}>
          <Select
            selectedOption={healthGoal}
            onChange={({ detail }) => setHealthGoal(detail.selectedOption)}
            options={healthGoals[language] || healthGoals.english}
            placeholder={currentTranslations["pref_select_goal"]}
            selectedAriaLabel="Selected"
          />
        </FormField>
      </Container>

      <Container header={<Header variant="h2">{currentTranslations["preference_title_allergies"]}</Header>}>
        <SpaceBetween size="m">
          <FormField label={currentTranslations["pref_allergies_label"]}>
            <Multiselect
              selectedOptions={allergies}
              onChange={({ detail }) => setAllergies(detail.selectedOptions)}
              options={allergyOptions[language] || allergyOptions.english}
              placeholder={currentTranslations["pref_select_allergies"]}
              selectedAriaLabel="Selected"
            />
          </FormField>

          <FormField label={currentTranslations["preference_title_other"]}>
            <Multiselect
              selectedOptions={dietaryPrefs}
              onChange={({ detail }) => setDietaryPrefs(detail.selectedOptions)}
              options={dietaryOptions[language] || dietaryOptions.english}
              placeholder={currentTranslations["pref_select_dietary"]}
              selectedAriaLabel="Selected"
            />
          </FormField>

          <FormField label={currentTranslations["pref_religious"]}>
            <Select
              selectedOption={religion}
              onChange={({ detail }) => setReligion(detail.selectedOption)}
              options={religionOptions[language] || religionOptions.english}
              placeholder={currentTranslations["pref_select_religious"]}
              selectedAriaLabel="Selected"
            />
          </FormField>
        </SpaceBetween>
      </Container>

      <Container header={<Header variant="h2">{currentTranslations["pref_food_prefs"]}</Header>}>
        <SpaceBetween size="m">
          <FormField label={currentTranslations["pref_disliked"]}>
            <Multiselect
              selectedOptions={dislikedIngredients}
              onChange={({ detail }) => setDislikedIngredients(detail.selectedOptions)}
              options={commonDislikes[language] || commonDislikes.english}
              placeholder={currentTranslations["pref_select_disliked"]}
              selectedAriaLabel="Selected"
            />
          </FormField>

          <FormField label={currentTranslations["pref_cuisines"]}>
            <Multiselect
              selectedOptions={favoriteCuisines}
              onChange={({ detail }) => setFavoriteCuisines(detail.selectedOptions)}
              options={cuisineOptions[language] || cuisineOptions.english}
              placeholder={currentTranslations["pref_select_cuisines"]}
              selectedAriaLabel="Selected"
            />
          </FormField>
        </SpaceBetween>
      </Container>

      <Container header={<Header variant="h2">{currentTranslations["dev_mode_title"]}</Header>}>
        <Toggle
          onChange={({ detail }) => setDevMode(detail.checked)}
          checked={devMode}
        >
          {currentTranslations["dev_mode_label"]}
        </Toggle>
      </Container>
    </SpaceBetween>
  );
};

export default Preferences;
