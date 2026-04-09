const API_HEADERS = {
  "Content-Type": "application/json",
};

async function parseApiResponse(res) {
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error || "Request failed.");
  }

  return data;
}

export async function signInUser(credentials) {
  const res = await fetch("/api/auth/sign-in", {
    method: "POST",
    headers: API_HEADERS,
    body: JSON.stringify(credentials),
  });

  const data = await parseApiResponse(res);
  return data.user;
}

export async function registerUser(payload) {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: API_HEADERS,
    body: JSON.stringify(payload),
  });

  const data = await parseApiResponse(res);
  return data.user;
}

export async function saveUser(user) {
  const res = await fetch(`/api/users/${user.id}`, {
    method: "PUT",
    headers: API_HEADERS,
    body: JSON.stringify(user),
  });

  const data = await parseApiResponse(res);
  return data.user;
}
