import { useQuery, useMutation } from '@tanstack/react-query';
import { attendantSignin, getDashboard, verifyQR, verifyClaim } from '../services/attendant.service';

export const useAttendantSignin = () =>
  useMutation({ mutationFn: ({ identifier, password }) => attendantSignin(identifier, password) });

export const useAttendantDashboard = (options = {}) =>
  useQuery({
    queryKey: ['attendant.dashboard'],
    queryFn: () => getDashboard().then((r) => r.data),
    refetchInterval: 30 * 1000, // refresh every 30s during active session
    ...options,
  });

export const useVerifyQR = () =>
  useMutation({ mutationFn: (qrCode) => verifyQR(qrCode) });

export const useVerifyClaim = () =>
  useMutation({ mutationFn: (code) => verifyClaim(code) });
