"use client";

// context/AuthContext.tsx
import { createContext, useContext, useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "../firebaseconfig";
import { doc, getDoc } from "firebase/firestore";

interface User {
  uid: string;
  email: string;
  fullName: string;
  role: "student" | "tutor" | "admin";
}

interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoggedIn: false,
  loading: true,
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, "customers", firebaseUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            const role = data.role === "admin" ? "admin" : data.role === "tutor" ? "tutor" : "student";
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email!,
              fullName: data.fullName || firebaseUser.displayName || "",
              role,
            });
            setIsLoggedIn(true);
          } else {
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email!,
              fullName: firebaseUser.displayName || "",
              role: "student",
            });
            setIsLoggedIn(true);
          }
        } catch (e) {
          console.error("Error fetching user doc:", e);
          setUser(null);
          setIsLoggedIn(false);
        }
      } else {
        setUser(null);
        setIsLoggedIn(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, isLoggedIn, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
