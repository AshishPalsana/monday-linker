import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { login } from '../store/authSlice';
import mondaySdk from "monday-sdk-js";

const monday = mondaySdk();

export function AuthProvider({ children }) {
  const dispatch = useDispatch();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    async function initAuth() {
      try {
        // Try to get context from the Monday platform first
        const contextRes = await monday.get("context");
        const contextUserId = contextRes?.data?.user?.id;

        // Fetch full user details from "me" query via the platform's API
        // This is the most reliable way to get the current user's name/admin status
        const query = `query { me { id name is_admin } }`;
        const apiRes = await monday.api(query);

        if (apiRes.data && apiRes.data.me) {
          const { id, name, is_admin } = apiRes.data.me;
          dispatch(login({
            mondayUserId: String(id),
            name: name,
            isAdmin: !!is_admin
          }));
        } else if (contextUserId) {
          // Fallback if "me" query fails but we have context ID
          dispatch(login({
            mondayUserId: String(contextUserId),
            name: import.meta.env.VITE_MONDAY_USER_NAME || "User",
            isAdmin: false
          }));
        } else {
          throw new Error("No Monday context found");
        }
      } catch (err) {
        console.warn("[AuthProvider] Using dev fallback identity:", err);
        // Local development fallback
        dispatch(login({
          mondayUserId: import.meta.env.VITE_MONDAY_USER_ID || '100074837',
          name:         import.meta.env.VITE_MONDAY_USER_NAME || 'Tanvi Sachar',
          isAdmin:      import.meta.env.VITE_MONDAY_USER_IS_ADMIN === 'true',
        }));
      } finally {
        setInitialized(true);
      }
    }

    initAuth();
  }, [dispatch]);

  if (!initialized) return null;

  return children;
}
