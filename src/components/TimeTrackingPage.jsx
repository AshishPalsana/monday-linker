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
import { useBoardHeader } from "../contexts/BoardHeaderContext";
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
import { useState, useEffect, useRef, useCallback } from "react";
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

function StatusChipSmall({ status, colorMap }) {
  return <StatusChip status={status} colorMap={colorMap} />;
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
  liveClock,
  elapsed,
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
  const clockedIn = Object.values(activeEntries).some(e => !!e);

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
            bgcolor: clockedIn ? "#22c55e" : "#e8f0fe",
            color: clockedIn ? "#fff" : "#1a6ef7",
            mx: collapsible ? 0 : "auto",
            mb: collapsible ? 0 : 1.25,
            transition: "background-color 0.4s ease",
            boxShadow: clockedIn ? "0 0 0 4px rgba(34,197,94,0.2)" : "none",
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
            sx={{ color: "text.disabled", fontSize: "0.75rem" }}
          >
            Technician
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
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <Box
              sx={{ width: 3, height: 16, bgcolor: "#1a6ef7", borderRadius: 2 }}
            />
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 700, fontSize: "0.8rem", color: "#333" }}
            >
              My Timing
            </Typography>
          </Box>

          <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
            <Paper
              elevation={0}
              sx={{
                flex: 1,
                textAlign: "center",
                py: 1.5,
                px: 1,
                border: "1px solid",
                borderColor: clockedIn ? "rgba(34,197,94,0.4)" : "#e4e4e4",
                borderRadius: 1,
                bgcolor: clockedIn ? "rgba(34,197,94,0.04)" : "#fafafa",
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: clockedIn ? "#15803d" : "text.disabled",
                  fontWeight: 600,
                  fontSize: "0.65rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  display: "block",
                  mb: 0.5,
                }}
              >
                {clockedIn ? "Session" : "Time"}
              </Typography>
              <Typography
                sx={{
                  fontSize: "1rem",
                  fontWeight: 800,
                  letterSpacing: "-0.5px",
                  fontVariantNumeric: "tabular-nums",
                  color: clockedIn ? "#15803d" : "#888",
                }}
              >
                {clockedIn ? elapsed : liveClock}
              </Typography>
            </Paper>

            <Paper
              elevation={0}
              sx={{
                flex: 1,
                textAlign: "center",
                py: 1.5,
                px: 1,
                border: "1px solid #e4e4e4",
                borderRadius: 1,
                bgcolor: "#fafafa",
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: "text.disabled",
                  fontWeight: 600,
                  fontSize: "0.65rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  display: "block",
                  mb: 0.5,
                }}
              >
                Today
              </Typography>
              <Typography
                sx={{
                  fontSize: "1rem",
                  fontWeight: 800,
                  letterSpacing: "-0.5px",
                  color: "#555",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {entriesLoading ? (
                  <Skeleton
                    variant="text"
                    width={40}
                    height={20}
                    sx={{ mx: "auto", borderRadius: 1 }}
                  />
                ) : (
                  <>{totalHours(todayEntries)}h</>
                )}
              </Typography>
            </Paper>
          </Box>
          {Object.entries(activeEntries).map(([type, entry]) => {
            if (!entry) return null;
            const label = entry.entryType === "Job"
              ? (entry.workOrder?.label ?? "Work Order")
              : (entry.taskDescription ?? entry.entryType);
            const typeColor = ENTRY_TYPE_HEX[entry.entryType === "NonJob" ? "Non-Job" : entry.entryType];

            return (
              <Box
                key={type}
                sx={{
                  mb: 1,
                  px: 1.5,
                  py: 1.25,
                  bgcolor: `${typeColor}08`,
                  border: `1px solid ${typeColor}22`,
                  borderRadius: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 0.5,
                  cursor: "pointer",
                  "&:hover": { bgcolor: `${typeColor}12` }
                }}
                onClick={() => onClockOut(entry)}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  {entry.entryType === "Job" ? (
                    <WorkOutlineIcon sx={{ fontSize: 13, color: typeColor }} />
                  ) : (
                    <HandymanOutlinedIcon sx={{ fontSize: 13, color: typeColor }} />
                  )}
                  <Typography variant="caption" sx={{ fontSize: "0.65rem", fontWeight: 700, color: typeColor, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {entry.entryType === "NonJob" ? "Non-Job" : entry.entryType}
                  </Typography>
                  <Box sx={{ flex: 1 }} />
                  <ActiveEntryTimer start={entry.clockInTime} color={typeColor} />
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
                  {label}
                </Typography>
                <Typography variant="caption" sx={{ fontSize: "0.62rem", color: "text.disabled" }}>
                  Tap to clock out
                </Typography>
              </Box>
            );
          })}

          <AppButton
            fullWidth
            startIcon={<LoginOutlinedIcon sx={{ fontSize: 16 }} />}
            onClick={onClockIn}
            sx={{ mt: Object.values(activeEntries).some(e => !!e) ? 1 : 0 }}
          >
            New Session
          </AppButton>
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

  const { activeEntries, setActiveEntry, clearActiveEntry } = useActiveEntry();
  const activeEntry = activeEntries.Job || activeEntries.Travel || activeEntries.NonJob;
  const clockedIn = Object.values(activeEntries).some(e => !!e);
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
  const rawWorkOrders = useSelector(
    (s) => s.workOrders.board?.items_page?.items ?? EMPTY_ITEMS,
  );
  const woLoading = useSelector((s) => s.workOrders.loading);

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

  const workOrders = rawWorkOrders
    .filter((item) => !item.group || item.group.id === GROUP_IDS.WORK_ORDERS_ACTIVE)
    .map((item) => {
      const woIdCol = item.column_values?.find((cv) => cv.id === "text_mm1s82bz");
      const woId = woIdCol?.text || "";
      return { id: item.id, label: woId ? `${woId} · ${item.name}` : item.name };
    });

  const elapsed = useElapsedTimer(clockedIn ? activeEntry?.clockInTime : null);
  const liveClock = useLiveClock();

  async function handleClockIn(data) {
    const typeKey = data.entryType === "Non-Job" ? "NonJob" : data.entryType;
    const optimistic = { ...data, backendEntryId: null };

    // If starting a new Job, auto-clear previous Job optimistic state
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

      // For Non-Job: create in Random Stuff immediately, then clean up any
      // duplicate the backend/automation puts in Active Work Orders.
      if (typeKey === "NonJob" && data.taskDescription) {
        ensureNonJobInRandomStuff(data.taskDescription); // intentionally not awaited
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
          : (activeToOut.taskDescription ?? "Task"),
      clockIn: inTime,
      clockOut: nowTime,
      hours: diffHours > 0 ? diffHours : 0.01,
      status: "Open",
    };

    let captured = activeToOut;
    const clockInIsToday = isToday(captured.clockInTime);

    if (!captured.backendEntryId) {
      try {
        const { data: todayData } = await timeEntriesApi.getToday(token);
        const openEntry = (todayData ?? []).find((e) => !e.clockOut);
        if (openEntry?.id) {
          captured = { ...captured, backendEntryId: openEntry.id };
          setActiveEntry(typeKey, captured);
        } else {
          setApiError("Clock-out failed: no active session found on server.");
          setClockOutOpen(false);
          setClockOutLoading(false);
          return;
        }
      } catch {
        setApiError("Clock-out failed: could not reach server. Try again.");
        setClockOutOpen(false);
        setClockOutLoading(false);
        return;
      }
    }

    if (clockInIsToday) {
      setTodayEntries((prev) => [optimisticEntry, ...prev]);
    }
    clearActiveEntry(typeKey);
    setClockOutOpen(false);
    setClockOutLoading(false);
    setActiveToOut(null);

    try {
      const clockOutResult = await timeEntriesApi.clockOut(token, captured.backendEntryId, {
        narrative: data.narrative,
        jobLocation: data.location?.label ?? data.location ?? "",
        jobLocationId: data.location?.id ?? null,
        expenses: data.expenses,
        markComplete: data.markComplete ?? false,
      });

      const mondayItemId = clockOutResult?.data?.mondayItemId;

      if (data.location?.id && mondayItemId) {
        setRelationColumn(
          BOARD_IDS.TIME_ENTRIES,
          mondayItemId,
          MONDAY_COLUMNS.TIME_ENTRIES.LOCATIONS_REL,
          data.location.id,
        ).catch((err) => console.error("[clock-out] Location relation failed:", err));
      }

      if (data.expenses?.length) {
        const workOrderId = captured.workOrder?.id ?? null;
        const technicianId = auth?.technician?.id ?? null;
        if (!mondayItemId) {
          setApiError("Expense creation failed: Could not link to time entry. Please try again.");
        } else {
          data.expenses.forEach((expense) => {
            createExpense({
              type: expense.type,
              amount: expense.amount,
              description: expense.description,
              timeEntryMondayId: mondayItemId,
              workOrderId,
              technicianId,
            }).catch((err) => console.error("[clock-out] Expense creation failed:", err));
          });
        }
      }
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
  const activeLabel =
    clockedIn && activeEntry
      ? activeEntry.entryType === "Job"
        ? (activeEntry.workOrder?.label ?? "Work Order")
        : (activeEntry.taskDescription ?? "Task")
      : null;

  const activityFeed = [
    ...(clockedIn && activeEntry
      ? [
        {
          time: new Date(activeEntry.clockInTime).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          label: activeLabel,
          type: activeEntry.entryType,
          active: true,
        },
      ]
      : []),
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
    liveClock,
    elapsed,
    todayEntries,
    activityFeed,
    onClockIn: () => setClockInOpen(true),
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
    buttonLabel: "Clock In",
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
            {totalHours(todayEntries)} hrs total
          </Typography>
        </Box>

        <BoardTable
          minWidth={420}
          maxHeight={isMobile ? 320 : 500}
          emptyMessage="No entries yet today - clock in to start tracking"
          columns={[
            { label: "Type", width: "90px" },
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
                  .map(e => ({
                    id: e.backendEntryId ?? `active-${e.entryType}`,
                    entryType: e.entryType === "NonJob" ? "Non-Job" : e.entryType,
                    description: e.entryType === "Job"
                      ? (e.workOrder?.label ?? "Work Order")
                      : (e.taskDescription ?? "Task"),
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
                  {[90, 260, 60, 60, 48, 72].map((w, i) => (
                    <TableCell key={i} sx={DATA_CELL_SX}>
                      <Skeleton
                        variant="rounded"
                        width={w}
                        height={14}
                        sx={{ borderRadius: 1 }}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              );
            }
            if (row.id === "__total__") {
              return (
                <TableRow key="total" sx={{ bgcolor: "#f4f8ff" }}>
                  <TableCell
                    colSpan={4}
                    sx={{ ...DATA_CELL_SX, fontWeight: 600, color: "#555" }}
                  >
                    Total
                  </TableCell>
                  <TableCell
                    sx={{
                      ...DATA_CELL_SX,
                      fontWeight: 700,
                      color: "#1a6ef7",
                    }}
                  >
                    {totalHours(todayEntries)}
                  </TableCell>
                  <TableCell sx={DATA_CELL_SX} />
                </TableRow>
              );
            }
            return (
              <TableRow
                key={row.id}
                hover
                sx={row._active ? { bgcolor: "rgba(34,197,94,0.04)" } : {}}
              >
                <TableCell sx={DATA_CELL_SX}>
                  <StatusChip status={row.entryType} colorMap={statusColors} />
                </TableCell>
                <TableCell sx={DATA_CELL_SX}>
                  <span
                    title={row.description}
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      display: "block",
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
                  <StatusChipSmall status={row.status} colorMap={statusColors} />
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
        autoHideDuration={7000}
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
