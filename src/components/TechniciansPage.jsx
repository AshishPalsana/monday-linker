import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Button,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  CircularProgress,
  Alert,
} from "@mui/material";
import SyncIcon from "@mui/icons-material/Sync";
import PeopleOutlineIcon from "@mui/icons-material/PeopleOutline";
import { useSnackbar } from "notistack";
import { useAuth } from "../hooks/useAuth";
import { technicianApi } from "../services/api";

export default function TechniciansPage() {
  const { auth } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [syncing, setSyncing]         = useState(false);
  const [error, setError]             = useState(null);

  const fetchTechnicians = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await technicianApi.getAll(auth?.token);
      setTechnicians(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [auth?.token]);

  useEffect(() => {
    fetchTechnicians();
  }, [fetchTechnicians]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data } = await technicianApi.syncFromMonday(auth?.token);
      enqueueSnackbar(
        `Sync complete — ${data.created} added, ${data.skipped} already existed${data.errors.length ? `, ${data.errors.length} errors` : ""}`,
        { variant: data.errors.length ? "warning" : "success", autoHideDuration: 6000 }
      );
      if (data.created > 0) fetchTechnicians();
    } catch (err) {
      enqueueSnackbar(`Sync failed: ${err.message}`, { variant: "error" });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <PeopleOutlineIcon sx={{ color: "text.secondary", fontSize: 22 }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
              Technicians
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Sync Monday workspace users to the Technicians board
            </Typography>
          </Box>
        </Box>

        <Button
          variant="contained"
          size="small"
          startIcon={syncing ? <CircularProgress size={14} color="inherit" /> : <SyncIcon />}
          onClick={handleSync}
          disabled={syncing}
          sx={{ textTransform: "none", fontWeight: 600 }}
        >
          {syncing ? "Syncing…" : "Sync from Monday"}
        </Button>
      </Box>

      {/* Info banner */}
      <Alert severity="info" sx={{ mb: 2.5, fontSize: "0.8rem" }}>
        Clicking <strong>Sync from Monday</strong> fetches all non-admin Monday workspace users and creates
        a row on the Technicians board for anyone not already there.
        Set each technician's <strong>Hourly Rate</strong> on the Technicians board after syncing —
        it will be picked up automatically on their next login.
      </Alert>

      {/* Error state */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}

      {/* Table */}
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Table size="small" stickyHeader sx={{ minWidth: 650, height: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}>
          <TableHead>
            <TableRow sx={{ bgcolor: "grey.50" }}>
              <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem", color: "text.secondary" }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem", color: "text.secondary" }}>Email</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem", color: "text.secondary" }} align="right">Hourly Rate</TableCell>
            </TableRow>
          </TableHead>
          <TableBody sx={{ display: 'block', overflowY: 'auto', flex: 1 }}>
            {loading ? (
              <TableRow>
                <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            ) : technicians.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} align="center" sx={{ py: 4, color: "text.secondary", fontSize: "0.85rem" }}>
                  No technicians yet — click <strong>Sync from Monday</strong> to populate
                </TableCell>
              </TableRow>
            ) : (
              <Box component="tbody" sx={{ display: 'block', overflowY: 'auto', flex: 1 }}>
                {technicians.map((tech) => (
                  <TableRow key={tech.id} hover sx={{ display: 'table', tableLayout: 'fixed', width: '100%' }}>
                    <TableCell sx={{ fontSize: "0.85rem", fontWeight: 500 }}>{tech.name}</TableCell>
                    <TableCell sx={{ fontSize: "0.82rem", color: "text.secondary" }}>{tech.email || "—"}</TableCell>
                    <TableCell align="right" sx={{ fontSize: "0.85rem", fontFamily: "monospace" }}>
                      {tech.burdenRate > 0 ? `$${parseFloat(tech.burdenRate).toFixed(2)}/hr` : (
                        <Typography component="span" sx={{ fontSize: "0.75rem", color: "text.disabled" }}>
                          Not set — set on Technicians board
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </Box>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="caption" sx={{ display: "block", mt: 1.5, color: "text.disabled" }}>
        {technicians.length > 0 && `${technicians.length} technician${technicians.length !== 1 ? "s" : ""} in system`}
      </Typography>
    </Box>
  );
}
