/*
 * =====================================================
 *  ESP32 Vehicle Monitor — Rescue Control Center
 * =====================================================
 *  Firmware IoT untuk monitoring kendaraan rescue.
 *  - Membaca tegangan baterai via ADC (GPIO 34)
 *  - Output PWM ke motor/aktuator (GPIO 25)
 *  - Menentukan safety_zone berdasarkan sensor DMS
 *  - Mengirim data riil ke Firebase Realtime Database
 *  - Menerima perintah kontrol dari Firebase
 *
 *  Board  : ESP32 Dev Module
 *  IDE    : Arduino IDE 2.x
 *
 *  Library yang dibutuhkan:
 *    - Firebase ESP Client by mobizt
 *      (install via Library Manager: "Firebase Arduino Client Library for ESP8266 and ESP32")
 *    - WiFi (bawaan ESP32)
 * =====================================================
 */

#include <WiFi.h>
#include <Firebase_ESP_Client.h>

// === Helper untuk token Firebase ===
#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"

// =====================================================
//  KONFIGURASI — SESUAIKAN DENGAN MILIK ANDA
// =====================================================

// WiFi
#define WIFI_SSID       "YOUR_WIFI_SSID"
#define WIFI_PASSWORD   "YOUR_WIFI_PASSWORD"

// Firebase RTDB
#define FIREBASE_HOST   "https://smart-tracker-cca9d-default-rtdb.firebaseio.com"
#define FIREBASE_API_KEY "AIzaSyAuPoG-PETHdW8DskMYsUsokTPdu5iEC0k"

// ID Kendaraan
#define VEHICLE_ID      "TRK-07"

// =====================================================
//  KONFIGURASI HARDWARE
// =====================================================

// --- Pin ADC Baterai ---
// Hubungkan output voltage divider ke pin ini.
// Skema: VBAT --- [R1 100kΩ] ---+--- [R2 100kΩ] --- GND
//                                |
//                             GPIO 34
#define BATTERY_ADC_PIN         34

// --- Pin PWM Motor ---
// Output PWM ke driver motor (L298N, BTS7960, dll.)
#define MOTOR_PWM_PIN           25
#define MOTOR_PWM_CHANNEL       0
#define MOTOR_PWM_FREQ          5000   // 5 kHz
#define MOTOR_PWM_RESOLUTION    8      // 8-bit → 0–255

// --- Pin Buzzer (opsional) ---
#define BUZZER_PIN              26

// =====================================================
//  KONSTANTA KALIBRASI
// =====================================================

// Voltage divider: VBAT → R1 → ADC → R2 → GND
// Jika R1 = R2 = 100kΩ, maka rasio = 2.0
// (tegangan di ADC = VBAT / 2)
#define VOLTAGE_DIVIDER_RATIO   2.0

// Tegangan referensi ADC ESP32 (umumnya ~3.3V, tapi bisa bervariasi)
// ESP32 ADC 12-bit: 0–4095 untuk 0–3.3V (dengan attenuation 11dB)
#define ADC_VREF                3.3
#define ADC_MAX_VALUE           4095.0

// Batas tegangan baterai Li-Po 1S
#define VBAT_MAX                4.20   // 100% (fully charged)
#define VBAT_MIN                3.00   // 0%   (cutoff, jangan di bawah ini)

// Kecepatan maksimum (km/h) saat PWM = 255
#define MAX_SPEED_KMH           120.0

// =====================================================
//  THRESHOLD ZONA KEAMANAN (DMS)
// =====================================================

// Threshold BAHAYA (salah satu terpenuhi → BAHAYA)
#define DANGER_DROWSINESS_SCORE   70.0
#define DANGER_EYES_CLOSED_SEC    3.0
#define DANGER_DRIVING_HOURS      8.0

// Threshold SIAGA (salah satu terpenuhi → SIAGA)
#define ALERT_DROWSINESS_SCORE    40.0
#define ALERT_EYES_CLOSED_SEC     1.5
#define ALERT_DRIVING_HOURS       5.0

// =====================================================
//  INTERVAL PENGIRIMAN DATA
// =====================================================
#define SEND_INTERVAL_MS        3000   // Kirim ke Firebase setiap 3 detik
#define CONTROL_READ_INTERVAL   5000   // Baca kontrol setiap 5 detik

