import { useState } from "react";
import { database, auth } from "../firebase";
import { ref, push, get } from "firebase/database";
import { QRCodeCanvas } from "qrcode.react";

function SlotBooking() {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(60);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [bookingId, setBookingId] = useState(null);

  const checkConflict = async (date, time) => {
    const bookingsRef = ref(database, "bookings");
    const snapshot = await get(bookingsRef);
    if (!snapshot.exists()) return false;

    const bookings = snapshot.val();
    for (const key in bookings) {
      const b = bookings[key];
      if (
        b.date === date &&
        b.time === time &&
        (b.status === "booked" || b.status === "active")
      ) {
        return true;
      }
    }
    return false;
  };

  const handleBooking = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!date || !time) {
      setMessage("Please fill all fields.");
      setMessageType("error");
      return;
    }

    const conflict = await checkConflict(date, time);
    if (conflict) {
      setMessage("This slot is already booked. Please choose a different time.");
      setMessageType("error");
      return;
    }

    try {
      const user = auth.currentUser;
      const bookingsRef = ref(database, "bookings");
      const newBookingRef = await push(bookingsRef, {
        userId: user.uid,
        userEmail: user.email,
        date,
        time,
        durationMinutes: Number(duration),
        stationId: "station1",
        status: "booked",
        createdAt: new Date().toISOString()
      });

      setBookingId(newBookingRef.key);
      setMessage("Slot booked successfully.");
      setMessageType("success");
      setDate("");
      setTime("");
      setDuration(60);
    } catch (error) {
      setMessage("Error booking slot: " + error.message);
      setMessageType("error");
    }
  };

  const inputClass =
    "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-lg">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Book a Charging Slot</h2>
      <p className="text-sm text-gray-500 mb-6">Reserve a time slot at Station 1.</p>

      <form onSubmit={handleBooking} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Time</label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputClass} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Duration</label>
          <select value={duration} onChange={(e) => setDuration(e.target.value)} className={inputClass}>
            <option value={30}>30 minutes</option>
            <option value={60}>1 hour</option>
            <option value={90}>1.5 hours</option>
            <option value={120}>2 hours</option>
          </select>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-blue-700 transition"
        >
          Book Slot
        </button>
      </form>

      {message && (
        <p className={`text-sm mt-4 ${messageType === "error" ? "text-red-600" : "text-green-600"}`}>
          {message}
        </p>
      )}

      {bookingId && (
        <div className="mt-6 pt-6 border-t border-gray-200 flex flex-col items-center text-center">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Your Booking QR Code</h3>
          <div className="p-3 bg-white border border-gray-200 rounded-lg">
            <QRCodeCanvas value={bookingId} size={160} />
          </div>
          <p className="text-xs text-gray-400 mt-3">Booking ID: {bookingId}</p>
          <p className="text-xs text-gray-500 mt-1">Show this QR code at the charging station to authenticate.</p>
        </div>
      )}
    </div>
  );
}

export default SlotBooking;