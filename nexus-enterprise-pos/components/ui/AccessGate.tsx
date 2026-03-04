import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Role } from '../../types';

interface AccessGateProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
  requiredPermission?: string;
  fallback?: React.ReactNode;
}

/**
 * AccessGate
 * 
 * A wrapper component that only renders its children if the authenticated user
 * has:
 * 1. One of the allowed roles (if allowedRoles provided)
 * 2. OR The specific required permission (if requiredPermission provided)
 * 
 * Note: If both are provided, it usually checks permission primarily, or role as fallback.
 * Here we enforce: user must have permission if specified. If permission not specified, check roles.
 */
export const AccessGate: React.FC<AccessGateProps> = ({ children, allowedRoles, requiredPermission, fallback = null }) => {
  const { user } = useAuth();

  if (!user) return <>{fallback}</>;

  // If a specific granular permission is required
  if (requiredPermission) {
    if (user.permissions.includes(requiredPermission)) {
        return <>{children}</>;
    }
    // If user doesn't have permission, return fallback
    return <>{fallback}</>;
  }

  // Fallback to role-based check if no specific permission is required
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};