// =====================================================
//  VARIABEL GLOBAL
// =====================================================

// Firebase
FirebaseData fbData;
FirebaseAuth fbAuth;
FirebaseConfig fbConfig;
bool firebaseReady = false;

// Timing
unsigned long lastSendTime = 0;
unsigned long lastControlRead = 0;
unsigned long bootTime = 0;

// --- Data Baterai ---
float batteryVoltage = 0.0;
int   batteryPercentage = 0;

// --- Data Kecepatan / PWM ---
int   currentPWM = 0;        // Nilai PWM saat ini (0–255)
float currentSpeedKmh = 0.0; // Kecepatan km/h (dihitung dari PWM)

// --- Data DMS (Driver Monitoring System) ---
// Dalam implementasi riil, nilai ini dari sensor kamera/ML.
// Di sini kita sediakan variabel yang bisa di-update dari sensor.
float drowsinessScore = 0.0;
float eyesClosedSec = 0.0;
float drivingHours = 0.0;
String safetyZone = "AMAN";
String alertLevel = "NORMAL";

// --- Data GPS ---
// Dalam implementasi riil, nilai ini dari modul GPS (NEO-6M, dll.)
float gpsLat = -6.7320;
float gpsLon = 108.5523;
float gpsSpeed = 0.0;
float gpsAccuracy = 3.0;
int   gpsHeading = 285;

// --- Kontrol dari Firebase ---
bool  ctrlEngineKill = false;
bool  ctrlEngineLock = false;
bool  ctrlBuzzer = false;
bool  ctrlGeoFence = true;
int   ctrlSpeedLimit = 80;

// =====================================================
//  FUNGSI: Inisialisasi WiFi
// =====================================================
void setupWiFi() {
  Serial.print("[WiFi] Menghubungkan ke ");
  Serial.println(WIFI_SSID);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.print("[WiFi] ✅ Terhubung! IP: ");
    Serial.println(WiFi.localIP());
    Serial.print("[WiFi] RSSI: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  } else {
    Serial.println();
    Serial.println("[WiFi] ❌ Gagal terhubung! Restart dalam 5 detik...");
    delay(5000);
    ESP.restart();
  }
}

// =====================================================
//  FUNGSI: Inisialisasi Firebase
// =====================================================
void setupFirebase() {
  Serial.println("[Firebase] Inisialisasi...");

  fbConfig.api_key = FIREBASE_API_KEY;
  fbConfig.database_url = FIREBASE_HOST;

  // Gunakan anonymous sign-in (tanpa auth email/password)
  // Pastikan rules Firebase RTDB mengizinkan read/write
  fbAuth.user.email = "";
  fbAuth.user.password = "";

  // Token status callback
  fbConfig.token_status_callback = tokenStatusCallback;  // dari TokenHelper.h

  Firebase.begin(&fbConfig, &fbAuth);
  Firebase.reconnectNetwork(true);

  // Tunggu sampai Firebase siap
  unsigned long startWait = millis();
  while (!Firebase.ready() && (millis() - startWait < 10000)) {
    delay(100);
  }

  if (Firebase.ready()) {
    firebaseReady = true;
    Serial.println("[Firebase] ✅ Siap!");
  } else {
    Serial.println("[Firebase] ❌ Gagal inisialisasi!");
  }
}

// =====================================================
//  FUNGSI: Setup PWM Motor
// =====================================================
void setupMotorPWM() {
  // Konfigurasi LEDC channel untuk PWM
  ledcAttach(MOTOR_PWM_PIN, MOTOR_PWM_FREQ, MOTOR_PWM_RESOLUTION);

  // Mulai dengan PWM 0 (motor mati)
  ledcWrite(MOTOR_PWM_PIN, 0);

  Serial.println("[Motor] ✅ PWM siap pada GPIO " + String(MOTOR_PWM_PIN));
}

