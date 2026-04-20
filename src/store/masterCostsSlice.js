import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { mondayClient } from "../services/monday/client";
import { FETCH_BOARD_DATA } from "../services/monday/queries";
import { BOARD_IDS } from "../constants/monday";
import { parseBoardStatusColors } from "../utils/mondayUtils";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

async function apiFetch(method, path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }
  if (res.status === 204) return null;
  return res.json();
}

// ── Thunks ────────────────────────────────────────────────────────────────────

export const fetchMasterCosts = createAsyncThunk(
  "masterCosts/fetch",
  async ({ workOrderId, token } = {}, { rejectWithValue }) => {
    try {
      const qs = workOrderId ? `?workOrderId=${encodeURIComponent(workOrderId)}` : "";
      const res = await apiFetch("GET", `/api/master-costs${qs}`, null, token);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
);

export const fetchMasterCostsMetadata = createAsyncThunk(
  "masterCosts/fetchMetadata",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await mondayClient.query({
        query: FETCH_BOARD_DATA,
        variables: { boardId: [BOARD_IDS.MASTER_COSTS] },
        fetchPolicy: "network-only",
      });
      return data.boards[0];
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
);

export const createMasterCost = createAsyncThunk(
  "masterCosts/create",
  async ({ payload, token }, { dispatch, rejectWithValue }) => {
    try {
      const res = await apiFetch("POST", "/api/master-costs", payload, token);
      // Refresh after create so totals are recalculated
      dispatch(fetchMasterCosts({ workOrderId: payload.workOrderId, token }));
      return res.data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
);

export const updateMasterCost = createAsyncThunk(
  "masterCosts/update",
  async ({ mondayItemId, payload, token }, { dispatch, rejectWithValue }) => {
    try {
      await apiFetch("PATCH", `/api/master-costs/${mondayItemId}`, payload, token);
      dispatch(fetchMasterCosts({ token }));
      return { mondayItemId };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
);

export const deleteMasterCost = createAsyncThunk(
  "masterCosts/delete",
  async ({ mondayItemId, token }, { dispatch, rejectWithValue }) => {
    try {
      await apiFetch("DELETE", `/api/master-costs/${mondayItemId}`, null, token);
      return { mondayItemId };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
);

// ── Slice ─────────────────────────────────────────────────────────────────────

const masterCostsSlice = createSlice({
  name: "masterCosts",
  initialState: {
    items:        [],
    groups:       [],
    itemGroupMap: {},
    loading:      false,
    creating:     false,
    saving:       false,
    error:        null,
    statusColors: {},
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // fetch
      .addCase(fetchMasterCosts.pending,   (s) => { s.loading = true;  s.error = null; })
      .addCase(fetchMasterCosts.fulfilled, (s, { payload }) => { s.loading = false; s.items = payload ?? []; })
      .addCase(fetchMasterCosts.rejected,  (s, { payload }) => { s.loading = false; s.error = payload; })
      // metadata — extract groups, status colors, and item→group mapping
      .addCase(fetchMasterCostsMetadata.fulfilled, (s, { payload }) => {
        s.statusColors = parseBoardStatusColors(payload);
        s.groups = payload?.groups ?? [];
        // build a map of itemId → groupId so the board can group REST items by Monday group
        const colorByGroupId = Object.fromEntries((payload?.groups ?? []).map(g => [g.id, g.color]));
        const map = {};
        for (const item of payload?.items_page?.items ?? []) {
          if (item.group?.id) {
            map[item.id] = {
              id:    item.group.id,
              title: item.group.title,
              color: colorByGroupId[item.group.id] ?? "#6b7280",
            };
          }
        }
        s.itemGroupMap = map;
      })
      // create
      .addCase(createMasterCost.pending,   (s) => { s.creating = true; })
      .addCase(createMasterCost.fulfilled, (s) => { s.creating = false; })
      .addCase(createMasterCost.rejected,  (s, { payload }) => { s.creating = false; s.error = payload; })
      // update
      .addCase(updateMasterCost.pending,   (s) => { s.saving = true; })
      .addCase(updateMasterCost.fulfilled, (s) => { s.saving = false; })
      .addCase(updateMasterCost.rejected,  (s, { payload }) => { s.saving = false; s.error = payload; })
      // delete
      .addCase(deleteMasterCost.fulfilled, (s, { payload }) => {
        s.items = s.items.filter((i) => i.id !== payload.mondayItemId);
      });
  },
});

export default masterCostsSlice.reducer;
