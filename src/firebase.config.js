import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";


// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDAgxp2h967UtSB98ijYpfldebzShvtgNg",
    authDomain: "house-marketplace-app-6f78b.firebaseapp.com",
    projectId: "house-marketplace-app-6f78b",
    storageBucket: "house-marketplace-app-6f78b.appspot.com",
    messagingSenderId: "697206441303",
    appId: "1:697206441303:web:8d0509ba20f0c396edaa12"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore();