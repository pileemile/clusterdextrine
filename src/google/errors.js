class GoogleError extends Error {
  constructor(code, status, retryAfter) {
    super(code);
    this.name = "GoogleError";
    this.code = code;
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

module.exports = { GoogleError };
