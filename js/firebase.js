import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCg6wELhPyF7tlI-pwJOZhJVwFaykFGxwc",
  authDomain: "devotional-tracker-bc403.firebaseapp.com",
  projectId: "devotional-tracker-bc403",
  storageBucket: "devotional-tracker-bc403.firebasestorage.app",
  messagingSenderId: "1001762138807",
  appId: "1:1001762138807:web:4e4934c8855675c5083b32",
  measurementId: "G-MEY8SGSH0V",
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);
export { auth, db };