// =====================================================
//  FUNGSI: Baca Tegangan Baterai via ADC
// =====================================================
void readBattery() {
  // Baca ADC (rata-rata dari beberapa sampel untuk stabilitas)
  long adcSum = 0;
  const int samples = 20;

  for (int i = 0; i < samples; i++) {
    adcSum += analogRead(BATTERY_ADC_PIN);
    delayMicroseconds(100);
  }

  float adcAverage = (float)adcSum / samples;

  // Konversi ADC → tegangan di pin ADC
  float adcVoltage = (adcAverage / ADC_MAX_VALUE) * ADC_VREF;

  // Konversi → tegangan baterai riil (sebelum voltage divider)
  batteryVoltage = adcVoltage * VOLTAGE_DIVIDER_RATIO;

  // Konversi tegangan → persentase (linear mapping)
  if (batteryVoltage >= VBAT_MAX) {
    batteryPercentage = 100;
  } else if (batteryVoltage <= VBAT_MIN) {
    batteryPercentage = 0;
  } else {
    batteryPercentage = (int)(((batteryVoltage - VBAT_MIN) / (VBAT_MAX - VBAT_MIN)) * 100.0);
  }

  // Clamp ke 0–100
  batteryPercentage = constrain(batteryPercentage, 0, 100);

  Serial.printf("[Baterai] ADC: %.0f | Pin: %.2fV | VBAT: %.2fV | %d%%\n",
                adcAverage, adcVoltage, batteryVoltage, batteryPercentage);
}

// =====================================================
//  FUNGSI: Update PWM Motor Berdasarkan Kecepatan
// =====================================================
void updateMotorPWM() {
  // Jika engine_kill atau engine_lock aktif → PWM = 0
  if (ctrlEngineKill || ctrlEngineLock) {
    currentPWM = 0;
    currentSpeedKmh = 0.0;
    ledcWrite(MOTOR_PWM_PIN, 0);
    Serial.println("[Motor] ⛔ Engine KILL/LOCK aktif → PWM = 0");
    return;
  }

  // Konversi speed_limit (km/h) → PWM (0–255)
  // speed_limit dari Firebase control node
  float targetSpeedKmh = (float)constrain(ctrlSpeedLimit, 0, (int)MAX_SPEED_KMH);
  int targetPWM = (int)((targetSpeedKmh / MAX_SPEED_KMH) * 255.0);
  targetPWM = constrain(targetPWM, 0, 255);

  // Smooth ramp (tidak langsung loncat, naik/turun bertahap)
  if (currentPWM < targetPWM) {
    currentPWM = min(currentPWM + 5, targetPWM);  // Naik 5 per cycle
  } else if (currentPWM > targetPWM) {
    currentPWM = max(currentPWM - 5, targetPWM);  // Turun 5 per cycle
  }

  // Hitung kecepatan riil berdasarkan PWM aktual
  currentSpeedKmh = ((float)currentPWM / 255.0) * MAX_SPEED_KMH;

  // Tulis PWM ke motor
  ledcWrite(MOTOR_PWM_PIN, currentPWM);

  Serial.printf("[Motor] Target: %d km/h → PWM: %d | Aktual: %.1f km/h (PWM: %d)\n",
                ctrlSpeedLimit, targetPWM, currentSpeedKmh, currentPWM);
}

// =====================================================
//  FUNGSI: Tentukan Zona Keamanan
// =====================================================
void determineSafetyZone() {
  /*
   * Logika penentuan safety_zone:
   *
   * BAHAYA — jika salah satu terpenuhi:
   *   - drowsiness_score >= 70
   *   - eyes_closed_sec >= 3.0
   *   - driving_hours >= 8
   *
   * SIAGA — jika salah satu terpenuhi:
   *   - drowsiness_score >= 40
   *   - eyes_closed_sec >= 1.5
   *   - driving_hours >= 5
   *
   * AMAN — jika semua di bawah threshold SIAGA
   */

  // Cek BAHAYA terlebih dahulu (prioritas tertinggi)
  if (drowsinessScore >= DANGER_DROWSINESS_SCORE ||
      eyesClosedSec >= DANGER_EYES_CLOSED_SEC ||
      drivingHours >= DANGER_DRIVING_HOURS) {
    safetyZone = "BAHAYA";
    alertLevel = "DANGER";
  }
  // Cek SIAGA
  else if (drowsinessScore >= ALERT_DROWSINESS_SCORE ||
           eyesClosedSec >= ALERT_EYES_CLOSED_SEC ||
           drivingHours >= ALERT_DRIVING_HOURS) {
    safetyZone = "SIAGA";
    alertLevel = "WARNING";
  }
  // Jika tidak ada yang terpenuhi → AMAN
  else {
    safetyZone = "AMAN";
    alertLevel = "NORMAL";
  }

  Serial.printf("[DMS] Score: %.1f | Eyes: %.1fs | Hours: %.1f → Zona: %s\n",
                drowsinessScore, eyesClosedSec, drivingHours, safetyZone.c_str());

  // Jika BAHAYA dan buzzer belum aktif, bisa nyalakan buzzer otomatis
  if (safetyZone == "BAHAYA") {
    digitalWrite(BUZZER_PIN, HIGH);
    Serial.println("[DMS] 🚨 BAHAYA! Buzzer ON otomatis!");
  } else if (!ctrlBuzzer) {
    // Matikan buzzer jika zona tidak bahaya dan buzzer tidak dinyalakan manual
    digitalWrite(BUZZER_PIN, LOW);
  }
}

