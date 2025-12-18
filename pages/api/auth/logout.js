const cookie = require('cookie');
const { COOKIE_ACCESS, COOKIE_REFRESH } = require('../../../lib/serverAuth');

module.exports = async function handler(req, res) {
  const cleared = [
    cookie.serialize(COOKIE_ACCESS, '', { path: '/', maxAge: 0 }),
    cookie.serialize(COOKIE_REFRESH, '', { path: '/', maxAge: 0 })
  ];
  res.setHeader('Set-Cookie', cleared);
  return res.status(200).json({ ok: true, next: '/login' });
};
