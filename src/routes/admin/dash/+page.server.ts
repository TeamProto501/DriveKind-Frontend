import { authenticatedFetch, API_BASE_URL } from "$lib/api";
import type { AuthInfo } from "../../../lib/types";
import type { RequestEvent } from "@sveltejs/kit";

const Table_Config = {
  clients: {
    endpoint: "/clients/dash",
    columns: [
      { key: "first_name", label: "First Name", source: "first_name" },
      { key: "last_name", label: "Last Name", source: "last_name" },
      { key: "date_of_birth", label: "Date of Birth", source: "date_of_birth" },
      {
        key: "street_address",
        label: "Street Address",
        source: "street_address",
      },
      { key: "city", label: "City", source: "city" },
      { key: "state", label: "State", source: "state" },
      { key: "zip_code", label: "Zip_code", source: "zip_code" },
      { key: "primary_phone", label: "Primary Phone", source: "primary_phone" },
    ],
  },
  drivers: {
    endpoint: "/driver/dash",
    columns: [
      { key: "first_name", label: "First Name", source: "first_name" },
      { key: "last_name", label: "Last Name", source: "last_name" },
      { key: "role", label: "Role", source: "role" },
      { key: "email", label: "e-Mail", source: "email" },
      { key: "dob", label: "Date of Birth", source: "dob" },
      {
        key: "street_address",
        label: "Street Address",
        source: "street_address",
      },
      { key: "city", label: "City", source: "city" },
      { key: "state", label: "State", source: "state" },
      { key: "zip_code", label: "Zip_code", source: "zip_code" },
      { key: "primary_phone", label: "Primary Phone", source: "primary_phone" },
    ],
  },
  volunteers: {
    endpoint: "/volunteer/dash",
    columns: [
      { key: "first_name", label: "First Name", source: "first_name" },
      { key: "last_name", label: "Last Name", source: "last_name" },
      { key: "role", label: "Role", source: "role" },
      { key: "email", label: "e-Mail", source: "email" },
      { key: "dob", label: "Date of Birth", source: "dob" },
      {
        key: "street_address",
        label: "Street Address",
        source: "street_address",
      },
      { key: "city", label: "City", source: "city" },
      { key: "state", label: "State", source: "state" },
      { key: "zip_code", label: "Zip_code", source: "zip_code" },
      { key: "primary_phone", label: "Primary Phone", source: "primary_phone" },
    ],
  },
  dispatchers: {
    endpoint: "/dispatcher/dash",
    columns: [
      { key: "first_name", label: "First Name", source: "first_name" },
      { key: "last_name", label: "Last Name", source: "last_name" },
      { key: "role", label: "Role", source: "role" },
      { key: "email", label: "e-Mail", source: "email" },
      { key: "dob", label: "Date of Birth", source: "dob" },
      {
        key: "street_address",
        label: "Street Address",
        source: "street_address",
      },
      { key: "city", label: "City", source: "city" },
      { key: "state", label: "State", source: "state" },
      { key: "zip_code", label: "Zip_code", source: "zip_code" },
      { key: "primary_phone", label: "Primary Phone", source: "primary_phone" },
    ],
  },
};
//initial data load to table
export const load = async (event) => {
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
