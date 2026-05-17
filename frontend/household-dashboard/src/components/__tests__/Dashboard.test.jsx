import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from '../pages/Dashboard';
import { useEnergyStore } from '../stores/energyStore';

describe('Dashboard', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  const renderWithQuery = (component) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  it('renders dashboard title', () => {
    renderWithQuery(<Dashboard />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('displays current balance', () => {
    renderWithQuery(<Dashboard />);
    expect(screen.getByText(/Current Balance/i)).toBeInTheDocument();
  });

  it('displays today\'s usage', () => {
    renderWithQuery(<Dashboard />);
    expect(screen.getByText(/Today's Usage/i)).toBeInTheDocument();
  });

  it('shows quick action buttons', () => {
    renderWithQuery(<Dashboard />);
    expect(screen.getByText('View Usage History')).toBeInTheDocument();
    expect(screen.getByText('Recharge Balance')).toBeInTheDocument();
    expect(screen.getByText('Check Alerts')).toBeInTheDocument();
  });
});

describe('Energy Store', () => {
  it('should initialize with default values', () => {
    const { result } = useEnergyStore();
    
    expect(result.current.currentBalance).toBe(0);
    expect(result.current.currentUsage).toBe(0);
    expect(result.current.meterId).toBeNull();
  });

  it('should update balance', () => {
    const { result } = useEnergyStore();
    
    result.current.setBalance(100);
    expect(result.current.currentBalance).toBe(100);
  });

  it('should update usage', () => {
    const { result } = useEnergyStore();
    
    result.current.setUsage(50);
    expect(result.current.currentUsage).toBe(50);
  });

  it('should deduct balance', () => {
    const { result } = useEnergyStore();
    
    result.current.setBalance(100);
    result.current.deductBalance(25);
    expect(result.current.currentBalance).toBe(75);
  });

  it('should add usage', () => {
    const { result } = useEnergyStore();
    
    result.current.setUsage(10);
    result.current.addUsage(5);
    expect(result.current.currentUsage).toBe(15);
  });
});
