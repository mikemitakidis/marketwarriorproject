import cookie from 'cookie';
import { COOKIE_ACCESS, COOKIE_REFRESH } from '../../../lib/serverAuth';

export default async function handler(req, res) {
  const cleared = [
    cookie.serialize(COOKIE_ACCESS, '', { path: '/', maxAge: 0 }),
    cookie.serialize(COOKIE_REFRESH, '', { path: '/', maxAge: 0 })
  ];
  res.setHeader('Set-Cookie', cleared);
  return res.status(200).json({ ok: true, next: '/login' });
}
