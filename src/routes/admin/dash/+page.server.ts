import { authenticatedFetch, API_BASE_URL } from "$lib/api";

//initial data load to table
export const load = async () => {
  const res = await authenticatedFetch(`${API_BASE_URL}/clients/dash`);
  return { dashboard: res };
};

export const actions = {
  changeToVolunteer: async () => {
    const res = await authenticatedFetch(`${API_BASE_URL}/volunteer/dash`);
    return { dashboard: res };
  },
  changeToDriver: async () => {
    const res = await authenticatedFetch(`${API_BASE_URL}/driver/dash`);
    return { dashboard: res };
  },
};
