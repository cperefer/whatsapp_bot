const API_BASE = "/api";

export async function fetchShoppingItems(): Promise<unknown> {
  const response = await fetch(`${API_BASE}/shopping`);
  return response.json();
}

export async function fetchCrossfitHistory(): Promise<unknown> {
  const response = await fetch(`${API_BASE}/crossfit`);
  return response.json();
}
