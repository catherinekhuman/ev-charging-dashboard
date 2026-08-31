import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDE4neWGLM92sWcLLI3w-7TgF_uRSLHBpc",
  authDomain: "ev-charging-system-2dfe8.firebaseapp.com",
  databaseURL: "https://ev-charging-system-2dfe8-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "ev-charging-system-2dfe8",
  storageBucket: "ev-charging-system-2dfe8.firebasestorage.app",
  messagingSenderId: "953693571356",
  appId: "1:953693571356:web:5706ab9e99f0c7837092d9"
};

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);