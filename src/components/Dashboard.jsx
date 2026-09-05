import { useState, useEffect } from "react";
import { database } from "../firebase";
import { ref, onValue } from "firebase/database";

function generateMockReading() {
  return {
    voltage: (220 + Math.random() * 10).toFixed(1),
    current: (2 + Math.random() * 3).toFixed(2),
    power: (500 + Math.random() * 300).toFixed(0),
    energy: (Math.random() * 5).toFixed(2),
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
  const [reading, setReading] = useState(generateMockReading());
  const [totalEnergy, setTotalEnergy] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [stationStatus, setStationStatus] = useState(null);
  const [isOverrun, setIsOverrun] = useState(false);

  // Effect 1: watch station + booking status for occupancy/overrun
  useEffect(() => {
    const stationRef = ref(database, "stations/station1");
    const unsubscribeStation = onValue(stationRef, (snapshot) => {
      const data = snapshot.val();
      setStationStatus(data);

      if (data && data.status === "occupied" && data.currentBookingId) {
        const bookingRef = ref(database, "bookings/" + data.currentBookingId);
        onValue(bookingRef, (bSnap) => {
          const booking = bSnap.val();
          if (booking && booking.sessionExpectedEndAt) {
            const overrun = new Date() > new Date(booking.sessionExpectedEndAt);
            setIsOverrun(overrun);
          }
        });
      } else {
        setIsOverrun(false);
      }
    });

    return () => unsubscribeStation();
  }, []);

  // Effect 2: mock PZEM reading simulation
  useEffect(() => {
    const interval = setInterval(() => {
      const newReading = generateMockReading();
      setReading(newReading);

      const rate = getRate();
      const energyIncrement = parseFloat(newReading.energy) / 100;
      setTotalEnergy((prev) => prev + energyIncrement);
      setTotalCost((prev) => prev + energyIncrement * rate);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const rate = getRate();

  const statCard = (label, value, unit) => (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-semibold text-gray-900 mt-2">
        {value} <span className="text-sm font-normal text-gray-400">{unit}</span>
      </p>
    </div>
  );

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
            <p className="text-lg font-semibold text-gray-900 mt-1">{totalEnergy.toFixed(3)} kWh</p>
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
            <p className="text-lg font-semibold text-gray-900 mt-1">₹{totalCost.toFixed(2)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;