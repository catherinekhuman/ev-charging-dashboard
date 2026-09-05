import { useState, useEffect } from "react";
import { auth } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import Login from "./components/Login";
import Signup from "./components/Signup";
import SlotBooking from "./components/SlotBooking";
import Dashboard from "./components/Dashboard";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSignup, setShowSignup] = useState(false);

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

  if (loading) {
    return <p>Loading...</p>;
  }

  if (!user) {
    return (
      <div>
        <h1>EV Charging System</h1>
        {showSignup ? (
          <Signup onSignupSuccess={() => setShowSignup(false)} />
        ) : (
          <Login
            onLoginSuccess={() => {}}
            onSwitchToSignup={() => setShowSignup(true)}
          />
        )}
      </div>
    );
  }

  return (
    <div>
      <h1>EV Charging Dashboard</h1>
      <p>Logged in as: {user.email}</p>
      <button onClick={handleLogout}>Sign Out</button>
      <SlotBooking />
      <Dashboard />
    </div>
  );
}

export default App;