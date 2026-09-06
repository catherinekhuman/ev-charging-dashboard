import { useState, useEffect } from "react";
import { database, auth } from "../firebase";
import { ref, query, orderByChild, equalTo, onValue, update } from "firebase/database";
import { QRCodeCanvas } from "qrcode.react";

function History() {
  const [bookings, setBookings] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [message, setMessage] = useState(null);

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

  const toggleQR = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleCancel = async (id) => {
    setMessage(null);
    try {
      await update(ref(database, "bookings/" + id), {
        status: "cancelled",
        cancelledAt: new Date().toISOString()
      });
      setMessage({ type: "success", text: "Booking cancelled." });
    } catch (error) {
      setMessage({ type: "error", text: "Error cancelling booking: " + error.message });
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Booking History</h2>
        <p className="text-sm text-gray-500">Your past and upcoming charging sessions.</p>
      </div>

      {message && (
        <p className={`text-sm px-6 pt-4 ${message.type === "error" ? "text-red-600" : "text-green-600"}`}>
          {message.text}
        </p>
      )}

      {bookings.length === 0 ? (
        <p className="text-sm text-gray-500 px-6 py-8 text-center">No bookings yet.</p>
      ) : (
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b border-gray-200">
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Time</th>
                <th className="px-6 py-3 font-medium">Duration</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Cost</th>
                <th className="px-6 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bookings.map((b) => (
                <>
                  <tr key={b.id}>
                    <td className="px-6 py-3 text-gray-900">{b.date}</td>
                    <td className="px-6 py-3 text-gray-900">{b.time}</td>
                    <td className="px-6 py-3 text-gray-500">{b.durationMinutes} min</td>
                    <td className="px-6 py-3">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${statusStyles[b.status] || "bg-gray-100 text-gray-600"}`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-900">
                      {b.totalCost ? `₹${b.totalCost.toFixed(2)}` : "—"}
                      {b.paymentStatus === "paid" && (
                        <span className="ml-2 text-xs text-green-600 font-medium">Paid</span>
                      )}
                      {b.paymentStatus === "pending" && (
                        <span className="ml-2 text-xs text-amber-600 font-medium">Unpaid</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-right whitespace-nowrap">
                      {b.status === "booked" && (
                        <div className="flex gap-3 justify-end">
                          <button
                            onClick={() => toggleQR(b.id)}
                            className="text-blue-600 text-xs font-medium hover:underline"
                          >
                            {expandedId === b.id ? "Hide QR" : "Show QR"}
                          </button>
                          <button
                            onClick={() => handleCancel(b.id)}
                            className="text-red-600 text-xs font-medium hover:underline"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                  {expandedId === b.id && (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 bg-gray-50">
                        <div className="flex flex-col items-center">
                          <div className="p-3 bg-white border border-gray-200 rounded-lg">
                            <QRCodeCanvas value={b.id} size={160} />
                          </div>
                          <p className="text-xs text-gray-400 mt-3">Booking ID: {b.id}</p>
                          <p className="text-xs text-gray-500 mt-1">Show this QR code at the charging station to authenticate.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default History;