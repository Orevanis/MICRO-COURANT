import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Wallet, Sparkles } from 'lucide-react';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const handleConnectWallet = async () => {
    setLoading(true);
    
    try {
      // In a real implementation, this would connect to Freighter wallet
      // For now, we'll simulate the connection
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockUser = {
        id: 'GB7TAYUQKJ7L5T7M6F5N4R3E2W1Q0A9S8D7F6G5H4',
        stellar_address: 'GB7TAYUQKJ7L5T7M6F5N4R3E2W1Q0A9S8D7F6G5H4',
        role: 'household'
      };
      
      const mockToken = 'mock_jwt_token_' + Date.now();
      
      login(mockUser, mockToken);
      navigate('/');
    } catch (error) {
      console.error('Wallet connection failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
            <Sparkles className="text-primary-600" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Micro-Courant</h1>
          <p className="text-gray-600 mt-2">Household Energy Management</p>
        </div>

        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-lg font-semibold mb-2">Connect Your Wallet</h2>
            <p className="text-sm text-gray-600">
              Connect your Stellar wallet to access your energy account
            </p>
          </div>

          <button
            onClick={handleConnectWallet}
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center space-x-2 py-3"
          >
            <Wallet size={24} />
            <span>{loading ? 'Connecting...' : 'Connect Freighter Wallet'}</span>
          </button>

          <div className="text-center">
            <p className="text-xs text-gray-500 mb-2">Don't have a wallet?</p>
            <a 
              href="https://freighter.app" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              Get Freighter Wallet →
            </a>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t">
          <div className="text-xs text-gray-500 space-y-2">
            <p>• Secure blockchain-based energy management</p>
            <p>• Real-time usage tracking</p>
            <p>• Transparent billing on Stellar</p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-400">
            By connecting, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
