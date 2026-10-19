import { useState, useEffect } from "react";
import { auth, database } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { ref, get } from "firebase/database";
import Login from "./components/Login";
import Signup from "./components/Signup";
import SlotBooking from "./components/SlotBooking";
import Dashboard from "./components/Dashboard";
import History from "./components/History";
import VerifyBooking from "./components/VerifyBooking";
import StaffDashboard from "./components/StaffDashboard";
import { checkAndExpireBookings } from "./expiryCheck";
import Profile from "./components/Profile";
import Payment from "./components/Payment";
import { startStationFeed } from "./stationFeed";

function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSignup, setShowSignup] = useState(false);
  const [activeTab, setActiveTab] = useState("booking");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        checkAndExpireBookings();
        const userSnap = await get(ref(database, "users/" + currentUser.uid));
        if (userSnap.exists()) {
          setRole(userSnap.val().role || "client");
        }
      } else {
        setRole(null);
      }

      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (role === "staff") {
      setActiveTab("staff");
    } else if (role === "client") {
      setActiveTab("booking");
    }
  }, [role]);

  useEffect(() => {
    if (!user || role !== "client") return;
    const stop = startStationFeed(user.uid);
    return () => stop();
  }, [user, role]);

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-bold text-center text-gray-900 mb-6">
            EV Charging System
          </h1>
          <div className="bg-white rounded-xl shadow-md p-6">
            {showSignup ? (
              <Signup onSignupSuccess={() => setShowSignup(false)} />
            ) : (
              <Login onLoginSuccess={() => {}} onSwitchToSignup={() => setShowSignup(true)} />
            )}
          </div>
        </div>
      </div>
    );
  }

  const clientTabs = [
    { id: "booking", label: "Book a Slot" },
    { id: "dashboard", label: "Live Dashboard" },
    { id: "history", label: "History" },
    { id: "verify", label: "Verify Booking" },
    { id: "payment", label: "Payments" },
    { id: "profile", label: "Profile" },
  ];

  const staffTabs = [
    { id: "staff", label: "Overview" },
  ];

  const tabs = role === "staff" ? staffTabs : clientTabs;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">
          EV Charging {role === "staff" ? " (Staff Portal)" : "Dashboard"}
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{user.email}</span>
          <button
            onClick={handleLogout}
            className="text-sm font-medium text-red-600 hover:text-red-700 transition"
          >
            Sign Out
          </button>
        </div>
      </header>

      <nav className="bg-white border-b border-gray-200 px-6">
        <div className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 text-sm font-medium border-b-2 transition ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {role === "staff" ? (
          activeTab === "staff" && <StaffDashboard />
        ) : (
          <>
            {activeTab === "booking" && <SlotBooking />}
            {activeTab === "dashboard" && <Dashboard />}
            {activeTab === "history" && <History />}
            {activeTab === "verify" && <VerifyBooking />}
            {activeTab === "payment" && <Payment />}
            {activeTab === "profile" && <Profile />}
          </>
        )}
      </main>
    </div>
  );
}

export default App;