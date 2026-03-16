/**
 * Central mapping of user roles to authorized routes.
 * After login, users are redirected to their first authorized route.
 * Route guards remain in place to prevent unauthorized manual access.
 */

import { Role } from '../types';

export interface RoleRouteMap {
  [key in Role]?: string[];
}

/**
 * Maps each role to its accessible routes in order of priority.
 * The first route in each array is the default post-login destination.
 */
export const ROLE_ROUTES: RoleRouteMap = {
  [Role.OWNER]: [
    '/dashboard',
    '/pos',
    '/inventory',
    '/reports',
    '/purchasing',
    '/accounting',
    '/hr',
    '/security',
    '/settings',
    '/warehouse-reports',
    '/warehouses',
    '/stock-movements',
    '/stock-report',
    '/production',
    '/suppliers',
    '/customers',
  ],
  [Role.MANAGER]: [
    '/dashboard',
    '/pos',
    '/inventory',
    '/reports',
    '/purchasing',
    '/warehouse-reports',
    '/warehouses',
    '/stock-movements',
    '/stock-report',
    '/production',
    '/suppliers',
    '/customers',
  ],
  [Role.CASHIER]: [
    '/pos',
    '/inventory',
    '/customers',
  ],
  [Role.STAFF]: [
    '/pos',
    '/inventory',
  ],
};

/**
 * Get the first authorized route for a given role.
 * Returns the default destination after login.
 *
 * @param role - User role
 * @returns First authorized route, or '/unauthorized' if role has no routes
 */
export const getFirstAuthorizedRoute = (role: Role | undefined): string => {
  if (!role) {
    return '/unauthorized';
  }

  const routes = ROLE_ROUTES[role];
  if (!routes || routes.length === 0) {
    return '/unauthorized';
  }

  return routes[0];
};

/**
 * Check if a user with a given role can access a specific route.
 *
 * @param role - User role
 * @param route - Route path to check
 * @returns true if authorized, false otherwise
 */
export const isRouteAuthorized = (role: Role | undefined, route: string): boolean => {
  if (!role) {
    return false;
  }

  const routes = ROLE_ROUTES[role];
  if (!routes) {
    return false;
  }

  return routes.includes(route);
};

/**
 * Get all authorized routes for a role.
 *
 * @param role - User role
 * @returns Array of authorized routes, empty array if role has no routes
 */
export const getAuthorizedRoutes = (role: Role | undefined): string[] => {
  if (!role) {
    return [];
  }

  return ROLE_ROUTES[role] || [];
};
