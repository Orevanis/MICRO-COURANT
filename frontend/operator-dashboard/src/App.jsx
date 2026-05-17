import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Meters from './pages/Meters';
import Payments from './pages/Payments';
import GridLoad from './pages/GridLoad';
import Enforcement from './pages/Enforcement';
import Reports from './pages/Reports';
import Login from './pages/Login';

function App() {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/meters" element={<Meters />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/grid-load" element={<GridLoad />} />
        <Route path="/enforcement" element={<Enforcement />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default App;
