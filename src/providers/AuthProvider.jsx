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
      console.log("[AuthProvider] Initializing Monday identity...");
      try {
        // 1. Get platform context
        const contextRes = await monday.get("context");
        const contextUser = contextRes?.data?.user;
        console.log("[AuthProvider] Platform context received:", contextRes?.data);

        let finalUserId = contextUser?.id ? String(contextUser.id) : null;
        let finalUserName = "Platform User";
        let finalIsAdmin = false;

        // 2. Fetch full user details from "me" query (requires me:read scope)
        try {
          const query = `query { me { id name is_admin } }`;
          const apiRes = await monday.api(query);
          console.log("[AuthProvider] 'Me' query result:", apiRes);

          if (apiRes.data && apiRes.data.me) {
            finalUserId = String(apiRes.data.me.id);
            finalUserName = apiRes.data.me.name;
            finalIsAdmin = !!apiRes.data.me.is_admin;
          }
        } catch (meErr) {
          console.warn("[AuthProvider] Could not fetch profile details (check scopes in Developer Center):", meErr);
        }

        if (finalUserId) {
          console.log(`[AuthProvider] Identifying as: ${finalUserName} (${finalUserId})`);
          dispatch(login({
            mondayUserId: finalUserId,
            name: finalUserName,
            isAdmin: finalIsAdmin
          }));
        } else {
          throw new Error("No Monday user context available");
        }
      } catch (err) {
        console.error("[AuthProvider] Authentication failed, falling back to dev identity:", err);
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
