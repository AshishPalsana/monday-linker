import { locationsApi } from "../api";

export async function createLocation(form) {
  const token = localStorage.getItem("token");
  const resp = await locationsApi.create(token, form);
  
  if (!resp.success) {
    throw new Error(resp.error || "Failed to create location.");
  }

  // Return formatted item for the local store
  return {
    id: resp.data.id,
    name: resp.data.name,
    column_values: [] // Will be populated by the next fetchLocations() call
  };
}

export async function updateLocation(itemId, form) {
  const token = localStorage.getItem("token");
  const resp = await locationsApi.update(token, itemId, form);
  
  if (!resp.success) {
    throw new Error(resp.error || "Failed to update location.");
  }

  return resp.data;
}

export async function fetchLocations() {
  const token = localStorage.getItem("token");
  const resp = await locationsApi.getAll(token);
  
  if (!resp.success) {
    throw new Error(resp.error || "Failed to fetch locations.");
  }

  return resp.data;
}
