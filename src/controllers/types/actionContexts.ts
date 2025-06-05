/* eslint-disable @typescript-eslint/no-explicit-any */

import React from 'react';
import { NextRouter } from 'next/router';

/**
 * User context for action execution
 */
export interface UserContext {
  userId: string;
  username?: string;
  email?: string;
  roles: string[];
  permissions: string[];
  organizationId?: string;
  organizationRoles?: string[];
}

/**
 * Organization context
 */
export interface OrganizationContext {
  id: string;
  name: string;
  settings: Record<string, unknown>;
  permissions: string[];
  features: string[];
}

/**
 * Navigation context
 */
export interface NavigationContext {
  router: NextRouter;
  currentPath: string;
  previousPath?: string;
  breadcrumbs: Array<{ label: string; path: string }>;
}

/**
 * Page context
 */
export interface PageContext {
  pageId: string;
  pageName: string;
  state: Record<string, unknown>;
  props: Record<string, unknown>;
  metadata: {
    category: string;
    tags: string[];
    permissions: string[];
  };
}

/**
 * Complete action execution context
 */
export interface ActionContext {
  user: UserContext;
  organization?: OrganizationContext;
  page: PageContext;
  navigation: NavigationContext;
  componentRefs?: Map<string, React.RefObject<HTMLElement>>;
  timestamp: Date;
}