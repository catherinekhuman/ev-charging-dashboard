import { useState, useEffect } from "react";
import { database, auth } from "../firebase";
import { ref, query, orderByChild, equalTo, onValue, update } from "firebase/database";

function Payment() {
  const [pendingBookings, setPendingBookings] = useState([]);
  const [processingId, setProcessingId] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const bookingsRef = ref(database, "bookings");
    const userQuery = query(bookingsRef, orderByChild("userId"), equalTo(user.uid));

    const unsubscribe = onValue(userQuery, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const arr = Object.entries(data)
          .map(([id, value]) => ({ id, ...value }))
          .filter((b) => b.status === "completed" && b.paymentStatus === "pending");
        setPendingBookings(arr);
      } else {
        setPendingBookings([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const handlePay = async (bookingId) => {
    setProcessingId(bookingId);
    setMessage(null);

    setTimeout(async () => {
      try {
        const fakeTransactionId = "TXN" + Date.now();
        await update(ref(database, "bookings/" + bookingId), {
          paymentStatus: "paid",
          transactionId: fakeTransactionId,
          paidAt: new Date().toISOString()
        });
        setMessage({ type: "success", text: "Payment successful." });
      } catch (error) {
        setMessage({ type: "error", text: "Payment failed: " + error.message });
      }
      setProcessingId(null);
    }, 1200);
  };

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Payments</h2>
        <p className="text-sm text-gray-500">Outstanding charges from completed sessions.</p>
      </div>

      {message && (
        <p className={`text-sm ${message.type === "error" ? "text-red-600" : "text-green-600"}`}>
          {message.text}
        </p>
      )}

      {pendingBookings.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <p className="text-sm text-gray-500">No pending payments.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingBookings.map((b) => (
            <div key={b.id} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Session — {b.date} at {b.time}
                  </p>
                  <p className="text-xs text-gray-500">Duration: {b.durationMinutes} min</p>
                </div>
                <p className="text-lg font-semibold text-gray-900">₹{(b.totalCost || 0).toFixed(2)}</p>
              </div>
              <button
                onClick={() => handlePay(b.id)}
                disabled={processingId === b.id}
                className="w-full bg-blue-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-blue-700 transition disabled:opacity-60"
              >
                {processingId === b.id ? "Processing..." : "Pay Now"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Payment;