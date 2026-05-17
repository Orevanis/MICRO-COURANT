import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Login from '../pages/Login';
import { useAuthStore } from '../stores/authStore';

// Mock Freighter wallet
vi.mock('freighter-api', () => ({
  isConnected: () => Promise.resolve(true),
  getPublicKey: () => Promise.resolve('GTEST123456789'),
  signTransaction: () => Promise.resolve('signed_tx')
}));

describe('Login', () => {
  it('renders login page', () => {
    render(<Login />);
    expect(screen.getByText('Micro-Courant')).toBeInTheDocument();
    expect(screen.getByText('Household Energy Management')).toBeInTheDocument();
  });

  it('shows connect wallet button', () => {
    render(<Login />);
    expect(screen.getByText('Connect Freighter Wallet')).toBeInTheDocument();
  });

  it('shows get wallet link for non-wallet users', () => {
    render(<Login />);
    expect(screen.getByText(/Get Freighter Wallet/)).toBeInTheDocument();
  });

  it('should login successfully when wallet connected', async () => {
    const { result } = useAuthStore();
    
    render(<Login />);
    
    const connectButton = screen.getByText('Connect Freighter Wallet');
    fireEvent.click(connectButton);

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  it('displays security information', () => {
    render(<Login />);
    expect(screen.getByText(/Secure blockchain-based energy management/)).toBeInTheDocument();
  });
});
