import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";
import { Users, Lock } from "lucide-react";

export default function Login() {
  const [stellarAddress, setStellarAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const mockUser = {
        id: stellarAddress,
        stellar_address: stellarAddress,
        role: "community_member",
        name: "Community Member",
      };

      const mockToken = "mock_governance_token_" + Date.now();

      login(mockUser, mockToken);
      navigate("/");
    } catch (error) {
      console.error("Login failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
            <Users className="text-purple-600" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Micro-Courant</h1>
          <p className="text-gray-600 mt-2">Community Governance Portal</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stellar Address
            </label>
            <input
              type="text"
              value={stellarAddress}
              onChange={(e) => setStellarAddress(e.target.value)}
              placeholder="G..."
              className="input-field"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !stellarAddress}
            className="btn-primary w-full flex items-center justify-center space-x-2 py-3"
          >
            <Lock size={20} />
            <span>{loading ? "Verifying..." : "Sign In with Stellar"}</span>
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Connect with your Stellar wallet to participate in community
            governance.
          </p>
        </div>
      </div>
    </div>
  );
}
