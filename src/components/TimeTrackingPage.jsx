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
import AttendanceActivityFeed from "./AttendanceActivityFeed";
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
import { useAuth } from "../hooks/useAuth";
import { useActiveEntry } from "../hooks/useActiveEntry";
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
  "Daily Shift": { bg: "#ede9fe", color: "#5b21b6", border: "#c4b5fd" },
  "Job": { bg: "#dbeafe", color: "#1d4ed8", border: "#93c5fd" },
  "Non-Job": { bg: "#fef9c3", color: "#854d0e", border: "#fde047" },
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
  return entries.reduce((sum, e) => sum + (parseFloat(e.hours) || 0), 0).toFixed(2);
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
  onClockIn, onClockOut,
  collapsible, userName, userInitials, entriesLoading,
}) {
  const [panelOpen, setPanelOpen] = useState(false);
  const isShiftActive = !!activeShift;
  const isTaskActive = !!activeTask;

  const taskTypeKey = activeTask?.entryType === "NonJob" ? "Non-Job" : activeTask?.entryType;
  const taskColor = ENTRY_TYPE_HEX[taskTypeKey] ?? "#6b7280";

  return (
    <Box
      sx={{
        width: collapsible ? "100%" : 300,
        minWidth: collapsible ? "auto" : 300,
        maxWidth: collapsible ? "100%" : 300,
        borderLeft: collapsible ? "none" : "1px solid",
        borderTop: collapsible ? "1px solid" : "none",
        borderColor: "divider",
        bgcolor: "#fff",
        display: "flex",
        flexDirection: "column",
        overflowY: collapsible ? "visible" : "auto",
        overflowX: "hidden",
        flexShrink: 0,
      }}
    >
      {/* ── Profile header ── */}
      <Box
        sx={{
          px: 2,
          pt: collapsible ? 1.5 : 2.5,
          pb: collapsible ? 1.5 : 2,
          borderBottom: collapsible && !panelOpen ? "none" : "1px solid",
          borderColor: "divider",
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          cursor: collapsible ? "pointer" : "default",
          flexShrink: 0,
        }}
        onClick={collapsible ? () => setPanelOpen((v) => !v) : undefined}
      >
        <Avatar
          sx={{
            width: 44,
            height: 44,
            fontSize: "0.9rem",
            fontWeight: 800,
            bgcolor: isShiftActive ? "#22c55e" : "#e8f0fe",
            color: isShiftActive ? "#fff" : "#1a6ef7",
            flexShrink: 0,
            transition: "background-color 0.4s ease",
            boxShadow: isShiftActive ? "0 0 0 3px rgba(34,197,94,0.2)" : "none",
          }}
        >
          {userInitials}
        </Avatar>

        <Box sx={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
          <Typography
            sx={{ fontWeight: 700, color: "#111", lineHeight: 1.2, fontSize: "0.9rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
          >
            {userName}
          </Typography>
          <Typography
            sx={{ color: entriesLoading ? "#aaa" : (isShiftActive ? "#22c55e" : "text.disabled"), fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}
          >
            {entriesLoading ? "Updating Status…" : (isShiftActive ? "● Clocked In" : "Off Duty")}
          </Typography>
        </Box>

        {collapsible && (
          <IconButton size="small" sx={{ color: "#aaa", flexShrink: 0, ml: "auto" }}>
            <ExpandMoreIcon
              sx={{ fontSize: 18, transform: panelOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }}
            />
          </IconButton>
        )}
      </Box>

      {/* ── Collapsible body ── */}
      <Collapse in={collapsible ? panelOpen : true} timeout="auto">
        {/* Daily Attendance */}
        <Box sx={{ px: 2, pt: 2, pb: 0 }}>
          <Typography sx={{ fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#aaa", mb: 1 }}>
            Daily Attendance
          </Typography>

          <Box
            onClick={isShiftActive ? () => onClockOut(activeShift) : () => onClockIn("DailyShift")}
            sx={{
              p: 1.5,
              borderRadius: "6px",
              bgcolor: isShiftActive ? "rgba(139,92,246,0.06)" : "#fafafa",
              border: "1px solid",
              borderColor: isShiftActive ? "rgba(139,92,246,0.25)" : "#ebebeb",
              cursor: "pointer",
              transition: "all 0.15s",
              "&:hover": { bgcolor: isShiftActive ? "rgba(139,92,246,0.1)" : "#f3f3f3" },
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.75 }}>
              <Typography sx={{ fontSize: "0.65rem", fontWeight: 800, color: isShiftActive ? "#7c3aed" : "#bbb", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                {isShiftActive ? "Shift Session" : "Ready to Start"}
              </Typography>
              {isShiftActive && (
                <Typography sx={{ fontSize: "0.7rem", fontWeight: 800, color: "#7c3aed", fontFamily: "monospace", fontVariantNumeric: "tabular-nums" }}>
                  {shiftElapsed}
                </Typography>
              )}
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {isShiftActive ? (
                <>
                  <LoginOutlinedIcon sx={{ fontSize: 16, color: "#7c3aed", flexShrink: 0 }} />
                  <Typography sx={{ fontSize: "0.88rem", fontWeight: 800, color: "#1a1a1a", flex: 1 }}>On Duty</Typography>
                  <Tooltip title="Click to end shift">
                    <LogoutOutlinedIcon sx={{ fontSize: 14, color: "#bbb", flexShrink: 0 }} />
                  </Tooltip>
                </>
              ) : (
                <>
                  <TimerOutlinedIcon sx={{ fontSize: 16, color: "#ccc", flexShrink: 0 }} />
                  <Typography sx={{ fontSize: "0.88rem", fontWeight: 700, color: "#bbb", flex: 1 }}>Start Your Day</Typography>
                  <LoginOutlinedIcon sx={{ fontSize: 14, color: "#1a6ef7", flexShrink: 0 }} />
                </>
              )}
            </Box>
          </Box>
        </Box>

        {/* Task Tracking */}
        <Box sx={{ px: 2, pt: 2, pb: 0 }}>
          <Typography sx={{ fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: isShiftActive ? "#aaa" : "#d0d0d0", mb: 1 }}>
            Task Tracking
          </Typography>

          {!isShiftActive ? (
            <Box sx={{ p: 1.5, border: "1px dashed #e0e0e0", borderRadius: "10px", textAlign: "center" }}>
              <Typography sx={{ fontSize: "0.75rem", color: "#bbb", fontWeight: 600 }}>
                Clock in for the day first
              </Typography>
            </Box>
          ) : isTaskActive ? (
            <Box
              onClick={() => onClockOut(activeTask)}
              sx={{
                p: 1.5,
                borderRadius: "10px",
                bgcolor: `${taskColor}08`,
                border: `1px solid ${taskColor}25`,
                cursor: "pointer",
                transition: "all 0.15s",
                "&:hover": { bgcolor: `${taskColor}14` },
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.5 }}>
                {activeTask.entryType === "Job"
                  ? <WorkOutlineIcon sx={{ fontSize: 13, color: taskColor, flexShrink: 0 }} />
                  : <HandymanOutlinedIcon sx={{ fontSize: 13, color: taskColor, flexShrink: 0 }} />
                }
                <Typography sx={{ fontSize: "0.62rem", fontWeight: 700, color: taskColor, textTransform: "uppercase", letterSpacing: "0.05em", flex: 1 }}>
                  {activeTask.entryType === "NonJob" ? "Non-Job" : "Active Job"}
                </Typography>
                <ActiveEntryTimer start={activeTask.clockInTime} color={taskColor} />
              </Box>
              <Typography
                sx={{ fontSize: "0.78rem", fontWeight: 600, color: "#333", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              >
                {activeTask.entryType === "Job"
                  ? (activeTask.workOrder?.label ?? "Work Order")
                  : (activeTask.taskDescription ?? "Non-Job Task")}
              </Typography>
              <Typography sx={{ fontSize: "0.62rem", color: "text.disabled", mt: 0.25 }}>
                Tap to complete task
              </Typography>
            </Box>
          ) : (
            <AppButton
              fullWidth
              variant="outlined"
              startIcon={<HandymanOutlinedIcon sx={{ fontSize: 15 }} />}
              onClick={() => onClockIn()}
              sx={{ fontSize: "0.8rem", py: 1 }}
            >
              Start New Task
            </AppButton>
          )}
        </Box>

        {/* Quick Stats */}
        <Box sx={{ px: 2, pt: 2, pb: 0, display: "flex", gap: 1 }}>
          <Paper elevation={0} sx={{ flex: 1, p: 1.25, border: "1px solid #f0f0f0", bgcolor: "#fafafa", borderRadius: "8px" }}>
            <Typography sx={{ fontSize: "0.6rem", fontWeight: 700, color: "#bbb", textTransform: "uppercase", letterSpacing: "0.05em", mb: 0.25 }}>
              Current Time
            </Typography>
            <Typography sx={{ fontSize: "0.85rem", fontWeight: 800, color: "#444", fontFamily: "monospace" }}>
              {liveClock}
            </Typography>
          </Paper>
          <Paper elevation={0} sx={{ flex: 1, p: 1.25, border: "1px solid #f0f0f0", bgcolor: "#fafafa", borderRadius: "8px" }}>
            <Typography sx={{ fontSize: "0.6rem", fontWeight: 700, color: "#bbb", textTransform: "uppercase", letterSpacing: "0.05em", mb: 0.25 }}>
              Hrs Today
            </Typography>
            <Typography sx={{ fontSize: "0.85rem", fontWeight: 800, color: "#444" }}>
              {entriesLoading ? "…" : `${totalHours(todayEntries)}h`}
            </Typography>
          </Paper>
        </Box>

        <Divider sx={{ mt: 2 }} />

        {/* Activity Feed */}
        <AttendanceActivityFeed activityFeed={activityFeed} />
      </Collapse>
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
        setApiError("Unable to load shift data. Please check your connection.");
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

  const userName = auth?.technician?.name ?? "…";
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
      
      // If the record was deleted from the database (404), don't restore it locally
      if (err.status === 404) {
        console.warn(`[clock-out] Record ${captured.backendEntryId} not found in database. Cleaning up local session…`);
        clearActiveEntry(typeKey);
        setApiError("Database record missing. Local session has been cleaned up.");
      } else {
        setActiveEntry(typeKey, captured);
        setApiError(`Clock-out failed: ${err.message || "server error"}.`);
      }
    }
  }

  const todayDate = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const getEntryLabel = (entry) => {
    if (!entry) return null;
    if (entry.entryType === "Job") return entry.workOrder?.label ?? "Work Order";
    if (entry.entryType === "DailyShift") return "Overall Day Shift";
    return entry.taskDescription ?? "Task";
  };

  const activityFeed = [
    ...Object.entries(activeEntries)
      .filter(([_, entry]) => !!entry)
      .map(([key, entry]) => ({
        time: new Date(entry.clockInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        label: getEntryLabel(entry),
        type: entry.entryType,
        active: true,
        clockInTime: entry.clockInTime,
      })),
    ...todayEntries.flatMap((e) => [
      { time: e.clockOut, label: e.description, type: e.entryType, event: "Clock Out", active: false },
      { time: e.clockIn, label: e.description, type: e.entryType, event: "Clock In", active: false },
    ]),
  ];

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
      description:
        e.entryType === "Job" ? (e.workOrder?.label ?? "Work Order")
          : e.entryType === "DailyShift" ? "Daily Attendance"
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

  const timingPanelProps = {
    activeEntries, activeShift, activeTask,
    liveClock, shiftElapsed, taskElapsed,
    todayEntries: filteredEntries,
    activityFeed,
    onClockIn: () => setClockInOpen(true),
    onClockOut: (entry) => { setActiveToOut(entry); setClockOutOpen(true); },
    userName, userInitials, entriesLoading,
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
          sx={{ border: "1px solid #e8e8e8", borderRadius: "12px", overflow: "hidden", bgcolor: "#fff" }}
        >
          <BoardTable
            minWidth={440}
            maxHeight={isMobile ? 320 : "calc(100vh - 260px)"}
            emptyMessage="No entries yet today — clock in to start tracking"
            columns={[
              { label: "Type", width: "120px" },
              { label: "Description", width: "auto" },
              { label: "Clock In", width: "90px" },
              { label: "Clock Out", width: "100px" },
              { label: "Hrs", width: "70px" },
              { label: "Status", width: "120px" },
            ]}
            rows={tableRows}
            renderRow={(row) => {
              if (String(row.id).startsWith("__skel_")) {
                return (
                  <TableRow key={row.id}>
                    {[90, 220, 80, 80, 45, 80].map((w, i) => (
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
                <TableRow key={row.id} hover sx={{ "&:hover": { bgcolor: "#fafafa" } }}>
                  <TableCell sx={DATA_CELL_SX}>
                    <TypeChip type={row.entryType} />
                  </TableCell>
                  <TableCell sx={DATA_CELL_SX}>
                    <Typography
                      sx={{ fontWeight: 500, color: "#333", fontSize: "0.82rem", maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    >
                      {row.description}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ ...DATA_CELL_SX, color: "#555", fontSize: "0.82rem" }}>
                    {row.clockIn}
                  </TableCell>
                  <TableCell sx={DATA_CELL_SX}>
                    {row._active ? (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "#22c55e", flexShrink: 0, animation: "pulse 1.5s ease infinite", "@keyframes pulse": { "0%,100%": { opacity: 1 }, "50%": { opacity: 0.4 } } }} />
                        <Typography sx={{ fontSize: "0.78rem", color: "#16a34a", fontWeight: 600 }}>Active</Typography>
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