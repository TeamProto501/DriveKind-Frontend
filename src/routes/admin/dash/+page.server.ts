import { authenticatedFetch, API_BASE_URL } from "$lib/api";
import type { AuthInfo } from "../../../lib/types";
import type { RequestEvent } from "@sveltejs/kit";
//initial data load to table
export const load = async (event) => {
  /* const res = await authenticatedFetch(
    `${API_BASE_URL}clients/dash`,
    {},
    undefined,
    event
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch clients: ${res.status}`);
  }

  const clients = await res.json();
  console.log(clients);
  /*  return { clients }; */
  const res = await authenticatedFetch(
    `${API_BASE_URL}clients/dash`,
    {},
    undefined,
    event
  );
  const text = await res.text();
  const clients = JSON.parse(text);
  return { clients };
};

export const actions = {
  changeToVolunteer: async () => {
    const res = await authenticatedFetch(`${API_BASE_URL}volunteer/dash`);
    return { dashboard: res };
  },
  changeToDriver: async () => {
    const res = await authenticatedFetch(`${API_BASE_URL}driver/dash`);
    return { dashboard: res };
  },
  changeToClient: async (event) => {
    const res = await authenticatedFetch(
      `${API_BASE_URL}clients/dash`,
      {},
      undefined,
      event
    );
    const text = await res.text();
    return { clients: JSON.parse(text) };
  },
};
