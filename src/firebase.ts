import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, onSnapshot, query, where, orderBy, limit, getDocFromServer } from 'firebase/firestore';

// Import the Firebase configuration
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Analytics if measurementId is present
export const analytics = firebaseConfig.measurementId ? getAnalytics(app) : null;

// Test connection and log status
async function testConnection() {
  try {
    console.log('Firebase initialized with Project ID:', firebaseConfig.projectId);
    console.log('Auth Domain:', firebaseConfig.authDomain);
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('Firestore connection: OK');
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Firebase connection error: The client is offline. Please check your network or Firebase configuration.");
    } else {
      console.error("Firebase connection error:", error);
    }
  }
}
testConnection();

export {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  signInAnonymously,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit
};
