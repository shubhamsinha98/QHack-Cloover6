import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "data");
const DB_PATH = path.join(DATA_DIR, "cloover-db.json");
const PORT = Number(process.env.CLOOVER_API_PORT || 8787);

const emptyDb = { users: [] };

async function ensureDb() {
  await mkdir(DATA_DIR, { recursive: true });

  try {
    await readFile(DB_PATH, "utf8");
  } catch {
    await writeFile(DB_PATH, JSON.stringify(emptyDb, null, 2));
  }
}

async function readDb() {
  await ensureDb();
  const raw = await readFile(DB_PATH, "utf8");
  return JSON.parse(raw);
}

async function writeDb(db) {
  await ensureDb();
  await writeFile(DB_PATH, JSON.stringify(db, null, 2));
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(payload));
}

function sanitizeUser(user) {
  return {
    ...user,
    customers: Array.isArray(user.customers) ? user.customers : [],
    products: Array.isArray(user.products) ? user.products : [],
    inventory: user.inventory || {},
  };
}

async function parseBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (!chunks.length) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

createServer(async (req, res) => {
  if (!req.url) {
    sendJson(res, 400, { error: "Missing request URL." });
    return;
  }

  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  try {
    if (req.method === "GET" && pathname === "/api/health") {
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === "POST" && pathname === "/api/auth/sign-in") {
      const body = await parseBody(req);
      const db = await readDb();
      const user = db.users.find(
        (item) =>
          normalize(item.name) === normalize(body.name) &&
          normalize(item.organisation) === normalize(body.organisation),
      );

      if (!user) {
        sendJson(res, 404, { error: "No saved account matched those details." });
        return;
      }

      sendJson(res, 200, { user: sanitizeUser(user) });
      return;
    }

    if (req.method === "POST" && pathname === "/api/auth/register") {
      const body = await parseBody(req);
      const db = await readDb();
      const exists = db.users.find(
        (item) =>
          normalize(item.name) === normalize(body.name) &&
          normalize(item.organisation) === normalize(body.organisation),
      );

      if (exists) {
        sendJson(res, 409, { error: "That account already exists. Please sign in instead." });
        return;
      }

      const user = sanitizeUser({
        id: `user-${randomUUID()}`,
        name: body.name,
        organisation: body.organisation,
        products: body.products || [],
        inventory: body.inventory || {},
        customers: [],
      });

      db.users.unshift(user);
      await writeDb(db);
      sendJson(res, 201, { user });
      return;
    }

    if (req.method === "PUT" && pathname.startsWith("/api/users/")) {
      const body = await parseBody(req);
      const [, , , userId] = pathname.split("/");
      const db = await readDb();
      const userIndex = db.users.findIndex((item) => item.id === userId);

      if (userIndex === -1) {
        sendJson(res, 404, { error: "User not found." });
        return;
      }

      const updatedUser = sanitizeUser({
        ...db.users[userIndex],
        ...body,
        id: db.users[userIndex].id,
      });

      db.users[userIndex] = updatedUser;
      await writeDb(db);
      sendJson(res, 200, { user: updatedUser });
      return;
    }

    sendJson(res, 404, { error: "Not found." });
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { error: error.message || "Server error." });
  }
}).listen(PORT, "127.0.0.1", () => {
  console.log(`Cloover API listening on http://127.0.0.1:${PORT}`);
});
