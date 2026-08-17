const { getStore } = require("@netlify/blobs");

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
  "Access-Control-Allow-Headers": "Content-Type, x-mmx-key",
};

exports.handler = async (event) => {
  const store = getStore({ name: "mmx-certs" });

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: cors, body: "" };
  }

  if (event.httpMethod === "POST") {
    // Creating a certificate is restricted — viewing one (GET) is not.
    // The real passcode lives only in Netlify's environment variable
    // (MMX_CREATE_KEY), never in the shipped code.
    const expectedKey = process.env.MMX_CREATE_KEY;
    const providedKey = event.headers["x-mmx-key"] || event.headers["X-Mmx-Key"];
    if (expectedKey && providedKey !== expectedKey) {
      return { statusCode: 401, headers: cors, body: "Unauthorized" };
    }

    let payload;
    try {
      payload = JSON.parse(event.body || "{}");
    } catch (e) {
      return { statusCode: 400, headers: cors, body: "Invalid JSON" };
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
      return { statusCode: 500, headers: cors, body: "Could not allocate an id" };
    }

    await store.setJSON(id, payload);
    return {
      statusCode: 200,
      headers: { ...cors, "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    };
  }

  if (event.httpMethod === "GET") {
    const id = (event.queryStringParameters || {}).id;
    if (!id) {
      return { statusCode: 400, headers: cors, body: "Missing id" };
    }
    const data = await store.get(id, { type: "json" });
    if (!data) {
      return { statusCode: 404, headers: cors, body: "Not found" };
    }
    return {
      statusCode: 200,
      headers: { ...cors, "Content-Type": "application/json" },
      body: JSON.stringify(data),
    };
  }

  return { statusCode: 405, headers: cors, body: "Method not allowed" };
};
