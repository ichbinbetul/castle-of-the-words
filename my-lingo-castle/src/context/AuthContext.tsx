"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { auth, db, googleProvider } from "@/lib/firebase";
import { signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from "firebase/firestore";

interface UserData {
  uid: string;
  soulPoints: number;
  unlockedLangs: string[];
  unlockedLevels: string[];
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  loginGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateSoulPoints: (amount: number) => Promise<void>;
  unlockLanguage: (langId: string) => Promise<void>;
  unlockLevel: (levelId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      setUser(currentUser);
      
      if (currentUser) {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          // Kullanıcı zaten varsa verisini çek
          setUserData(userSnap.data() as UserData);
        } else {
          // YENİ KULLANICI: Veritabanında 'users' koleksiyonunu otomatik oluşturur
          const newData: UserData = {
            uid: currentUser.uid,
            soulPoints: 0,
            unlockedLangs: ["İngilizce"], 
            unlockedLevels: ["A1"]
          };
          await setDoc(userRef, newData);
          setUserData(newData);
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const loginGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Giriş hatası:", error);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const updateSoulPoints = async (amount: number) => {
    if (!user || !userData) return;
    const newPoints = userData.soulPoints + amount;
    // Anlık güncelle
    setUserData({ ...userData, soulPoints: newPoints });
    // Veritabanına kaydet
    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, { soulPoints: newPoints });
  };

  const unlockLanguage = async (langId: string) => {
      if (!user || !userData) return;
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { unlockedLangs: arrayUnion(langId) });
      setUserData({ ...userData, unlockedLangs: [...userData.unlockedLangs, langId] });
  }

  const unlockLevel = async (levelId: string) => {
      if (!user || !userData) return;
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { unlockedLevels: arrayUnion(levelId) });
      setUserData({ ...userData, unlockedLevels: [...userData.unlockedLevels, levelId] });
  }

  return (
    <AuthContext.Provider value={{ user, userData, loading, loginGoogle, logout, updateSoulPoints, unlockLanguage, unlockLevel }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);