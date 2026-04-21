import {
  Box,
  Typography,
  TableRow,
  TableCell,
  Chip,
  Avatar,
  Divider,
  Skeleton,
  Snackbar,
  Alert,
  useMediaQuery,
  useTheme,
  Collapse,
  IconButton,
  Paper,
  Tooltip,
} from "@mui/material";
import { useBoardHeader, useBoardHeaderContext } from "../contexts/BoardHeaderContext";
import { parseBoardStatusColors } from "../utils/mondayUtils";
import { BOARD_IDS, MONDAY_COLUMNS, GROUP_IDS } from "../constants/monday";
import { ENTRY_TYPE_HEX } from "../constants/status";
import { BoardTable, DATA_CELL_SX, DASH } from "./BoardTable";
import { mondayClient } from "../services/monday/client";
import { FETCH_BOARD_DATA } from "../services/monday/queries";
import AppButton from "./AppButton";
import TimerOutlinedIcon from "@mui/icons-material/TimerOutlined";
import LoginOutlinedIcon from "@mui/icons-material/LoginOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import WorkOutlineIcon from "@mui/icons-material/WorkOutline";
import HandymanOutlinedIcon from "@mui/icons-material/HandymanOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchWorkOrders } from "../store/workOrderSlice";
import { fetchLocations } from "../store/locationsSlice";
import ClockInModal from "./ClockInModal";
import ClockOutModal from "./ClockOutModal";
import QuickExpenseModal from "./QuickExpenseModal";
import { useAuth } from "../hooks/useAuth";
import { useActiveEntry } from "../hooks/useActiveEntry";
import { addActiveExpense } from "../store/activeEntrySlice";
import { useSocket } from "../hooks/useSocket";
import { timeEntriesApi } from "../services/api";
import { DELETE_ITEM } from "../services/monday/mutations";
import { createWorkOrder as createMondayWorkOrder } from "../services/monday/workOrderService";
import { gql } from "@apollo/client";

const SEARCH_WO_ITEMS = gql`
  query SearchWOItems($boardId: [ID!]) {
    boards(ids: $boardId) {
      items_page(limit: 100) {
        items { id name group { id } }
      }
    }
  }
`;

async function ensureNonJobInRandomStuff(taskDescription) {
  try {
    await createMondayWorkOrder({ name: taskDescription, groupId: GROUP_IDS.WORK_ORDERS_RANDOM_STUFF });
  } catch (err) {
    console.error("[non-job] create in Random Stuff failed:", err);
  }
  await new Promise((r) => setTimeout(r, 4000));
  try {
    const { data } = await mondayClient.query({
      query: SEARCH_WO_ITEMS,
      variables: { boardId: [BOARD_IDS.WORK_ORDERS] },
      fetchPolicy: "network-only",
    });
    const items = data?.boards?.[0]?.items_page?.items ?? [];
    const duplicates = items.filter(
      (item) => item.group.id === GROUP_IDS.WORK_ORDERS_ACTIVE && item.name === taskDescription
    );
    await Promise.all(
      duplicates.map((item) =>
        mondayClient.mutate({ mutation: DELETE_ITEM, variables: { itemId: item.id } })
      )
    );
  } catch (err) {
    console.error("[non-job] cleanup failed:", err);
  }
}

function formatEntry(entry) {
  return {
    id: entry.id,
    entryType: entry.entryType === "NonJob" ? "Non-Job" : entry.entryType,
    description: entry.workOrderLabel || entry.taskDescription || "—",
    clockIn: new Date(entry.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    clockOut: entry.clockOut
      ? new Date(entry.clockOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : DASH,
    hours: parseFloat(entry.hoursWorked) || 0,
    status: entry.status,
  };
}

function isToday(dateIso) {
  const d = new Date(dateIso);
  const today = new Date();
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

const EMPTY_ITEMS = [];

// ─── Design tokens ───────────────────────────────────────────────────────────
const TYPE_CHIP_STYLES = {
  "Daily Shift": { bg: "#f5f3ff", color: "#7c3aed", border: "#ddd6fe" }, // Indigo/Violet for Attendance
  "Job": { bg: "#eff6ff", color: "#1d4ed8", border: "#dbeafe" },        // Blue for Jobs
  "Non-Job": { bg: "#fffbeb", color: "#d97706", border: "#fef3c7" },    // Amber for Tasks
  "General": { bg: "#f0fdf4", color: "#166534", border: "#86efac" },
};

const STATUS_STYLES = {
  Open: { bg: "#fef9c3", color: "#854d0e", border: "#fde047" },
  Complete: { bg: "#dcfce7", color: "#166534", border: "#86efac" },
  Approved: { bg: "#dbeafe", color: "#1e40af", border: "#93c5fd" },
};

function TypeChip({ type }) {
  const style = TYPE_CHIP_STYLES[type] ?? { bg: "#f3f4f6", color: "#374151", border: "#d1d5db" };
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        px: 1,
        height: 22,
        borderRadius: "5px",
        bgcolor: style.bg,
        border: `1px solid ${style.border}`,
        whiteSpace: "nowrap",
      }}
    >
      <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: style.color, textTransform: "uppercase", letterSpacing: "0.05em", lineHeight: 1 }}>
        {type}
      </Typography>
    </Box>
  );
}

