import { createContext, useContext, useState, useCallback } from "react";
import { setAuthToken, clearAuthToken } from "../lib/axios";
import Cookies from "js-cookie";

const AttendantAuthContext = createContext(null);
const SESSION_KEY = "slashit_attendant_session";

export function AttendantAuthProvider({ children }) {
  const [attendant, setAttendant] = useState(() => {
    try {
      return JSON.parse(Cookies.get(SESSION_KEY) || "null");
    } catch {
      return null;
    }
  });

  // signin response: data: { attendant: { _id, name, email, phone, role }, accessToken }
  const login = useCallback((responseData) => {
    const { attendant: backendAttendant, accessToken } = responseData;
    setAuthToken(accessToken);
    const session = { ...backendAttendant, id: backendAttendant._id };
    setAttendant(session);
    try {
      Cookies.set(SESSION_KEY, JSON.stringify(session));
    } catch {}
  }, []);

  const logout = useCallback(() => {
    clearAuthToken();
    Cookies.remove(SESSION_KEY);
    setAttendant(null);
  }, []);

  return (
    <AttendantAuthContext.Provider value={{ attendant, login, logout }}>
      {children}
    </AttendantAuthContext.Provider>
  );
}

export const useAttendantAuth = () => {
  const ctx = useContext(AttendantAuthContext);
  if (!ctx)
    throw new Error("useAttendantAuth must be inside AttendantAuthProvider");
  return ctx;
};
