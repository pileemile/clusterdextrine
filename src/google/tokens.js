const { getPrisma } = require("../config/prisma");
const { seal, open } = require("./crypto");
const { refreshAccessToken, revoke } = require("./oauth");
const { GoogleError } = require("./errors");

// On rafraîchit un peu avant l'échéance pour ne pas envoyer un token qui expire en route.
const EARLY_REFRESH_MS = 60 * 1000;

function createTokenStore(getDb = getPrisma) {
  const pending = new Map();
  const credentials = () => getDb().googleCredential;

  async function lookup(userId) {
    if (!userId) return null;
    return credentials().findUnique({ where: { userId } });
  }

  async function find(userId) {
    const row = await lookup(userId);
    if (!row) throw new GoogleError("not_connected", 401);
    return row;
  }

  async function save(userId, tokens) {
    const fields = {
      accessToken: seal(tokens.access_token),
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      scopes: tokens.scope.split(" "),
    };
    // Au refresh, Google ne renvoie en général pas de nouveau refresh token : on garde l'ancien.
    if (tokens.refresh_token) fields.refreshToken = seal(tokens.refresh_token);
    await credentials().upsert({ where: { userId }, update: fields, create: { userId, ...fields } });
  }

  async function remove(userId) {
    await credentials().deleteMany({ where: { userId } });
  }

  async function refresh(row) {
    let tokens;
    try {
      tokens = await refreshAccessToken(open(row.refreshToken));
    } catch (err) {
      if (err.code !== "invalid_grant") throw err;
      await remove(row.userId);
      throw new GoogleError("revoked", 401);
    }
    await save(row.userId, tokens);
    return tokens.access_token;
  }

  // Deux requêtes du même utilisateur ne doivent pas lancer deux refresh en parallèle.
  function refreshOnce(row) {
    if (!pending.has(row.userId)) {
      pending.set(row.userId, refresh(row).finally(() => pending.delete(row.userId)));
    }
    return pending.get(row.userId);
  }

  async function accessTokenFor(userId) {
    const row = await find(userId);
    if (row.expiresAt.getTime() - Date.now() > EARLY_REFRESH_MS) return open(row.accessToken);
    return refreshOnce(row);
  }

  async function forceRefresh(userId) {
    return refreshOnce(await find(userId));
  }

  async function status(userId) {
    const row = await lookup(userId);
    if (!row) return { connected: false };
    return { connected: true, scopes: row.scopes, expiresAt: row.expiresAt };
  }

  async function disconnect(userId) {
    const row = await find(userId);
    try {
      await revoke(open(row.refreshToken));
    } catch (err) {
      console.warn("Révocation Google impossible, compte oublié quand même :", err.message);
    }
    await remove(userId);
  }

  return { save, remove, accessTokenFor, forceRefresh, status, disconnect };
}

module.exports = { createTokenStore };
