import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set } from 'firebase/database';
import { getFirestore, doc, setDoc, Timestamp } from 'firebase/firestore';

// =====================================================
// KONFIGURASI BACKEND (Ambil dari Firebase Console)
// =====================================================
const firebaseConfig = {
  apiKey: "AIzaSyAuPoG-PETHdW8DskMYsUsokTPdu5iEC0k",
  authDomain: "smart-tracker-cca9d.firebaseapp.com",
  databaseURL: "https://smart-tracker-cca9d-default-rtdb.firebaseio.com",
  projectId: "smart-tracker-cca9d",
  storageBucket: "smart-tracker-cca9d.appspot.com",
  messagingSenderId: "G-VMS9C1T5QV",
  appId: "1:1085339015056:web:6257b9770be79a1669c515"
};

const app = initializeApp(firebaseConfig);
const rtdb = getDatabase(app);
const firestore = getFirestore(app);

// 1. Reset / Isi Realtime Database (GPS, Vehicle, Control)
async function seedRTDB() {
  console.log('📡 [RTDB] Mengirim data kendaraan rescue...');
  await set(ref(rtdb, 'vehicles/TRK-07'), {
    gps: {
      lat: -6.7320,
      lon: 108.5523,
      speed: 72,
      heading: 285,
      timestamp: Date.now(),
    },
    vehicle: {
      fuel: 64,
      engine_status: 'running',
      odometer: 142350,
    },
    control: {
      engine_kill: false,
      engine_lock: false,
      geo_fence: true,
      buzzer: false,
      speed_limit: 80,
    },
  });
  console.log('✅ [RTDB] Berhasil!');
}

// 2. Isi Firestore (Log Misi Distribusi Bantuan)
async function seedFirestore() {
  console.log('📦 [Firestore] Mengirim log misi bantuan...');
  const missions = [
    { code: 'BNC-2024-0091', detail: 'Obat-obatan — 15 dus', status: 'picked_up', destination: 'Pos Evakuasi A', vehicle_id: 'TRK-07', timestamp: Timestamp.now() },
    { code: 'BNC-2024-0092', detail: 'Selimut & Tenda — 20 unit', status: 'in_transit', destination: 'Shelter Utara', vehicle_id: 'TRK-07', timestamp: Timestamp.now() },
    { code: 'BNC-2024-0093', detail: 'Air Bersih — 50 galon', status: 'delivered', destination: 'Camp Pengungsi B', vehicle_id: 'TRK-07', timestamp: Timestamp.now() },
    { code: 'BNC-2024-0094', detail: 'Makanan Siap Saji — 200 pack', status: 'pending', destination: 'Posko Darurat', vehicle_id: 'TRK-07', timestamp: Timestamp.now() },
  ];

  for (const s of missions) {
    await setDoc(doc(firestore, 'shipments', s.code), s);
    console.log(`   + ${s.code} → ${s.destination}`);
  }
  console.log('✅ [Firestore] Berhasil!');
}

// Jalankan Utama
async function run() {
  try {
    await seedRTDB();
    await seedFirestore();
    console.log('\n🚀 [BACKEND] Semua data misi bantuan berhasil disinkronkan!');
    process.exit(0);
  } catch (e) {
    console.error('❌ [BACKEND] Error:', e);
    process.exit(1);
  }
}

run();
