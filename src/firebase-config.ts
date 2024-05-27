// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { getStorage } from "firebase/storage";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC0vQmVrQbAx7NTEXRZgH_k6rYl5WwYHH8",
  authDomain: "borsaliyorum-7da89.firebaseapp.com",
  projectId: "borsaliyorum-7da89",
  storageBucket: "borsaliyorum-7da89.appspot.com",
  messagingSenderId: "477704498003",
  appId: "1:477704498003:web:c381e03f13f648a2b70fa6",
  measurementId: "G-Z6ZS87645K",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const storage = getStorage(app);

const db = getFirestore(app);

// TODO: Adding analytics gives error. investigate how to use analytics
// const analytics = getAnalytics(app);

export { app, db, storage };
