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
import { BoardTable, DATA_CELL_SX, DASH } from "./BoardTable";
import AppButton from "./AppButton";
import TimerOutlinedIcon from "@mui/icons-material/TimerOutlined";
import LoginOutlinedIcon from "@mui/icons-material/LoginOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import WorkOutlineIcon from "@mui/icons-material/WorkOutline";
import HandymanOutlinedIcon from "@mui/icons-material/HandymanOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchWorkOrders } from "../store/workOrderSlice";
import ClockInModal from "./ClockInModal";
import ClockOutModal from "./ClockOutModal";
import { useAuth } from "../hooks/useAuth";
import { useActiveEntry } from "../hooks/useActiveEntry";
import { useSocket } from "../hooks/useSocket";
import { timeEntriesApi } from "../services/api";

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

const ENTRY_TYPE_HEX = { Job: "#4f8ef7", "Non-Job": "#a855f7" };
const STATUS_HEX = {
  Open: "#f59e0b",
  Complete: "#22c55e",
  Approved: "#4f8ef7",
};
const EMPTY_ITEMS = [];

function EntryTypeChip({ type }) {
  const color = ENTRY_TYPE_HEX[type] ?? "#888";
  return (
    <Chip
      label={type}
      size="small"
      sx={{
        fontSize: "0.7rem",
        fontWeight: 700,
        height: 20,
        bgcolor: color + "22",
        color,
        border: `1px solid ${color}44`,
        borderRadius: 1,
      }}
    />
  );
}

function StatusChipSmall({ status }) {
  const color = STATUS_HEX[status] ?? "#888";
  return (
    <Chip
      label={status}
      size="small"
      sx={{
        fontSize: "0.7rem",
        fontWeight: 700,
        height: 20,
        bgcolor: color + "22",
        color,
        border: `1px solid ${color}44`,
        borderRadius: 1,
      }}
    />
  );
}

function totalHours(entries) {
  return entries
    .reduce((sum, e) => sum + (parseFloat(e.hours) || 0), 0)
    .toFixed(2);
}

