import {
  Box,
  Typography,
  IconButton,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Tooltip,
  Collapse,
  Select,
  MenuItem,
  FormControl,
  CircularProgress,
} from "@mui/material";
import { useBoardHeader, useBoardHeaderContext } from "../contexts/BoardHeaderContext";
import { parseBoardStatusColors } from "../utils/mondayUtils";
import { BOARD_IDS } from "../constants/monday";
import { FETCH_BOARD_DATA } from "../services/monday/queries";
import { mondayClient } from "../services/monday/client";
import StatusChip from "./StatusChip";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import { useSocket } from "../hooks/useSocket";

/* ── helpers ── */
function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function fmtShortDate(date) {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "numeric",
    day: "numeric",
  });
}

function fmtRangeLabel(start, end) {
  const opts = { month: "short", day: "numeric" };
  const yearOpts = { month: "short", day: "numeric", year: "numeric" };
  const sameYear = start.getFullYear() === end.getFullYear();
  return `${start.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString("en-US", sameYear ? opts : yearOpts)}${sameYear ? `, ${start.getFullYear()}` : ""}`;
}

const ENTRY_TYPE_COLOR = { Job: "#4f8ef7", "Non-Job": "#a855f7" };
const STATUS_COLOR = {
  Open: "#f59e0b",
  Complete: "#22c55e",
  Approved: "#3b82f6",
};

function filterByWeek(entries, weekStart) {
  const weekEnd = addDays(weekStart, 6);
  return entries.filter((e) => e.date >= weekStart && e.date <= weekEnd);
}

function groupByTechnician(entries) {
  const map = new Map();
  for (const e of entries) {
    if (!map.has(e.techId))
      map.set(e.techId, { groupKey: e.techId, label: e.techName, entries: [] });
    map.get(e.techId).entries.push(e);
  }
  return Array.from(map.values());
}

function groupByWorkOrder(entries) {
  const map = new Map();
  for (const e of entries) {
    const key = e.description;
    if (!map.has(key)) map.set(key, { groupKey: key, label: key, entries: [] });
    map.get(key).entries.push(e);
  }
  return Array.from(map.values());
}

const HEAD_CELL_SX = {
  fontSize: "0.72rem",
  fontWeight: 700,
  color: "#8c8c8c",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  py: 1,
  px: 2,
  bgcolor: "#f9fafb",
  borderBottom: "1px solid #ebebeb",
  whiteSpace: "nowrap",
  position: "sticky",
  top: 0,
  zIndex: 1,
};

const BODY_CELL_SX = {
  fontSize: "0.8125rem",
  py: 1,
  px: 2,
  borderBottom: "1px solid #f3f4f6",
  color: "#374151",
};

