import apiClient from './client';

export const energyApi = {
  // Get household balance
  getBalance: async (householdId) => {
    const response = await apiClient.get(`/api/v1/billing/balance/${householdId}`);
    return response.data;
  },

  // Get usage history
  getUsageHistory: async (meterId, limit = 100) => {
    const response = await apiClient.get(`/api/v1/telemetry/meter/${meterId}/stats`);
    return response.data;
  },

  // Get current tariff rate
  getTariffRate: async () => {
    const response = await apiClient.get('/api/v1/billing/tariff');
    return response.data;
  },

  // Submit meter reading
  submitReading: async (reading) => {
    const response = await apiClient.post('/api/v1/telemetry/ingest', reading);
    return response.data;
  },

  // Recharge balance
  rechargeBalance: async (householdId, amount) => {
    const response = await apiClient.post('/api/v1/billing/recharge', {
      household_id: householdId,
      amount
    });
    return response.data;
  },

  // Get alerts
  getAlerts: async (householdId) => {
    const response = await apiClient.get(`/api/v1/alerts/${householdId}`);
    return response.data;
  },

  // Get grid load
  getGridLoad: async () => {
    const response = await apiClient.get('/api/v1/telemetry/grid/load');
    return response.data;
  }
};