function useElapsedTimer(startIso) {
  const [elapsed, setElapsed] = useState(() =>
    startIso ? Math.floor((Date.now() - new Date(startIso)) / 1000) : 0,
  );
  const intervalRef = useRef(null);
  useEffect(() => {
    clearInterval(intervalRef.current);
    if (!startIso) {
      intervalRef.current = null;
      return;
    }
    intervalRef.current = setInterval(
      () => setElapsed(Math.floor((Date.now() - new Date(startIso)) / 1000)),
      1000,
    );
    return () => clearInterval(intervalRef.current);
  }, [startIso]);
  const h = String(Math.floor(elapsed / 3600)).padStart(2, "0");
  const m = String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0");
  const s = String(elapsed % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
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
  clockedIn,
  activeEntry,
  activeLabel,
  elapsed,
  liveClock,
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

          {clockedIn && activeEntry && (
            <Box
              sx={{
                mb: 2,
                px: 1.5,
                py: 1,
                bgcolor: "rgba(79,142,247,0.08)",
                border: "1px solid rgba(79,142,247,0.2)",
                borderRadius: 1,
                display: "flex",
                alignItems: "center",
                gap: 0.75,
              }}
            >
              {activeEntry.entryType === "Job" ? (
                <WorkOutlineIcon sx={{ fontSize: 14, color: "#4f8ef7" }} />
              ) : (
                <HandymanOutlinedIcon sx={{ fontSize: 14, color: "#a855f7" }} />
              )}
              <Typography
                variant="caption"
                sx={{
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  color: "#333",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {activeLabel}
              </Typography>
            </Box>
          )}

          {clockedIn ? (
            <AppButton
              fullWidth
              color="error"
              startIcon={<LogoutOutlinedIcon sx={{ fontSize: 16 }} />}
              onClick={onClockOut}
            >
              Clock Out
            </AppButton>
          ) : (
            <AppButton
              fullWidth
              startIcon={<LoginOutlinedIcon sx={{ fontSize: 16 }} />}
              onClick={onClockIn}
            >
              Clock In
            </AppButton>
          )}
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

  const { activeEntry, setActiveEntry, clearActiveEntry } = useActiveEntry();
  const clockedIn = !!activeEntry;
  const socket = useSocket();

  const requestedSocketRef = useRef(null);

  const [todayEntries, setTodayEntries] = useState([]);
  const [entriesLoading, setEntriesLoading] = useState(true);
  const [clockInOpen, setClockInOpen] = useState(false);
  const [clockOutOpen, setClockOutOpen] = useState(false);
  const [apiError, setApiError] = useState(null);

  const dispatch = useDispatch();
  const rawWorkOrders = useSelector(
    (s) => s.workOrders.board?.items_page?.items ?? EMPTY_ITEMS,
  );
  const woLoading = useSelector((s) => s.workOrders.loading);

  useEffect(() => {
    if (!token) return;
    dispatch(fetchWorkOrders());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

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

  const workOrders = rawWorkOrders.map((item) => {
    const woIdCol = item.column_values?.find((cv) => cv.id === "text_mm1s82bz");
    const woId = woIdCol?.text || "";
    return { id: item.id, label: woId ? `${woId} · ${item.name}` : item.name };
  });

  const elapsed = useElapsedTimer(clockedIn ? activeEntry?.clockInTime : null);
  const liveClock = useLiveClock();

  async function handleClockIn(data) {
    const optimistic = { ...data, backendEntryId: null };
    setActiveEntry(optimistic); 
    setClockInOpen(false);

    if (!token) return;
    try {
      const result = await timeEntriesApi.clockIn(token, {
        entryType: data.entryType === "Non-Job" ? "NonJob" : data.entryType,
        ...(data.workOrder?.id && { workOrderRef: String(data.workOrder.id) }),
        ...(data.workOrder?.label && { workOrderLabel: data.workOrder.label }),
        ...(data.taskDescription && { taskDescription: data.taskDescription }),
      });
      setActiveEntry({ ...optimistic, backendEntryId: result.data.id });
    } catch (err) {
      if (err.status === 409 && err.data?.activeEntryId) {
        setActiveEntry({
          ...optimistic,
          backendEntryId: err.data.activeEntryId,
        });
      } else {
        console.error("[clock-in] API error:", err);
        clearActiveEntry();
        setApiError(
          `Clock-in failed: ${err.message || "server error"}. Please try again.`,
        );
      }
    }
  }

  async function handleClockOut(data) {
    if (!activeEntry) return;

    const inTime = new Date(activeEntry.clockInTime).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const nowTime = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const diffMs = Date.now() - new Date(activeEntry.clockInTime);
    const diffHours = Math.max(0, parseFloat((diffMs / 3_600_000).toFixed(2)));

    const optimisticEntry = {
      id: `temp-${Date.now()}`,
      entryType: activeEntry.entryType,
      description:
        activeEntry.entryType === "Job"
          ? (activeEntry.workOrder?.label ?? "Work Order")
          : (activeEntry.taskDescription ?? "Task"),
      clockIn: inTime,
      clockOut: nowTime,
      hours: diffHours > 0 ? diffHours : 0.01,
      status: "Open",
    };

    const captured = activeEntry;
    const clockInIsToday = isToday(captured.clockInTime);

    if (!captured.backendEntryId) {
      console.error(
        "[clock-out] backendEntryId missing — clock-in may not have reached the server.",
      );
      setApiError(
        "Clock-out failed: your clock-in session wasn't saved to the server. Please clock in again.",
      );
      setClockOutOpen(false);
      return;
    }

    if (clockInIsToday) {
      setTodayEntries((prev) => [optimisticEntry, ...prev]);
    }
    clearActiveEntry();
    setClockOutOpen(false);

    try {
      await timeEntriesApi.clockOut(token, captured.backendEntryId, {
        narrative: data.narrative,
        jobLocation: data.location,
        expenses: data.expenses,
        markComplete: data.markComplete ?? false,
      });
    } catch (err) {
      console.error("[clock-out] API error:", err);
      if (clockInIsToday) {
        setTodayEntries((prev) =>
          prev.filter((e) => e.id !== optimisticEntry.id),
        );
      }
      setActiveEntry(captured);
      setApiError(
        `Clock-out failed: ${err.message || "server error"}. Please try again.`,
      );
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
    clockedIn,
    activeEntry,
    activeLabel,
    elapsed,
    liveClock,
    todayEntries,
    activityFeed,
    onClockIn: () => setClockInOpen(true),
    onClockOut: () => setClockOutOpen(true),
    userName,
    userInitials,
    entriesLoading,
  };

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
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 0.5 }}>
          <TimerOutlinedIcon sx={{ fontSize: 24, color: "text.disabled" }} />
          <Typography
            variant="h5"
            sx={{ fontWeight: 800, letterSpacing: "-0.5px" }}
          >
            Time Tracker
          </Typography>
        </Box>
        <Typography
          variant="caption"
          sx={{ color: "text.disabled", display: "block", mb: 3 }}
        >
          {todayDate}
        </Typography>

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
                  ...(clockedIn && activeEntry
                    ? [
                        {
                          id: activeEntry.backendEntryId ?? "active-now",
                          entryType: activeEntry.entryType,
                          description:
                            activeEntry.entryType === "Job"
                              ? (activeEntry.workOrder?.label ?? "Work Order")
                              : (activeEntry.taskDescription ?? "Task"),
                          clockIn: new Date(
                            activeEntry.clockInTime,
                          ).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          }),
                          clockOut: null,
                          hours: null,
                          status: "Open",
                          _active: true,
                        },
                      ]
                    : []),
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
                  <EntryTypeChip type={row.entryType} />
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
                  <StatusChipSmall status={row.status} />
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
        onClose={() => setClockOutOpen(false)}
        onConfirm={handleClockOut}
        activeEntry={activeEntry}
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