// =====================================================
//  FUNGSI: Baca Sensor DMS
// =====================================================
void readDMSSensors() {
  /*
   * ======================================================
   *  PENTING: Sesuaikan bagian ini dengan sensor Anda!
   * ======================================================
   *
   * Contoh integrasi sensor DMS:
   *
   * 1. ESP32-CAM + TensorFlow Lite Micro:
   *    - Jalankan model deteksi wajah/mata di ESP32
   *    - Update drowsinessScore dan eyesClosedSec
   *
   * 2. Sensor IR/Infrared Mata:
   *    - Baca analog pin sensor IR yang mendeteksi mata tertutup
   *    - Konversi ke detik dan skor
   *
   * 3. Komunikasi Serial dari modul DMS eksternal:
   *    - Terima data via UART dari OpenMV/Raspberry Pi
   *    - Parse dan update variabel
   *
   * Untuk saat ini, contoh menggunakan simulasi sederhana
   * berdasarkan waktu berjalan (driving_hours) yang terakumulasi.
   * GANTI DENGAN PEMBACAAN SENSOR RIIL ANDA.
   */

  // Akumulasi jam mengemudi berdasarkan uptime
  unsigned long uptimeMs = millis() - bootTime;
  drivingHours = (float)uptimeMs / 3600000.0;  // ms → jam

  // --- CONTOH: Simulasi drowsiness berdasarkan jam mengemudi ---
  // Semakin lama mengemudi, skor drowsiness meningkat
  // GANTI ini dengan pembacaan sensor kamera/ML yang sebenarnya!
  if (drivingHours < 2.0) {
    drowsinessScore = random(0, 20);      // Segar
    eyesClosedSec = random(0, 50) / 100.0;  // 0–0.5 detik
  } else if (drivingHours < 5.0) {
    drowsinessScore = random(20, 50);     // Mulai mengantuk
    eyesClosedSec = random(50, 200) / 100.0; // 0.5–2.0 detik
  } else if (drivingHours < 8.0) {
    drowsinessScore = random(50, 80);     // Sangat mengantuk
    eyesClosedSec = random(150, 400) / 100.0; // 1.5–4.0 detik
  } else {
    drowsinessScore = random(70, 100);    // Kritis
    eyesClosedSec = random(300, 600) / 100.0; // 3.0–6.0 detik
  }

  /*
   * === CONTOH PEMBACAAN SENSOR RIIL (uncomment sesuai kebutuhan) ===
   *
   * // Contoh 1: Sensor analog drowsiness pada GPIO 35
   * int rawDrowsy = analogRead(35);
   * drowsinessScore = map(rawDrowsy, 0, 4095, 0, 100);
   *
   * // Contoh 2: Data dari Serial2 (modul DMS eksternal)
   * if (Serial2.available()) {
   *   String line = Serial2.readStringUntil('\n');
   *   // Parse: "SCORE:65,EYES:2.3"
   *   int scoreIdx = line.indexOf("SCORE:");
   *   int eyesIdx = line.indexOf("EYES:");
   *   if (scoreIdx >= 0) drowsinessScore = line.substring(scoreIdx+6).toFloat();
   *   if (eyesIdx >= 0) eyesClosedSec = line.substring(eyesIdx+5).toFloat();
   * }
   */
}

