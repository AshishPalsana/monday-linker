import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSnackbar } from "notistack";
import { removeNotification } from "../store/uiSlice";

/**
 * Headless component that bridge Redux notifications to notistack toasts.
 */
const NotificationManager = () => {
  const { enqueueSnackbar } = useSnackbar();
  const dispatch = useDispatch();
  const notifications = useSelector((state) => state.ui.notifications);

  useEffect(() => {
    notifications.forEach(({ message, variant, key, options = {} }) => {
      // Display the toast
      enqueueSnackbar(message, {
        variant: variant || "default",
        key,
        autoHideDuration: 4000,
        ...options,
      });
      // Remove from Redux immediately so it's not re-processed on next render
      dispatch(removeNotification(key));
    });
  }, [notifications, enqueueSnackbar, dispatch]);

  return null;
};

export default NotificationManager;
