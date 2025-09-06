import { f as fail, r as redirect } from "../../chunks/index2.js";
import { c as createSupabaseServerClient } from "../../chunks/supabase.server.js";
const API_BASE_URL = "https://smile-design-manhattan-api.vercel.app";
async function authenticatedFetch(url, options = {}, authInfo, event) {
  let token;
  let supabaseClient = null;
  if (event) {
    supabaseClient = createSupabaseServerClient(event);
    const { data: { session } } = await supabaseClient.auth.getSession();
    token = session?.access_token;
  }
  if (!token) {
    throw new Error("No authentication token available");
  }
  const makeRequest = async (accessToken) => {
    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`,
      ...options.headers
    };
    return fetch(url, {
      ...options,
      headers,
      credentials: "include"
    });
  };
  try {
    const response = await makeRequest(token);
    if (response.ok) {
      return response;
    }
    if (response.status === 401 || response.status === 403) {
      if (supabaseClient) {
        const { data: { session }, error } = await supabaseClient.auth.refreshSession();
        if (session?.access_token && !error) {
          const retryResponse = await makeRequest(session.access_token);
          if (retryResponse.ok) {
            return retryResponse;
          }
        }
      }
    }
    return response;
  } catch (fetchError) {
    throw fetchError;
  }
}
const actions = {
  logout: async (event) => {
    const supabase = createSupabaseServerClient(event);
    const { error } = await supabase.auth.signOut();
    if (error) {
      return fail(500, {
        error: "Error logging out"
      });
    }
    throw redirect(302, "/login");
  },
  testProviders: async (event) => {
    try {
      const response = await authenticatedFetch(
        `${API_BASE_URL}/providers`,
        {},
        void 0,
        event
      );
      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          data
        };
      } else {
        const errorData = await response.json().catch(() => ({ error: "Failed to parse error response" }));
        return fail(response.status, {
          error: `HTTP ${response.status}: ${errorData.error || "Unknown error"}`
        });
      }
    } catch (error) {
      return fail(500, {
        error: `Network error: ${error.message}`
      });
    }
  }
};
export {
  actions
};
