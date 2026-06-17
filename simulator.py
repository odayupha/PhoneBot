"""
=====================================================
SIMULATOR PERANGKAT IoT — Rescue Control Center
=====================================================
Simulasi data ESP32 kendaraan bantuan bencana ke Firebase RTDB.
Versi baru: mengirim device_info (baterai), safety_zone, speed_pwm.

Cara pakai:
  pip install requests
  python simulator.py
=====================================================
"""

import requests
import time
import random
import math

FIREBASE_URL = "https://smart-tracker-cca9d-default-rtdb.firebaseio.com"
VEHICLE_ID = "TRK-07"
INTERVAL_SECONDS = 3

START_LAT = -6.9923
END_LAT = -6.2088
START_LON = 110.4203
END_LON = 106.8456

MAX_SPEED_KMH = 120.0

current_progress = 0.35
battery_voltage = 4.10   # Mulai dari hampir penuh
boot_time = time.time()


def interpolate(start, end, progress):
    return start + (end - start) * progress


def voltage_to_percentage(voltage):
    """Konversi tegangan baterai Li-Po 1S ke persentase (linear)."""
    VBAT_MAX = 4.20
    VBAT_MIN = 3.00
    pct = ((voltage - VBAT_MIN) / (VBAT_MAX - VBAT_MIN)) * 100
    return max(0, min(100, round(pct, 1)))


def speed_to_pwm(speed_kmh):
    """Konversi kecepatan (km/h) ke nilai PWM (0–255)."""
    pwm = int((speed_kmh / MAX_SPEED_KMH) * 255)
    return max(0, min(255, pwm))


def determine_safety_zone(drowsiness_score, eyes_closed_sec, driving_hours):
    """
    Tentukan zona keamanan berdasarkan metrik DMS.

    BAHAYA: drowsiness >= 70 OR eyes >= 3.0s OR hours >= 8
    SIAGA:  drowsiness >= 40 OR eyes >= 1.5s OR hours >= 5
    AMAN:   lainnya
    """
    if (drowsiness_score >= 70 or eyes_closed_sec >= 3.0 or driving_hours >= 8):
        return "BAHAYA", "DANGER"
    elif (drowsiness_score >= 40 or eyes_closed_sec >= 1.5 or driving_hours >= 5):
        return "SIAGA", "WARNING"
    else:
        return "AMAN", "NORMAL"


def send_gps_data(lat, lon, speed_kmh, pwm):
    url = f"{FIREBASE_URL}/vehicles/{VEHICLE_ID}/gps.json"
    data = {
        "lat": round(lat, 6),
        "lon": round(lon, 6),
        "speed": round(speed_kmh, 1),
        "speed_kmh": round(speed_kmh, 1),
        "speed_pwm": pwm,
        "heading": 285,
        "accuracy": round(random.uniform(2, 5), 1),
        "timestamp": {".sv": "timestamp"}
    }
    try:
        r = requests.put(url, json=data, timeout=5)
        print(f"  GPS [{r.status_code}] lat={data['lat']}, lon={data['lon']}, "
              f"spd={data['speed_kmh']}km/h, pwm={pwm}")
    except Exception as e:
        print(f"  GPS Error: {e}")

    # Also persist to route_history for trail reconstruction across sessions
    history_url = f"{FIREBASE_URL}/vehicles/{VEHICLE_ID}/route_history.json"
    history_data = {
        "lat": round(lat, 6),
        "lon": round(lon, 6),
        "timestamp": {".sv": "timestamp"}
    }
    try:
        r = requests.post(history_url, json=history_data, timeout=5)
        print(f"  HIST [{r.status_code}] route_history pushed")
    except Exception as e:
        print(f"  History Error: {e}")


def send_device_info(batt_pct, batt_volt, pwm, uptime_sec):
    url = f"{FIREBASE_URL}/vehicles/{VEHICLE_ID}/device_info.json"
    data = {
        "battery_percentage": batt_pct,
        "battery_voltage": round(batt_volt, 2),
        "pwm_speed": pwm,
        "uptime_seconds": uptime_sec,
        "wifi_rssi": random.randint(-65, -35),
        "timestamp": {".sv": "timestamp"}
    }
    try:
        r = requests.put(url, json=data, timeout=5)
        print(f"  DEV [{r.status_code}] batt={batt_pct}% ({batt_volt:.2f}V) pwm={pwm}")
    except Exception as e:
        print(f"  Device Info Error: {e}")


