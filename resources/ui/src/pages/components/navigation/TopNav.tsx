import TopNavigation from "@cloudscape-design/components/top-navigation";
import customTranslations from "../../../assets/i18n/all";
import { Language } from "src/pages/app";
import { useNavigate } from "react-router-dom";

const TopNav = ({
  language,
  setLanguage,
}: {
  language: Language;
  setLanguage: (value: Language) => void;
}) => {
  const currentTranslations = customTranslations[language]; // Get translations for the current language or fallback to English
  const navigate = useNavigate();
  return (
    <TopNavigation
      identity={{
        href: "#",
        title: "Food Analyzer",
        onFollow: () => navigate("/"),
      }}
      utilities={[
        {
          type: "menu-dropdown",
          items: [
            { id: "italian", text: "Italiano" },
            { id: "english", text: "English" },
            { id: "french", text: "Français" },
            { id: "spanish", text: "Español" },
          ],

          onItemClick: ({ detail }) => {
            setLanguage(detail.id as Language);
            document.cookie = `language=${detail.id}`;
          },

          text: currentTranslations["lang_label"],
        },
      ]}
    />
  );
};

export default TopNav;
