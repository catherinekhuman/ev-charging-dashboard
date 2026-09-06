import { useState, useEffect } from "react";
import { database } from "../firebase";
import { ref, onValue } from "firebase/database";

function StaffDashboard() {
  const [bookings, setBookings] = useState([]);
  const [station, setStation] = useState(null);
  const [faultLogs, setFaultLogs] = useState([]);

  useEffect(() => {
    const bookingsRef = ref(database, "bookings");
    const unsubBookings = onValue(bookingsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const arr = Object.entries(data).map(([id, value]) => ({ id, ...value }));
        arr.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setBookings(arr);
      } else {
        setBookings([]);
      }
    });

    const stationRef = ref(database, "stations/station1");
    const unsubStation = onValue(stationRef, (snapshot) => {
      setStation(snapshot.val());
    });

    const faultRef = ref(database, "faultLogs");
    const unsubFaults = onValue(faultRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const arr = Object.entries(data).map(([id, value]) => ({ id, ...value }));
        arr.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setFaultLogs(arr);
      } else {
        setFaultLogs([]);
      }
    });

    return () => {
      unsubBookings();
      unsubStation();
      unsubFaults();
    };
  }, []);

  const statusStyles = {
    booked: "bg-blue-50 text-blue-700",
    active: "bg-green-50 text-green-700",
    completed: "bg-gray-100 text-gray-600",
    cancelled: "bg-red-50 text-red-700",
    expired: "bg-red-50 text-red-700",
  };

  const activeCount = bookings.filter((b) => b.status === "active").length;
  const bookedCount = bookings.filter((b) => b.status === "booked").length;
  const completedCount = bookings.filter((b) => b.status === "completed").length;
  const totalRevenue = bookings.reduce((sum, b) => sum + (b.totalCost || 0), 0);

  const statCard = (label, value) => (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-semibold text-gray-900 mt-2">{value}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Station Overview</h2>
        <p className="text-sm text-gray-500">System-wide bookings, sessions, and station status.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Station 1 Status</p>
          <p className="text-lg font-semibold text-gray-900 mt-1 capitalize">
            {station ? station.status : "available"}
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ${
            station && station.status === "occupied" ? "bg-amber-50 text-amber-700" : "bg-green-50 text-green-700"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${station && station.status === "occupied" ? "bg-amber-500" : "bg-green-500"}`}></span>
          {station && station.status === "occupied" ? "In Use" : "Available"}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCard("Active Sessions", activeCount)}
        {statCard("Upcoming Bookings", bookedCount)}
        {statCard("Completed Sessions", completedCount)}
        {statCard("Total Revenue", `₹${totalRevenue.toFixed(2)}`)}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Fault Logs</h3>
          {faultLogs.length > 0 && (
            <span className="bg-red-50 text-red-700 text-xs font-medium px-2.5 py-1 rounded-full">
              {faultLogs.length} incident{faultLogs.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        {faultLogs.length === 0 ? (
          <p className="text-sm text-gray-500 px-6 py-6 text-center">No faults recorded.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {faultLogs.map((log) => (
              <div key={log.id} className="px-6 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-900">{log.reason}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Station: {log.stationId} · {new Date(log.timestamp).toLocaleString()}
                  </p>
                </div>
                <span className="bg-red-50 text-red-700 text-xs font-medium px-2.5 py-1 rounded-full">
                  Fault
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">All Bookings</h3>
        </div>
        {bookings.length === 0 ? (
          <p className="text-sm text-gray-500 px-6 py-8 text-center">No bookings yet.</p>
        ) : (
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b border-gray-200">
                  <th className="px-6 py-3 font-medium">User</th>
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
                    <td className="px-6 py-3 text-gray-900">{b.userEmail}</td>
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
          </div>
        )}
      </div>
    </div>
  );
}

export default StaffDashboard;