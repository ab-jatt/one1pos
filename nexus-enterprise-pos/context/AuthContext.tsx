import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { User, Role } from '../types';
import { Api } from '../services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  [Role.OWNER]: [
    'inventory.view', 'inventory.manage', 'inventory.delete',
    'pos.operate', 'pos.refund',
    'customers.view', 'customers.manage',
    'suppliers.view', 'suppliers.manage',
    'reports.view', 'financials.view',
    'settings.manage', 'users.manage', 'hr.manage'
  ],
  [Role.MANAGER]: [
    'inventory.view', 'inventory.manage',
    'pos.operate', 'pos.refund',
    'customers.view', 'customers.manage',
    'suppliers.view', 'suppliers.manage',
    'reports.view', 'purchasing.manage'
  ],
  [Role.CASHIER]: [
    'pos.operate',
    'customers.view', 'customers.add',
    'inventory.view'
  ]
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Restore user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('nexus_auth_user');
    const storedToken = localStorage.getItem('nexus_auth_token');
    if (storedUser && storedToken) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('nexus_auth_user');
        localStorage.removeItem('nexus_auth_token');
      }
    }
    setIsLoading(false);
  }, []);

  const loginWithEmail = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await Api.auth.login(email, password);
      const { access_token, user: userData } = response;

      // Store token
      localStorage.setItem('nexus_auth_token', access_token);

      // Build app user
      const appUser: User = {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: userData.role as Role,
        avatar: userData.avatar || userData.name.substring(0, 2).toUpperCase(),
        branchId: userData.branchId,
        permissions: DEFAULT_PERMISSIONS[userData.role] || [],
      };

      localStorage.setItem('nexus_auth_user', JSON.stringify(appUser));
      setUser(appUser);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Invalid email or password';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();

      const response = await Api.auth.loginWithGoogle(idToken);
      const { access_token, user: userData } = response;

      localStorage.setItem('nexus_auth_token', access_token);

      const appUser: User = {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: userData.role as Role,
        avatar: userData.avatar || userData.name.substring(0, 2).toUpperCase(),
        branchId: userData.branchId,
        permissions: DEFAULT_PERMISSIONS[userData.role] || [],
      };

      localStorage.setItem('nexus_auth_user', JSON.stringify(appUser));
      setUser(appUser);
    } catch (err: any) {
      // User closed the popup — not an error worth showing
      if (
        err.code === 'auth/popup-closed-by-user' ||
        err.code === 'auth/cancelled-popup-request'
      ) {
        return;
      }
      const message = err.response?.data?.message || 'Google sign-in failed. Please try again.';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('nexus_auth_token');
    localStorage.removeItem('nexus_auth_user');
    setError(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      loginWithEmail,
      loginWithGoogle,
      logout,
      isLoading,
      error,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/** Map Firebase error codes to user-friendly messages */
function mapFirebaseError(code: string): string {
  switch (code) {
    case 'auth/invalid-email':
      return 'Invalid email address.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/user-not-found':
      return 'No account found with this email.';
    case 'auth/wrong-password':
      return 'Incorrect password.';
    case 'auth/invalid-credential':
      return 'Invalid email or password.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in popup was closed.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection.';
    default:
      return `Authentication error: ${code}`;
  }
}
