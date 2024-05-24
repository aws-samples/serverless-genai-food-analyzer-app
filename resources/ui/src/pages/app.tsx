// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import "../../src/init";
import React, { createContext, useMemo, useRef } from "react";
import { AppLayout, ContentLayout } from "@cloudscape-design/components";
import NavSideBar from "./components/navigation/NavSideBar";
import "./styles.css";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Barcode from "./components/barcode";
import TopNav from "./components/navigation/TopNav";
import Preferences from "./components/preferences";
import { useState, useEffect } from "react";
import Recipe from "./components/recipe";
import { Home } from "./components/home";

function setCookie(value: string) {
  let expires = "";
  const date = new Date();
  date.setTime(date.getTime() + 7 * 24 * 60 * 60 * 1000);
  expires = "; expires=" + date.toUTCString();

  document.cookie = "language=" + value + expires + "; path=/";
}

export type Language = "english" | "italian" | "french";

export const LanguageContext = createContext<Language>("english");
export const DevModeContext = createContext({
  devMode: false,
  setDevMode: (v: boolean) => {},
});

const getCookie = (name: string) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift();
};

function App() {
  const [language, setLanguage] = useState<Language>("english"); // Initialize language state

  const [devMode, setDevMode] = useState(false);

  useEffect(() => {
    // Check if language cookie is set
    const cookieLanguage = getCookie("language");
    if (cookieLanguage) {
      setLanguage(cookieLanguage.toLowerCase() as Language); // Set language state based on the cookie value
    } else {
      setLanguage("english");
    }
    setDevMode(localStorage.getItem("devMode") === "true");
  }, []);

  console.log("App language=" + language);

  return (
    <LanguageContext.Provider value={language}>
      <DevModeContext.Provider value={{ devMode, setDevMode }}>
        <BrowserRouter basename="/">
          {<TopNav language={language} setLanguage={setLanguage} />}
          <AppLayout
            //navigation={<NavSideBar />}
            navigationHide={true}
            toolsHide={true}
            content={
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="barcode" element={<Barcode />} />
                <Route path="recipe" element={<Recipe />} />
                <Route path="preference" element={<Preferences />} />
              </Routes>
            }
          />
        </BrowserRouter>
      </DevModeContext.Provider>
    </LanguageContext.Provider>
  );
}

export default App;
