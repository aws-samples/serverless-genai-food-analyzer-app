import React, { ReactNode } from "react";
import Scan from "../barcode";
import customTranslations from "../../../assets/i18n/all";
import Preferences from "../preferences";
import Recipe from "../recipe";
import { Language } from "src/pages/app";

interface RouteType {
  routePath: string; // displayed in the url
  title(language: Language): string; // displayed in the navigation panel
  show: boolean; // whether or not to show the page in the navigation panel
  main(language: string): ReactNode; // the rendered page, accepting a language parameter
}

const routes: RouteType[] = [
  {
    routePath: "/",
    title: (language) => customTranslations[language].menu_scan,
    show: true,
    main: () => <Scan />,
  },
  {
    routePath: "/recipe",
    title: (language) => customTranslations[language].menu_recipe,
    show: true,
    main: () => <Recipe />, // You can pass language if needed
  },
  {
    routePath: "/preference",
    title: (language) => customTranslations[language].menu_preferences,
    show: true,
    main: () => <Preferences />,
  },
];

export default routes;
