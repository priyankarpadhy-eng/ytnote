// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCxtr2np81x1IZRk5ooeN87FFKxhCYBylE",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "lecturesnapp.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "lecturesnapp",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "lecturesnapp.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "944710599100",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:944710599100:web:653184b38e923ee15a6bb9",
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-7GGHZSE0TZ",
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://lecturesnapp-default-rtdb.firebaseio.com/"
};

import { getDatabase } from "firebase/database";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Services
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');
export const db = getFirestore(app);
export const storage = getStorage(app);
export const rtdb = getDatabase(app);

// Connect to Emulators if on localhost
// Connect to Emulators if on localhost
if (location.hostname === 'localhost') {
    // const { connectAuthEmulator } = await import('firebase/auth');
    // const { connectFirestoreEmulator } = await import('firebase/firestore');
    // const { connectStorageEmulator } = await import('firebase/storage');
    // const { connectDatabaseEmulator } = await import('firebase/database');
    const { connectFunctionsEmulator, getFunctions } = await import('firebase/functions');

    // connectAuthEmulator(auth, "http://127.0.0.1:9099");
    // connectFirestoreEmulator(db, '127.0.0.1', 8080);
    // connectStorageEmulator(storage, '127.0.0.1', 9199);
    // connectDatabaseEmulator(rtdb, '127.0.0.1', 9000);

    // Also connect functions if you use them client-side
    const functions = getFunctions(app);
    connectFunctionsEmulator(functions, '127.0.0.1', 5001);
}

// Helper to upload base64 to Firebase Storage
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

export async function uploadToStorage(dataUrl, path) {
    const storageRef = ref(storage, path);
    // dataUrl is likely "data:image/jpeg;base64,..."
    await uploadString(storageRef, dataUrl, 'data_url');
    return getDownloadURL(storageRef);
}

export default app;
