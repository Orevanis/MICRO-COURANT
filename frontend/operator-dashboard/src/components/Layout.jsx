import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Zap, 
  DollarSign, 
  Activity, 
  Shield, 
  FileText,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '../stores/authStore';

export default function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Meters', href: '/meters', icon: Zap },
    { name: 'Payments', href: '/payments', icon: DollarSign },
    { name: 'Grid Load', href: '/grid-load', icon: Activity },
    { name: 'Enforcement', href: '/enforcement', icon: Shield },
    { name: 'Reports', href: '/reports', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile header */}
      <header className="bg-white shadow-sm lg:hidden">
        <div className="px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-blue-600">Micro-Courant Operator</h1>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-b">
          <nav className="px-4 py-2 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg ${
                    location.pathname === item.href
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon size={20} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-64 bg-white shadow-sm min-h-screen">
          <div className="p-6">
            <h1 className="text-2xl font-bold text-blue-600">Micro-Courant</h1>
            <p className="text-sm text-gray-500 mt-1">Operator Portal</p>
          </div>
          
          <nav className="px-4 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                    location.pathname === item.href
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon size={20} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="absolute bottom-0 left-0 w-64 p-4 border-t">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <p className="font-medium text-gray-900">{user?.name || 'Operator'}</p>
                <p className="text-gray-500">{user?.role || 'Grid Operator'}</p>
              </div>
              <button
                onClick={logout}
                className="text-sm text-red-600 hover:text-red-700"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
