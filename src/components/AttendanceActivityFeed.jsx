import React from "react";
import { Box, Typography } from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import LoginOutlinedIcon from "@mui/icons-material/LoginOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";

const eventIcons = {
   "Clock In": <LoginOutlinedIcon sx={{ fontSize: 16, color: '#16a34a' }} />,
   "Clock Out": <LogoutOutlinedIcon sx={{ fontSize: 16, color: '#ef4444' }} />,
   "LIVE": <AccessTimeIcon sx={{ fontSize: 16, color: '#22c55e' }} />,
};

export default function AttendanceActivityFeed({ activityFeed = [] }) {
   return (
      <Box sx={{ px: 2, pt: 2, pb: 3 }}>
         <Typography sx={{ fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#aaa", mb: 1.5 }}>
            Attendance Activity
         </Typography>
         {activityFeed.length === 0 ? (
            <Typography sx={{ fontSize: "0.78rem", color: "#ccc", fontWeight: 500 }}>No activity yet today</Typography>
         ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
               {activityFeed.map((item, idx) => (
                  <Box key={idx} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                     {/* Left icon circle */}
                     <Box sx={{ minWidth: 28, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Box sx={{ width: 24, height: 24, borderRadius: "50%", border: "1.5px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "#fff" }}>
                           {eventIcons[item.event] || <AccessTimeIcon sx={{ fontSize: 16, color: '#64748b' }} />}
                        </Box>
                     </Box>
                     {/* Card-like entry */}
                     <Box sx={{ flex: 1, background: "#f8fafc", borderRadius: 2, px: 1.5, py: 0.7, boxShadow: "0 1px 2px 0 #f1f5f9", display: "flex", flexDirection: "column", gap: 0.2, border: "1px solid #f1f5f9" }}>
                        <Typography sx={{ fontWeight: 700, fontSize: "0.93rem", color: "#222", lineHeight: 1.2 }}>
                           {item.time}
                        </Typography>
                        <Typography sx={{ color: "#64748b", fontSize: "0.8rem", fontWeight: 500 }}>
                           {item.event}
                        </Typography>
                        {item.label && (
                           <Typography sx={{ color: "#64748b", fontSize: "0.74rem", fontWeight: 400, mt: 0.1 }}>
                              {item.label}
                           </Typography>
                        )}
                     </Box>
                  </Box>
               ))}
            </Box>
         )}
      </Box>
   );
}
