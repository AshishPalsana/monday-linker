import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  ToggleButtonGroup,
  ToggleButton,
  Autocomplete,
  TextField,
  Box,
  Typography,
  CircularProgress,
} from "@mui/material";
import WorkOutlineIcon from "@mui/icons-material/WorkOutline";
import HandymanOutlinedIcon from "@mui/icons-material/HandymanOutlined";
import { useState } from "react";

export default function ClockInModal({ open, onClose, onConfirm, workOrders = [], workOrdersLoading = false }) {
  const [entryType, setEntryType] = useState("Job");
  const [selectedWO, setSelectedWO] = useState(null);
  const [taskDescription, setTaskDescription] = useState("");

  const isValid =
    entryType === "Job"
      ? selectedWO !== null
      : taskDescription.trim().length > 0;

  function handleConfirm() {
    onConfirm({
      entryType,
      workOrder: entryType === "Job" ? selectedWO : null,
      taskDescription: entryType === "Non-Job" ? taskDescription : "",
      clockInTime: new Date().toISOString(),
    });
    // reset
    setEntryType("Job");
    setSelectedWO(null);
    setTaskDescription("");
  }

  function handleClose() {
    setEntryType("Job");
    setSelectedWO(null);
    setTaskDescription("");
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: "12px" } }}
    >
      <DialogTitle sx={{ fontWeight: 700, pb: 0.5 }}>Clock In</DialogTitle>
      <DialogContent sx={{ pt: "12px !important" }}>
        <Typography variant="caption" sx={{ color: "text.disabled", display: "block", mb: 1.5 }}>
          Select entry type
        </Typography>

        <ToggleButtonGroup
          value={entryType}
          exclusive
          onChange={(_, val) => val && setEntryType(val)}
          fullWidth
          size="small"
          sx={{ mb: 2.5 }}
        >
          <ToggleButton
            value="Job"
            sx={{
              textTransform: "none",
              fontWeight: 600,
              fontSize: 13,
              gap: 0.75,
              "&.Mui-selected": {
                bgcolor: "rgba(79,142,247,0.14)",
                color: "#1a6ef7",
                borderColor: "rgba(79,142,247,0.4)",
              },
            }}
          >
            <WorkOutlineIcon sx={{ fontSize: 16 }} /> Job
          </ToggleButton>
          <ToggleButton
            value="Non-Job"
            sx={{
              textTransform: "none",
              fontWeight: 600,
              fontSize: 13,
              gap: 0.75,
              "&.Mui-selected": {
                bgcolor: "rgba(168,85,247,0.12)",
                color: "#a855f7",
                borderColor: "rgba(168,85,247,0.35)",
              },
            }}
          >
            <HandymanOutlinedIcon sx={{ fontSize: 16 }} /> Non-Job
          </ToggleButton>
        </ToggleButtonGroup>

        {entryType === "Job" ? (
          <>
            <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary", display: "block", mb: 0.75 }}>
              Work Order
            </Typography>
            <Autocomplete
              options={workOrders}
              loading={workOrdersLoading}
              disableClearable={selectedWO !== null}
              value={selectedWO}
              onChange={(_, val) => setSelectedWO(val)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Search work orders…"
                  size="small"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {workOrdersLoading ? <CircularProgress size={16} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
          </>
        ) : (
          <>
            <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary", display: "block", mb: 0.75 }}>
              Task Description <span style={{ color: "#ef4444" }}>*</span>
            </Typography>
            <TextField
              fullWidth
              size="small"
              placeholder="Describe the task (required)…"
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              inputProps={{ maxLength: 200 }}
              helperText={
                taskDescription.trim().length === 0
                  ? "A description is required to clock in."
                  : " "
              }
              FormHelperTextProps={{ sx: { color: "#ef4444", mx: 0 } }}
            />
          </>
        )}

        <Box sx={{ mt: 2, p: 1.5, bgcolor: "#f5f5f5", borderRadius: 2 }}>
          <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.75rem" }}>
            Clock-in time will be recorded as{" "}
            <strong>{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</strong>
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={handleClose} sx={{ textTransform: "none", color: "text.secondary" }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={!isValid}
          onClick={handleConfirm}
          sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}
        >
          Clock In
        </Button>
      </DialogActions>
    </Dialog>
  );
}
