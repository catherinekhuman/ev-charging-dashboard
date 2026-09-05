import { useState } from "react";
import { database } from "../firebase";
import { ref, get, update } from "firebase/database";

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

      // Replay protection: reject if already active or completed
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

      // Valid — mark as active
      await update(bookingRef, {
        status: "active",
        sessionStartedAt: new Date().toISOString()
      });

      setResult({
        type: "success",
        message: `Access granted. Welcome, ${booking.userEmail}. Charging session started.`
      });
    } catch (error) {
      setResult({ type: "error", message: "Error verifying booking: " + error.message });
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-lg">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Verify Booking (Station Simulator)</h2>
      <p className="text-sm text-gray-500 mb-6">
        This simulates the ESP32-CAM scan — paste a Booking ID to test authentication logic.
      </p>

      <form onSubmit={handleVerify} className="flex gap-3">
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

      {result && (
        <p className={`text-sm mt-4 ${result.type === "error" ? "text-red-600" : "text-green-600"}`}>
          {result.message}
        </p>
      )}
    </div>
  );
}

export default VerifyBooking;