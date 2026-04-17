import { useState, useEffect, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
import { fetchLocations, createLocation as createLocationThunk, linkRecordToLocation } from "../store/locationsSlice";
import { fetchCustomers } from "../store/customersSlice";
import { fetchWorkOrders } from "../store/workOrderSlice";
import { fetchEquipment } from "../store/equipmentslice";
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
import { getColumnDisplayValue, getColumnSnapshot } from "../utils/mondayUtils";
import StatusChip from "./StatusChip";
import LocationDrawer from "./LocationDrawer";
import RelationCell from "./RelationCell";
import { BoardGroup, BoardTable, DATA_CELL_SX, DASH, TruncCell } from "./BoardTable";

const COL = MONDAY_COLUMNS.LOCATIONS;

export default function LocationsBoard() {
  const dispatch = useDispatch();
  const { board, loading, error, statusColors } = useSelector((state) => state.locations);
  const customers = useSelector((s) => s.customers.board?.items_page?.items || []);
  const workOrders = useSelector((s) => s.workOrders.board?.items_page?.items || []);
  const equipment = useSelector((s) => s.equipment.board?.items_page?.items || []);
  const { search } = useBoardHeaderContext();
  const { id } = useParams();
  const navigate = useNavigate();

  // Derived state for the selected location based on the URL ID
  const openDialog = useMemo(() => {
    if (!id) return null;
    if (id === '__new__') return { id: "__new__", name: "", column_values: [] };
    if (!board?.items_page?.items) return null;
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
    dispatch(fetchCustomers());
    dispatch(fetchWorkOrders());
    dispatch(fetchEquipment());
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
    { label: "Street Address", width: 250 },
    { label: "City", width: 140 },
    { label: "State", width: 100 },
    { label: "ZIP", width: 100 },
    { label: "Customers", width: 200 },
    { label: "Work Orders", width: 200 },
    { label: "Equipment", width: 200 },
    { label: "Status", width: 160 },
    { label: "Notes", width: 250 },
  ];

  const renderLocationRow = (loc) => {
    const status = getColumnDisplayValue(loc, COL.STATUS);
    
    const handleLink = (colId, linkedId, linkedName) => {
      const previousSnapshot = getColumnSnapshot(loc, colId);
      dispatch(linkRecordToLocation({
        locationId: loc.id,
        columnId: colId,
        linkedId,
        linkedName,
        previousSnapshot
      }));
    };

    return (
      <TableRow
        key={loc.id}
        hover
        sx={{ cursor: "pointer" }}
        onClick={() => navigate(`/locations/${loc.id}`)}
      >
        <TableCell sx={{ ...DATA_CELL_SX, py: '5px' }}>
          <Tooltip title={loc.name} placement="top" enterDelay={600} arrow>
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem', color: 'text.primary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {loc.name}
            </Typography>
          </Tooltip>
        </TableCell>
        <TruncCell value={getColumnDisplayValue(loc, COL.STREET_ADDRESS)} />
        <TruncCell value={getColumnDisplayValue(loc, COL.CITY)} />
        <TruncCell value={getColumnDisplayValue(loc, COL.STATE)} />
        <TruncCell value={getColumnDisplayValue(loc, COL.ZIP)} />
        <TableCell sx={{ ...DATA_CELL_SX, overflow: "visible", py: "5px" }} onClick={(e) => e.stopPropagation()}>
          <RelationCell
            value={getColumnDisplayValue(loc, COL.CUSTOMERS_REL)}
            options={customers}
            placeholder="— add customer"
            chipBgColor="#f0fdf4"
            chipTextColor="#166534"
            chipBorderColor="#bbf7d0"
            onSelectExisting={(id, name) => handleLink(COL.CUSTOMERS_REL, id, name)}
          />
        </TableCell>
        <TableCell sx={{ ...DATA_CELL_SX, overflow: "visible", py: "5px" }} onClick={(e) => e.stopPropagation()}>
          <RelationCell
            value={getColumnDisplayValue(loc, COL.WORK_ORDERS_REL)}
            options={workOrders}
            placeholder="— add work order"
            chipBgColor="#ebf0fd"
            chipTextColor="#1e40af"
            chipBorderColor="#c7d7fb"
            onSelectExisting={(id, name) => handleLink(COL.WORK_ORDERS_REL, id, name)}
          />
        </TableCell>
        <TableCell sx={{ ...DATA_CELL_SX, overflow: "visible", py: "5px" }} onClick={(e) => e.stopPropagation()}>
          <RelationCell
            value={getColumnDisplayValue(loc, COL.EQUIPMENTS_REL)}
            options={equipment}
            placeholder="— add equipment"
            chipBgColor="#fff7ed"
            chipTextColor="#c2410c"
            chipBorderColor="#fed7aa"
            onSelectExisting={(id, name) => handleLink(COL.EQUIPMENTS_REL, id, name)}
          />
        </TableCell>
        <TableCell sx={{ ...DATA_CELL_SX, overflow: 'visible' }}>
          {status ? (
            <StatusChip status={status} colorMap={statusColors} />
          ) : DASH}
        </TableCell>
        <TruncCell value={getColumnDisplayValue(loc, COL.NOTES)} />
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
                minWidth={1920}
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
