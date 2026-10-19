import { useState, useEffect } from "react";
import { database, auth } from "../firebase";
import { ref, onValue, get, query, orderByChild, equalTo } from "firebase/database";

function getRate() {
  const hour = new Date().getHours();
  if (hour >= 22 || hour < 6) return 5;
  if (hour >= 18 && hour < 22) return 12;
  return 8;
}

function getRateLabel(rate) {
  if (rate === 5) return "Off-Peak";
  if (rate === 12) return "Peak";
  return "Normal";
}

function Dashboard() {
  const [sessionId, setSessionId] = useState(null);
  const [session, setSession] = useState(null);
  const [isOverrun, setIsOverrun] = useState(false);
  const [noActiveSession, setNoActiveSession] = useState(false);
  const [secondsAgo, setSecondsAgo] = useState(null);

  // Find the logged-in user's active session
  useEffect(() => {
    const findActiveSession = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const sessionsRef = ref(database, "sessions");
      const userQuery = query(sessionsRef, orderByChild("userId"), equalTo(user.uid));
      const snapshot = await get(userQuery);

      if (snapshot.exists()) {
        const entry = Object.entries(snapshot.val()).find(([, s]) => s.status === "in-progress");
        if (entry) {
          setSessionId(entry[0]);
          setNoActiveSession(false);
          return;
        }
      }
      setNoActiveSession(true);
    };

    findActiveSession();
    const interval = setInterval(findActiveSession, 3000);
    return () => clearInterval(interval);
  }, []);

  // Listen to that session's live data (written by the station controller)
  useEffect(() => {
    if (!sessionId) return;
    const sessionRef = ref(database, "sessions/" + sessionId);
    const unsubscribe = onValue(sessionRef, (snapshot) => {
      const data = snapshot.val();
      setSession(data);
      if (data && data.expectedEndTime) {
        setIsOverrun(new Date() > new Date(data.expectedEndTime) && data.status === "in-progress");
      }
    });
    return () => unsubscribe();
  }, [sessionId]);

  // Track how old the latest sensor reading is
  useEffect(() => {
    const timer = setInterval(() => {
      if (session && session.lastUpdate) {
        const age = (Date.now() - new Date(session.lastUpdate).getTime()) / 1000;
        setSecondsAgo(Math.max(0, Math.round(age)));
      } else {
        setSecondsAgo(null);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [session]);

  const rate = getRate();

  const statCard = (label, value, unit) => (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-semibold text-gray-900 mt-2">
        {value} <span className="text-sm font-normal text-gray-400">{unit}</span>
      </p>
    </div>
  );

  if (noActiveSession) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
        <p className="text-sm text-gray-500">No active charging session right now.</p>
        <p className="text-xs text-gray-400 mt-1">
          Book a slot and scan your QR code at the station to start a session.
        </p>
      </div>
    );
  }

  if (!session) {
    return <p className="text-sm text-gray-500">Loading session data...</p>;
  }

  const reading = session.liveReading || { voltage: 0, current: 0, power: 0 };

  let sensorLabel = "Waiting for sensor";
  let sensorStyle = "bg-gray-100 text-gray-600";
  if (secondsAgo !== null) {
    if (secondsAgo <= 10) {
      sensorLabel = "Sensor live";
      sensorStyle = "bg-green-50 text-green-700";
    } else {
      sensorLabel = "Sensor offline";
      sensorStyle = "bg-amber-50 text-amber-700";
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Live Charging Dashboard</h2>
          <p className="text-sm text-gray-500">
            Station 1 — real-time monitoring
            {secondsAgo !== null && ` — last reading ${secondsAgo}s ago`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium px-3 py-1.5 rounded-full ${sensorStyle}`}>{sensorLabel}</span>
          <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 text-xs font-medium px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
            Charging Active
          </span>
        </div>
      </div>

      {isOverrun && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-lg">
          This session has exceeded its expected charging duration. Station may need manual review.
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {statCard("Voltage", reading.voltage, "V")}
        {statCard("Current", reading.current, "A")}
        {statCard("Power", reading.power, "W")}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Session Summary</h3>
        <div className="grid grid-cols-3 gap-6">
          <div>
            <p className="text-xs text-gray-500">Energy Used</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">
              {(session.totalEnergyKWh || 0).toFixed(4)} kWh
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Tariff Rate</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">
              ₹{rate}/kWh
              <span className="text-xs font-normal text-gray-400 ml-1">({getRateLabel(rate)})</span>
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Estimated Cost</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">₹{(session.totalCost || 0).toFixed(3)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;