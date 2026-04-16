import { useState, useEffect } from "react";
import { Box, Tooltip, Typography, Avatar, Stack } from "@mui/material";
import ImageIcon from "@mui/icons-material/Image";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import { mondayClient } from "../services/monday/client";
import { gql } from "@apollo/client";

const FETCH_ASSETS_URLS = gql`
  query GetAssets($ids: [ID!]!) {
    assets(ids: $ids) {
      id
      public_url
    }
  }
`;

/**
 * Renders a visual preview for Monday.com FileValue columns.
 * Supports thumbnails for images and Icons for other file types.
 */
export default function FileCell({ item, columnId, maxShown = 2 }) {
  const [fileUrls, setFileUrls] = useState({});
  const col = item?.column_values?.find((cv) => cv.id === columnId);
  
  // Parse files from col.value JSON
  let files = [];
  try {
    if (col?.value) {
      const parsed = JSON.parse(col.value);
      files = parsed.files || [];
    }
  } catch (e) {
    files = [];
  }

  useEffect(() => {
    if (files.length > 0) {
      const assetIds = files.map(f => f.assetId).filter(Boolean);
      if (assetIds.length > 0) {
        mondayClient.query({
          query: FETCH_ASSETS_URLS,
          variables: { ids: assetIds }
        }).then(resp => {
          const mapping = {};
          resp.data?.assets?.forEach(a => {
            mapping[a.id] = a.public_url;
          });
          setFileUrls(prev => ({ ...prev, ...mapping }));
        }).catch(err => console.error("[FileCell] Asset load failed:", err));
      }
    }
  }, [col?.value]);

  if (files.length === 0) return <Typography variant="body2" sx={{ color: "text.disabled", fontSize: "0.8rem" }}>—</Typography>;

  const getFileIcon = (fileName) => {
    const ext = fileName.split(".").pop().toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return "image";
    if (ext === "pdf") return "pdf";
    return "file";
  };

  const visibleFiles = files.slice(0, maxShown);
  const remainingCount = files.length - maxShown;

  return (
    <Stack direction="row" spacing={0.75} alignItems="center">
      {visibleFiles.map((file) => {
        const type = getFileIcon(file.name);
        const publicUrl = fileUrls[file.assetId] || file.public_url || "";
        
        return (
          <Tooltip key={file.assetId || file.id} title={file.name} arrow placement="top">
            <Box
              component="a"
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              sx={{
                width: 28,
                height: 28,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "6px",
                border: "1px solid #e5e7eb",
                bgcolor: "#f9fafb",
                overflow: "hidden",
                cursor: "pointer",
                transition: "all 0.2s",
                "&:hover": {
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                  borderColor: "primary.main",
                  transform: "translateY(-1px)",
                },
              }}
            >
              {(type === "image" && publicUrl) ? (
                <Avatar
                  src={publicUrl}
                  variant="square"
                  sx={{ width: "100%", height: "100%", bgcolor: "transparent" }}
                >
                  <ImageIcon sx={{ fontSize: 16, color: "#6b7280" }} />
                </Avatar>
              ) : type === "pdf" ? (
                <PictureAsPdfIcon sx={{ fontSize: 16, color: "#ef4444" }} />
              ) : (
                <InsertDriveFileIcon sx={{ fontSize: 16, color: "#6b7280" }} />
              )}
            </Box>
          </Tooltip>
        );
      })}
      
      {remainingCount > 0 && (
        <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, fontSize: "0.7rem" }}>
          +{remainingCount}
        </Typography>
      )}
    </Stack>
  );
}
