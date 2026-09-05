import { useState, useEffect } from "react";
import { database, auth } from "../firebase";
import { ref, query, orderByChild, equalTo, onValue } from "firebase/database";

function History() {
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const bookingsRef = ref(database, "bookings");
    const userBookingsQuery = query(bookingsRef, orderByChild("userId"), equalTo(user.uid));

    const unsubscribe = onValue(userBookingsQuery, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const bookingsArray = Object.entries(data).map(([id, value]) => ({ id, ...value }));
        bookingsArray.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setBookings(bookingsArray);
      } else {
        setBookings([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const statusStyles = {
    booked: "bg-blue-50 text-blue-700",
    active: "bg-green-50 text-green-700",
    completed: "bg-gray-100 text-gray-600",
    cancelled: "bg-red-50 text-red-700",
    expired: "bg-red-50 text-red-700",
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Booking History</h2>
        <p className="text-sm text-gray-500">Your past and upcoming charging sessions.</p>
      </div>

      {bookings.length === 0 ? (
        <p className="text-sm text-gray-500 px-6 py-8 text-center">No bookings yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b border-gray-200">
              <th className="px-6 py-3 font-medium">Date</th>
              <th className="px-6 py-3 font-medium">Time</th>
              <th className="px-6 py-3 font-medium">Duration</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {bookings.map((b) => (
              <tr key={b.id}>
                <td className="px-6 py-3 text-gray-900">{b.date}</td>
                <td className="px-6 py-3 text-gray-900">{b.time}</td>
                <td className="px-6 py-3 text-gray-500">{b.durationMinutes} min</td>
                <td className="px-6 py-3">
                  <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${statusStyles[b.status] || "bg-gray-100 text-gray-600"}`}>
                    {b.status}
                  </span>
                </td>
                <td className="px-6 py-3 text-gray-900">{b.totalCost ? `₹${b.totalCost.toFixed(2)}` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default History;