// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import React from 'react';
import BreadcrumbGroup, { BreadcrumbGroupProps } from '@cloudscape-design/components/breadcrumb-group';

const items: BreadcrumbGroupProps.Item[] = [
  { text: 'Dashboard', href: '/index.html' },
];

export interface BreadcrumbsProps {
  active: BreadcrumbGroupProps.Item;
}

export default function Breadcrumbs() {
  return <BreadcrumbGroup items={items} />;
}
