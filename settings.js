const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'set.env') });

const digits = (v) => (v || '').replace(/\D/g, '');

module.exports = {
  botName: process.env.BOT_NAME || 'Nexus',
  prefix: process.env.PREFIX || '.',
  // Owner number(s), digits only with country code, comma separated. e.g. 254712345678
  owners: (process.env.OWNER_NUMBER || '').split(',').map(digits).filter(Boolean),
  // "public" = everyone can use commands, "private" = owner only
  mode: (process.env.MODE || 'public').toLowerCase(),
  pairingNumber: digits(process.env.PAIRING_NUMBER),
  sessionId: (process.env.SESSION_ID || '').trim(),
  sessionDir: process.env.SESSION_DIR || path.join(__dirname, 'session'),
  port: Number(process.env.PORT) || 3000,
  connectAlert: String(process.env.CONNECT_ALERT || 'true') !== 'false',
  menuImage: process.env.MENU_IMAGE || 'https://u.pone.rs/vluuzjpq.jpeg',
  timezone: process.env.TIMEZONE || 'Africa/Nairobi',
  repo: process.env.REPO_URL || 'https://github.com/adeztech2/xmd',
  autoRead: String(process.env.AUTO_READ || 'false') === 'true',
};
