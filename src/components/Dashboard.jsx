import { useState, useEffect } from "react";
import { database, auth } from "../firebase";
import { ref, onValue, update, get, query, orderByChild, equalTo } from "firebase/database";

function generateMockReading() {
  return {
    voltage: parseFloat((220 + Math.random() * 10).toFixed(1)),
    current: parseFloat((2 + Math.random() * 3).toFixed(2)),
    power: parseFloat((500 + Math.random() * 300).toFixed(0)),
  };
}

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

  // Find the logged-in user's active session
  useEffect(() => {
    const findActiveSession = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const sessionsRef = ref(database, "sessions");
      const activeQuery = query(sessionsRef, orderByChild("userId"), equalTo(user.uid));
      const snapshot = await get(activeQuery);

      if (snapshot.exists()) {
        const data = snapshot.val();
        const activeEntry = Object.entries(data).find(([id, s]) => s.status === "in-progress");
        if (activeEntry) {
          setSessionId(activeEntry[0]);
          setNoActiveSession(false);
          return;
        }
      }
      setNoActiveSession(true);
    };

    findActiveSession();
    const interval = setInterval(findActiveSession, 3000); // re-check periodically in case a new session starts
    return () => clearInterval(interval);
  }, []);

  // Listen to the session's live data
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

  // Simulate PZEM readings being written into the active session every 2 seconds
  useEffect(() => {
    if (!sessionId || !session || session.status !== "in-progress") return;

    const interval = setInterval(async () => {
      const reading = generateMockReading();
      const rate = getRate();

      const energyIncrement = reading.power / 1000 / 1800; // rough kWh increment per 2-second tick
      const newTotalEnergy = (session.totalEnergyKWh || 0) + energyIncrement;
      const newTotalCost = (session.totalCost || 0) + energyIncrement * rate;

      await update(ref(database, "sessions/" + sessionId), {
        liveReading: reading,
        totalEnergyKWh: newTotalEnergy,
        totalCost: newTotalCost
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [sessionId, session]);

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
          Book a slot and verify your QR code at the station to start a session.
        </p>
      </div>
    );
  }

  if (!session) {
    return <p className="text-sm text-gray-500">Loading session data...</p>;
  }

  const reading = session.liveReading || { voltage: 0, current: 0, power: 0 };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Live Charging Dashboard</h2>
          <p className="text-sm text-gray-500">Station 1 — real-time monitoring</p>
        </div>
        <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 text-xs font-medium px-3 py-1.5 rounded-full">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
          Charging Active
        </span>
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
              {(session.totalEnergyKWh || 0).toFixed(3)} kWh
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
            <p className="text-lg font-semibold text-gray-900 mt-1">₹{(session.totalCost || 0).toFixed(2)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;