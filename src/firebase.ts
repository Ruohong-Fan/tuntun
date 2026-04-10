import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Go to https://console.firebase.google.com → your project → Project Settings → Your apps
// Copy the firebaseConfig object and paste it here.
const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_AUTH_DOMAIN',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_STORAGE_BUCKET',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId: 'YOUR_APP_ID',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
