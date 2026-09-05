import { useState, useEffect } from "react";
import { database, auth } from "../firebase";
import { ref, query, orderByChild, equalTo, onValue } from "firebase/database";

function History() {
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const bookingsRef = ref(database, "bookings");
    const userBookingsQuery = query(
      bookingsRef,
      orderByChild("userId"),
      equalTo(user.uid)
    );

    const unsubscribe = onValue(userBookingsQuery, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const bookingsArray = Object.entries(data).map(([id, value]) => ({
          id,
          ...value
        }));
        // Sort newest first
        bookingsArray.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setBookings(bookingsArray);
      } else {
        setBookings([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case "booked": return "#2563eb";
      case "active": return "#16a34a";
      case "completed": return "#6b7280";
      case "cancelled":
      case "expired": return "#dc2626";
      default: return "#000";
    }
  };

  return (
    <div>
      <h2>Booking History</h2>
      {bookings.length === 0 ? (
        <p>No bookings yet.</p>
      ) : (
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th style={{ border: "1px solid #ddd", padding: "8px" }}>Date</th>
              <th style={{ border: "1px solid #ddd", padding: "8px" }}>Time</th>
              <th style={{ border: "1px solid #ddd", padding: "8px" }}>Duration</th>
              <th style={{ border: "1px solid #ddd", padding: "8px" }}>Status</th>
              <th style={{ border: "1px solid #ddd", padding: "8px" }}>Cost</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id}>
                <td style={{ border: "1px solid #ddd", padding: "8px" }}>{b.date}</td>
                <td style={{ border: "1px solid #ddd", padding: "8px" }}>{b.time}</td>
                <td style={{ border: "1px solid #ddd", padding: "8px" }}>{b.durationMinutes} min</td>
                <td style={{ border: "1px solid #ddd", padding: "8px", color: getStatusColor(b.status), fontWeight: "bold" }}>
                  {b.status}
                </td>
                <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                  {b.totalCost ? `₹${b.totalCost.toFixed(2)}` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default History;