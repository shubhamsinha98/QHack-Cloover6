const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

const API_HEADERS = {
  "Content-Type": "application/json",
};

function apiUrl(pathname) {
  return `${API_BASE_URL}${pathname}`;
}

async function parseApiResponse(res) {
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error || "Request failed.");
  }

  return data;
}

export async function signInUser(credentials) {
  const res = await fetch(apiUrl("/api/auth/sign-in"), {
    method: "POST",
    headers: API_HEADERS,
    body: JSON.stringify(credentials),
  });

  const data = await parseApiResponse(res);
  return data.user;
}

export async function registerUser(payload) {
  const res = await fetch(apiUrl("/api/auth/register"), {
    method: "POST",
    headers: API_HEADERS,
    body: JSON.stringify(payload),
  });

  const data = await parseApiResponse(res);
  return data.user;
}

export async function saveUser(user) {
  const res = await fetch(apiUrl(`/api/users/${user.id}`), {
    method: "PUT",
    headers: API_HEADERS,
    body: JSON.stringify(user),
  });

  const data = await parseApiResponse(res);
  return data.user;
}
