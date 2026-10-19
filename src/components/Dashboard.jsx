import { useState, useEffect } from "react";
import { database, auth } from "../firebase";
import {
  ref,
  onValue,
  get,
  update,
  query,
  orderByChild,
  equalTo,
} from "firebase/database";

const TARIFF_RATE = 8;
const SIMULATION_INTERVAL_MS = 2000;

function Dashboard() {
  const [sessionId, setSessionId] = useState(null);
  const [session, setSession] = useState(null);
  const [station, setStation] = useState(null);
  const [simEnabled, setSimEnabled] = useState(true);
  const [error, setError] = useState("");
  const [secondsAgo, setSecondsAgo] = useState(null);

  const stationRef = ref(database, "stations/station1");

  // Find the logged-in user's active session.
  useEffect(() => {
    let cancelled = false;

    const findActiveSession = async () => {
      const user = auth.currentUser;

      if (!user) {
        if (!cancelled) {
          setSessionId(null);
          setSession(null);
        }
        return;
      }

      try {
        const sessionsRef = ref(database, "sessions");
        const userQuery = query(
          sessionsRef,
          orderByChild("userId"),
          equalTo(user.uid)
        );

        const snapshot = await get(userQuery);

        if (cancelled) return;

        if (snapshot.exists()) {
          const entry = Object.entries(snapshot.val()).find(
            ([, item]) => item.status === "in-progress"
          );

          setSessionId(entry ? entry[0] : null);
        } else {
          setSessionId(null);
        }
      } catch (err) {
        console.error("Session lookup failed:", err);

        if (!cancelled) {
          setError("Could not load session information.");
        }
      }
    };

    findActiveSession();

    const interval = setInterval(findActiveSession, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Listen to station readings from Firebase.
  useEffect(() => {
    const unsubscribe = onValue(
      stationRef,
      (snapshot) => {
        setStation(snapshot.val());
        setError("");
      },
      (err) => {
        console.error("Station listener failed:", err);
        setError("Cannot read station data. Check Firebase permissions.");
      }
    );

    return unsubscribe;
  }, []);

  // Listen to the active charging session.
  useEffect(() => {
    if (!sessionId) {
      setSession(null);
      return;
    }

    const sessionRef = ref(database, `sessions/${sessionId}`);

    const unsubscribe = onValue(
      sessionRef,
      (snapshot) => setSession(snapshot.val()),
      (err) => {
        console.error("Session listener failed:", err);
        setError("Could not load session details.");
      }
    );

    return unsubscribe;
  }, [sessionId]);

  // Generate fake readings and write them to Firebase.
  // The button starts and stops this effect.
  useEffect(() => {
    if (!simEnabled) return;

    let cancelled = false;
    let energyWh = 0;
    let previousTime = Date.now();

    const generateReading = async () => {
      const now = Date.now();

      const elapsedSeconds = Math.max(
        0,
        (now - previousTime) / 1000
      );

      previousTime = now;

      const voltage = Number((228 + Math.random() * 5).toFixed(1));
      const current = Number((2 + Math.random() * 3).toFixed(2));

      const powerFactor = Number(
        (0.94 + Math.random() * 0.05).toFixed(2)
      );

      const power = Number(
        (voltage * current * powerFactor).toFixed(1)
      );

      // Accumulate energy in Wh.
      energyWh += (power * elapsedSeconds) / 3600;

      const energy = Number(energyWh.toFixed(4));
      const energyUsedKWh = energy / 1000;
      const totalCost = energyUsedKWh * TARIFF_RATE;

      const reading = {
        voltage,
        current,
        power,
        energy,
        frequency: Number(
          (49.8 + Math.random() * 0.4).toFixed(1)
        ),
        powerFactor,
        lastUpdated: new Date().toISOString(),
        simulationMode: true,
        energyUsedKWh: Number(energyUsedKWh.toFixed(6)),
        totalCost: Number(totalCost.toFixed(4)),
      };

      if (cancelled) return;

      try {
        await update(stationRef, reading);

        if (!cancelled) {
          setError("");
        }
      } catch (err) {
        console.error("Simulation write failed:", err);

        if (!cancelled) {
          setError(
            "Could not write simulated readings. Check Firebase write permissions."
          );
        }
      }
    };

    generateReading();

    const interval = setInterval(
      generateReading,
      SIMULATION_INTERVAL_MS
    );

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [simEnabled]);

  // Update the age of the latest reading.
  useEffect(() => {
    const calculateAge = () => {
      const timestamp = station?.lastUpdated
        ? new Date(station.lastUpdated).getTime()
        : NaN;

      setSecondsAgo(
        Number.isFinite(timestamp)
          ? Math.max(
              0,
              Math.floor((Date.now() - timestamp) / 1000)
            )
          : null
      );
    };

    calculateAge();

    const interval = setInterval(calculateAge, 1000);

    return () => clearInterval(interval);
  }, [station?.lastUpdated]);

  const reading = station || {};

  // Convert stored energy from Wh to kWh.
  const energyUsedKWh =
    Number(reading.energyUsedKWh) ||
    (Number(reading.energy) || 0) / 1000;

  // Fixed tariff calculation: energy (kWh) × ₹8/kWh.
  const totalCost = energyUsedKWh * TARIFF_RATE;

  const dataUpdating =
    secondsAgo !== null && secondsAgo <= 10;

  const statCard = (label, value, unit) => (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
        {label}
      </p>

      <p className="text-2xl font-semibold text-gray-900 mt-2">
        {value ?? "--"}{" "}
        <span className="text-sm font-normal text-gray-400">
          {unit}
        </span>
      </p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Live Charging Dashboard
          </h2>

          <p className="text-sm text-gray-500">
            Station 1 — Firebase real-time monitoring
            {secondsAgo !== null
              ? ` — updated ${secondsAgo}s ago`
              : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`text-xs font-medium px-3 py-1.5 rounded-full ${
              dataUpdating
                ? "bg-green-50 text-green-700"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            {dataUpdating ? "Data updating" : "Waiting for data"}
          </span>

          <span className="bg-amber-50 text-amber-800 text-xs font-semibold px-3 py-1.5 rounded-full">
            SIMULATED DATA
          </span>
        </div>
      </div>

      {/* Start / Stop simulation button */}
      <div className="flex justify-end">
        <button
          onClick={() => setSimEnabled((enabled) => !enabled)}
          className={`rounded-lg px-5 py-2 text-sm font-medium text-white ${
            simEnabled
              ? "bg-red-600 hover:bg-red-700"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {simEnabled ? "Stop Simulation" : "Start Simulation"}
        </button>
      </div>

      {/* Errors */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Live readings */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {statCard(
          "Voltage",
          reading.voltage != null
            ? Number(reading.voltage).toFixed(1)
            : "--",
          "V"
        )}

        {statCard(
          "Current",
          reading.current != null
            ? Number(reading.current).toFixed(2)
            : "--",
          "A"
        )}

        {statCard(
          "Power",
          reading.power != null
            ? Number(reading.power).toFixed(1)
            : "--",
          "W"
        )}

        {statCard("Energy", energyUsedKWh.toFixed(4), "kWh")}

        {statCard(
          "Frequency",
          reading.frequency != null
            ? Number(reading.frequency).toFixed(1)
            : "--",
          "Hz"
        )}

        {statCard(
          "Power Factor",
          reading.powerFactor != null
            ? Number(reading.powerFactor).toFixed(2)
            : "--",
          ""
        )}
      </div>

      {/* Session summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          Session Summary
        </h3>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div>
            <p className="text-xs text-gray-500">Session Status</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {session?.status || "Demo Mode"}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-500">Energy Used</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {energyUsedKWh.toFixed(4)} kWh
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-500">Estimated Cost</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              ₹{totalCost.toFixed(4)}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {energyUsedKWh.toFixed(4)} kWh × ₹{TARIFF_RATE}/kWh
            </p>
          </div>
        </div>

        <div className="mt-5 border-t border-gray-100 pt-4 text-sm text-gray-500">
          Tariff: ₹{TARIFF_RATE}/kWh. Estimated cost is calculated
          from energy consumed. These readings are simulated, not
          measured by the physical PZEM sensor, and do not update
          actual session billing.
        </div>
      </div>
    </div>
  );
}

export default Dashboard;