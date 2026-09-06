import { useState, useEffect } from "react";
import { database, auth } from "../firebase";
import { ref, get, update } from "firebase/database";
import { updatePassword } from "firebase/auth";

function Profile() {
  const [profile, setProfile] = useState(null);
  const [name, setName] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleRegNumber, setVehicleRegNumber] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      const user = auth.currentUser;
      const snapshot = await get(ref(database, "users/" + user.uid));
      if (snapshot.exists()) {
        const data = snapshot.val();
        setProfile(data);
        setName(data.name || "");
        setVehicleModel(data.vehicleModel || "");
        setVehicleRegNumber(data.vehicleRegNumber || "");
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setMessage(null);
    try {
      const user = auth.currentUser;
      await update(ref(database, "users/" + user.uid), {
        name,
        vehicleModel,
        vehicleRegNumber
      });
      setMessage({ type: "success", text: "Profile updated successfully." });
    } catch (error) {
      setMessage({ type: "error", text: "Error updating profile: " + error.message });
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword.length < 6) {
      setMessage({ type: "error", text: "Password must be at least 6 characters." });
      return;
    }

    try {
      const user = auth.currentUser;
      await updatePassword(user, newPassword);
      setMessage({ type: "success", text: "Password updated successfully." });
      setNewPassword("");
    } catch (error) {
      setMessage({
        type: "error",
        text: "Could not update password. You may need to sign in again before changing it."
      });
    }
  };

  const inputClass =
    "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  if (loading) return <p className="text-sm text-gray-500">Loading profile...</p>;

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">My Profile</h2>
        <p className="text-sm text-gray-500">Manage your account and vehicle details.</p>
      </div>

      {message && (
        <p className={`text-sm ${message.type === "error" ? "text-red-600" : "text-green-600"}`}>
          {message.text}
        </p>
      )}

      {/* Account info card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Account Details</h3>
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div>
            <label className={labelClass}>Email</label>
            <input
              type="email"
              value={profile.email}
              disabled
              className={inputClass + " bg-gray-50 text-gray-400 cursor-not-allowed"}
            />
          </div>
          <div>
            <label className={labelClass}>Full Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Vehicle Model</label>
              <input
                type="text"
                value={vehicleModel}
                onChange={(e) => setVehicleModel(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Reg. Number</label>
              <input
                type="text"
                value={vehicleRegNumber}
                onChange={(e) => setVehicleRegNumber(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <button
            type="submit"
            className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Save Changes
          </button>
        </form>
      </div>

      {/* Password change card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Change Password</h3>
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div>
            <label className={labelClass}>New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputClass}
              placeholder="At least 6 characters"
            />
          </div>
          <button
            type="submit"
            className="bg-gray-100 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-200 transition"
          >
            Update Password
          </button>
        </form>
      </div>

      {/* Account meta */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Account Info</h3>
        <p className="text-xs text-gray-500">
          Member since {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "—"}
        </p>
      </div>
    </div>
  );
}

export default Profile;