import { useState, useEffect } from "react";
import { auth } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import Login from "./components/Login";
import Signup from "./components/Signup";
import SlotBooking from "./components/SlotBooking";
import Dashboard from "./components/Dashboard";
import History from "./components/History";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSignup, setShowSignup] = useState(false);
  const [activeTab, setActiveTab] = useState("booking");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (loading) return <p>Loading...</p>;

  if (!user) {
    return (
      <div>
        <h1>EV Charging System</h1>
        {showSignup ? (
          <Signup onSignupSuccess={() => setShowSignup(false)} />
        ) : (
          <Login onLoginSuccess={() => {}} onSwitchToSignup={() => setShowSignup(true)} />
        )}
      </div>
    );
  }

  return (
    <div>
      <h1>EV Charging Dashboard</h1>
      <p>Logged in as: {user.email}</p>
      <button onClick={handleLogout}>Sign Out</button>

      <div style={{ marginTop: "20px", marginBottom: "20px" }}>
        <button onClick={() => setActiveTab("booking")}>Book a Slot</button>
        <button onClick={() => setActiveTab("dashboard")}>Live Dashboard</button>
        <button onClick={() => setActiveTab("history")}>History</button>
      </div>

      {activeTab === "booking" && <SlotBooking />}
      {activeTab === "dashboard" && <Dashboard />}
      {activeTab === "history" && <History />}
    </div>
  );
}

export default App;