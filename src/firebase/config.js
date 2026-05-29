// ========================================
// Firebase Configuration
// ========================================
// CARA ISI CONFIG INI:
// 1. Buka https://console.firebase.google.com/
// 2. Pilih project "smart-tracker-cca9d"
// 3. Klik ⚙️ (gear icon) → Project Settings
// 4. Scroll ke bawah → "Your apps" → klik icon Web (</>)
// 5. Register app → copy config object ke bawah
// ========================================

import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  // ⚠️ GANTI DENGAN CONFIG DARI FIREBASE CONSOLE
  apiKey: "AIzaSyAuPoG-PETHdW8DskMYsUsokTPdu5iEC0k",
  authDomain: "smart-tracker-cca9d.firebaseapp.com",
  databaseURL: "https://smart-tracker-cca9d-default-rtdb.firebaseio.com",
  projectId: "smart-tracker-cca9d",
  storageBucket: "smart-tracker-cca9d.appspot.com",
  messagingSenderId: "G-VMS9C1T5QV",
  appId: "1:1085339015056:web:6257b9770be79a1669c515"
};

const app = initializeApp(firebaseConfig);

// Realtime Database — untuk GPS, DMS, kontrol kendaraan (data cepat berubah)
export const rtdb = getDatabase(app);

// Firestore — untuk shipment log, history (data lebih statis)
export const firestore = getFirestore(app);

export default app;
