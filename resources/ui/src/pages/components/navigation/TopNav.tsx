import TopNavigation from "@cloudscape-design/components/top-navigation";
import customTranslations from "../../../assets/i18n/all";
import { Language } from "src/pages/app";
import { useNavigate, useLocation } from "react-router-dom";

const TopNav = ({
  language,
  setLanguage,
}: {
  language: Language;
  setLanguage: (value: Language) => void;
}) => {
  const currentTranslations = customTranslations[language];
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check if we're on home page
  const isHomePage = location.pathname === '/';
  
  // Get cart count
  const cartCount = (() => {
    try {
      const cart = JSON.parse(localStorage.getItem("shoppingCart") || "[]");
      return cart.length;
    } catch {
      return 0;
    }
  })();
  
  return (
    <TopNavigation
      identity={{
        href: "#",
        title: "Food Analyzer",
        onFollow: () => navigate("/"),
      }}
      utilities={[
        // Cart button (not on home page)
        ...(!isHomePage ? [{
          type: "button" as const,
          text: cartCount > 0 ? `🛒${cartCount}` : "🛒",
          title: "Shopping Cart",
          ariaLabel: "Shopping Cart",
          onClick: () => navigate("/cart"),
        }] : []),
        // Preferences button (not on home page)
        ...(!isHomePage ? [{
          type: "button" as const,
          text: "⚙",
          title: "Preferences",
          ariaLabel: "Preferences",
          onClick: () => navigate("/preference"),
        }] : []),
        {
          type: "menu-dropdown" as const,
          items: [
            { id: "italian", text: "Italiano" },
            { id: "english", text: "English" },
            { id: "french", text: "Français" },
            { id: "spanish", text: "Español" },
            { id: "arabic", text: "عربي" },
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
