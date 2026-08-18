import { API_BASE } from "./constants";

export async function apiRequest(path, options = {}) {
  const accessToken = localStorage.getItem("access_token");
  const headers = {
    "Content-Type": "application/json",
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };

  const res = await fetch(`${API_BASE}${path}`, {
    headers,
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = JSON.stringify(body);
    } catch (_) {
      /* no json body */
    }
    throw new Error(`API ${res.status}: ${detail}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export async function fetchJobs() {
  const data = await apiRequest("/jobsheets/?page_size=10000");
  return Array.isArray(data) ? data : data.results;
}

export async function createJobAPI(payload) {
  return apiRequest("/jobsheets/", { method: "POST", body: JSON.stringify(payload) });
}

export async function updateJobAPI(id, payload) {
  return apiRequest(`/jobsheets/${id}/`, { method: "PATCH", body: JSON.stringify(payload) });
}

export async function deleteJobAPI(id) {
  return apiRequest(`/jobsheets/${id}/`, { method: "DELETE" });
}

export async function fetchEmployees(branch) {
  const apiPath = "/auth/employees/" + (branch ? `?branch=${encodeURIComponent(branch)}` : "");
  const response = await fetch(`/api${apiPath}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("access_token")}`,
    },
  });
  if (!response.ok) {
    throw new Error("Failed to load employees");
  }
  return response.json();
}
