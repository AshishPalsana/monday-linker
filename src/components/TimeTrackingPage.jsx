import {
  Box,
  Typography,
  TableRow,
  TableCell,
  Paper,
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
} from "@mui/material";
import { useBoardHeader, useBoardHeaderContext } from "../contexts/BoardHeaderContext";
import { parseBoardStatusColors } from "../utils/mondayUtils";
import { BOARD_IDS, MONDAY_COLUMNS, GROUP_IDS } from "../constants/monday";
import { ENTRY_TYPE_HEX } from "../constants/status";
import { BoardTable, DATA_CELL_SX, DASH } from "./BoardTable";
import { mondayClient } from "../services/monday/client";
import { FETCH_BOARD_DATA } from "../services/monday/queries";
import StatusChip from "./StatusChip";
import AppButton from "./AppButton";
import TimerOutlinedIcon from "@mui/icons-material/TimerOutlined";
import LoginOutlinedIcon from "@mui/icons-material/LoginOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import WorkOutlineIcon from "@mui/icons-material/WorkOutline";
import HandymanOutlinedIcon from "@mui/icons-material/HandymanOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
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
import { setRelationColumn } from "../services/monday/baseService";
import { createExpense } from "../services/monday/expenseService";
import { MOVE_ITEM_TO_GROUP, DELETE_ITEM } from "../services/monday/mutations";
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

// 1. Immediately creates the item in Random Stuff.
// 2. After 4 seconds, deletes any duplicate the backend/automation
//    placed in Active Work Orders so only one item remains.
async function ensureNonJobInRandomStuff(taskDescription) {
  try {
    await createMondayWorkOrder({
      name: taskDescription,
      groupId: GROUP_IDS.WORK_ORDERS_RANDOM_STUFF,
    });
  } catch (err) {
    console.error("[non-job] create in Random Stuff failed:", err);
  }

  // Wait for backend / Monday automations to finish creating their copy
  await new Promise((r) => setTimeout(r, 4000));

  try {
    const { data } = await mondayClient.query({
      query: SEARCH_WO_ITEMS,
      variables: { boardId: [BOARD_IDS.WORK_ORDERS] },
      fetchPolicy: "network-only",
    });
    const items = data?.boards?.[0]?.items_page?.items ?? [];
    const duplicates = items.filter(
      (item) =>
        item.group.id === GROUP_IDS.WORK_ORDERS_ACTIVE &&
        item.name === taskDescription
    );
    await Promise.all(
      duplicates.map((item) =>
        mondayClient.mutate({
          mutation: DELETE_ITEM,
          variables: { itemId: item.id },
        })
      )
    );
  } catch (err) {
    console.error("[non-job] cleanup Active Work Orders duplicate failed:", err);
  }
}

function formatEntry(entry) {
  return {
    id: entry.id,
    entryType: entry.entryType === "NonJob" ? "Non-Job" : entry.entryType,
    description: entry.workOrderLabel || entry.taskDescription || "—",
    clockIn: new Date(entry.clockIn).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    clockOut: entry.clockOut
      ? new Date(entry.clockOut).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
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

const STATUS_BADGE_COLOR = {
  Open: "#f59e0b",
  Complete: "#22c55e",
  Approved: "#3b82f6",
};

function EntryTypeChip({ type }) {
  const color = ENTRY_TYPE_HEX[type] ?? "#6b7280";
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        px: 1.25,
        height: 24,
        borderRadius: "4px",
        bgcolor: color + "22",
        border: `1.5px solid ${color}`,
      }}
    >
      <Typography
        sx={{
          fontSize: "0.7rem",
          fontWeight: 700,
          color,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          lineHeight: 1,
        }}
      >
        {type}
      </Typography>
    </Box>
  );
}

