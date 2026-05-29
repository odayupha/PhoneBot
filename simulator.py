"""
=====================================================
SIMULATOR PERANGKAT IoT — Rescue Control Center
=====================================================
Simulasi GPS kendaraan bantuan bencana ke Firebase RTDB.

Cara pakai:
  pip install requests
  python simulator.py
=====================================================
"""

import requests
import time
import random

FIREBASE_URL = "https://smart-tracker-cca9d-default-rtdb.firebaseio.com"
VEHICLE_ID = "TRK-07"
INTERVAL_SECONDS = 3

START_LAT = -6.9923
END_LAT = -6.2088
START_LON = 110.4203
END_LON = 106.8456

current_progress = 0.35
fuel = 64


def interpolate(start, end, progress):
    return start + (end - start) * progress


def send_gps_data(lat, lon, speed):
    url = f"{FIREBASE_URL}/vehicles/{VEHICLE_ID}/gps.json"
    data = {
        "lat": round(lat, 6),
        "lon": round(lon, 6),
        "speed": round(speed, 1),
        "heading": 285,
        "timestamp": int(time.time() * 1000)
    }
    try:
        r = requests.put(url, json=data, timeout=5)
        print(f"  GPS [{r.status_code}] lat={data['lat']}, lon={data['lon']}, spd={data['speed']}km/h")
    except Exception as e:
        print(f"  GPS Error: {e}")


def send_vehicle_data(fuel_level):
    url = f"{FIREBASE_URL}/vehicles/{VEHICLE_ID}/vehicle.json"
    data = {
        "fuel": round(fuel_level, 1),
        "engine_status": "running",
        "odometer": 142350 + int(current_progress * 450)
    }
    try:
        r = requests.put(url, json=data, timeout=5)
        print(f"  FUEL [{r.status_code}] fuel={data['fuel']}%")
    except Exception as e:
        print(f"  Vehicle Error: {e}")


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
                print(f"  Control: limit={ctrl.get('speed_limit',80)}km/h geo={ctrl.get('geo_fence')}")
                return ctrl
    except Exception as e:
        print(f"  Control Error: {e}")
    return {}


def main():
    global current_progress, fuel
    print("=" * 50)
    print("Rescue Vehicle IoT Simulator")
    print(f"Vehicle: {VEHICLE_ID} | Interval: {INTERVAL_SECONDS}s")
    print("=" * 50)

    cycle = 0
    while True:
        cycle += 1
        print(f"--- Cycle {cycle} [{time.strftime('%H:%M:%S')}] ---")

        current_progress += 0.002
        if current_progress > 1.0:
            current_progress = 0.0

        lat = interpolate(START_LAT, END_LAT, current_progress)
        lon = interpolate(START_LON, END_LON, current_progress)
        speed = 60 + random.uniform(-10, 15)
        fuel -= 0.02

        send_gps_data(lat, lon, speed)
        send_vehicle_data(fuel)
        ctrl = read_control()

        if ctrl.get("engine_kill"):
            requests.patch(
                f"{FIREBASE_URL}/vehicles/{VEHICLE_ID}/control.json",
                json={"engine_kill": False}, timeout=5
            )
            print("  engine_kill reset")

        print()
        time.sleep(INTERVAL_SECONDS)


if __name__ == "__main__":
    main()
