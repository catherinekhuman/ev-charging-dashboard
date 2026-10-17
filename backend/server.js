console.log("SERVER.JS STARTED");

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const { getDatabase } = require("firebase-admin/database");

const app = express();
const PORT = process.env.PORT || 3000;

// ========================================
// MIDDLEWARE
// ========================================

app.use(cors());
app.use(express.json());

// ========================================
// CHECK ENVIRONMENT VARIABLES
// ========================================

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

// ========================================
// FIREBASE INITIALIZATION
// ========================================

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,

  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,

  privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
};

admin.initializeApp({
  credential: admin.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

const db = getDatabase();

// ========================================
// HOME
// ========================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "EV Charging Backend is running"
  });
});

// ========================================
// FIREBASE CONNECTION TEST
// ========================================

app.get("/test-firebase", async (req, res) => {
  try {
    const snapshot = await db
      .ref("bookings")
      .limitToFirst(1)
      .get();

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

// ========================================
// VERIFY BOOKING
// ========================================

app.post("/api/verify-booking", async (req, res) => {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json({
        valid: false,
        message: "Booking ID is required"
      });
    }

    console.log("Received booking ID:", bookingId);

    const bookingRef = db.ref(`bookings/${bookingId}`);
    const snapshot = await bookingRef.get();

    if (!snapshot.exists()) {
      return res.json({
        valid: false,
        message: "Booking not found"
      });
    }

    const booking = snapshot.val();

    console.log("Booking found:", booking);

    // Booking must be in booked state
    if (booking.status !== "booked") {
      return res.json({
        valid: false,
        message:
          `Booking is not available. Current status: ${booking.status}`
      });
    }

    // Prevent duplicate verification
    if (
      booking.verification &&
      booking.verification.verified === true
    ) {
      return res.json({
        valid: false,
        message: "Booking has already been verified"
      });
    }

    // Successful verification
    const verifiedAt = new Date().toISOString();

    await bookingRef.update({
      status: "active",

      verification: {
        verified: true,
        verifiedAt: verifiedAt,
        stationId: "ESP32_01"
      }
    });

    console.log(
      "Booking verified successfully:",
      bookingId
    );

    return res.json({
      valid: true,
      message: "Booking verified successfully",
      bookingId: bookingId,
      status: "active",
      stationId: "ESP32_01"
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

// ========================================
// START SERVER
// ========================================

app.listen(PORT, "0.0.0.0", () => {
  console.log("========================================");
  console.log("EV Charging Backend Running");
  console.log(`http://localhost:${PORT}`);
  console.log("========================================");
});