function StatusChip({ status }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.Open;
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        px: 1,
        height: 22,
        borderRadius: "5px",
        bgcolor: style.bg,
        border: `1px solid ${style.border}`,
      }}
    >
      <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: style.color, textTransform: "uppercase", letterSpacing: "0.05em", lineHeight: 1 }}>
        {status}
      </Typography>
    </Box>
  );
}

function totalHours(entries) {
  // Exclude DailyShift from the summary total to avoid double-counting attendance with work
  return entries
    .filter(e => e.entryType !== "DailyShift" && e.entryType !== "Daily Shift")
    .reduce((sum, e) => sum + (parseFloat(e.hours) || 0), 0)
    .toFixed(2);
}

// ─── Elapsed timer hook ───────────────────────────────────────────────────────
function useElapsedTimer(startIso) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!startIso) { setElapsed(0); return; }
    const update = () => {
      const diff = Math.floor((Date.now() - new Date(startIso)) / 1000);
      setElapsed(Math.max(0, diff));
    };
    update();
    intervalRef.current = setInterval(update, 1000);
    return () => clearInterval(intervalRef.current);
  }, [startIso]);

  const h = String(Math.floor(elapsed / 3600)).padStart(2, "0");
  const m = String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0");
  const s = String(elapsed % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function formatSeconds(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${sec}`;
}

function ActiveEntryTimer({ start, color }) {
  const elapsed = useElapsedTimer(start);
  return (
    <Typography sx={{ fontSize: "0.65rem", fontWeight: 800, color, fontVariantNumeric: "tabular-nums", fontFamily: "monospace" }}>
      {elapsed}
    </Typography>
  );
}

function useLiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// ─── Sidebar TimingPanel ──────────────────────────────────────────────────────
function TimingPanel({
  activeEntries, activeShift, activeTask,
  liveClock, shiftElapsed, taskElapsed,
  todayEntries, activityFeed,
  onClockIn, onClockOut, onAddExpense,
  collapsible, userName, userInitials, entriesLoading,
  userRole = "Technician",
  totalJobDuration = "00:00:00"
}) {
  const isShiftActive = !!activeShift;
  const isTaskActive = !!activeTask;
  const activeExpenseCount = activeTask?.expenses?.length || 0;

  return (
    <Box
      sx={{
        width: collapsible ? "100%" : 320,
        minWidth: collapsible ? "auto" : 320,
        maxWidth: collapsible ? "100%" : 320,
        borderLeft: collapsible ? "none" : "1px solid",
        borderTop: collapsible ? "1px solid" : "none",
        borderColor: "divider",
        bgcolor: "#fff",
        display: "flex",
        flexDirection: "column",
        overflowY: collapsible ? "visible" : "auto",
        overflowX: "hidden",
        flexShrink: 0,
        boxShadow: "-4px 0 16px rgba(0,0,0,0.02)"
      }}
    >
      {/* ── Profile header ── */}
      <Box
        sx={{
          px: 2,
          pt: 4,
          pb: 3,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          position: "relative",
        }}
      >
        <Avatar
          sx={{
            width: 80,
            height: 80,
            fontSize: "1.5rem",
            fontWeight: 800,
            bgcolor: "#7c3aed",
            color: "#fff",
            mb: 2,
            boxShadow: "0 8px 16px rgba(124, 58, 237, 0.25)",
            border: "4px solid #fff"
          }}
        >
          {userInitials}
        </Avatar>

        <Typography sx={{ fontWeight: 800, color: "#111", fontSize: "1.1rem" }}>
          {userName}
        </Typography>
        <Typography sx={{ color: "text.secondary", fontSize: "0.78rem", fontWeight: 500, mt: 0.5 }}>
          {userRole}
        </Typography>
      </Box>

      {/* ── My Timing Section ── */}
      <Box sx={{ px: 2, pb: 4 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5, px: 0.5 }}>
          <Typography sx={{ fontSize: "0.75rem", fontWeight: 800, color: "#111" }}>
            My Timing
          </Typography>
          {isTaskActive && (
            <Box 
              onClick={onAddExpense}
              sx={{ 
                display: "flex", 
                alignItems: "center", 
                gap: 0.5, 
                cursor: "pointer",
                color: "#7c3aed",
                "&:hover": { opacity: 0.8 }
              }}
            >
              <Box sx={{ bgcolor: "#7c3aed15", px: 0.75, py: 0.25, borderRadius: "6px", display: "flex", alignItems: "center", gap: 0.5 }}>
                 <Typography sx={{ fontSize: "0.68rem", fontWeight: 800 }}>+ ADD EXPENSE</Typography>
                 {activeExpenseCount > 0 && (
                   <Box sx={{ bgcolor: "#7c3aed", color: "#fff", minWidth: 16, height: 16, borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", fontWeight: 900 }}>
                     {activeExpenseCount}
                   </Box>
                 )}
              </Box>
            </Box>
          )}
        </Box>

        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: "12px",
            border: "1px solid #f0f0f0",
            bgcolor: "#fff",
            display: "flex",
            alignItems: "center",
            boxShadow: "0 2px 10px rgba(0,0,0,0.02)"
          }}
        >
          {/* Daily Shift Timer */}
          <Box sx={{ flex: 1, textAlign: "center" }}>
            <Typography sx={{ fontSize: "0.62rem", fontWeight: 700, color: "#666", textTransform: "uppercase", letterSpacing: "0.05em", mb: 0.5 }}>
              Current Time
            </Typography>
            <Typography sx={{ fontSize: "1.1rem", fontWeight: 800, color: isShiftActive ? "#7c3aed" : "#333", fontFamily: "monospace" }}>
              {isShiftActive ? shiftElapsed : "00:00:00"}
            </Typography>
          </Box>

          <Divider orientation="vertical" flexItem sx={{ mx: 2, borderColor: "#f0f0f0" }} />

          {/* Total Job Hours */}
          <Box sx={{ flex: 1, textAlign: "center" }}>
            <Typography sx={{ fontSize: "0.62rem", fontWeight: 700, color: "#666", textTransform: "uppercase", letterSpacing: "0.05em", mb: 0.5 }}>
              Total Job Hours
            </Typography>
            <Typography sx={{ fontSize: "1.1rem", fontWeight: 800, color: isTaskActive ? "#16a34a" : "#333", fontFamily: "monospace" }}>
              {totalJobDuration}
            </Typography>
          </Box>
        </Paper>

        {/* Action Buttons */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mt: 2 }}>
          {isShiftActive && (
            <AppButton
              fullWidth
              variant="contained"
              onClick={() => onClockIn()}
              sx={{
                borderRadius: "8px",
                bgcolor: "#1a6ef7",
                boxShadow: "0 4px 12px rgba(26, 110, 247, 0.25)",
                textTransform: "uppercase",
                fontSize: "0.75rem",
                fontWeight: 800,
                py: 1.2
              }}
            >
              {isTaskActive ? "Switch Job" : "Start Job"}
            </AppButton>
          )}

          <AppButton
            fullWidth
            variant={isShiftActive ? "outlined" : "contained"}
            color="error"
            onClick={isShiftActive ? () => onClockOut(activeShift) : () => onClockIn("DailyShift")}
            sx={{
              borderRadius: "8px",
              borderWidth: "1.5px",
              "&:hover": { borderWidth: "1.5px" },
              ...(isShiftActive ? { color: "#ff5252", borderColor: "#ff5252" } : { bgcolor: "#ff5252", color: "#fff" }),
              textTransform: "uppercase",
              fontSize: "0.75rem",
              fontWeight: 800,
              py: 1.2
            }}
          >
            {isShiftActive ? "End Day" : "Start Day"}
          </AppButton>
        </Box>
      </Box>

      <Divider sx={{ mx: 2 }} />

      {/* Attendance Activity */}
      <Box sx={{ px: 2, pt: 3, pb: 4 }}>
        <Typography sx={{ fontSize: "0.75rem", fontWeight: 800, color: "#111", mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
          <Box component="span" sx={{ width: 4, height: 4, borderRadius: "50%", bgcolor: "#7c3aed" }} />
          Attendance activity
        </Typography>

        {activityFeed.length === 0 ? (
          <Typography sx={{ fontSize: "0.78rem", color: "#ccc", fontWeight: 500, textAlign: "center", py: 2 }}>
            No activity yet today
          </Typography>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            {activityFeed.map((item, idx) => (
              <Box
                key={idx}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  p: 1.25,
                  borderRadius: "8px",
                  bgcolor: "rgba(0,0,0,0.015)",
                }}
              >
                <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: "#666", width: 65 }}>
                  {item.time}
                </Typography>
                <Typography sx={{ fontSize: "0.7rem", color: "#bbb" }}>→</Typography>
                <Typography sx={{ fontSize: "0.75rem", fontWeight: 600, color: "#333", flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {item.type === 'DailyShift' ? (item.active ? "Day Start" : "Day Ended") : `${item.label} ${item.active ? 'Started' : 'Completed'}`}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TimeTrackingPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const { auth } = useAuth();
  const token = auth?.token ?? null;
  const { search } = useBoardHeaderContext();

  const { activeEntries, setActiveEntry, clearActiveEntry } = useActiveEntry();
  const activeShift = activeEntries.DailyShift;
  const activeTask = activeEntries.Job || activeEntries.NonJob;
  const isShiftActive = !!activeShift;
  const isTaskActive = !!activeTask;

  const socket = useSocket();
  const requestedSocketRef = useRef(null);

  const [todayEntries, setTodayEntries] = useState([]);
  const [entriesLoading, setEntriesLoading] = useState(true);
  const [clockInOpen, setClockInOpen] = useState(false);
  const [clockOutOpen, setClockOutOpen] = useState(false);
  const [clockOutLoading, setClockOutLoading] = useState(false);
  const [activeToOut, setActiveToOut] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);

  const dispatch = useDispatch();

  useEffect(() => {
    if (!token) return;
    dispatch(fetchWorkOrders());
    dispatch(fetchLocations());
    mondayClient
      .query({ query: FETCH_BOARD_DATA, variables: { boardId: [BOARD_IDS.TIME_ENTRIES] } })
      .catch((err) => console.error("[time-tracker] Metadata fetch error:", err));
  }, [token, dispatch]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    timeEntriesApi
      .getToday(token)
      .then(({ data }) => {
        if (cancelled) return;
        setTodayEntries((data ?? []).filter((e) => e.clockOut && isToday(e.clockIn)).map(formatEntry));
        setEntriesLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[today-log] REST fetch error:", err);
        setEntriesLoading(false);
      });
    return () => { cancelled = true; };
  }, [token]);

  useEffect(() => {
    if (!socket) return;
    function onTodayData({ data }) {
      setTodayEntries((data ?? []).filter((e) => e.clockOut && isToday(e.clockIn)).map(formatEntry));
      setEntriesLoading(false);
    }
    function onClockOut(payload) {
      if (payload.technicianId !== auth?.technician?.id) return;
      if (!isToday(payload.clockIn)) return;
      const realEntry = {
        id: payload.entryId,
        entryType: payload.entryType === "NonJob" ? "Non-Job" : payload.entryType,
        description: payload.workOrderLabel || payload.taskDescription || "—",
        clockIn: new Date(payload.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        clockOut: new Date(payload.clockOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        hours: parseFloat(payload.hoursWorked) || 0,
        status: payload.status || "Complete",
      };
      setTodayEntries((prev) => {
        const tempIdx = prev.findIndex((e) => String(e.id).startsWith("temp-"));
        if (tempIdx !== -1) { const next = [...prev]; next[tempIdx] = realEntry; return next; }
        if (prev.some((e) => e.id === payload.entryId)) return prev.map((e) => (e.id === payload.entryId ? realEntry : e));
        return [realEntry, ...prev];
      });
    }
    socket.on("today:data", onTodayData);
    socket.on("clock_out", onClockOut);
    return () => { socket.off("today:data", onTodayData); socket.off("clock_out", onClockOut); };
  }, [socket, auth?.technician?.id]);

  useEffect(() => {
    if (!socket || requestedSocketRef.current === socket) return;
    requestedSocketRef.current = socket;
    socket.emit("today:request");
  }, [socket]);

  // Refetch work orders whenever the Clock-In modal is opened to ensure data is fresh
  useEffect(() => {
    if (clockInOpen && token) {
      dispatch(fetchWorkOrders());
    }
  }, [clockInOpen, token, dispatch]);

  const userName = auth?.name ?? auth?.technician?.name ?? "…";
  const userRole = auth?.role || auth?.technician?.position || "Technician";
  const userInitials = userName !== "…"
    ? userName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  const { board: woData, loading: woLoading } = useSelector((s) => s.workOrders);
  const rawWorkOrders = woData?.items_page?.items ?? EMPTY_ITEMS;

  const workOrders = useMemo(() => {
    // Collect all possible IDs for the current user
    const allowedIds = [
      String(auth?.mondayUserId || ""),
      String(auth?.technician?.mondayId || ""),
      String(auth?.technician?.id || ""),
      String(auth?.technician?.mondayUserId || ""),
    ].filter((id) => id && id !== "undefined" && id !== "null");

    const isAdmin = !!auth?.technician?.isAdmin;

    const filtered = (rawWorkOrders || [])
      .filter((item) => {
        const isInActiveGroup = !item.group || item.group.id === GROUP_IDS.WORK_ORDERS_ACTIVE;
        if (!isInActiveGroup) return false;
        if (isAdmin) return true;

        const techVal = item.column_values?.find((cv) => cv.id === MONDAY_COLUMNS.WORK_ORDERS.TECHNICIAN);
        const assignedIds = techVal?.persons_and_teams?.map((p) => String(p.id)) || [];

        // Match if any of the technician's IDs match any of the assigned IDs on the board
        const isAssigned = assignedIds.some(aid => allowedIds.includes(aid));

        if (!isAssigned && assignedIds.length > 0) {
          console.log(`[work-order-filter] No match for "${item.name}". Assigned: [${assignedIds.join(",")}], Your IDs: [${allowedIds.join(",")}]`);
        }

        return isAssigned;
      })
      .map((item) => ({ id: item.id, label: item.name }));

    return filtered;
  }, [rawWorkOrders, auth]);

  const shiftElapsed = useElapsedTimer(activeShift?.clockInTime);
  const taskElapsed = useElapsedTimer(activeTask?.clockInTime);
  const liveClock = useLiveClock();

  async function handleClockIn(data) {
    const typeKey = data.entryType === "Non-Job" ? "NonJob" : data.entryType;
    const optimistic = { ...data, backendEntryId: null };
    if ((typeKey === "Job" || typeKey === "NonJob") && activeTask) {
      clearActiveEntry(activeTask.entryType === "Non-Job" ? "NonJob" : activeTask.entryType);
    }
    setActiveEntry(typeKey, optimistic);
    setClockInOpen(false);
    if (!token) return;
    try {
      const result = await timeEntriesApi.clockIn(token, {
        entryType: typeKey,
        ...(data.workOrder?.id && { workOrderRef: String(data.workOrder.id) }),
        ...(data.workOrder?.label && { workOrderLabel: data.workOrder.label }),
        ...(data.taskDescription && { taskDescription: data.taskDescription }),
      });
      setActiveEntry(typeKey, { ...optimistic, backendEntryId: result.data.id });
      if (typeKey === "NonJob" && data.taskDescription) ensureNonJobInRandomStuff(data.taskDescription);
    } catch (err) {
      if (err.status === 409 && err.data?.activeEntryId) {
        setActiveEntry(typeKey, { ...optimistic, backendEntryId: err.data.activeEntryId });
      } else {
        console.error("[clock-in] API error:", err);
        clearActiveEntry(typeKey);
        setApiError(`Clock-in failed: ${err.message || "server error"}. Please try again.`);
      }
    }
  }

  async function handleClockOut(data) {
    if (!activeToOut) return;
    setClockOutLoading(true);
    const typeKey = activeToOut.entryType === "Non-Job" ? "NonJob" : activeToOut.entryType;
    const isEndingShift = typeKey === "DailyShift";
    const inTime = new Date(activeToOut.clockInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const diffMs = Date.now() - new Date(activeToOut.clockInTime);
    const diffHours = Math.max(0, parseFloat((diffMs / 3_600_000).toFixed(2)));
    const optimisticEntry = {
      id: `temp-${Date.now()}`,
      entryType: activeToOut.entryType,
      description:
        activeToOut.entryType === "Job" ? (activeToOut.workOrder?.label ?? "Work Order")
          : activeToOut.entryType === "DailyShift" ? "Overall Day Shift"
            : (activeToOut.taskDescription ?? "Task"),
      clockIn: inTime, clockOut: nowTime,
      hours: diffHours > 0 ? diffHours : 0.01,
      status: "Open",
    };
    let captured = activeToOut;
    const clockInIsToday = isToday(captured.clockInTime);
    if (clockInIsToday) setTodayEntries((prev) => [optimisticEntry, ...prev]);
    if (isEndingShift) {
      clearActiveEntry("DailyShift"); clearActiveEntry("Job"); clearActiveEntry("NonJob");
    } else {
      clearActiveEntry(typeKey);
    }
    setClockOutOpen(false); setClockOutLoading(false); setActiveToOut(null);
    try {
      await timeEntriesApi.clockOut(token, captured.backendEntryId, {
        narrative: data.narrative,
        jobLocation: data.location?.label ?? data.location ?? "",
        jobLocationId: data.location?.id ?? null,
        expenses: data.expenses,
        markComplete: data.markComplete || false,
      });
    } catch (err) {
      console.error("[clock-out] API error:", err);
      if (clockInIsToday) setTodayEntries((prev) => prev.filter((e) => e.id !== optimisticEntry.id));
      setActiveEntry(typeKey, captured);
      setApiError(`Clock-out failed: ${err.message || "server error"}.`);
    }
  }

  function handleAddExpense(expense) {
    if (!activeTask) return;
    const typeKey = activeTask.entryType === "Non-Job" ? "NonJob" : activeTask.entryType;
    dispatch(addActiveExpense({ type: typeKey, expense }));
  }

  const todayDate = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const getEntryLabel = (entry) => {
    if (!entry) return null;
    if (entry.entryType === "Job") return entry.workOrder?.label ?? "Work Order";
    if (entry.entryType === "DailyShift") return "Overall Day Shift";
    return entry.taskDescription ?? "Task";
  };

  const activityFeed = useMemo(() => {
    const feed = [
      ...Object.entries(activeEntries)
        .filter(([_, entry]) => !!entry)
        .map(([key, entry]) => ({
          time: new Date(entry.clockInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          timestamp: new Date(entry.clockInTime).getTime(),
          label: getEntryLabel(entry),
          type: entry.entryType,
          active: true,
        })),
      ...todayEntries.flatMap((e) => [
        {
          time: e.clockOut,
          timestamp: e._clockOutTime ? new Date(e._clockOutTime).getTime() : Date.now(),
          label: e.description, type: e.entryType, active: false
        },
        {
          time: e.clockIn,
          timestamp: e._clockInTime ? new Date(e._clockInTime).getTime() : Date.now() - 1000,
          label: e.description, type: e.entryType, active: true
        },
      ]),
    ];
    return feed.sort((a, b) => b.timestamp - a.timestamp);
  }, [activeEntries, todayEntries]);

  const handleHeaderClockIn = useCallback(() => setClockInOpen(true), []);

  useBoardHeader({
    title: "Time Tracker",
    count: todayDate,
    countLabel: "",
    buttonLabel: isShiftActive ? (isTaskActive ? "Switch Task" : "Start Task") : "Clock In for Day",
    onButtonClick: handleHeaderClockIn,
  });

  // Filtered rows for search
  const filteredEntries = search
    ? todayEntries.filter((e) => {
      const q = search.toLowerCase();
      return (
        e.entryType?.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q) ||
        e.status?.toLowerCase().includes(q)
      );
    })
    : todayEntries;

  // Build table rows
  const activeRows = Object.values(activeEntries)
    .filter((e) => !!e)
    .sort((a, b) => (a.entryType === "DailyShift" ? -1 : 1))
    .map((e) => ({
      id: e.backendEntryId ?? `active-${e.entryType}`,
      entryType:
        e.entryType === "NonJob" ? "Non-Job"
          : e.entryType === "DailyShift" ? "Daily Shift"
            : e.entryType,
      _isBackground: e.entryType === "DailyShift",
      description:
        e.entryType === "Job" ? (e.workOrder?.label ?? "Work Order")
          : e.entryType === "DailyShift" ? "Overall Attendance"
            : (e.taskDescription ?? "Task"),
      clockIn: new Date(e.clockInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      clockOut: null, hours: null, status: "Open", _active: true,
    }));

  const tableRows = entriesLoading
    ? [{ id: "__skel_1__" }, { id: "__skel_2__" }, { id: "__skel_3__" }]
    : [
      ...activeRows,
      ...filteredEntries,
      ...(filteredEntries.length > 0 ? [{ id: "__total__" }] : []),
    ];

  // Live tick for Total Job Hours and Shift Timer
  const [liveTick, setLiveTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setLiveTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const totalJobDuration = useMemo(() => {
    const completedSeconds = todayEntries
      .filter((e) => e.entryType === "Job" || e.entryType === "Non-Job" || e.entryType === "NonJob")
      .reduce((acc, e) => acc + (parseFloat(e.hours) || 0) * 3600, 0);
    const activeSec = isTaskActive ? Math.floor((Date.now() - new Date(activeTask.clockInTime)) / 1000) : 0;
    return formatSeconds(completedSeconds + activeSec);
  }, [todayEntries, activeTask, isTaskActive, liveTick]);

  const timingPanelProps = {
    activeEntries,
    activeShift,
    activeTask,
    liveClock,
    shiftElapsed,
    taskElapsed,
    totalJobDuration,
    todayEntries: filteredEntries,
    activityFeed,
    onClockIn: () => setClockInOpen(true),
    onClockOut: (entry) => { setActiveToOut(entry); setClockOutOpen(true); },
    onAddExpense: () => setExpenseModalOpen(true),
    userName, userInitials, entriesLoading,
    userRole,
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
        height: "100%",
        minHeight: 0,
        overflow: { xs: "auto", md: "hidden" },
        bgcolor: "#f7f7f5",
      }}
    >
      {/* ── Main content ── */}
      <Box
        sx={{
          flex: 1,
          p: { xs: 2, sm: 2.5, md: 3 },
          overflowY: { xs: "visible", md: "auto" },
          minWidth: 0,
        }}
      >
        {/* Summary row */}
        <Box sx={{ display: "flex", gap: 1.5, mb: 2.5, flexWrap: "wrap" }}>
          {[
            { label: "Total Hours", value: entriesLoading ? "…" : `${totalHours(filteredEntries)}h`, color: "#1a6ef7" },
            { label: "Entries Today", value: entriesLoading ? "…" : String(filteredEntries.length), color: "#111" },
            { label: "Shift Status", value: isShiftActive ? "Active" : "Inactive", color: isShiftActive ? "#16a34a" : "#9ca3af" },
          ].map((stat) => (
            <Paper
              key={stat.label}
              elevation={0}
              sx={{
                px: 2, py: 1.5,
                border: "1px solid #e8e8e8",
                borderRadius: "10px",
                bgcolor: "#fff",
                minWidth: 120,
                flex: "1 1 auto",
              }}
            >
              <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, color: "#bbb", textTransform: "uppercase", letterSpacing: "0.07em", mb: 0.25 }}>
                {stat.label}
              </Typography>
              <Typography sx={{ fontSize: "1.1rem", fontWeight: 800, color: stat.color }}>
                {stat.value}
              </Typography>
            </Paper>
          ))}
        </Box>

        {/* Table header */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <AccessTimeIcon sx={{ fontSize: 16, color: "#bbb" }} />
            <Typography sx={{ fontWeight: 700, fontSize: "0.9rem", color: "#111" }}>
              Today's Log
            </Typography>
          </Box>
          <Typography sx={{ fontSize: "0.75rem", color: "#bbb", fontWeight: 600 }}>
            {entriesLoading ? "…" : `${totalHours(filteredEntries)} hrs total`}
          </Typography>
        </Box>

        {/* Table */}
        <Paper
          elevation={0}
          sx={{ border: "1px solid #e8e8e8", borderRadius: "8px", overflow: "auto", bgcolor: "#fff" }}
        >
          <BoardTable
            minWidth={600}
            maxHeight={isMobile ? 320 : "calc(100vh - 260px)"}
            emptyMessage="No entries yet today — clock in to start tracking"
            columns={[
              { label: "Type", width: "130px" },
              { label: "Description", width: "auto" },
              { label: "Clock In", width: "95px" },
              { label: "Clock Out", width: "95px" },
              { label: "Hrs", width: "85px" },
              { label: "Status", width: "110px" },
            ]}
            rows={tableRows}
            renderRow={(row) => {
              if (String(row.id).startsWith("__skel_")) {
                return (
                  <TableRow key={row.id}>
                    {[80, 200, 80, 80, 65, 80].map((w, i) => (
                      <TableCell key={i} sx={DATA_CELL_SX}>
                        <Skeleton variant="text" width={w} height={18} />
                      </TableCell>
                    ))}
                  </TableRow>
                );
              }

              if (row.id === "__total__") {
                return (
                  <TableRow key="total" sx={{ bgcolor: "#fafafa" }}>
                    <TableCell colSpan={4} sx={{ ...DATA_CELL_SX, fontWeight: 700, fontSize: "0.78rem", color: "#888", textAlign: "right", borderTop: "1px solid #f0f0f0" }}>
                      Daily Total
                    </TableCell>
                    <TableCell sx={{ ...DATA_CELL_SX, fontWeight: 800, fontSize: "0.85rem", color: "#1a6ef7", borderTop: "1px solid #f0f0f0" }}>
                      {totalHours(filteredEntries)}h
                    </TableCell>
                    <TableCell sx={{ ...DATA_CELL_SX, borderTop: "1px solid #f0f0f0" }} />
                  </TableRow>
                );
              }

              return (
                <TableRow
                  key={row.id}
                  hover
                  sx={{
                    "&:hover": { bgcolor: "#fafafa" },
                    ...(row._isBackground ? { bgcolor: "#fbfbfe" } : {})
                  }}
                >
                  <TableCell sx={DATA_CELL_SX}>
                    <TypeChip type={row.entryType} />
                  </TableCell>
                  <TableCell sx={DATA_CELL_SX}>
                    <Typography
                      sx={{
                        fontWeight: row._isBackground ? 700 : 500,
                        color: row._isBackground ? "#7c3aed" : "#333",
                        fontSize: "0.82rem",
                        maxWidth: 260,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}
                    >
                      {row.description}
                      {row._isBackground && (
                        <Typography component="span" sx={{ ml: 1, fontSize: "0.65rem", fontWeight: 600, color: "text.disabled", textTransform: "uppercase" }}>
                          (Background)
                        </Typography>
                      )}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ ...DATA_CELL_SX, color: "#555", fontSize: "0.82rem" }}>
                    {row.clockIn}
                  </TableCell>
                  <TableCell sx={DATA_CELL_SX}>
                    {row._active ? (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <Box sx={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          bgcolor: row._isBackground ? "#7c3aed" : "#22c55e",
                          flexShrink: 0,
                          animation: "pulse 1.5s ease infinite",
                          "@keyframes pulse": { "0%,100%": { opacity: 1 }, "50%": { opacity: 0.4 } }
                        }} />
                        <Typography sx={{
                          fontSize: "0.78rem",
                          color: row._isBackground ? "#7c3aed" : "#16a34a",
                          fontWeight: 600
                        }}>
                          {row._isBackground ? "Running" : "Active"}
                        </Typography>
                      </Box>
                    ) : (
                      <Typography sx={{ fontSize: "0.82rem", color: "#555" }}>{row.clockOut ?? DASH}</Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ ...DATA_CELL_SX, fontWeight: 600, color: "#111", fontSize: "0.82rem" }}>
                    {row._active ? DASH : (parseFloat(row.hours) || 0).toFixed(2)}
                  </TableCell>
                  <TableCell sx={DATA_CELL_SX}>
                    <StatusChip status={row.status} />
                  </TableCell>
                </TableRow>
              );
            }}
          />
        </Paper>
      </Box>

      {/* ── Right sidebar ── */}
      <TimingPanel {...timingPanelProps} collapsible={isMobile} />

      {/* ── Modals ── */}
      <ClockInModal
        open={clockInOpen}
        onClose={() => setClockInOpen(false)}
        onConfirm={handleClockIn}
        workOrders={workOrders}
        workOrdersLoading={woLoading}
        isShiftActive={isShiftActive}
      />
      <ClockOutModal
        open={clockOutOpen}
        onClose={() => { if (clockOutLoading) return; setClockOutOpen(false); setActiveToOut(null); }}
        onConfirm={handleClockOut}
        activeEntry={activeToOut}
        loading={clockOutLoading}
      />

      <QuickExpenseModal
        open={expenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
        onConfirm={handleAddExpense}
        jobLabel={activeTask?.entryType === "Job" ? (activeTask.workOrder?.label ?? "Active Job") : activeTask?.taskDescription}
      />

      <Snackbar
        open={!!apiError}
        autoHideDuration={3000}
        onClose={() => setApiError(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="error" onClose={() => setApiError(null)} sx={{ width: "100%" }}>
          {apiError}
        </Alert>
      </Snackbar>
    </Box>
  );
}