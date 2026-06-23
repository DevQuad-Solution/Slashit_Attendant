import './index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AttendantAuthProvider } from './context/AttendantAuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import App from './App.jsx';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30 * 1000, refetchOnWindowFocus: false },
    mutations: { retry: 0 },
  },
});


// Silent backend warmup — Render free tier sleeps after 15min inactivity.
// Ping on load so the server is awake by the time the user interacts.
setTimeout(() => {
  fetch('https://slashit-g2og.onrender.com/api/health', { method: 'GET' }).catch(() => {});
}, 500);
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AttendantAuthProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AttendantAuthProvider>
    </QueryClientProvider>
  </StrictMode>
);
