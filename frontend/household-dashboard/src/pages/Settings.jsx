import {
  Settings as SettingsIcon,
  User,
  Bell,
  Shield,
  LogOut,
} from "lucide-react";
import { useAuthStore } from "../stores/authStore";

export default function Settings() {
  const { user, logout } = useAuthStore();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your account preferences</p>
      </div>

      {/* Profile section */}
      <div className="card">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
            <User className="text-primary-600" size={32} />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Household Account</h3>
            <p className="text-sm text-gray-600">{user?.stellar_address}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Display Name
            </label>
            <input
              type="text"
              defaultValue="My Household"
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number (for SMS alerts)
            </label>
            <input
              type="tel"
              placeholder="+1 234 567 8900"
              className="input-field"
            />
          </div>
        </div>
      </div>

      {/* Notification settings */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-4">
          <Bell className="text-gray-600" size={24} />
          <h3 className="font-semibold">Notifications</h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Push Notifications</p>
              <p className="text-sm text-gray-600">Receive alerts in the app</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Email Notifications</p>
              <p className="text-sm text-gray-600">Receive alerts via email</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Low Bandwidth Mode</p>
              <p className="text-sm text-gray-600">
                Reduce data usage for slow connections
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Security settings */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-4">
          <Shield className="text-gray-600" size={24} />
          <h3 className="font-semibold">Security</h3>
        </div>

        <div className="space-y-4">
          <button className="btn-secondary w-full">Change Wallet</button>
          <button className="btn-secondary w-full">
            View Connected Devices
          </button>
          <button className="btn-secondary w-full">
            Download Account Data
          </button>
        </div>
      </div>

      {/* App settings */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-4">
          <SettingsIcon className="text-gray-600" size={24} />
          <h3 className="font-semibold">App Settings</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Language
            </label>
            <select className="input-field">
              <option>English</option>
              <option>Spanish</option>
              <option>French</option>
              <option>Swahili</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Currency Display
            </label>
            <select className="input-field">
              <option>XLM (Stellar)</option>
              <option>USD (US Dollar)</option>
              <option>EUR (Euro)</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Dark Mode</p>
              <p className="text-sm text-gray-600">Switch to dark theme</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Logout */}
      <div className="card border-red-200">
        <button
          onClick={logout}
          className="w-full flex items-center justify-center space-x-2 text-red-600 hover:text-red-700 font-medium py-2"
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>

      {/* App info */}
      <div className="text-center text-sm text-gray-500">
        <p>Micro-Courant Household Dashboard v1.0.0</p>
        <p>Built with Stellar & Soroban</p>
      </div>
    </div>
  );
}