def send_dms_data(drowsiness, eyes_sec, hours, zone, alert):
    url = f"{FIREBASE_URL}/vehicles/{VEHICLE_ID}/dms.json"
    data = {
        "alert_level": alert,
        "drowsiness_score": round(drowsiness, 1),
        "eyes_closed_sec": round(eyes_sec, 1),
        "driving_hours": round(hours, 1),
        "safety_zone": zone,
        "timestamp": {".sv": "timestamp"}
    }
    try:
        r = requests.put(url, json=data, timeout=5)
        print(f"  DMS [{r.status_code}] score={drowsiness:.0f} eyes={eyes_sec:.1f}s "
              f"hours={hours:.1f} zone={zone}")
    except Exception as e:
        print(f"  DMS Error: {e}")


def read_control():
    url = f"{FIREBASE_URL}/vehicles/{VEHICLE_ID}/control.json"
    try:
        r = requests.get(url, timeout=5)
        if r.status_code == 200:
            ctrl = r.json()
            if ctrl:
                if ctrl.get("engine_kill"):
                    print("  *** EMERGENCY STOP ***")
                if ctrl.get("buzzer"):
                    print("  SIRINE DARURAT ON")
                print(f"  Control: limit={ctrl.get('speed_limit', 80)}km/h "
                      f"geo={ctrl.get('geo_fence')}")
                return ctrl
    except Exception as e:
        print(f"  Control Error: {e}")
    return {}


def main():
    global current_progress, battery_voltage
    print("=" * 55)
    print("  Rescue Vehicle IoT Simulator (v2 — Real Schema)")
    print(f"  Vehicle: {VEHICLE_ID} | Interval: {INTERVAL_SECONDS}s")
    print("=" * 55)

    cycle = 0
    while True:
        cycle += 1
        elapsed_hours = (time.time() - boot_time) / 3600.0
        uptime_sec = int(time.time() - boot_time)
        print(f"\n--- Cycle {cycle} [{time.strftime('%H:%M:%S')}] "
              f"(uptime: {uptime_sec}s) ---")

        # --- Progress jalur ---
        current_progress += 0.002
        if current_progress > 1.0:
            current_progress = 0.0

        lat = interpolate(START_LAT, END_LAT, current_progress)
        lon = interpolate(START_LON, END_LON, current_progress)

        # --- Kecepatan & PWM ---
        speed_kmh = 60 + random.uniform(-10, 15)
        pwm = speed_to_pwm(speed_kmh)

        # --- Baterai (deplesi lambat) ---
        battery_voltage -= 0.001  # ~0.001V per cycle
        battery_voltage = max(3.0, battery_voltage)
        batt_pct = voltage_to_percentage(battery_voltage)

        # --- DMS (simulasi berdasarkan jam mengemudi) ---
        if elapsed_hours < 0.5:
            drowsiness = random.uniform(0, 20)
            eyes_sec = random.uniform(0, 0.5)
        elif elapsed_hours < 1.5:
            drowsiness = random.uniform(20, 50)
            eyes_sec = random.uniform(0.5, 2.0)
        elif elapsed_hours < 3.0:
            drowsiness = random.uniform(50, 80)
            eyes_sec = random.uniform(1.5, 4.0)
        else:
            drowsiness = random.uniform(70, 100)
            eyes_sec = random.uniform(3.0, 6.0)

        zone, alert = determine_safety_zone(drowsiness, eyes_sec, elapsed_hours)

        # --- Baca kontrol ---
        ctrl = read_control()
        if ctrl.get("engine_kill"):
            speed_kmh = 0
            pwm = 0
            requests.patch(
                f"{FIREBASE_URL}/vehicles/{VEHICLE_ID}/control.json",
                json={"engine_kill": False}, timeout=5
            )
            print("  engine_kill reset")

        # --- Kirim semua data ---
        send_gps_data(lat, lon, speed_kmh, pwm)
        send_device_info(batt_pct, battery_voltage, pwm, uptime_sec)
        send_dms_data(drowsiness, eyes_sec, elapsed_hours, zone, alert)

        time.sleep(INTERVAL_SECONDS)


if __name__ == "__main__":
    main()
