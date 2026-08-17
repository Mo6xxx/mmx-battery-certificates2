import { getStore } from "https://esm.sh/@netlify/blobs@8?target=deno";

const ID_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomId(len = 8) {
  let out = "";
  for (let i = 0; i < len; i++) {
    out += ID_CHARS[Math.floor(Math.random() * ID_CHARS.length)];
  }
  return out;
}

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default async (request) => {
  const store = getStore({ name: "mmx-certs" });
  const url = new URL(request.url);

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  if (request.method === "POST") {
    // Creating a certificate is restricted — viewing one (GET) is not.
    // The real passcode lives only in Netlify's environment variable
    // (MMX_CREATE_KEY), never in this shipped file, so it can't be read
    // by inspecting the page source.
    const expectedKey = Deno.env.get("MMX_CREATE_KEY");
    const providedKey = request.headers.get("x-mmx-key");
    if (expectedKey && providedKey !== expectedKey) {
      return new Response("Unauthorized", { status: 401, headers: cors });
    }

    let payload;
    try {
      payload = await request.json();
    } catch (e) {
      return new Response("Invalid JSON", { status: 400, headers: cors });
    }

    let id;
    for (let attempt = 0; attempt < 6; attempt++) {
      const candidate = randomId(8);
      const existing = await store.get(candidate);
      if (!existing) {
        id = candidate;
        break;
      }
    }
    if (!id) {
      return new Response("Could not allocate an id", { status: 500, headers: cors });
    }

    await store.setJSON(id, payload);
    return new Response(JSON.stringify({ id }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  if (request.method === "GET") {
    const id = url.searchParams.get("id");
    if (!id) {
      return new Response("Missing id", { status: 400, headers: cors });
    }
    const data = await store.get(id, { type: "json" });
    if (!data) {
      return new Response("Not found", { status: 404, headers: cors });
    }
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  return new Response("Method not allowed", { status: 405, headers: cors });
};

export const config = { path: "/api/cert" };
