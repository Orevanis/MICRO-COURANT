import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./stores/authStore";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Usage from "./pages/Usage";
import Balance from "./pages/Balance";
import Recharge from "./pages/Recharge";
import Alerts from "./pages/Alerts";
import Settings from "./pages/Settings";
import Login from "./pages/Login";

function App() {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/usage" element={<Usage />} />
        <Route path="/balance" element={<Balance />} />
        <Route path="/recharge" element={<Recharge />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default App;
