import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics'; // optional, see note below
import { getFirestore } from 'firebase/firestore';

import {
  initializeAuth,
  getReactNativePersistence
} from 'firebase/auth';

import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
   // hiding for public repo purposes
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);