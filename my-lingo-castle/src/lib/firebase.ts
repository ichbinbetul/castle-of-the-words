import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Senin Firebase Konsolundan aldığın özel anahtarlar
const firebaseConfig = {
  apiKey: "AIzaSyCvZIvrkb5g5Zs9uZG2fqONiixmTN8evSs",
  authDomain: "castle-of-the-words.firebaseapp.com",
  projectId: "castle-of-the-words",
  storageBucket: "castle-of-the-words.firebasestorage.app",
  messagingSenderId: "184174969528",
  appId: "1:184174969528:web:791a255ea17ef0ad7eaa4d",
  measurementId: "G-0HKXNKZ1FB"
};

// Uygulamayı başlat
const app = initializeApp(firebaseConfig);

// Servisleri başlat ve dışa aktar
// (AuthContext.tsx ve page.tsx dosyalarında bunları import edeceğiz)
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);