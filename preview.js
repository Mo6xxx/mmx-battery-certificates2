const { getStore } = require("@netlify/blobs");

function escapeHtml(s){
  return String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

exports.handler = async (event) => {
  const id = (event.queryStringParameters || {}).id;

  if(!id){
    return { statusCode: 400, headers: {"Content-Type": "text/plain"}, body: "Missing id" };
  }

  const store = getStore({
    name: "mmx-certs",
    siteID: process.env.NETLIFY_SITE_ID || process.env.MMX_SITE_ID,
    token: process.env.MMX_BLOBS_TOKEN,
  });

  const cert = await store.get(id, { type: "json" });

  const host = event.headers.host;
  const appUrl = `https://${host}/#id=${encodeURIComponent(id)}`;

  if(!cert){
    // Unknown id — still redirect, the app's own "not found" screen handles it.
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>MMX Battery Certificate</title>
<meta http-equiv="refresh" content="0; url=${escapeHtml(appUrl)}">
<script>location.replace(${JSON.stringify(appUrl)});</script>
</head><body>Redirecting… <a href="${escapeHtml(appUrl)}">Click here</a></body></html>`;
    return { statusCode: 200, headers: {"Content-Type": "text/html"}, body: html };
  }

  const title = `MMX Battery Certificate — ${cert.make || "Tesla"} ${cert.model || ""} — ${cert.soh || "?"}% SoH`.trim();
  const description = `${cert.variant || ""} • VIN ${cert.vin || "—"} • ${cert.availableKwh || "?"} kWh available • Measured ${cert.measureDate || ""}`.trim();

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">

<meta property="og:type" content="website">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${escapeHtml(appUrl)}">

<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">

<meta http-equiv="refresh" content="0; url=${escapeHtml(appUrl)}">
<script>location.replace(${JSON.stringify(appUrl)});</script>
</head>
<body>
  <p>Opening certificate… <a href="${escapeHtml(appUrl)}">Click here if you're not redirected.</a></p>
</body>
</html>`;

  return {
    statusCode: 200,
    headers: {"Content-Type": "text/html; charset=utf-8"},
    body: html,
  };
};
