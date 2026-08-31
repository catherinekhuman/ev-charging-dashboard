import { useState } from "react";
import { database } from "../firebase";
import { ref, push } from "firebase/database";

function SlotBooking() {
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [message, setMessage] = useState("");

  const handleBooking = async (e) => {
    e.preventDefault();

    if (!name || !date || !time) {
      setMessage("Please fill all fields.");
      return;
    }

    try {
      const bookingsRef = ref(database, "bookings");
      await push(bookingsRef, {
        userName: name,
        date: date,
        time: time,
        status: "booked",
        createdAt: new Date().toISOString()
      });

      setMessage("Slot booked successfully!");
      setName("");
      setDate("");
      setTime("");
    } catch (error) {
      setMessage("Error booking slot: " + error.message);
    }
  };

  return (
    <div>
      <h2>Book a Charging Slot</h2>
      <form onSubmit={handleBooking}>
        <div>
          <label>Name: </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label>Date: </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div>
          <label>Time: </label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>
        <button type="submit">Book Slot</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
}

export default SlotBooking;