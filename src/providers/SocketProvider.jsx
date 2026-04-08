import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { connectSocket, disconnectSocket } from '../services/socket';
import { setActiveEntry, clearActiveEntry } from '../store/activeEntrySlice';
import SocketContext from '../context/SocketContext';

export function SocketProvider({ children }) {
  const dispatch      = useDispatch();
  const techId        = useSelector((state) => state.auth.data?.technician?.id);
  const techIsAdmin   = useSelector((state) => state.auth.data?.technician?.isAdmin ?? false);
  const reconciledRef = useRef(false);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!techId) return;
    const sock = connectSocket({ technicianId: techId, role: techIsAdmin ? 'admin' : 'technician' });
    setSocket(sock);
    return () => {
      disconnectSocket();
      setSocket(null);
    };
  }, [techId, techIsAdmin]);

  useEffect(() => {
    if (!socket) return;

    function onTodayData({ data }) {
      if (reconciledRef.current) return;
      reconciledRef.current = true;

      const openEntry = (data ?? []).find((e) => !e.clockOut);
      if (openEntry) {
        dispatch(setActiveEntry({
          entryType:       openEntry.entryType === 'NonJob' ? 'Non-Job' : openEntry.entryType,
          workOrder:       openEntry.workOrderRef
            ? { id: openEntry.workOrderRef, label: openEntry.workOrderLabel ?? openEntry.workOrderRef }
            : null,
          taskDescription: openEntry.taskDescription ?? '',
          clockInTime:     openEntry.clockIn,
          backendEntryId:  openEntry.id,
        }));
      } else {
        dispatch(clearActiveEntry());
      }
    }

    function onClockOut(payload) {
      if (payload.technicianId !== techId) return;
      dispatch(clearActiveEntry());
    }

    function onClockIn(payload) {
      if (payload.technicianId !== techId) return;
      if (payload.entryId && payload.clockIn) {
        dispatch(setActiveEntry({
          entryType:       payload.entryType === 'NonJob' ? 'Non-Job' : payload.entryType,
          workOrder:       payload.workOrderRef
            ? { id: payload.workOrderRef, label: payload.workOrderLabel ?? payload.workOrderRef }
            : null,
          taskDescription: payload.taskDescription ?? '',
          clockInTime:     payload.clockIn,
          backendEntryId:  payload.entryId,
        }));
      }
    }

    socket.on('today:data', onTodayData);
    socket.on('clock_out',  onClockOut);
    socket.on('clock_in',   onClockIn);

    return () => {
      socket.off('today:data', onTodayData);
      socket.off('clock_out',  onClockOut);
      socket.off('clock_in',   onClockIn);
    };
  }, [socket, techId, dispatch]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
}