// =====================================================
//  FUNGSI: Baca GPS (Placeholder — ganti dengan modul GPS)
// =====================================================
void readGPS() {
  /*
   * Untuk implementasi riil, gunakan library TinyGPS++ 
   * dengan modul GPS NEO-6M / NEO-M8N pada Serial2.
   *
   * Contoh:
   *   #include <TinyGPS++.h>
   *   TinyGPSPlus gps;
   *   while (Serial2.available() > 0) {
   *     gps.encode(Serial2.read());
   *   }
   *   if (gps.location.isValid()) {
   *     gpsLat = gps.location.lat();
   *     gpsLon = gps.location.lng();
   *     gpsSpeed = gps.speed.kmph();
   *     gpsHeading = (int)gps.course.deg();
   *   }
   *
   * Untuk saat ini, kecepatan GPS disinkronkan dengan PWM.
   */

  // Sinkronkan kecepatan GPS dengan kecepatan PWM motor
  gpsSpeed = currentSpeedKmh;
}

// =====================================================
//  FUNGSI: Kirim Data ke Firebase RTDB
// =====================================================
void sendDataToFirebase() {
  if (!firebaseReady || !Firebase.ready()) {
    Serial.println("[Firebase] ⚠️ Belum siap, skip pengiriman.");
    return;
  }

  String basePath = "/vehicles/" + String(VEHICLE_ID);
  unsigned long timestamp = millis();  // Gunakan epoch jika ada RTC/NTP

  // ---- 1. Device Info (Baterai, PWM, Uptime, WiFi) ----
  FirebaseJson deviceInfoJson;
  deviceInfoJson.set("battery_percentage", batteryPercentage);
  deviceInfoJson.set("battery_voltage", roundf(batteryVoltage * 100) / 100);  // 2 desimal
  deviceInfoJson.set("pwm_speed", currentPWM);
  deviceInfoJson.set("uptime_seconds", (int)((millis() - bootTime) / 1000));
  deviceInfoJson.set("wifi_rssi", WiFi.RSSI());
  deviceInfoJson.set("timestamp/.sv", "timestamp");  // Server timestamp

  if (Firebase.RTDB.setJSON(&fbData, basePath + "/device_info", &deviceInfoJson)) {
    Serial.println("[Firebase] ✅ device_info terkirim");
  } else {
    Serial.println("[Firebase] ❌ device_info gagal: " + fbData.errorReason());
  }

  // ---- 2. DMS (Driver Monitoring System) ----
  FirebaseJson dmsJson;
  dmsJson.set("alert_level", alertLevel);
  dmsJson.set("drowsiness_score", roundf(drowsinessScore * 10) / 10);
  dmsJson.set("eyes_closed_sec", roundf(eyesClosedSec * 10) / 10);
  dmsJson.set("driving_hours", roundf(drivingHours * 10) / 10);
  dmsJson.set("safety_zone", safetyZone);
  dmsJson.set("timestamp/.sv", "timestamp");

  if (Firebase.RTDB.setJSON(&fbData, basePath + "/dms", &dmsJson)) {
    Serial.println("[Firebase] ✅ dms terkirim");
  } else {
    Serial.println("[Firebase] ❌ dms gagal: " + fbData.errorReason());
  }

  // ---- 3. GPS ----
  FirebaseJson gpsJson;
  gpsJson.set("lat", gpsLat);
  gpsJson.set("lon", gpsLon);
  gpsJson.set("speed", roundf(gpsSpeed * 10) / 10);
  gpsJson.set("speed_kmh", roundf(currentSpeedKmh * 10) / 10);
  gpsJson.set("speed_pwm", currentPWM);
  gpsJson.set("heading", gpsHeading);
  gpsJson.set("accuracy", gpsAccuracy);
  gpsJson.set("timestamp/.sv", "timestamp");

  if (Firebase.RTDB.setJSON(&fbData, basePath + "/gps", &gpsJson)) {
    Serial.println("[Firebase] ✅ gps terkirim");
  } else {
    Serial.println("[Firebase] ❌ gps gagal: " + fbData.errorReason());
  }

  Serial.println("─────────────────────────────────────");
}

