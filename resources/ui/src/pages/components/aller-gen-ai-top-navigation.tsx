// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import React, {useMemo} from 'react';
import TopNavigation, {TopNavigationProps} from '@cloudscape-design/components/top-navigation';


const ID_TOKEN = "id-token";

export default function AllerGenAITopNavigation() {
  const {userId, email} = useMemo(() => {



    const email = "user@amazon.fr"

    const userId = "user";

    return {userId, email};
  }, []);

  return (
    <>
      <TopNavigation
        identity={{
          title: 'Food Analyzer',
          href: '/index.html',
        }}
        i18nStrings={{
          overflowMenuTriggerText: 'More',
          overflowMenuTitleText: 'All',
        }}
        utilities={[{
          type: "menu-dropdown",
          text: userId,
          description: email,
          iconName: "user-profile",
          items: [{id: "profile", text: "Profile"}, {id: "preferences", text: "Preferences"}, {
            id: "security",
            text: "Security"
          }, {
            id: "support-group",
            text: "Support",
            items: [{
              id: "documentation",
              text: "Documentation",
              href: "#",
              external: true,
              externalIconAriaLabel: " (opens in new tab)"
            }, {id: "support", text: "Support"}, {
              id: "feedback",
              text: "Feedback",
              href: "#",
              external: true,
              externalIconAriaLabel: " (opens in new tab)"
            }]
          }, {id: "signout", text: "Sign out"}]
        }]}
      />
    </>
  );
}



