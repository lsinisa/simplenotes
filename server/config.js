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
  maxBodyBytes: 8 * 1024,
  secret: hasSecret ? process.env.SECRET : crypto.randomBytes(32).toString('hex'),
  generatedSecret: !hasSecret,
};
