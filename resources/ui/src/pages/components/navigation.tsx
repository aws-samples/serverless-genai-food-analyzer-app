// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import React from 'react';
import SideNavigation, {SideNavigationProps} from '@cloudscape-design/components/side-navigation';

export default function Navigation() {
  return (
    <>
      <SideNavigation
        activeHref={location.pathname}
      />
    </>
  );
}
