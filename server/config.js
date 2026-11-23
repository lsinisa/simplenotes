'use strict';

const crypto = require('node:crypto');

// The old build shipped a hardcoded signing secret. A random per-boot secret is
// safer: it invalidates tokens from previous runs, which is what you want locally.
// Set SECRET in the environment to keep tokens valid across restarts.
const hasSecret = Boolean(process.env.SECRET);

module.exports = {
  host: process.env.HOST || '127.0.0.1',
  port: Number(process.env.PORT || 3000),
  dbPath: process.env.DB_PATH || 'data/simplenotes.sqlite',
  publicDir: process.env.PUBLIC_DIR || 'public',
  tokenExpiresIn: Number(process.env.TOKEN_EXPIRES_IN || 24 * 60 * 60),
  // Has to fit the biggest note the API itself accepts: a 200-char title and
  // 4000-char message are 16,800 bytes of UTF-8 worst case (4-byte chars), plus
  // JSON overhead. An 8 KiB limit rejected perfectly valid notes (413) if the
  // text was accented. The cap stays small as the DoS guard.
  maxBodyBytes: 24 * 1024,
  secret: hasSecret ? process.env.SECRET : crypto.randomBytes(32).toString('hex'),
  generatedSecret: !hasSecret,
};
