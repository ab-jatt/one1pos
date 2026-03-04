import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { User, Role } from '../types';
import { auth, googleProvider } from '../firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  type User as FirebaseUser,
} from 'firebase/auth';
import { Api } from '../services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (role: Role) => void;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (name: string, email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
  firebaseUser: FirebaseUser | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_PERMISSIONS = {
  [Role.ADMIN]: [
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

const MOCK_USERS: Record<Role, User> = {
  [Role.ADMIN]: { 
    id: '1', 
    name: 'John Admin', 
    email: 'admin@one1pos.com', 
    role: Role.ADMIN, 
    avatar: 'JD',
    permissions: DEFAULT_PERMISSIONS[Role.ADMIN]
  },
  [Role.MANAGER]: { 
    id: '2', 
    name: 'Sarah Manager', 
    email: 'manager@one1pos.com', 
    role: Role.MANAGER, 
    avatar: 'SM',
    permissions: DEFAULT_PERMISSIONS[Role.MANAGER]
  },
  [Role.CASHIER]: { 
    id: '3', 
    name: 'Kyle Cashier', 
    email: 'cashier@one1pos.com', 
    role: Role.CASHIER, 
    avatar: 'KC',
    permissions: DEFAULT_PERMISSIONS[Role.CASHIER]
  },
};

/**
 * Map a Firebase user to app User, looking up role from backend User table.
 * Falls back to ADMIN if not found in DB.
 */
const mapFirebaseUser = async (fbUser: FirebaseUser): Promise<User> => {
  // Try to find the user in our backend DB by email to get the correct role
  let role: Role = Role.ADMIN;
  try {
    const dbUsers = await Api.users.getByEmail(fbUser.email || '');
    if (dbUsers && dbUsers.role) {
      role = dbUsers.role as Role;
    }
  } catch {
    // User doesn't exist in DB yet, default to ADMIN
  }

  return {
    id: fbUser.uid,
    name: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
    email: fbUser.email || '',
    role,
    avatar: (fbUser.displayName || fbUser.email || 'U').substring(0, 2).toUpperCase(),
    permissions: DEFAULT_PERMISSIONS[role],
  };
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Listen for Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        // Get the ID token for API calls
        const token = await fbUser.getIdToken();
        localStorage.setItem('nexus_auth_token', token);
        setFirebaseUser(fbUser);

        const appUser = await mapFirebaseUser(fbUser);
        localStorage.setItem('nexus_auth_user', JSON.stringify(appUser));
        setUser(appUser);
      } else {
        // Check for mock/demo user
        const storedRole = localStorage.getItem('nexus_auth_role') as Role;
        if (storedRole && MOCK_USERS[storedRole]) {
          setUser(MOCK_USERS[storedRole]);
        } else {
          setUser(null);
          localStorage.removeItem('nexus_auth_token');
          localStorage.removeItem('nexus_auth_user');
        }
        setFirebaseUser(null);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const loginWithEmail = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle the rest
    } catch (err: any) {
      const message = mapFirebaseError(err.code);
      setError(message);
      setIsLoading(false);
      throw new Error(message);
    }
  };

  const signUpWithEmail = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      // Set display name
      await updateProfile(credential.user, { displayName: name });
      // onAuthStateChanged will handle the rest
    } catch (err: any) {
      const message = mapFirebaseError(err.code);
      setError(message);
      setIsLoading(false);
      throw new Error(message);
    }
  };

  const loginWithGoogle = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      // onAuthStateChanged will handle the rest
    } catch (err: any) {
      const message = mapFirebaseError(err.code);
      setError(message);
      setIsLoading(false);
      throw new Error(message);
    }
  };

  const resetPassword = async (email: string) => {
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err: any) {
      const message = mapFirebaseError(err.code);
      setError(message);
      throw new Error(message);
    }
  };

  const login = (role: Role) => {
    setIsLoading(true);
    setError(null);
    setTimeout(() => {
      const user = MOCK_USERS[role];
      setUser(user);
      localStorage.setItem('nexus_auth_role', role);
      setIsLoading(false);
    }, 800);
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Error during Firebase sign out:', err);
    }
    setUser(null);
    setFirebaseUser(null);
    localStorage.removeItem('nexus_auth_token');
    localStorage.removeItem('nexus_auth_refresh_token');
    localStorage.removeItem('nexus_auth_user');
    localStorage.removeItem('nexus_auth_role');
    setError(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      login,
      loginWithEmail,
      signUpWithEmail,
      loginWithGoogle,
      resetPassword,
      logout,
      isLoading,
      error,
      firebaseUser,
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
