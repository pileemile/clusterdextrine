const { GoogleError } = require("./errors");

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const SCOPE = "https://www.googleapis.com/auth/calendar.events";
const FORM = { "Content-Type": "application/x-www-form-urlencoded" };

function authUrl(state) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    // Sans prompt=consent, Google ne renvoie le refresh token qu'à la toute première connexion.
    prompt: "consent",
    state,
  });
  return `${AUTH_URL}?${params}`;
}

async function postToken(fields) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: FORM,
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      ...fields,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (res.ok) return body;
  if (body.error === "invalid_grant") throw new GoogleError("invalid_grant", 400);
  if (res.status === 429) throw new GoogleError("quota", 429, res.headers.get("retry-after"));
  throw new GoogleError("google_error", 502);
}

function exchangeCode(code) {
  return postToken({
    code,
    grant_type: "authorization_code",
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
  });
}

function refreshAccessToken(refreshToken) {
  return postToken({ refresh_token: refreshToken, grant_type: "refresh_token" });
}

async function revoke(token) {
  await fetch(REVOKE_URL, { method: "POST", headers: FORM, body: new URLSearchParams({ token }) });
}

module.exports = { authUrl, exchangeCode, refreshAccessToken, revoke };
