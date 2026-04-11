import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Go to https://console.firebase.google.com → your project → Project Settings → Your apps
// Copy the firebaseConfig object and paste it here.
const firebaseConfig = {
  apiKey: 'AIzaSyDSuRa0xBHZgKWBS2lTfcMzb6I-EvycFp8',
  authDomain: 'tuntun-a19b0.firebaseapp.com',
  projectId: 'tuntun-a19b0',
  storageBucket: 'tuntun-a19b0.firebasestorage.app',
  messagingSenderId: '1010625959809',
  appId: '1:1010625959809:web:576b23ea78cabf6d1dba80',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
