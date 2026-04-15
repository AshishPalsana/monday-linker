import { addNotification } from "../uiSlice";

/**
 * Redux Middleware to automatically handle success/error notifications for async thunks.
 */
const notificationMiddleware = (store) => (next) => (action) => {
  // We only care about createAsyncThunk actions which have meta.requestStatus
  if (action.meta && action.meta.requestStatus) {
    const isRejected = action.meta.requestStatus === "rejected";
    const isFulfilled = action.meta.requestStatus === "fulfilled";
    const actionName = action.type.split("/")[1]; // e.g., 'createCustomer' -> 'createCustomer'

    // 1. Handle Errors (All rejected thunks)
    if (isRejected) {
      const errorMessage = action.payload || action.error?.message || "An unexpected error occurred.";
      
      // Ignore some specific errors if needed
      if (errorMessage !== "Aborted") {
        store.dispatch(
          addNotification({
            message: `${errorMessage}`,
            variant: "error",
          })
        );
      }
    }

    // 2. Handle Successes (Specific critical operations)
    if (isFulfilled) {
      let successMessage = null;

      // Map action types to user-friendly messages
      if (action.type.includes("createCustomer")) {
        successMessage = "Customer created successfully!";
      } else if (action.type.includes("updateCustomer")) {
        successMessage = "Customer updated successfully!";
      } else if (action.type.includes("createWorkOrder")) {
        successMessage = "Work order created successfully!";
      } else if (action.type.includes("updateWorkOrder")) {
        successMessage = "Work order updated successfully!";
      } else if (action.type.includes("createLocation")) {
        successMessage = "Location created successfully!";
      } else if (action.type.includes("updateLocation") || (action.type.includes("locations/update"))) {
        successMessage = "Location updated successfully!";
      } else if (action.type.includes("createEquipment")) {
        successMessage = "Equipment created successfully!";
      } else if (action.type.includes("updateEquipment") || (action.type.includes("equipment/update"))) {
        successMessage = "Equipment updated successfully!";
      } else if (action.type.includes("linkExistingCustomer")) {
        successMessage = "Customer linked successfully!";
      } else if (action.type.includes("linkExistingLocation")) {
        successMessage = "Location linked successfully!";
      }

      if (successMessage) {
        store.dispatch(
          addNotification({
            message: successMessage,
            variant: "success",
          })
        );
      }
    }
  }

  return next(action);
};

export default notificationMiddleware;
