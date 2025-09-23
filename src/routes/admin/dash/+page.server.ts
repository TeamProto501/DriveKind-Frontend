import { authenticatedFetch, API_BASE_URL } from "$lib/api";

//initial data load to table
export const load = async () => {
  const res = await authenticatedFetch(`${API_BASE_URL}/clients/dashboard`);
  return { dashboard: res };
};
