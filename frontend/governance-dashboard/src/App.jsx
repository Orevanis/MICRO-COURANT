import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Proposals from './pages/Proposals';
import Subsidies from './pages/Subsidies';
import Tariffs from './pages/Tariffs';
import Voting from './pages/Voting';
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
        <Route path="/proposals" element={<Proposals />} />
        <Route path="/subsidies" element={<Subsidies />} />
        <Route path="/tariffs" element={<Tariffs />} />
        <Route path="/voting" element={<Voting />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default App;
