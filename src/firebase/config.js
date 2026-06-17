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
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  // ✅ CONFIG FIREBASE TERBARU - smart-tracker-cca9d
  apiKey: "AIzaSyAuPoG-PETHdW8DskMYsUsokTPdu5iEC0k",
  authDomain: "smart-tracker-cca9d.firebaseapp.com",
  databaseURL: "https://smart-tracker-cca9d-default-rtdb.firebaseio.com",
  projectId: "smart-tracker-cca9d",
  storageBucket: "smart-tracker-cca9d.firebasestorage.app",
  messagingSenderId: "1085339015056",
  appId: "1:1085339015056:web:6257b9770be79a1669c515",
  measurementId: "G-VMS9C1T5QV"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Realtime Database — untuk GPS, DMS, kontrol kendaraan (data cepat berubah)
export const rtdb = getDatabase(app);

// Firestore — untuk shipment log, history (data lebih statis)
export const firestore = getFirestore(app);

export default app;