// =====================================================
//  FUNGSI: Baca Kontrol dari Firebase
// =====================================================
void readControlFromFirebase() {
  if (!firebaseReady || !Firebase.ready()) return;

  String controlPath = "/vehicles/" + String(VEHICLE_ID) + "/control";

  if (Firebase.RTDB.getJSON(&fbData, controlPath)) {
    FirebaseJson &json = fbData.jsonData();
    FirebaseJsonData jsonData;

    if (json.get(jsonData, "engine_kill"))  ctrlEngineKill = jsonData.boolValue;
    if (json.get(jsonData, "engine_lock"))  ctrlEngineLock = jsonData.boolValue;
    if (json.get(jsonData, "buzzer"))       ctrlBuzzer = jsonData.boolValue;
    if (json.get(jsonData, "geo_fence"))    ctrlGeoFence = jsonData.boolValue;
    if (json.get(jsonData, "speed_limit"))  ctrlSpeedLimit = jsonData.intValue;

    Serial.printf("[Control] kill=%d lock=%d buzzer=%d fence=%d limit=%d\n",
                  ctrlEngineKill, ctrlEngineLock, ctrlBuzzer, ctrlGeoFence, ctrlSpeedLimit);

    // Eksekusi perintah kontrol
    if (ctrlEngineKill) {
      Serial.println("[Control] 🛑 EMERGENCY STOP diterima!");
      ledcWrite(MOTOR_PWM_PIN, 0);
      currentPWM = 0;
      currentSpeedKmh = 0;

      // Reset engine_kill setelah dieksekusi
      Firebase.RTDB.setBool(&fbData, controlPath + "/engine_kill", false);
      ctrlEngineKill = false;
      Serial.println("[Control] engine_kill direset");
    }

    // Buzzer manual dari dashboard
    digitalWrite(BUZZER_PIN, ctrlBuzzer ? HIGH : LOW);

  } else {
    Serial.println("[Control] ❌ Gagal baca: " + fbData.errorReason());
  }
}

// =====================================================
//  SETUP
// =====================================================
void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println();
  Serial.println("╔═══════════════════════════════════════╗");
  Serial.println("║   ESP32 Vehicle Monitor — TRK-07     ║");
  Serial.println("║   Rescue Control Center               ║");
  Serial.println("╚═══════════════════════════════════════╝");
  Serial.println();

  bootTime = millis();

  // Setup pin
  pinMode(BATTERY_ADC_PIN, INPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);

  // ADC: atur resolusi dan attenuation
  analogReadResolution(12);           // 12-bit (0–4095)
  analogSetAttenuation(ADC_11db);     // Range 0–3.3V

  // Setup komponen
  setupWiFi();
  setupFirebase();
  setupMotorPWM();

  // Baca kontrol awal dari Firebase
  readControlFromFirebase();

  Serial.println();
  Serial.println("[System] ✅ Semua sistem siap!");
  Serial.println("─────────────────────────────────────");
}

// =====================================================
//  LOOP UTAMA
// =====================================================
void loop() {
  unsigned long now = millis();

  // --- Baca kontrol dari Firebase ---
  if (now - lastControlRead >= CONTROL_READ_INTERVAL) {
    lastControlRead = now;
    readControlFromFirebase();
  }

  // --- Kirim data setiap SEND_INTERVAL_MS ---
  if (now - lastSendTime >= SEND_INTERVAL_MS) {
    lastSendTime = now;

    Serial.printf("\n=== Cycle [%lu detik] ===\n", (now - bootTime) / 1000);

    // 1. Baca tegangan baterai
    readBattery();

    // 2. Baca sensor DMS
    readDMSSensors();

    // 3. Tentukan zona keamanan
    determineSafetyZone();

    // 4. Update PWM motor berdasarkan speed_limit
    updateMotorPWM();

    // 5. Baca GPS (atau sinkronkan dengan PWM)
    readGPS();

    // 6. Kirim semua data ke Firebase
    sendDataToFirebase();
  }

  // Kecil delay agar tidak busy-loop
  delay(50);
}
