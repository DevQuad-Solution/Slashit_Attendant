import { axiosClient } from '../lib/axios';

// POST /auth/attendant/signin
// Body: { identifier, password }
// Response 200: { data: { attendant: { _id, name, email, phone, role }, accessToken } }
export const attendantSignin = (identifier, password) =>
  axiosClient
    .post('/auth/attendant/signin', { identifier, password })
    .then((r) => r.data);

// GET /attendant/dashboard
// Response 200: { data: { counts, deliverySummary, schedule, activeDeliveries } }
export const getDashboard = () =>
  axiosClient.get('/attendant/dashboard').then((r) => r.data);

// POST /slash/qr — verify QR at pickup
// Body: { qrCode }
export const verifyQR = (qrCode) =>
  axiosClient.post('/slash/qr', { qrCode }).then((r) => r.data);

// POST /slash/claim — verify claim code at pickup
// Body: { code }
export const verifyClaim = (code) =>
  axiosClient.post('/slash/claim', { code }).then((r) => r.data);
