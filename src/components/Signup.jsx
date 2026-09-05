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
        name,
        email,
        role: "client",
        vehicleModel,
        vehicleRegNumber,
        createdAt: new Date().toISOString()
      });

      onSignupSuccess();
    } catch (err) {
      setError(err.message);
    }
  };

  const inputClass =
    "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Create your account</h2>
      <p className="text-sm text-gray-500 mb-6">Set up your profile to start booking charging slots.</p>

      <form onSubmit={handleSignup} className="space-y-4">
        <div>
          <label className={labelClass}>Full Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Vehicle Model</label>
            <input type="text" value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Reg. Number</label>
            <input type="text" value={vehicleRegNumber} onChange={(e) => setVehicleRegNumber(e.target.value)} className={inputClass} />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          className="w-full bg-blue-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-blue-700 transition"
        >
          Create Account
        </button>
      </form>
    </div>
  );
}

export default Signup;