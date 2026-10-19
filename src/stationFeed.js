import { database } from "./firebase";
import { ref, onValue, runTransaction } from "firebase/database";
import { createLoadProfile } from "./loadProfile";

const STATION_ID = "station1";

// Tariff in rupees per kWh, by hour of the day
function getRate(date) {
  const hour = date.getHours();
  if (hour >= 22 || hour < 6) return 5;   // off-peak
  if (hour >= 18 && hour < 22) return 12; // peak
  return 8;                               // normal
}

// Writes a reading into the active session about every 2 seconds, like the
// station controller does, and stops as soon as the session is no longer in progress.
export function startStationFeed(uid) {
  let stopped = false;
  let timer = null;
  let sessionId = null;
  let session = null;
  let stopSessionListener = null;
  let startedAt = 0;
  let lastTick = 0;
  let nextReading = createLoadProfile();

  const schedule = () => {
    if (stopped || timer) return;
    let delay = 1900 + Math.random() * 500; // reading interval varies a little
    if (Math.random() < 0.03) delay += 1500; // an occasional slow serial read
    timer = setTimeout(tick, delay);
  };

  const tick = async () => {
    timer = null;
    if (stopped || !sessionId || !session) return;
    if (session.status !== "in-progress" || session.userId !== uid) return;

    const now = Date.now();
    const dtSeconds = Math.min((now - lastTick) / 1000, 120);
    lastTick = now;

    const reading = nextReading((now - startedAt) / 1000);
    const energyStep = (reading.power * dtSeconds) / 3600 / 1000; // kWh since last reading
    const rate = getRate(new Date(now));

    try {
      await runTransaction(ref(database, "sessions/" + sessionId), (current) => {
        // If the session was ended or faulted in the meantime, write nothing
        if (!current || current.status !== "in-progress") return;
        return {
          ...current,
          liveReading: reading,
          totalEnergyKWh: Number(((current.totalEnergyKWh || 0) + energyStep).toFixed(6)),
          totalCost: Number(((current.totalCost || 0) + energyStep * rate).toFixed(6)),
          lastUpdate: new Date(now).toISOString(),
        };
      });
    } catch (err) {
      console.error("Reading update failed:", err);
    }
    schedule();
  };

  // Follow whichever session currently occupies the station
  const stopStationListener = onValue(
    ref(database, "stations/" + STATION_ID + "/currentSessionId"),
    (snapshot) => {
      const id = snapshot.val() || null;
      if (id === sessionId) return;

      if (stopSessionListener) stopSessionListener();
      stopSessionListener = null;
      clearTimeout(timer);
      timer = null;
      session = null;
      sessionId = id;
      if (!id) return;

      nextReading = createLoadProfile();
      stopSessionListener = onValue(ref(database, "sessions/" + id), (snap) => {
        const first = session === null;
        session = snap.val();
        if (first && session && session.status === "in-progress") {
          startedAt = new Date(session.startTime).getTime();
          lastTick = session.lastUpdate ? new Date(session.lastUpdate).getTime() : startedAt;
          schedule();
        }
      });
    }
  );

  return () => {
    stopped = true;
    clearTimeout(timer);
    stopStationListener();
    if (stopSessionListener) stopSessionListener();
  };
}