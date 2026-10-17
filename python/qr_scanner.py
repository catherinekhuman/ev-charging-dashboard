import cv2
import numpy as np
import requests
import time


# =========================================================
# ESP32-CAM
# =========================================================

ESP32_IP = "YOUR_ESP32_IP"

CAPTURE_URL = f"http://{ESP32_IP}/capture"


# =========================================================
# NODE.JS BACKEND
# =========================================================

BACKEND_URL = "http://localhost:3000/api/verify-booking"


# =========================================================
# QR DETECTOR
# =========================================================

detector = cv2.QRCodeDetector()

session = requests.Session()

print("==========================================")
print("       EV CHARGING QR AUTHENTICATION")
print("==========================================")

print("ESP32-CAM:", CAPTURE_URL)
print("Backend:", BACKEND_URL)

last_qr = ""
last_scan_time = 0


def verify_booking(booking_id):

    print()
    print("------------------------------------------")
    print("Sending booking ID to Node.js...")
    print("Booking ID:", booking_id)
    print("------------------------------------------")

    try:
        response = session.post(
            BACKEND_URL,
            json={
                "bookingId": booking_id
            },
            timeout=5
        )

        print("HTTP STATUS:", response.status_code)

        result = response.json()

        print("SERVER RESPONSE:")
        print(result)

        if result.get("valid") is True:
            print("✅ BOOKING VALID")
            print("✅ FIREBASE VERIFICATION SUCCESS")
        else:
            print("❌ BOOKING INVALID")
            print("Reason:", result.get("message"))

    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to Node.js.")
        print("Make sure server.js is running.")

    except requests.exceptions.Timeout:
        print("❌ Node.js request timed out.")

    except Exception as error:
        print("❌ Error:", error)


def decode_qr(frame):

    # Original image
    data, points, _ = detector.detectAndDecode(frame)

    if data:
        return data

    # Upscaled image
    enlarged = cv2.resize(
        frame,
        None,
        fx=2,
        fy=2,
        interpolation=cv2.INTER_CUBIC
    )

    data, points, _ = detector.detectAndDecode(enlarged)

    if data:
        return data

    # Grayscale
    gray = cv2.cvtColor(
        enlarged,
        cv2.COLOR_BGR2GRAY
    )

    data, points, _ = detector.detectAndDecode(gray)

    if data:
        return data

    return ""


print()
print("Starting camera...")
print("Waiting for QR code...")
print("Press Q to quit.")


while True:

    try:

        response = session.get(
            CAPTURE_URL,
            timeout=5
        )

        if response.status_code != 200:
            print(
                "Camera HTTP error:",
                response.status_code
            )
            continue

        image_array = np.frombuffer(
            response.content,
            dtype=np.uint8
        )

        frame = cv2.imdecode(
            image_array,
            cv2.IMREAD_COLOR
        )

        if frame is None:
            print("Could not decode camera image.")
            continue

        data = decode_qr(frame)

        if data:

            now = time.time()

            if (
                data != last_qr
                or now - last_scan_time > 5
            ):

                print()
                print("==========================================")
                print("           QR CODE DETECTED!")
                print("==========================================")
                print("BOOKING ID:", data)
                print("==========================================")

                last_qr = data
                last_scan_time = now

                verify_booking(data)

        cv2.namedWindow(
            "ESP32-CAM QR Scanner",
            cv2.WINDOW_NORMAL
        )

        cv2.resizeWindow(
            "ESP32-CAM QR Scanner",
            640,
            480
        )

        cv2.imshow(
            "ESP32-CAM QR Scanner",
            frame
        )

        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

        time.sleep(0.05)

    except requests.exceptions.Timeout:
        print("Camera capture timeout.")

    except requests.exceptions.ConnectionError:
        print("Cannot connect to ESP32-CAM.")
        time.sleep(1)

    except Exception as error:
        print("Error:", error)
        time.sleep(1)


cv2.destroyAllWindows()

print("QR scanner stopped.")
