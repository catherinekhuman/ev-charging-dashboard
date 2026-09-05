import { database } from "./firebase";
import { ref, get, update } from "firebase/database";

// Checks all "booked" bookings and marks overdue ones as "expired"
export async function checkAndExpireBookings() {
  const bookingsRef = ref(database, "bookings");
  const snapshot = await get(bookingsRef);

  if (!snapshot.exists()) return;

  const bookings = snapshot.val();
  const now = new Date();

  for (const id in bookings) {
    const booking = bookings[id];

    if (booking.status === "booked") {
      const bookingDateTime = new Date(`${booking.date}T${booking.time}`);
      // Grace period: 15 minutes past booked time
      const graceMs = 15 * 60 * 1000;

      if (now.getTime() > bookingDateTime.getTime() + graceMs) {
        await update(ref(database, `bookings/${id}`), {
          status: "expired"
        });
      }
    }
  }
}