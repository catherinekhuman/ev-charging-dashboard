console.log("SERVER.JS STARTED");

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const { getDatabase } = require("firebase-admin/database");

const app = express();
const PORT = process.env.PORT || 3000;

const STATION = "station1";
const EARLY_GRACE_MIN = 10;
const LATE_GRACE_MIN = 15;

app.use(cors());
app.use(express.json());

const requiredEnv = [
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
  "FIREBASE_DATABASE_URL"
];

for (const name of requiredEnv) {
  if (!process.env[name]) {
    console.error(`Missing environment variable: ${name}`);
    process.exit(1);
  }
}

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
  }),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

const db = getDatabase();

app.get("/", (req, res) => {
  res.json({ success: true, message: "EV Charging Backend is running" });
});

app.get("/test-firebase", async (req, res) => {
  try {
    const snapshot = await db.ref("bookings").limitToFirst(1).get();
    res.json({
      success: true,
      message: "Firebase connection successful",
      data: snapshot.val()
    });
  } catch (error) {
    console.error("Firebase error:", error);
    res.status(500).json({
      success: false,
      message: "Firebase connection failed",
      error: error.message
    });
  }
});

app.post("/api/verify-booking", async (req, res) => {
  const reject = (message) => {
    console.log("REJECTED:", message);
    return res.json({ valid: false, message });
  };

  try {
    const bookingId = String((req.body && req.body.bookingId) || "").trim();

    if (!bookingId) {
      return res.status(400).json({ valid: false, message: "Booking ID is required" });
    }

    console.log("Received booking ID:", bookingId);

    const bookingRef = db.ref(`bookings/${bookingId}`);
    const snapshot = await bookingRef.get();

    if (!snapshot.exists()) return reject("Booking not found");

    const booking = snapshot.val();

    if (booking.status === "active") return reject("QR already used for an active session");
    if (booking.status === "completed") return reject("Booking already completed");
    if (booking.status === "expired" || booking.status === "cancelled") {
      return reject("Booking no longer valid");
    }
    if (booking.status !== "booked") {
      return reject(`Booking not available. Current status: ${booking.status}`);
    }

    // Time-window check (uses this machine's clock, which must be correct IST)
    const slotStart = new Date(`${booking.date}T${booking.time}`);
    const now = new Date();

    if (now < new Date(slotStart.getTime() - EARLY_GRACE_MIN * 60000)) {
      const mins = Math.ceil((slotStart.getTime() - now.getTime()) / 60000);
      return reject(`Too early. Your slot starts in ${mins} minute(s)`);
    }
    if (now > new Date(slotStart.getTime() + LATE_GRACE_MIN * 60000)) {
      return reject("Time window for this booking has passed");
    }

    // Claim the station atomically so two scans cannot both succeed
    const sessionRef = db.ref("sessions").push();
    const sessionId = sessionRef.key;
    const startTime = new Date();
    const endTime = new Date(
      startTime.getTime() + (Number(booking.durationMinutes) || 60) * 60000
    );

    const claim = await db.ref(`stations/${STATION}`).transaction((current) => {
      if (current && current.status === "occupied") return; // abort
      return {
        ...(current || {}),
        status: "occupied",
        currentBookingId: bookingId,
        currentSessionId: sessionId
      };
    });

    if (!claim.committed) return reject("Station is currently occupied");

    try {
      await sessionRef.set({
        bookingId: bookingId,
        userId: booking.userId || null,
        userEmail: booking.userEmail || null,
        stationId: STATION,
        startTime: startTime.toISOString(),
        expectedEndTime: endTime.toISOString(),
        endTime: null,
        status: "in-progress",
        liveReading: { voltage: 0, current: 0, power: 0 },
        totalEnergyKWh: 0,
        totalCost: 0,
        faultTriggered: false
      });

      await bookingRef.update({
        status: "active",
        sessionId: sessionId,
        sessionStartedAt: startTime.toISOString(),
        sessionExpectedEndAt: endTime.toISOString(),
        verification: {
          verified: true,
          verifiedAt: startTime.toISOString(),
          stationId: STATION
        }
      });
    } catch (writeError) {
      // Release the station if anything failed after claiming it
      await db.ref(`stations/${STATION}`).update({
        status: "available",
        currentBookingId: null,
        currentSessionId: null
      });
      throw writeError;
    }

    console.log("Booking verified, session created:", sessionId);

    return res.json({
      valid: true,
      message: "Access granted",
      bookingId: bookingId,
      sessionId: sessionId,
      status: "active",
      stationId: STATION
    });
  } catch (error) {
    console.error("Verification error:", error);
    return res.status(500).json({
      valid: false,
      message: "Server error",
      error: error.message
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("========================================");
  console.log("EV Charging Backend Running");
  console.log(`http://localhost:${PORT}`);
  console.log("========================================");
});