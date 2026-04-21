import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { login } from '../store/authSlice';
import mondaySdk from "monday-sdk-js";
import { mondayClient } from "../services/monday/client";
import { gql } from "@apollo/client";

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

        // 2. Fetch full user details. 
        // We use the Apollo mondayClient (which has the service token) 
        // because the platform-level SDK might have restricted permissions.
        try {
          const userQuery = gql`
            query GetUser($ids: [ID!]) {
              users(ids: $ids) {
                id
                name
                is_admin
              }
            }
          `;
          const apiRes = await mondayClient.query({
            query: userQuery,
            variables: { ids: [finalUserId] }
          });
          console.log("[AuthProvider] User lookup result:", apiRes);

          if (apiRes.data && apiRes.data.users?.[0]) {
            const user = apiRes.data.users[0];
            finalUserId = String(user.id);
            finalUserName = user.name;
            finalIsAdmin = !!user.is_admin;
          }
        } catch (meErr) {
          console.warn("[AuthProvider] Could not fetch profile details via Apollo:", meErr);
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
          name: import.meta.env.VITE_MONDAY_USER_NAME || 'Tanvi Sachar',
          isAdmin: import.meta.env.VITE_MONDAY_USER_IS_ADMIN === 'true',
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
