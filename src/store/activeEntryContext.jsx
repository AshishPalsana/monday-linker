import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { connectSocket, disconnectSocket } from "../services/socket";

const STORAGE_KEY = "ml_active_entry_v1";

function readStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeStorage(entry) {
  try {
    if (entry) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    /* quota errors, etc. */
  }
}

const ActiveEntryContext = createContext(null);

export function ActiveEntryProvider({ children, auth }) {
  const [activeEntry, _setActiveEntry] = useState(() => readStorage());
  const reconciledRef = useRef(false);
  const [socket, setSocket] = useState(null);

  const setActiveEntry = useCallback((entry) => {
    _setActiveEntry(entry);
    writeStorage(entry);
  }, []);

  const clearActiveEntry = useCallback(() => {
    _setActiveEntry(null);
    writeStorage(null);
  }, []);

  useEffect(() => {
    if (!auth?.technician?.id) return;

    const sock = connectSocket({
      technicianId: auth.technician.id,
      role: auth.technician.isAdmin ? "admin" : "technician",
    });

    function onTodayData({ data }) {
      if (reconciledRef.current) return;
      reconciledRef.current = true;

      const openEntry = (data ?? []).find((e) => !e.clockOut);
      if (openEntry) {
        setActiveEntry({
          entryType:
            openEntry.entryType === "NonJob" ? "Non-Job" : openEntry.entryType,
          workOrder: openEntry.workOrderRef
            ? {
                id: openEntry.workOrderRef,
                label: openEntry.workOrderLabel ?? openEntry.workOrderRef,
              }
            : null,
          taskDescription: openEntry.taskDescription ?? "",
          clockInTime: openEntry.clockIn,
          backendEntryId: openEntry.id,
        });
      } else {
        if (readStorage()) clearActiveEntry();
      }
    }

    function onClockOut(payload) {
      if (payload.technicianId !== auth.technician.id) return;
      clearActiveEntry();
    }

    function onClockIn(payload) {
      if (payload.technicianId !== auth.technician.id) return;
      if (payload.entryId && payload.clockIn) {
        setActiveEntry({
          entryType:
            payload.entryType === "NonJob" ? "Non-Job" : payload.entryType,
          workOrder: payload.workOrderRef
            ? {
                id: payload.workOrderRef,
                label: payload.workOrderLabel ?? payload.workOrderRef,
              }
            : null,
          taskDescription: payload.taskDescription ?? "",
          clockInTime: payload.clockIn,
          backendEntryId: payload.entryId,
        });
      }
    }

    sock.on("today:data", onTodayData);
    sock.on("clock_out", onClockOut);
    sock.on("clock_in", onClockIn);

    // Expose socket — triggers re-render of consumers (e.g. TimeTrackingPage)
    setSocket(sock);

    return () => {
      sock.off("today:data", onTodayData);
      sock.off("clock_out", onClockOut);
      sock.off("clock_in", onClockIn);
    };
  }, [
    auth?.technician?.id,
    auth?.technician?.isAdmin,
    clearActiveEntry,
    setActiveEntry,
  ]);

  // ── Cleanup socket on unmount ──────────────────────────────────────────────
  useEffect(() => {
    return () => disconnectSocket();
  }, []);

  return (
    <ActiveEntryContext.Provider
      value={{ activeEntry, setActiveEntry, clearActiveEntry, socket }}
    >
      {children}
    </ActiveEntryContext.Provider>
  );
}

export function useActiveEntry() {
  return useContext(ActiveEntryContext);
}
