const express = require("express");
const QRCode = require("qrcode");
const User = require("../models/User");
const { requireUser, markTwoFactorVerified, destroySession } = require("../auth/session");
const { randomSecret, verifyCode, recoveryCode, hashRecoveryCode } = require("../auth/totp");
const { seal, open } = require("../google/crypto");
const { log, whoFrom } = require("../services/adminLog");

const router = express.Router();
router.use(requireUser());

router.post("/logout", async (req, res) => {
  log({ action: "logout", who: whoFrom(req) });
  await destroySession(req, res);
  res.status(204).end();
});

router.post("/2fa/enroll", async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "admin_required" });
  if (req.user.twoFactorEnabled) return res.status(409).json({ error: "two_factor_already_enabled" });
  const secret = randomSecret();
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { twoFactorSecret: seal(secret) } },
    { returnDocument: "after" }
  ).lean();
  const label = encodeURIComponent(`Ciel:${user.email}`);
  const issuer = encodeURIComponent("Ciel");
  const otpauthUrl = `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
  res.json({
    secret,
    otpauthUrl,
    qrDataUrl: await QRCode.toDataURL(otpauthUrl),
  });
});

router.post("/2fa/verify", async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "admin_required" });
  const user = await User.findById(req.user._id).select("+twoFactorSecret");
  if (!user?.twoFactorSecret) return res.status(409).json({ error: "two_factor_not_enrolled" });
  if (!verifyCode(open(user.twoFactorSecret), req.body?.code)) {
    const recoveryHash = hashRecoveryCode(req.body?.code);
    const index = user.recoveryCodeHashes.indexOf(recoveryHash);
    if (index === -1) {
      log({ level: "warn", action: "2fa_ko", who: whoFrom(req), detail: "Code TOTP ou récupération invalide" });
      return res.status(401).json({ error: "invalid_two_factor_code" });
    }
    user.recoveryCodeHashes.splice(index, 1);
  }
  const codes = user.twoFactorEnabled ? [] : Array.from({ length: 10 }, recoveryCode);
  user.twoFactorEnabled = true;
  if (codes.length) user.recoveryCodeHashes = codes.map(hashRecoveryCode);
  await user.save();
  if (!(await markTwoFactorVerified(req))) return res.status(401).json({ error: "auth_required" });
  log({ action: "2fa_ok", who: whoFrom(req), detail: codes.length ? "2FA activée" : "2FA validée" });
  res.json({ enabled: true, recoveryCodes: codes });
});

module.exports = router;
