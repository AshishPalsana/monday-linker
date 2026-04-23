import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { login } from '../store/authSlice';
import { registerReauth, setCurrentToken } from '../services/api';
import mondaySdk from "monday-sdk-js";
import { mondayClient } from "../services/monday/client";
import { gql } from "@apollo/client";

const monday = mondaySdk();

const USER_QUERY = gql`
  query GetUser($ids: [ID!]) {
    users(ids: $ids) { id name is_admin }
  }
`;

export function AuthProvider({ children }) {
  const dispatch = useDispatch();
  const [initialized, setInitialized] = useState(false);
  // Keep the resolved Monday identity so re-auth can re-use it without
  // hitting the Monday SDK again (SDK context is stable within a session).
  const identityRef = useRef(null);

  async function resolveIdentity() {
    const contextRes = await monday.get("context");
    const contextUser = contextRes?.data?.user;
    console.log("[AuthProvider] Platform context received:", contextRes?.data);

    let finalUserId = contextUser?.id ? String(contextUser.id) : null;
    let finalUserName = "Platform User";
    let finalIsAdmin = false;

    try {
      const apiRes = await mondayClient.query({
        query: USER_QUERY,
        variables: { ids: [finalUserId] },
      });
      if (apiRes.data?.users?.[0]) {
        const user = apiRes.data.users[0];
        finalUserId = String(user.id);
        finalUserName = user.name;
        finalIsAdmin = !!user.is_admin;
      }
    } catch (meErr) {
      console.warn("[AuthProvider] Could not fetch profile details via Apollo:", meErr);
    }

    if (!finalUserId) throw new Error("No Monday user context available");
    return { mondayUserId: finalUserId, name: finalUserName, isAdmin: finalIsAdmin };
  }

  const doLogin = useCallback(async (identity) => {
    const result = await dispatch(login(identity)).unwrap();
    setCurrentToken(result.token);
    return result.token;
  }, [dispatch]);

  useEffect(() => {
    async function initAuth() {
      console.log("[AuthProvider] Initializing Monday identity...");
      try {
        const identity = await resolveIdentity();
        identityRef.current = identity;
        console.log(`[AuthProvider] Identifying as: ${identity.name} (${identity.mondayUserId})`);

        await doLogin(identity);

        // Register a re-auth function that re-uses the cached identity.
        // Called automatically by api.js whenever a 401 is received.
        registerReauth(async () => {
          console.log("[AuthProvider] Re-authenticating (token expired)...");
          try {
            return await doLogin(identityRef.current);
          } catch (err) {
            console.error("[AuthProvider] Re-auth failed:", err);
            return null;
          }
        });
      } catch (err) {
        console.error("[AuthProvider] Authentication failed:", err);
      } finally {
        setInitialized(true);
      }
    }

    initAuth();
  }, [dispatch, doLogin]);

  if (!initialized) return null;
  return children;
}
