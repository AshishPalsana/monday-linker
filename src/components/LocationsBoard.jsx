import { useState, useEffect, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
import { fetchLocations, createLocation as createLocationThunk } from "../store/locationsSlice";
import {
  Box,
  Typography,
  TableCell,
  TableRow,
  Avatar,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import { useBoardHeader, useBoardHeaderContext } from "../contexts/BoardHeaderContext";
import { MONDAY_COLUMNS } from "../constants/index";
import { getColumnDisplayValue } from "../utils/mondayUtils";
import StatusChip from "./StatusChip";
import LocationDrawer from "./LocationDrawer";
import { BoardGroup, BoardTable, DATA_CELL_SX, DASH, TruncCell } from "./BoardTable";

const COL = MONDAY_COLUMNS.LOCATIONS;

export default function LocationsBoard() {
  const dispatch = useDispatch();
  const { board, loading, error, statusColors } = useSelector((state) => state.locations);
  const { search } = useBoardHeaderContext();
  const { id } = useParams();
  const navigate = useNavigate();

  // Derived state for the selected location based on the URL ID
  const openDialog = useMemo(() => {
    if (!id || !board?.items_page?.items) return null;
    return board.items_page.items.find((i) => String(i.id) === id) || null;
  }, [id, board]);

  // URL Cleanup: if an ID is provided but doesn't exist in the board, clear it.
  useEffect(() => {
    if (id && board?.items_page?.items && !openDialog && !loading) {
      if (id !== "__new__") {
        navigate("/locations", { replace: true });
      }
    }
  }, [id, board, openDialog, loading, navigate]);

  useEffect(() => {
    dispatch(fetchLocations());
  }, [dispatch]);

  const handleNew = useCallback(() => {
    navigate("/locations/__new__");
  }, [navigate]);

  const allLocations = board?.items_page?.items || [];
  const groups = board?.groups || [];

  const filteredLocations = allLocations.filter((item) =>
    !search || item.name.toLowerCase().includes(search.toLowerCase())
  );

  useBoardHeader({
    title: 'Locations',
    count: filteredLocations.length,
    buttonLabel: 'New location',
    onButtonClick: handleNew,
  });

  const locationsByGroup = filteredLocations.reduce((acc, loc) => {
    const groupId = loc.group?.id || 'default';
    if (!acc[groupId]) acc[groupId] = [];
    acc[groupId].push(loc);
    return acc;
  }, {});

  const LOCATION_COLUMNS = [
    { label: "Location Name", width: 220 },
    { label: "Customer Name", width: 220 },
    { label: "Address", width: 250 },
    { label: "Phone", width: 140 },
    { label: "Email", width: 200 },
    { label: "Notes", width: 250 },
    { label: "Location Status", width: 160 },
  ];

  const renderLocationRow = (loc) => {
    const status = getColumnDisplayValue(loc, COL.STATUS);
    return (
      <TableRow
        key={loc.id}
        hover
        sx={{ cursor: "pointer" }}
        onClick={() => navigate(`/locations/${loc.id}`)}
      >
        <TableCell sx={{ ...DATA_CELL_SX, py: '5px' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, overflow: 'hidden' }}>
            <Avatar sx={{ width: 26, height: 26, fontSize: '0.6rem', fontWeight: 700, flexShrink: 0, bgcolor: 'rgba(168,85,247,0.15)', color: '#a855f7' }}>
              {loc.name?.slice(0, 2).toUpperCase() || '??'}
            </Avatar>
            <Tooltip title={loc.name} placement="top" enterDelay={600} arrow>
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem', color: 'text.primary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {loc.name}
              </Typography>
            </Tooltip>
          </Box>
        </TableCell>
        <TruncCell value={getColumnDisplayValue(loc, COL.CUSTOMER_NAME)} />
        <TruncCell value={getColumnDisplayValue(loc, COL.ADDRESS)} />
        <TruncCell value={getColumnDisplayValue(loc, COL.PHONE)} />
        <TruncCell value={getColumnDisplayValue(loc, COL.EMAIL)} />
        <TruncCell value={getColumnDisplayValue(loc, COL.NOTES)} />
        <TableCell sx={{ ...DATA_CELL_SX, overflow: 'visible' }}>
          {status ? (
            <StatusChip status={status} colorMap={statusColors} />
          ) : DASH}
        </TableCell>
      </TableRow>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <CircularProgress size={40} />
      </Box>
    );
  }
  if (error) return <Box sx={{ p: 3 }}>Error: {error}</Box>;
  if (!board) return null;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <Box sx={{ flex: 1, overflow: "auto", px: { xs: 1.5, sm: 3 }, py: { xs: 1.5, sm: 2 } }}>
        {groups.map((group) => {
          const rows = locationsByGroup[group.id] || [];
          return (
            <BoardGroup key={group.id} label={group.title} color={group.color || '#6b7280'} count={rows.length}>
              <BoardTable
                columns={LOCATION_COLUMNS}
                rows={rows}
                renderRow={renderLocationRow}
                emptyMessage="No locations"
                minWidth={1450}
              />
            </BoardGroup>
          );
        })}
      </Box>

      {openDialog && (
        <LocationDrawer
          open={true}
          location={openDialog}
          onClose={() => navigate("/locations")}
          onSaveNew={async (form) => {
            await dispatch(createLocationThunk(form));
            navigate("/locations");
          }}
        />
      )}
    </Box>
  );
}
