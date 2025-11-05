// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set } from "firebase/database";

// Your web app's Firebase configuration
// IMPORTANT: Replace with your own Firebase project's configuration!
const firebaseConfig = {
  apiKey: "AIzaSyC1Qvlz8HCpeIydqg-etneUt95JkefGoUk",
  authDomain: "lets-do-it-dd683.firebaseapp.com",
  databaseURL: "https://lets-do-it-dd683-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "lets-do-it-dd683",
  storageBucket: "lets-do-it-dd683.appspot.com",
  messagingSenderId: "994172286869",
  appId: "1:994172286869:web:6eff7b8868fb99062a689c",
  measurementId: "G-8MGGFX5H8K"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Example: Write data to the database
function writeUserData(userId, name, email) {
  set(ref(database, 'users/' + userId), {
    username: name,
    email: email
  });
  console.log("Data written to database");
}

// Example of how to use the function
writeUserData("1", "Ada Lovelace", "ada@example.com");

console.log("Firebase app initialized and data written to Realtime Database!");
