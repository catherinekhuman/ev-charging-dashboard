import { useState, useEffect } from "react";

// Mock data generator - simulates what PZEM-004T will eventually send
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
  if (hour >= 22 || hour < 6) return 5;   // Off-peak
  if (hour >= 18 && hour < 22) return 12; // Peak
  return 8;                                // Normal
}

function Dashboard() {
  const [reading, setReading] = useState(generateMockReading());
  const [totalEnergy, setTotalEnergy] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [status, setStatus] = useState("Charging Active");

  useEffect(() => {
    const interval = setInterval(() => {
      const newReading = generateMockReading();
      setReading(newReading);

      const rate = getRate();
      const energyIncrement = parseFloat(newReading.energy) / 100; // small increment per tick
      setTotalEnergy((prev) => prev + energyIncrement);
      setTotalCost((prev) => prev + energyIncrement * rate);
    }, 2000); // updates every 2 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ border: "1px solid #ccc", padding: "20px", marginTop: "30px" }}>
      <h2>Live Charging Dashboard</h2>
      <p><strong>Status:</strong> {status}</p>

      <h3>Live Readings</h3>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <tbody>
          <tr>
            <td style={{ padding: "8px", border: "1px solid #ddd" }}>Voltage</td>
            <td style={{ padding: "8px", border: "1px solid #ddd" }}>{reading.voltage} V</td>
          </tr>
          <tr>
            <td style={{ padding: "8px", border: "1px solid #ddd" }}>Current</td>
            <td style={{ padding: "8px", border: "1px solid #ddd" }}>{reading.current} A</td>
          </tr>
          <tr>
            <td style={{ padding: "8px", border: "1px solid #ddd" }}>Power</td>
            <td style={{ padding: "8px", border: "1px solid #ddd" }}>{reading.power} W</td>
          </tr>
        </tbody>
      </table>

      <h3>Session Summary</h3>
      <p><strong>Total Energy Used:</strong> {totalEnergy.toFixed(3)} kWh</p>
      <p><strong>Current Tariff Rate:</strong> ₹{getRate()}/kWh ({getRate() === 5 ? "Off-Peak" : getRate() === 12 ? "Peak" : "Normal"})</p>
      <p><strong>Estimated Cost:</strong> ₹{totalCost.toFixed(2)}</p>
    </div>
  );
}

export default Dashboard;