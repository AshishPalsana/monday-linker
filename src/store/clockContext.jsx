import { createContext, useContext, useState } from "react";

const ClockContext = createContext(null);

export function ClockProvider({ children }) {
  const [clockedIn, setClockedIn] = useState(false);
  return (
    <ClockContext.Provider value={{ clockedIn, setClockedIn }}>
      {children}
    </ClockContext.Provider>
  );
}

export function useClockStatus() {
  return useContext(ClockContext);
}
