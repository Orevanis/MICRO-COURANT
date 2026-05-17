import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useEnergyStore = create(
  persist(
    (set, get) => ({
      currentBalance: 0,
      currentUsage: 0,
      meterId: null,
      householdId: null,
      lastReading: null,
      tariffRate: 100, // stroops per kWh

      setBalance: (balance) => {
        set({ currentBalance: balance });
      },

      setUsage: (usage) => {
        set({ currentUsage: usage });
      },

      setMeterInfo: (meterId, householdId) => {
        set({ meterId, householdId });
      },

      setLastReading: (reading) => {
        set({ lastReading: reading });
      },

      setTariffRate: (rate) => {
        set({ tariffRate: rate });
      },

      deductBalance: (amount) => {
        set((state) => ({
          currentBalance: Math.max(0, state.currentBalance - amount)
        }));
      },

      addUsage: (kwh) => {
        set((state) => ({
          currentUsage: state.currentUsage + kwh
        }));
      }
    }),
    {
      name: 'micro-courant-energy',
      partialize: (state) => ({
        currentBalance: state.currentBalance,
        currentUsage: state.currentUsage,
        meterId: state.meterId,
        householdId: state.householdId
      })
    }
  )
);
