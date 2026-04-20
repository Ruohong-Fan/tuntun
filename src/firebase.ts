import { initializeApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDSuRa0xBHZgKWBS2lTfcMzb6I-EvycFp8',
  authDomain: 'tuntun-a19b0.firebaseapp.com',
  projectId: 'tuntun-a19b0',
  storageBucket: 'tuntun-a19b0.firebasestorage.app',
  messagingSenderId: '1010625959809',
  appId: '1:1010625959809:web:576b23ea78cabf6d1dba80',
};

const app = initializeApp(firebaseConfig);

// Force long-polling transport — React Native / Android emulators often fail
// to establish Firestore's default WebChannel streaming connection.
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});
