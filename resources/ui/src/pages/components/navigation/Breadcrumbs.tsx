import { useLocation } from "react-router-dom";
import routes from "./constRoutes";
import { BreadcrumbGroup } from "@cloudscape-design/components";
import { PROJECT_NAME, SITES_ROUTE_HREF_PREFIX } from "../../utils/constNames";
import { Language, LanguageContext } from "src/pages/app";
import { useContext } from "react";

export function findTitle(href: string, language: Language): string {
  if (href.startsWith(SITES_ROUTE_HREF_PREFIX))
    return `${href.substring(SITES_ROUTE_HREF_PREFIX.length)}`;
  let retval = "null";
  const stripped = href.substring(1); // strip leading '#'
  routes.forEach((route) => {
    if (route.routePath === stripped) retval = route.title(language);
  });
  return retval;
}

export function crumbs(pathname: string, language: Language) {
  //creates a list of breadcrumb subitems, e.g. [#/, #/components, #/components/service]
  let splits = pathname.split("/");
  splits.forEach((_, i) =>
    i !== 0 ? (splits[i] = splits[i - 1] + "/" + splits[i]) : (splits[i] = "#")
  );
  splits[0] += "/";

  const crumbs = splits.map((href) => ({
    text: findTitle(href, language),
    href: href,
  }));
  crumbs[0].text = PROJECT_NAME;
  return crumbs;
}

function Breadcrumbs() {
  const language = useContext(LanguageContext);

  console.log(crumbs(useLocation().pathname, language));
  // gets the hash route, e.g. #/components/service
  let pathname = useLocation().pathname;

  return <BreadcrumbGroup items={crumbs(pathname, language)} />;
}

export default Breadcrumbs;
