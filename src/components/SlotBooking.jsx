import { useState } from "react";
import { database, auth } from "../firebase";
import { ref, push, get, query, orderByChild, equalTo } from "firebase/database";
import { QRCodeCanvas } from "qrcode.react";

function SlotBooking() {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(60);
  const [message, setMessage] = useState("");
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
        return true; // conflict found
      }
    }
    return false;
  };

  const handleBooking = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!date || !time) {
      setMessage("Please fill all fields.");
      return;
    }

    const conflict = await checkConflict(date, time);
    if (conflict) {
      setMessage("This slot is already booked. Please choose a different time.");
      return;
    }

    try {
      const user = auth.currentUser;
      const bookingsRef = ref(database, "bookings");
      const newBookingRef = await push(bookingsRef, {
        userId: user.uid,
        userEmail: user.email,
        date: date,
        time: time,
        durationMinutes: Number(duration),
        stationId: "station1",
        status: "booked",
        createdAt: new Date().toISOString()
      });

      setBookingId(newBookingRef.key);
      setMessage("Slot booked successfully!");
      setDate("");
      setTime("");
      setDuration(60);
    } catch (error) {
      setMessage("Error booking slot: " + error.message);
    }
  };

  return (
    <div>
      <h2>Book a Charging Slot</h2>
      <form onSubmit={handleBooking}>
        <div>
          <label>Date: </label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label>Time: </label>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
        <div>
          <label>Duration: </label>
          <select value={duration} onChange={(e) => setDuration(e.target.value)}>
            <option value={30}>30 minutes</option>
            <option value={60}>1 hour</option>
            <option value={90}>1.5 hours</option>
            <option value={120}>2 hours</option>
          </select>
        </div>
        <button type="submit">Book Slot</button>
      </form>
      {message && <p>{message}</p>}

      {bookingId && (
        <div>
          <h3>Your Booking QR Code</h3>
          <QRCodeCanvas value={bookingId} size={200} />
          <p>Booking ID: {bookingId}</p>
          <p>Show this QR code at the charging station to authenticate.</p>
        </div>
      )}
    </div>
  );
}

export default SlotBooking;