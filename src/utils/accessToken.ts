import { supabase } from "@/integrations/supabase/client";

/**
 * Fetches a valid Supabase access token, refreshing the session if needed.
 * Throws if the user is not authenticated or the refresh fails.
 */
export async function getFreshAccessToken() {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !sessionData.session) {
    throw new Error("SESSION_NOT_FOUND");
  }

  let accessToken = sessionData.session.access_token;
  const expiresAt = sessionData.session.expires_at
    ? sessionData.session.expires_at * 1000
    : null;
  
  const tokenExpiringSoon = expiresAt ? expiresAt - Date.now() < 60_000 : false;

  if (!accessToken || tokenExpiringSoon) {
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError || !refreshed.session?.access_token) {
      throw new Error("TOKEN_REFRESH_FAILED");
    }
    accessToken = refreshed.session.access_token;
  }

  return accessToken;
}
