import { authenticatedFetchServer, API_BASE_URL } from "$lib/api.server";

//initial data load to table
export const load = async (event) => {
  const tab = event.url.searchParams.get("tab") ?? "clients";
  const endpoint =
    tab === "drivers"
      ? "/driver/dash"
      : tab === "volunteer"
      ? "/volunteer/dash"
      : tab === "dispatcher"
      ? "/dispatcher/dash"
      : "/clients/dash";
      
  try {
    const res = await authenticatedFetchServer(
      API_BASE_URL + endpoint,
      {},
      event
    );
    const text = await res.text();
    const data = JSON.parse(text);

    return { tab, data };
  } catch (error) {
    console.error('Dashboard load error:', error);
    // If it's a redirect (authentication error), let it through
    if (error instanceof Response && error.status >= 300 && error.status < 400) {
      throw error;
    }
    
    return { 
      tab, 
      data: [],
      error: 'Failed to load dashboard data'
    };
  }
};