function StatusBadgeChip({ status }) {
  const color =
    STATUS_BADGE_COLOR[status] ??
    STATUS_BADGE_COLOR[
    Object.keys(STATUS_BADGE_COLOR).find(
      (k) => k.toLowerCase() === status?.toLowerCase()
    )
    ] ??
    "#6b7280";
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        px: 1.25,
        height: 24,
        borderRadius: "4px",
        bgcolor: color + "22",
        border: `1.5px solid ${color}`,
      }}
    >
      <Typography
        sx={{
          fontSize: "0.7rem",
          fontWeight: 700,
          color,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          lineHeight: 1,
        }}
      >
        {status}
      </Typography>
    </Box>
  );
}

function totalHours(entries) {
  return entries
    .reduce((sum, e) => sum + (parseFloat(e.hours) || 0), 0)
    .toFixed(2);
}

function useElapsedTimer(startIso) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!startIso) {
      setElapsed(0);
      return;
    }

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
    <Typography sx={{ fontSize: "0.65rem", fontWeight: 800, color, fontVariantNumeric: "tabular-nums" }}>
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
  return now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function TimingPanel({
  activeEntries,
  activeShift,
  activeTask,
  liveClock,
  shiftElapsed,
  taskElapsed,
  todayEntries,
  activityFeed,
  onClockIn,
  onClockOut,
  collapsible,
  userName,
  userInitials,
  entriesLoading,
}) {
  const [panelOpen, setPanelOpen] = useState(false);
  const isShiftActive = !!activeShift;
  const isTaskActive = !!activeTask;

  return (
    <Box
      sx={{
        width: collapsible ? "100%" : 350,
        minWidth: collapsible ? "auto" : 350,
        borderLeft: collapsible ? "none" : "1px solid",
        borderTop: collapsible ? "1px solid" : "none",
        borderColor: "divider",
        bgcolor: "background.paper",
        display: "flex",
        flexDirection: "column",
        overflowY: collapsible ? "visible" : "auto",
        flexShrink: 0,
      }}
    >
      <Box
        sx={{
          px: { xs: 2, sm: 2.5 },
          pt: { xs: 1.5, sm: 3 },
          pb: { xs: 1.5, sm: 2.5 },
          textAlign: collapsible ? "left" : "center",
          borderBottom: collapsible && !panelOpen ? "none" : "1px solid",
          borderColor: "divider",
          display: "flex",
          alignItems: "center",
          gap: collapsible ? 1.5 : 0,
          flexDirection: collapsible ? "row" : "column",
          cursor: collapsible ? "pointer" : "default",
        }}
        onClick={collapsible ? () => setPanelOpen((v) => !v) : undefined}
      >
        <Avatar
          sx={{
            width: collapsible ? 36 : 64,
            height: collapsible ? 36 : 64,
            fontSize: collapsible ? "0.85rem" : "1.3rem",
            fontWeight: 800,
            bgcolor: isShiftActive ? "#22c55e" : "#e8f0fe",
            color: isShiftActive ? "#fff" : "#1a6ef7",
            mx: collapsible ? 0 : "auto",
            mb: collapsible ? 0 : 1.25,
            transition: "background-color 0.4s ease",
            boxShadow: isShiftActive ? "0 0 0 4px rgba(34,197,94,0.2)" : "none",
            flexShrink: 0,
          }}
        >
          {userInitials}
        </Avatar>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="body1"
            sx={{ fontWeight: 700, color: "#111", lineHeight: 1.2 }}
          >
            {userName}
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: isShiftActive ? "#22c55e" : "text.disabled", fontSize: "0.75rem", fontWeight: 700 }}
          >
            {isShiftActive ? "CLOCKED IN" : "OFF DUTY"}
          </Typography>
        </Box>

        {collapsible && (
          <IconButton size="small" sx={{ color: "#aaa", flexShrink: 0 }}>
            <ExpandMoreIcon
              sx={{
                fontSize: 18,
                transform: panelOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s ease",
              }}
            />
          </IconButton>
        )}
      </Box>

      <Collapse in={collapsible ? panelOpen : true} timeout="auto">
        <Box sx={{ px: { xs: 2, sm: 2.5 }, pt: 2, pb: 2 }}>

          {/* Section: Daily Shift */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
            <Box
              sx={{ width: 3, height: 16, bgcolor: "#8b5cf6", borderRadius: 2 }}
            />
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 700, fontSize: "0.8rem", color: "#333" }}
            >
              Daily Attendance
            </Typography>
          </Box>

          <Box
            onClick={isShiftActive ? () => onClockOut(activeShift) : () => onClockIn("DailyShift")}
            sx={{
              mb: 3,
              p: 2,
              borderRadius: 2,
              bgcolor: isShiftActive ? "rgba(139,92,246,0.06)" : "#fafafa",
              border: "1px solid",
              borderColor: isShiftActive ? "rgba(139,92,246,0.2)" : "#eee",
              cursor: "pointer",
              transition: "all 0.2s",
              "&:hover": { bgcolor: isShiftActive ? "rgba(139,92,246,0.1)" : "#f5f5f5" }
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: isShiftActive ? "#8b5cf6" : "#aaa", textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {isShiftActive ? "Shift Session" : "Ready to Start"}
              </Typography>
              {isShiftActive && (
                <Typography sx={{ fontSize: '0.65rem', fontWeight: 800, color: '#8b5cf6', fontVariantNumeric: 'tabular-nums' }}>
                  {shiftElapsed}
                </Typography>
              )}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {isShiftActive ? (
                <>
                  <LoginOutlinedIcon sx={{ fontSize: 18, color: '#8b5cf6' }} />
                  <Typography sx={{ fontSize: '1rem', fontWeight: 800, color: '#333' }}>
                    On Duty
                  </Typography>
                  <Box sx={{ flex: 1 }} />
                  <LogoutOutlinedIcon sx={{ fontSize: 16, color: '#aaa' }} />
                </>
              ) : (
                <>
                  <TimerOutlinedIcon sx={{ fontSize: 18, color: '#bbb' }} />
                  <Typography sx={{ fontSize: '1rem', fontWeight: 800, color: '#aaa' }}>
                    Start Your Day
                  </Typography>
                  <Box sx={{ flex: 1 }} />
                  <LoginOutlinedIcon sx={{ fontSize: 16, color: '#1a6ef7' }} />
                </>
              )}
            </Box>
          </Box>

          {/* Section: Task Tracking */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5, opacity: isShiftActive ? 1 : 0.5 }}>
            <Box
              sx={{ width: 3, height: 16, bgcolor: "#1a6ef7", borderRadius: 2 }}
            />
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 700, fontSize: "0.8rem", color: "#333" }}
            >
              Task Tracking
            </Typography>
          </Box>

          {!isShiftActive ? (
            <Paper elevation={0} sx={{ p: 2, textAlign: 'center', bgcolor: '#fdfdfd', border: '1px dashed #ddd', mb: 2 }}>
              <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600 }}>
                Clock in for the day to enable task tracking
              </Typography>
            </Paper>
          ) : isTaskActive ? (
            <Box
              sx={{
                mb: 2,
                px: 1.5,
                py: 1.25,
                bgcolor: `${ENTRY_TYPE_HEX[activeTask.entryType === 'NonJob' ? 'Non-Job' : activeTask.entryType]}08`,
                border: `1px solid ${ENTRY_TYPE_HEX[activeTask.entryType === 'NonJob' ? 'Non-Job' : activeTask.entryType]}22`,
                borderRadius: 1,
                display: "flex",
                flexDirection: "column",
                gap: 0.5,
                cursor: "pointer",
                "&:hover": { bgcolor: `${ENTRY_TYPE_HEX[activeTask.entryType === 'NonJob' ? 'Non-Job' : activeTask.entryType]}12` }
              }}
              onClick={() => onClockOut(activeTask)}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                {activeTask.entryType === "Job" ? (
                  <WorkOutlineIcon sx={{ fontSize: 13, color: ENTRY_TYPE_HEX.Job }} />
                ) : (
                  <HandymanOutlinedIcon sx={{ fontSize: 13, color: ENTRY_TYPE_HEX["Non-Job"] }} />
                )}
                <Typography variant="caption" sx={{ fontSize: "0.65rem", fontWeight: 700, color: ENTRY_TYPE_HEX[activeTask.entryType === 'NonJob' ? 'Non-Job' : activeTask.entryType], textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {activeTask.entryType === "NonJob" ? "Non-Job" : "Active Job"}
                </Typography>
                <Box sx={{ flex: 1 }} />
                <ActiveEntryTimer start={activeTask.clockInTime} color={ENTRY_TYPE_HEX[activeTask.entryType === 'NonJob' ? 'Non-Job' : activeTask.entryType]} />
              </Box>
              <Typography
                variant="caption"
                sx={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "#333",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {activeTask.entryType === "Job"
                  ? (activeTask.workOrder?.label ?? "Work Order")
                  : (activeTask.taskDescription ?? "Non-Job Task")}
              </Typography>
              <Typography variant="caption" sx={{ fontSize: "0.62rem", color: "text.disabled" }}>
                Tap to complete task
              </Typography>
            </Box>
          ) : (
            <AppButton
              fullWidth
              variant="outlined"
              startIcon={<HandymanOutlinedIcon sx={{ fontSize: 16 }} />}
              onClick={() => onClockIn()}
              sx={{ mb: 2 }}
            >
              Start New Task
            </AppButton>
          )}

          <Box sx={{ display: 'flex', gap: 1, mb: 1, opacity: isShiftActive ? 1 : 0.8 }}>
            <Paper elevation={0} sx={{ flex: 1, p: 1.5, textAlign: 'center', border: '1px solid #eee', bgcolor: '#fafafa' }}>
              <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 700, fontSize: '0.6rem', textTransform: 'uppercase' }}>
                Current Time
              </Typography>
              <Typography sx={{ fontSize: '0.9rem', fontWeight: 800, color: '#555' }}>
                {liveClock}
              </Typography>
            </Paper>
            <Paper elevation={0} sx={{ flex: 1, p: 1.5, textAlign: 'center', border: '1px solid #eee', bgcolor: '#fafafa' }}>
              <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 700, fontSize: '0.6rem', textTransform: 'uppercase' }}>
                Hrs Today
              </Typography>
              <Typography sx={{ fontSize: '0.9rem', fontWeight: 800, color: '#555' }}>
                {entriesLoading ? "..." : `${totalHours(todayEntries)}h`}
              </Typography>
            </Paper>
          </Box>
        </Box>

        <Divider />

        <Box sx={{ px: { xs: 2, sm: 2.5 }, pt: 2, pb: 3 }}>
          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 700, fontSize: "0.8rem", color: "#333", mb: 1.5 }}
          >
            Attendance Activity
          </Typography>

          {activityFeed.length === 0 ? (
            <Typography variant="caption" sx={{ color: "text.disabled" }}>
              No activity yet today
            </Typography>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {activityFeed.map((item, idx) => {
                const typeColor = ENTRY_TYPE_HEX[item.type] ?? "#888";
                return (
                  <Box
                    key={idx}
                    sx={{ display: "flex", gap: 1.25, position: "relative" }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        mt: "3px",
                      }}
                    >
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          flexShrink: 0,
                          bgcolor: item.active ? "#22c55e" : typeColor,
                          border: "2px solid white",
                          boxShadow: item.active
                            ? "0 0 0 2px rgba(34,197,94,0.4)"
                            : `0 0 0 2px ${typeColor}33`,
                        }}
                      />
                      {idx < activityFeed.length - 1 && (
                        <Box
                          sx={{
                            width: 1.5,
                            flex: 1,
                            minHeight: 20,
                            bgcolor: "#ebebeb",
                            my: 0.25,
                          }}
                        />
                      )}
                    </Box>
                    <Box sx={{ pb: 1.5 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 700,
                          fontSize: "0.75rem",
                          color: "#333",
                          display: "block",
                          lineHeight: 1.2,
                        }}
                      >
                        {item.time}
                        {item.active && (
                          <Box
                            component="span"
                            sx={{
                              ml: 0.75,
                              fontSize: "0.62rem",
                              fontWeight: 800,
                              color: "#22c55e",
                              letterSpacing: "0.05em",
                            }}
                          >
                            LIVE
                          </Box>
                        )}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "text.disabled",
                          fontSize: "0.7rem",
                          display: "block",
                        }}
                      >
                        {item.active ? `Clocked in ${item.type}` : item.event}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: typeColor,
                          fontSize: "0.68rem",
                          fontWeight: 600,
                          display: "block",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          maxWidth: 180,
                        }}
                      >
                        {item.label}
                      </Typography>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>
      </Collapse>
    </Box>
  );
}

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
  const clockedIn = isShiftActive;

  const socket = useSocket();
  const requestedSocketRef = useRef(null);

  const [todayEntries, setTodayEntries] = useState([]);
  const [entriesLoading, setEntriesLoading] = useState(true);
  const [clockInOpen, setClockInOpen] = useState(false);
  const [clockOutOpen, setClockOutOpen] = useState(false);
  const [clockOutLoading, setClockOutLoading] = useState(false);
  const [activeToOut, setActiveToOut] = useState(null); // Which entry are we clocking out?
  const [apiError, setApiError] = useState(null);
  const [statusColors, setStatusColors] = useState({});

  const dispatch = useDispatch();





  useEffect(() => {
    if (!token) return;
    dispatch(fetchWorkOrders());
    dispatch(fetchLocations());

    // Fetch board metadata for colors
    mondayClient.query({
      query: FETCH_BOARD_DATA,
      variables: { boardId: [BOARD_IDS.TIME_ENTRIES] }
    }).then(({ data }) => {
      if (data?.boards?.[0]) {
        setStatusColors(parseBoardStatusColors(data.boards[0]));
      }
    }).catch(err => console.error("[time-tracker] Metadata fetch error:", err));
  }, [token, dispatch]);

  // Primary load: REST API — more reliable than socket-only path since it
  // uses the JWT directly (no socket auth mismatch possible) and re-fires
  // whenever the component remounts (navigation away and back).
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    timeEntriesApi
      .getToday(token)
      .then(({ data }) => {
        if (cancelled) return;
        setTodayEntries(
          (data ?? []).filter((e) => e.clockOut && isToday(e.clockIn)).map(formatEntry),
        );
        setEntriesLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[today-log] REST fetch error:", err);
        setEntriesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!socket) return;

    function onTodayData({ data }) {
      setTodayEntries(
        (data ?? []).filter((e) => e.clockOut && isToday(e.clockIn)).map(formatEntry),
      );
      setEntriesLoading(false);
    }

    function onClockOut(payload) {
      if (payload.technicianId !== auth?.technician?.id) return;
      if (!isToday(payload.clockIn)) return;

      const realEntry = {
        id: payload.entryId,
        entryType:
          payload.entryType === "NonJob" ? "Non-Job" : payload.entryType,
        description: payload.workOrderLabel || payload.taskDescription || "—",
        clockIn: new Date(payload.clockIn).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        clockOut: new Date(payload.clockOut).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        hours: parseFloat(payload.hoursWorked) || 0,
        status: payload.status || "Complete",
      };

      setTodayEntries((prev) => {
        const tempIdx = prev.findIndex((e) => String(e.id).startsWith("temp-"));
        if (tempIdx !== -1) {
          const next = [...prev];
          next[tempIdx] = realEntry;
          return next;
        }
        if (prev.some((e) => e.id === payload.entryId)) {
          return prev.map((e) => (e.id === payload.entryId ? realEntry : e));
        }
        return [realEntry, ...prev];
      });
    }

    socket.on("today:data", onTodayData);
    socket.on("clock_out", onClockOut);

    return () => {
      socket.off("today:data", onTodayData);
      socket.off("clock_out", onClockOut);
    };
  }, [socket, auth?.technician?.id]);

  useEffect(() => {
    if (!socket || requestedSocketRef.current === socket) return;
    requestedSocketRef.current = socket;
    socket.emit("today:request");
  }, [socket]);

  const userName = auth?.technician?.name ?? "…";
  const userInitials =
    userName !== "…"
      ? userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
      : "?";

  const { data: woData, loading: woLoading } = useSelector((s) => s.workOrders);

  const rawWorkOrders = woData?.items_page?.items ?? EMPTY_ITEMS;

  const workOrders = useMemo(() => {
    const currentUserId = String(auth?.technician?.id || "");
    const isAdmin = !!auth?.technician?.isAdmin;

    return (rawWorkOrders || [])
      .filter((item) => {
        const isInActiveGroup = !item.group || item.group.id === GROUP_IDS.WORK_ORDERS_ACTIVE;
        if (!isInActiveGroup) return false;

        if (isAdmin) return true;

        const techColId = MONDAY_COLUMNS.WORK_ORDERS.TECHNICIAN;
        const techVal = item.column_values?.find((cv) => cv.id === techColId);

        const assignedIds = techVal?.persons_and_teams?.map(p => String(p.id)) || [];
        return assignedIds.includes(currentUserId);
      })
      .map((item) => {
        return { id: item.id, label: item.name };
      });
  }, [rawWorkOrders, auth?.technician]);

  // Calculate elapsed timers for both levels
  const shiftElapsed = useElapsedTimer(activeShift?.clockInTime);
  const taskElapsed = useElapsedTimer(activeTask?.clockInTime);
  const liveClock = useLiveClock();

  async function handleClockIn(data) {
    const typeKey = data.entryType === "Non-Job" ? "NonJob" : data.entryType;
    const optimistic = { ...data, backendEntryId: null };

    // If starting a new task while one is active, clear the old one optimistically
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

      if (typeKey === "NonJob" && data.taskDescription) {
        ensureNonJobInRandomStuff(data.taskDescription);
      }
    } catch (err) {
      if (err.status === 409 && err.data?.activeEntryId) {
        setActiveEntry(typeKey, {
          ...optimistic,
          backendEntryId: err.data.activeEntryId,
        });
      } else {
        console.error("[clock-in] API error:", err);
        clearActiveEntry(typeKey);
        setApiError(
          `Clock-in failed: ${err.message || "server error"}. Please try again.`,
        );
      }
    }
  }

  async function handleClockOut(data) {
    if (!activeToOut) return;
    setClockOutLoading(true);

    const typeKey = activeToOut.entryType === "Non-Job" ? "NonJob" : activeToOut.entryType;
    const isEndingShift = typeKey === "DailyShift";

    const inTime = new Date(activeToOut.clockInTime).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const nowTime = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const diffMs = Date.now() - new Date(activeToOut.clockInTime);
    const diffHours = Math.max(0, parseFloat((diffMs / 3_600_000).toFixed(2)));

    const optimisticEntry = {
      id: `temp-${Date.now()}`,
      entryType: activeToOut.entryType,
      description:
        activeToOut.entryType === "Job"
          ? (activeToOut.workOrder?.label ?? "Work Order")
          : activeToOut.entryType === "DailyShift"
            ? "Overall Day Shift"
            : (activeToOut.taskDescription ?? "Task"),
      clockIn: inTime,
      clockOut: nowTime,
      hours: diffHours > 0 ? diffHours : 0.01,
      status: "Open",
    };

    let captured = activeToOut;
    const clockInIsToday = isToday(captured.clockInTime);

    if (clockInIsToday) {
      setTodayEntries((prev) => [optimisticEntry, ...prev]);
    }

    // Requirement: If ending Shift, clear ALL active entries
    if (isEndingShift) {
      clearActiveEntry("DailyShift");
      clearActiveEntry("Job");
      clearActiveEntry("NonJob");
    } else {
      clearActiveEntry(typeKey);
    }

    setClockOutOpen(false);
    setClockOutLoading(false);
    setActiveToOut(null);

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
      if (clockInIsToday) {
        setTodayEntries((prev) => prev.filter((e) => e.id !== optimisticEntry.id));
      }
      setActiveEntry(typeKey, captured);
      setApiError(`Clock-out failed: ${err.message || "server error"}.`);
    }
  }

  const todayDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

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
        clockInTime: entry.clockInTime
      })),
    ...todayEntries.flatMap((e) => [
      {
        time: e.clockOut,
        label: e.description,
        type: e.entryType,
        event: "Clock Out",
        active: false,
      },
      {
        time: e.clockIn,
        label: e.description,
        type: e.entryType,
        event: "Clock In",
        active: false,
      },
    ]),
  ];

  const timingPanelProps = {
    activeEntries,
    activeShift,
    activeTask,
    liveClock,
    shiftElapsed,
    taskElapsed,
    todayEntries,
    activityFeed,
    onClockIn: (type) => {
      setClockInOpen(true);
    },
    onClockOut: (entry) => {
      setActiveToOut(entry);
      setClockOutOpen(true);
    },
    userName,
    userInitials,
    entriesLoading,
  };

  const handleHeaderClockIn = useCallback(() => setClockInOpen(true), []);

  useBoardHeader({
    title: "Time Tracker",
    count: todayDate,
    countLabel: "",
    buttonLabel: isShiftActive ? (isTaskActive ? "Switch Task" : "Start Task") : "Clock In for Day",
    onButtonClick: handleHeaderClockIn,
  });

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
        height: "100%",
        minHeight: 0,
        overflow: { xs: "auto", md: "hidden" },
      }}
    >
      <Box
        sx={{
          flex: 1,
          p: { xs: 2, sm: 2.5, md: 3 },
          overflowY: { xs: "visible", md: "auto" },
          minWidth: 0,
        }}
      >

        <Box
          sx={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            mb: 1.5,
          }}
        >
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 700, fontSize: "0.9rem" }}
          >
            {"Today's Log"}
          </Typography>
          <Typography variant="caption" sx={{ color: "text.disabled" }}>
            {totalHours(search ? todayEntries.filter(e => {
              const q = search.toLowerCase();
              return e.entryType?.toLowerCase().includes(q) || e.description?.toLowerCase().includes(q) || e.status?.toLowerCase().includes(q);
            }) : todayEntries)} hrs total
          </Typography>
        </Box>

        <BoardTable
          minWidth={420}
          maxHeight={isMobile ? 320 : 500}
          emptyMessage="No entries yet today - clock in to start tracking"
          columns={[
            { label: "Type", width: "100px" },
            { label: "Description", width: "auto" },
            { label: "Clock In", width: "100px" },
            { label: "Clock Out", width: "100px" },
            { label: "Hrs", width: "60px" },
            { label: "Status", width: "100px" },
          ]}
          rows={
            entriesLoading
              ? [
                { id: "__skel_1__" },
                { id: "__skel_2__" },
                { id: "__skel_3__" },
              ]
              : [
                ...Object.values(activeEntries)
                  .filter(e => !!e)
                  .sort((a, b) => (a.entryType === 'DailyShift' ? -1 : 1))
                  .map(e => ({
                    id: e.backendEntryId ?? `active-${e.entryType}`,
                    entryType: e.entryType === "NonJob" ? "Non-Job" : e.entryType === "DailyShift" ? "Daily Shift" : e.entryType,
                    description: e.entryType === "Job"
                      ? (e.workOrder?.label ?? "Work Order")
                      : e.entryType === "DailyShift" ? "Daily Attendance" : (e.taskDescription ?? "Task"),
                    clockIn: new Date(e.clockInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                    clockOut: null,
                    hours: null,
                    status: "Open",
                    _active: true,
                  })),
                ...todayEntries,
                ...(todayEntries.length > 0 ? [{ id: "__total__" }] : []),
              ]
          }
          renderRow={(row) => {
            if (String(row.id).startsWith("__skel_")) {
              return (
                <TableRow key={row.id}>
                  {[100, 260, 100, 100, 48, 100].map((w, i) => (
                    <TableCell key={i} sx={DATA_CELL_SX}>
                      <Skeleton variant="text" width={w} />
                    </TableCell>
                  ))}
                </TableRow>
              );
            }
            if (row.id === "__total__") {
              return (
                <TableRow key="total" sx={{ bgcolor: "rgba(0,0,0,0.02)" }}>
                  <TableCell colSpan={4} sx={{ ...DATA_CELL_SX, fontWeight: 800, textAlign: "right" }}>
                    Daily Total
                  </TableCell>
                  <TableCell sx={{ ...DATA_CELL_SX, fontWeight: 800, color: "#1a6ef7" }}>
                    {totalHours(todayEntries)}h
                  </TableCell>
                  <TableCell sx={DATA_CELL_SX} />
                </TableRow>
              );
            }

            const typeColor = ENTRY_TYPE_HEX[row.entryType] ?? "#888";
            return (
              <TableRow key={row.id} hover>
                <TableCell sx={DATA_CELL_SX}>
                  <Chip
                    label={row.entryType}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: "0.65rem",
                      fontWeight: 800,
                      textTransform: "uppercase",
                      bgcolor: `${typeColor}15`,
                      color: typeColor,
                      border: `1px solid ${typeColor}30`,
                    }}
                  />
                </TableCell>
                <TableCell sx={DATA_CELL_SX}>
                  <span
                    style={{
                      fontWeight: 600,
                      color: "#333",
                      display: "block",
                      maxWidth: 240,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {row.description}
                  </span>
                </TableCell>
                <TableCell sx={DATA_CELL_SX}>{row.clockIn}</TableCell>
                <TableCell sx={DATA_CELL_SX}>
                  {row._active ? (
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 0.75 }}
                    >
                      <Box
                        sx={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          bgcolor: "#22c55e",
                          flexShrink: 0,
                        }}
                      />
                      <Typography
                        sx={{
                          fontSize: "0.75rem",
                          color: "#22c55e",
                          fontWeight: 600,
                        }}
                      >
                        Active
                      </Typography>
                    </Box>
                  ) : (
                    (row.clockOut ?? DASH)
                  )}
                </TableCell>
                <TableCell
                  sx={{ ...DATA_CELL_SX, fontWeight: 600, color: "#111" }}
                >
                  {row._active ? DASH : (parseFloat(row.hours) || 0).toFixed(2)}
                </TableCell>
                <TableCell sx={DATA_CELL_SX}>
                  <StatusBadgeChip status={row.status} />
                </TableCell>
              </TableRow>
            );
          }}
        />
      </Box>

      <TimingPanel {...timingPanelProps} collapsible={isMobile} />

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
        onClose={() => {
          if (clockOutLoading) return;
          setClockOutOpen(false);
          setActiveToOut(null);
        }}
        onConfirm={handleClockOut}
        activeEntry={activeToOut}
        loading={clockOutLoading}
      />

      <Snackbar
        open={!!apiError}
        autoHideDuration={2000}
        onClose={() => setApiError(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity="error"
          onClose={() => setApiError(null)}
          sx={{ width: "100%" }}
        >
          {apiError}
        </Alert>
      </Snackbar>
    </Box>
  );
}
