import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, doc, getDoc, setDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyByHlcafaGGi9y4Oc5WvWPC4Yc-ZTh-IZ0",
    authDomain: "gradus-26a77.firebaseapp.com",
    projectId: "gradus-26a77",
    storageBucket: "gradus-26a77.firebasestorage.app",
    messagingSenderId: "818433218009",
    appId: "1:818433218009:web:0dd0cfc85b484bfc7f75c8",
    measurementId: "G-C3R3JBHL1P"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db, collection, doc, getDoc, setDoc, updateDoc, serverTimestamp };