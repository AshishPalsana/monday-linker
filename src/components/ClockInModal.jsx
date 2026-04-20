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
  InputAdornment,
} from "@mui/material";
import WorkOutlineIcon from "@mui/icons-material/WorkOutline";
import HandymanOutlinedIcon from "@mui/icons-material/HandymanOutlined";
import LoginOutlinedIcon from "@mui/icons-material/LoginOutlined";
import SearchIcon from "@mui/icons-material/Search";
import { useState, useEffect } from "react";
import AppButton from "./AppButton";

export default function ClockInModal({ open, onClose, onConfirm, workOrders = [], workOrdersLoading = false, isShiftActive }) {
  const [entryType, setEntryType] = useState("DailyShift");
  const [selectedWO, setSelectedWO] = useState(null);
  const [taskCategory, setTaskCategory] = useState("Billable");
  const [taskDescription, setTaskDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (open) {
      setEntryType(isShiftActive ? "Job" : "DailyShift");
      setSubmitted(false);
      setSelectedWO(null);
      setTaskDescription("");
    }
  }, [open, isShiftActive]);

  const isValid =
    entryType === "Job"
      ? selectedWO !== null
      : entryType === "NonJob"
        ? taskDescription.trim().length > 0
        : true;

  function handleConfirm() {
    setSubmitted(true);
    if (!isValid) return;

    onConfirm({
      entryType,
      workOrder: entryType === "Job" ? selectedWO : null,
      taskCategory: entryType === "NonJob" ? taskCategory : null,
      taskDescription: entryType === "NonJob" ? taskDescription : "Daily Attendance",
      clockInTime: new Date().toISOString(),
    });
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: "12px" } }}
    >
      <DialogTitle sx={{ fontWeight: 800, color: "#333", pb: 0.5 }}>
        {!isShiftActive ? "Start Your Day" : "Start New Task"}
      </DialogTitle>

      <DialogContent sx={{ pt: "12px !important" }}>
        <Box sx={{ mt: 1 }}>
          {isShiftActive ? (
            <>
              <Typography variant="body2" sx={{ mb: 2, color: "text.secondary", fontWeight: 500 }}>
                Choose the type of task you are starting:
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
                    gap: 1,
                    "&.Mui-selected": {
                      bgcolor: "rgba(26,110,247,0.08) !important",
                      color: "#1a6ef7 !important",
                      borderColor: "#1a6ef7 !important",
                    },
                  }}
                >
                  <WorkOutlineIcon sx={{ fontSize: 16 }} /> Job Level
                </ToggleButton>
                <ToggleButton
                  value="NonJob"
                  sx={{
                    textTransform: "none",
                    fontWeight: 600,
                    gap: 1,
                    "&.Mui-selected": {
                      bgcolor: "rgba(245,158,11,0.08) !important",
                      color: "#f59e0b !important",
                      borderColor: "#f59e0b !important",
                    },
                  }}
                >
                  <HandymanOutlinedIcon sx={{ fontSize: 16 }} /> Non-Job
                </ToggleButton>
              </ToggleButtonGroup>

              {entryType === "Job" && (
                <Box sx={{ animation: "fadeIn 0.3s ease" }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: "#666", mb: 0.5, display: "block" }}>
                    Select Work Order
                  </Typography>
                  <Autocomplete
                    options={workOrders}
                    getOptionLabel={(opt) => opt.label}
                    loading={workOrdersLoading}
                    value={selectedWO}
                    onChange={(_, val) => setSelectedWO(val)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        placeholder="Search assigned work orders..."
                        error={submitted && !selectedWO}
                        helperText={submitted && !selectedWO ? "Please select a work order" : ""}
                        InputProps={{
                          ...params.InputProps,
                          sx: { borderRadius: 1.5, bgcolor: "#fcfcfc" },
                          startAdornment: (
                            <InputAdornment position="start">
                              <SearchIcon sx={{ color: "#aaa", fontSize: 20 }} />
                            </InputAdornment>
                          ),
                        }}
                      />
                    )}
                    sx={{ mb: 2 }}
                  />
                </Box>
              )}

              {entryType === "NonJob" && (
                <Box sx={{ animation: "fadeIn 0.3s ease" }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: "#666", mb: 0.5, display: "block" }}>
                    Task Description
                  </Typography>
                  <TextField
                    fullWidth
                    placeholder="What are you working on?"
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    error={submitted && !taskDescription.trim()}
                    helperText={submitted && !taskDescription.trim() ? "Description is required" : ""}
                    sx={{ mb: 2 }}
                    InputProps={{ sx: { borderRadius: 1.5, bgcolor: "#fcfcfc" } }}
                  />
                </Box>
              )}
            </>
          ) : (
            <Box sx={{ textAlign: "center", py: 2 }}>
              <Box
                sx={{
                  width: 60,
                  height: 60,
                  borderRadius: "50%",
                  bgcolor: "rgba(139,92,246,0.1)",
                  color: "#8b5cf6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mx: "auto",
                  mb: 2,
                }}
              >
                <LoginOutlinedIcon sx={{ fontSize: 30 }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: "#333", mb: 1 }}>
                Ready to Clock In?
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", px: 2 }}>
                This will start your **Daily Shift** session. You will be able to track specific jobs and tasks once you are clocked in.
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} sx={{ color: "text.secondary", fontWeight: 600 }}>
          Cancel
        </Button>
        <AppButton
          onClick={handleConfirm}
          disabled={submitted && !isValid}
          sx={{ px: 4 }}
        >
          Confirm
        </AppButton>
      </DialogActions>
    </Dialog>
  );
}