function StatusBadgeChip({ status }) {
  const color = STATUS_COLOR[status] ?? STATUS_COLOR[
    Object.keys(STATUS_COLOR).find(k => k.toLowerCase() === status?.toLowerCase())
  ] ?? "#6b7280";
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
          color: color,
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

function EntryTypeChip({ type }) {
  const color = ENTRY_TYPE_COLOR[type] ?? "#6b7280";
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
          color: color,
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

function GroupSection({ group, groupBy, statusColors, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  const weekTotal = group.entries.reduce((s, e) => s + (e.hours ?? 0), 0);

  return (
    <Box sx={{ mb: 2 }}>
      <Box
        onClick={() => setOpen((v) => !v)}
        sx={{
          display: "flex",
          alignItems: "center",
          px: 2,
          py: 1.25,
          bgcolor: "#f9fafb",
          border: "1px solid #e5e7eb",
          borderRadius: open ? "10px 10px 0 0" : "10px",
          cursor: "pointer",
          userSelect: "none",
          transition: "background 0.15s",
          "&:hover": { bgcolor: "#f3f4f6" },
        }}
      >
        <Box sx={{ color: "#6b7280", display: "flex", mr: 1 }}>
          {open ? (
            <KeyboardArrowDownIcon fontSize="small" />
          ) : (
            <KeyboardArrowRightIcon fontSize="small" />
          )}
        </Box>
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: "0.9rem",
            color: "#111827",
            flex: 1,
          }}
        >
          {group.label}
        </Typography>
        <Tooltip title="Week total" arrow placement="left">
          <Box
            sx={{
              px: 1.5,
              py: 0.35,
              borderRadius: 5,
              bgcolor: "#1a6ef714",
              border: "1px solid #1a6ef730",
            }}
          >
            <Typography
              sx={{ fontSize: "0.8rem", fontWeight: 700, color: "#1a6ef7" }}
            >
              {weekTotal.toFixed(1)}h
            </Typography>
          </Box>
        </Tooltip>
      </Box>

      <Collapse in={open} timeout={200}>
        <Paper
          elevation={0}
          sx={{
            border: "1px solid #e5e7eb",
            borderTop: "none",
            borderRadius: "0 0 10px 10px",
            overflow: "visible",
          }}
        >
          <Box sx={{ maxHeight: 400, overflow: "auto" }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={HEAD_CELL_SX}>Date</TableCell>
                  {groupBy === "workorder" && (
                    <TableCell sx={HEAD_CELL_SX}>Technician</TableCell>
                  )}
                  <TableCell sx={HEAD_CELL_SX}>WO / Task</TableCell>
                  <TableCell sx={HEAD_CELL_SX}>Type</TableCell>
                  <TableCell sx={{ ...HEAD_CELL_SX, textAlign: "center" }}>
                    Clock In
                  </TableCell>
                  <TableCell sx={{ ...HEAD_CELL_SX, textAlign: "center" }}>
                    Clock Out
                  </TableCell>
                  <TableCell sx={{ ...HEAD_CELL_SX, textAlign: "right" }}>
                    Hrs
                  </TableCell>
                  <TableCell sx={HEAD_CELL_SX}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {group.entries
                  .slice()
                  .sort((a, b) => a.date - b.date)
                  .map((entry, idx) => (
                    <TableRow
                      key={entry.id ?? idx}
                      sx={{
                        "&:last-of-type td": { borderBottom: "none" },
                        "&:hover": { bgcolor: "#fafafa" },
                      }}
                    >
                      <TableCell
                        sx={{
                          ...BODY_CELL_SX,
                          color: "#6b7280",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {fmtShortDate(entry.date)}
                      </TableCell>
                      {groupBy === "workorder" && (
                        <TableCell sx={{ ...BODY_CELL_SX, fontWeight: 500 }}>
                          {entry.techName}
                        </TableCell>
                      )}
                      <TableCell sx={{ ...BODY_CELL_SX, fontWeight: 500 }}>
                        {entry.description}
                      </TableCell>
                      <TableCell sx={BODY_CELL_SX}>
                        <EntryTypeChip type={entry.entryType} />
                      </TableCell>
                      <TableCell
                        sx={{
                          ...BODY_CELL_SX,
                          textAlign: "center",
                          color: "#6b7280",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {entry.clockIn}
                      </TableCell>
                      <TableCell
                        sx={{
                          ...BODY_CELL_SX,
                          textAlign: "center",
                          color: "#6b7280",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {entry.clockOut}
                      </TableCell>
                      <TableCell
                        sx={{
                          ...BODY_CELL_SX,
                          textAlign: "right",
                          fontWeight: 600,
                          fontVariantNumeric: "tabular-nums",
                          color: "#374151",
                        }}
                      >
                        {entry.hours.toFixed(1)}
                      </TableCell>
                      <TableCell sx={BODY_CELL_SX}>
                        <StatusBadgeChip status={entry.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                {/* Totals footer row */}
                <TableRow sx={{ bgcolor: "#f9fafb", position: "sticky", bottom: 0, zIndex: 2 }}>
                  <TableCell
                    colSpan={groupBy === "workorder" ? 6 : 5}
                    sx={{
                      ...BODY_CELL_SX,
                      fontWeight: 600,
                      color: "#6b7280",
                      borderTop: "1px solid #e5e7eb",
                      borderBottom: "none",
                      py: 0.75,
                    }}
                  >
                    Week Total
                  </TableCell>
                  <TableCell
                    sx={{
                      ...BODY_CELL_SX,
                      textAlign: "right",
                      fontWeight: 700,
                      color: "#1a6ef7",
                      borderTop: "1px solid #e5e7eb",
                      borderBottom: "none",
                      py: 0.75,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {weekTotal.toFixed(1)}
                  </TableCell>
                  <TableCell
                    sx={{
                      ...BODY_CELL_SX,
                      borderTop: "1px solid #e5e7eb",
                      borderBottom: "none",
                      py: 0.75,
                    }}
                  />
                </TableRow>
              </TableBody>
            </Table>
          </Box>
        </Paper>
      </Collapse>
    </Box>
  );
}

export default function TimeBoard() {
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date()));
  const [groupBy, setGroupBy] = useState("technician");
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [accessError, setAccessError] = useState(null);
  const [statusColors, setStatusColors] = useState({});

  const { auth } = useAuth();
  const socket = useSocket();
  const { search } = useBoardHeaderContext();

  function normalise(e) {
    return {
      id: e.id,
      techId: e.technicianId,
      techName: e.technician?.name ?? e.technicianId,
      date: new Date(e.clockIn),
      entryType: e.entryType === "NonJob" ? "Non-Job" : e.entryType,
      description: e.workOrderLabel || e.taskDescription || "—",
      clockIn: new Date(e.clockIn).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      }),
      clockOut: e.clockOut
        ? new Date(e.clockOut).toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        })
        : "Active",
      hours: parseFloat(e.hoursWorked ?? 0) || 0,
      status: e.status,
    };
  }

  useEffect(() => {
    if (!socket) return;

    function onBoardData({ data }) {
      setEntries((data ?? []).map(normalise));
      setLoading(false);
    }

    function onBoardError({ message }) {
      console.warn("[time-board] board:error:", message);
      setLoading(false);
      setAccessError(message);
    }

    function onClockIn(payload) {
      const d = new Date(payload.clockIn);
      setEntries((prev) => {
        if (prev.some((e) => e.id === payload.entryId)) return prev;
        return [
          ...prev,
          {
            id: payload.entryId,
            techId: payload.technicianId,
            techName: payload.technicianName,
            date: d,
            entryType:
              payload.entryType === "NonJob" ? "Non-Job" : payload.entryType,
            description:
              payload.workOrderLabel || payload.taskDescription || "—",
            clockIn: d.toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
            }),
            clockOut: "Active",
            hours: 0,
            status: "Open",
          },
        ];
      });
    }

    function onClockOut(payload) {
      setEntries((prev) =>
        prev.map((e) =>
          e.id === payload.entryId
            ? {
              ...e,
              clockOut: new Date(payload.clockOut).toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
              }),
              hours: parseFloat(payload.hoursWorked ?? e.hours) || 0,
              status: payload.status ?? "Complete",
            }
            : e,
        ),
      );
    }

    socket.on("board:data", onBoardData);
    socket.on("board:error", onBoardError);
    socket.on("clock_in", onClockIn);
    socket.on("clock_out", onClockOut);

    // Fetch board metadata for colors
    mondayClient.query({
      query: FETCH_BOARD_DATA,
      variables: { boardId: [BOARD_IDS.TIME_ENTRIES] }
    }).then(({ data }) => {
      if (data?.boards?.[0]) {
        setStatusColors(parseBoardStatusColors(data.boards[0]));
      }
    }).catch(err => console.error("[time-board] Metadata fetch error:", err));

    return () => {
      socket.off("board:data", onBoardData);
      socket.off("board:error", onBoardError);
      socket.off("clock_in", onClockIn);
      socket.off("clock_out", onClockOut);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  useEffect(() => {
    if (!socket) return;
    setLoading(true);
    const from = weekStart.toISOString().slice(0, 10);
    const to = addDays(weekStart, 6).toISOString().slice(0, 10);
    socket.emit("board:request", { from, to });
  }, [socket, weekStart]);

  const weekEnd = addDays(weekStart, 5);
  const weekLabel = fmtRangeLabel(weekStart, weekEnd);
  const weekEntries = filterByWeek(entries, weekStart);
  const visible = search
    ? weekEntries.filter((e) => {
      const q = search.toLowerCase();
      return (
        e.techName?.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q) ||
        e.entryType?.toLowerCase().includes(q) ||
        e.status?.toLowerCase().includes(q)
      );
    })
    : weekEntries;
  const groups =
    groupBy === "technician"
      ? groupByTechnician(visible)
      : groupByWorkOrder(visible);
  const grandTotal = visible.reduce((s, e) => s + (e.hours ?? 0), 0);

  const headerExtra = useMemo(() => (
    <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Typography variant="body2" sx={{ color: "#6b7280", fontWeight: 500, whiteSpace: "nowrap" }}>
          Group by:
        </Typography>
        <FormControl size="small">
          <Select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
            sx={{
              fontSize: "0.8125rem",
              fontWeight: 600,
              minWidth: 140,
              borderRadius: 2,
              height: 36,
              "& .MuiOutlinedInput-notchedOutline": { borderColor: "#e5e7eb" },
            }}
          >
            <MenuItem value="technician" sx={{ fontSize: "0.8125rem" }}>Technician</MenuItem>
            <MenuItem value="workorder" sx={{ fontSize: "0.8125rem" }}>Work Order</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <IconButton size="small" onClick={() => setWeekStart((w) => addDays(w, -7))} sx={{ border: "1px solid #e5e7eb", borderRadius: 1.5 }}>
          <ChevronLeftIcon fontSize="small" />
        </IconButton>
        <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 200, textAlign: "center" }}>
          {weekLabel}
        </Typography>
        <IconButton size="small" onClick={() => setWeekStart((w) => addDays(w, 7))} sx={{ border: "1px solid #e5e7eb", borderRadius: 1.5 }}>
          <ChevronRightIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  ), [groupBy, weekLabel]);

  useBoardHeader({
    title: 'Time Board',
    count: visible.length,
    countLabel: 'entries',
    extra: headerExtra,
  });

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, height: "100%", overflow: "auto" }}>

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress size={32} />
        </Box>
      )}

      {!loading && groups.length === 0 ? (
        <Box
          sx={{
            textAlign: "center",
            py: 8,
            border: "1px dashed #e5e7eb",
            borderRadius: 3,
            color: "#9ca3af",
          }}
        >
          <Typography variant="body2">
            No time entries for this week.
          </Typography>
        </Box>
      ) : (
        !loading &&
        groups.map((group) => (
          <GroupSection
            key={group.groupKey}
            group={group}
            groupBy={groupBy}
            statusColors={statusColors}
            defaultOpen
          />
        ))
      )}

      {!loading && groups.length > 0 && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: 1.5,
            mt: 1,
            pt: 1.5,
            borderTop: "2px solid #e5e7eb",
          }}
        >
          <Typography
            variant="body2"
            sx={{ fontWeight: 600, color: "#6b7280" }}
          >
            Week Grand Total
          </Typography>
          <Box sx={{ px: 2, py: 0.4, borderRadius: 5, bgcolor: "#1a6ef7" }}>
            <Typography
              sx={{ fontSize: "0.875rem", fontWeight: 700, color: "#fff" }}
            >
              {grandTotal.toFixed(1)}h
            </Typography>
          </Box>
        </Box>
      )}

      <Box
        sx={{
          mt: 3,
          display: "flex",
          flexWrap: "wrap",
          gap: 2,
          alignItems: "center",
        }}
      >
        {Object.entries(ENTRY_TYPE_COLOR).map(([label, color]) => (
          <Box
            key={label}
            sx={{ display: "flex", alignItems: "center", gap: 0.75 }}
          >
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: 0.5,
                bgcolor: color + "40",
                border: `1.5px solid ${color}`,
              }}
            />
            <Typography
              variant="caption"
              sx={{ color: "#6b7280", fontSize: "0.72rem" }}
            >
              {label}
            </Typography>
          </Box>
        ))}
        <Box sx={{ width: 1, height: 14, bgcolor: "#e5e7eb", mx: 0.5 }} />
        {Object.entries(STATUS_COLOR).map(([label, color]) => (
          <Box
            key={label}
            sx={{ display: "flex", alignItems: "center", gap: 0.75 }}
          >
            <Box
              sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: color }}
            />
            <Typography
              variant="caption"
              sx={{ color: "#6b7280", fontSize: "0.72rem" }}
            >
              {label}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}


