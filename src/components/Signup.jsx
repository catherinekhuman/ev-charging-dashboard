import { useState } from "react";
import { auth, database } from "../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { ref, set } from "firebase/database";

function Signup({ onSignupSuccess }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleRegNumber, setVehicleRegNumber] = useState("");
  const [error, setError] = useState("");

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");

    if (!name || !email || !password) {
      setError("Please fill all required fields.");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const userId = userCredential.user.uid;

      await set(ref(database, "users/" + userId), {
        name: name,
        email: email,
        role: "client",
        vehicleModel: vehicleModel,
        vehicleRegNumber: vehicleRegNumber,
        createdAt: new Date().toISOString()
      });

      onSignupSuccess();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <h2>Create Account</h2>
      <form onSubmit={handleSignup}>
        <div>
          <label>Full Name: </label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label>Email: </label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label>Password: </label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div>
          <label>Vehicle Model: </label>
          <input type="text" value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} />
        </div>
        <div>
          <label>Vehicle Registration Number: </label>
          <input type="text" value={vehicleRegNumber} onChange={(e) => setVehicleRegNumber(e.target.value)} />
        </div>
        <button type="submit">Sign Up</button>
      </form>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}

export default Signup;