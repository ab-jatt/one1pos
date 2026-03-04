import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyB9mg7r-cJbt7kMdGBur4grZ9I0SI-h_Cg",
  authDomain: "one1pos.firebaseapp.com",
  projectId: "one1pos",
  storageBucket: "one1pos.firebasestorage.app",
  messagingSenderId: "609563083362",
  appId: "1:609563083362:web:de9f9115f0c1fcf1c5073b",
  measurementId: "G-WWBRB7KC16"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export default app;
