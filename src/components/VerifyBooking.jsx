import { useState } from "react";
import { database } from "../firebase";
import { ref, get, update, push, set } from "firebase/database";

const STATION_ID = "station1";

function VerifyBooking() {
  const [bookingId, setBookingId] = useState("");
  const [result, setResult] = useState(null);

  const handleVerify = async (e) => {
    e.preventDefault();
    setResult(null);

    try {
      const bookingRef = ref(database, "bookings/" + bookingId.trim());
      const snapshot = await get(bookingRef);

      if (!snapshot.exists()) {
        setResult({ type: "error", message: "Booking not found. Invalid QR code." });
        return;
      }

      const booking = snapshot.val();

      if (booking.status === "active") {
        setResult({ type: "error", message: "This QR code has already been used to start a session." });
        return;
      }
      if (booking.status === "completed") {
        setResult({ type: "error", message: "This booking has already been completed." });
        return;
      }
      if (booking.status === "expired" || booking.status === "cancelled") {
        setResult({ type: "error", message: "This booking is no longer valid." });
        return;
      }

      const stationRef = ref(database, "stations/" + STATION_ID);
      const stationSnapshot = await get(stationRef);
      const station = stationSnapshot.val();

      if (station && station.status === "occupied") {
        setResult({ type: "error", message: "Station is currently occupied by another session. Please wait." });
        return;
      }

      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + booking.durationMinutes * 60000);

      const sessionsRef = ref(database, "sessions");
      const newSessionRef = push(sessionsRef);
      const sessionId = newSessionRef.key;

      await set(newSessionRef, {
        bookingId: bookingId.trim(),
        userId: booking.userId,
        userEmail: booking.userEmail,
        stationId: STATION_ID,
        startTime: startTime.toISOString(),
        expectedEndTime: endTime.toISOString(),
        endTime: null,
        status: "in-progress",
        liveReading: { voltage: 0, current: 0, power: 0 },
        totalEnergyKWh: 0,
        totalCost: 0,
        faultTriggered: false
      });

      await update(bookingRef, {
        status: "active",
        sessionId: sessionId,
        sessionStartedAt: startTime.toISOString(),
        sessionExpectedEndAt: endTime.toISOString()
      });

      await update(stationRef, {
        status: "occupied",
        currentBookingId: bookingId.trim(),
        currentSessionId: sessionId
      });

      setResult({ type: "success", message: `Access granted. Welcome, ${booking.userEmail}. Charging session started.` });
    } catch (error) {
      setResult({ type: "error", message: "Error verifying booking: " + error.message });
    }
  };

  const handleEndSession = async () => {
    setResult(null);
    try {
      const stationRef = ref(database, "stations/" + STATION_ID);
      const stationSnapshot = await get(stationRef);
      const station = stationSnapshot.val();

      if (!station || station.status !== "occupied" || !station.currentBookingId) {
        setResult({ type: "error", message: "No active session to end." });
        return;
      }

      const sessionRef = ref(database, "sessions/" + station.currentSessionId);
      const sessionSnapshot = await get(sessionRef);
      const session = sessionSnapshot.val();

      await update(ref(database, "bookings/" + station.currentBookingId), {
      status: "completed",
      sessionEndedAt: new Date().toISOString(),
      totalCost: session ? session.totalCost : 0,
      paymentStatus: "pending"
    });

      await update(sessionRef, {
        status: "completed",
        endTime: new Date().toISOString()
      });

      await update(stationRef, {
        status: "available",
        currentBookingId: null,
        currentSessionId: null
      });

      setResult({ type: "success", message: "Session ended. Station is now available." });
    } catch (error) {
      setResult({ type: "error", message: "Error ending session: " + error.message });
    }
  };

  const handleSimulateFault = async () => {
    setResult(null);
    try {
      const stationRef = ref(database, "stations/" + STATION_ID);
      const stationSnapshot = await get(stationRef);
      const station = stationSnapshot.val();

      if (!station || station.status !== "occupied" || !station.currentSessionId) {
        setResult({ type: "error", message: "No active session to trigger a fault on." });
        return;
      }

      const sessionId = station.currentSessionId;
      const bookingId = station.currentBookingId;

      // Mark session as fault-stopped
      await update(ref(database, "sessions/" + sessionId), {
        status: "fault-stopped",
        faultTriggered: true,
        endTime: new Date().toISOString()
      });

      // Mark booking accordingly
      await update(ref(database, "bookings/" + bookingId), {
        status: "completed",
        sessionEndedAt: new Date().toISOString(),
        faultStopped: true
      });

      // Log the fault
      const faultLogsRef = ref(database, "faultLogs");
      const newLogRef = push(faultLogsRef);
      await set(newLogRef, {
        stationId: STATION_ID,
        sessionId: sessionId,
        bookingId: bookingId,
        timestamp: new Date().toISOString(),
        reason: "Overcurrent detected (simulated)"
      });

      // Free up the station
      await update(stationRef, {
        status: "available",
        currentBookingId: null,
        currentSessionId: null
      });

      setResult({ type: "error", message: "Fault triggered: session terminated for safety. Logged for staff review." });
    } catch (error) {
      setResult({ type: "error", message: "Error simulating fault: " + error.message });
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-lg">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Verify Booking (Station Simulator)</h2>
      <p className="text-sm text-gray-500 mb-6">
        Simulates the ESP32-CAM scan, session creation, and safety behavior.
      </p>

      <form onSubmit={handleVerify} className="flex gap-3 mb-3">
        <input
          type="text"
          value={bookingId}
          onChange={(e) => setBookingId(e.target.value)}
          placeholder="Enter Booking ID"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Verify
        </button>
      </form>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleEndSession}
          className="bg-gray-100 text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-200 transition"
        >
          Simulate: End Session
        </button>
        <button
          onClick={handleSimulateFault}
          className="bg-red-50 text-red-700 text-sm font-medium py-2 rounded-lg hover:bg-red-100 transition"
        >
          Simulate: Fault
        </button>
      </div>

      {result && (
        <p className={`text-sm mt-4 ${result.type === "error" ? "text-red-600" : "text-green-600"}`}>
          {result.message}
        </p>
      )}
    </div>
  );
}

export default VerifyBooking;