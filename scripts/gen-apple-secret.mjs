// Apple Sign In 用 client_secret JWT を生成するスクリプト
// 使い方: node scripts/gen-apple-secret.mjs /path/to/AuthKey_WY73MC9GK5.p8

import { createSign } from 'crypto';
import { readFileSync } from 'fs';

const TEAM_ID    = 'BB2HS6C28U';
const KEY_ID     = 'WY73MC9GK5';
const SERVICE_ID = 'com.y.konishi.ideahatch.signin';
const AUDIENCE   = 'https://appleid.apple.com';

const p8Path = process.argv[2];
if (!p8Path) {
  console.error('Usage: node scripts/gen-apple-secret.mjs /path/to/AuthKey_WY73MC9GK5.p8');
  process.exit(1);
}

const privateKey = readFileSync(p8Path, 'utf8');
const now = Math.floor(Date.now() / 1000);
const exp = now + 60 * 60 * 24 * 180; // 180日（Appleの上限）

const header  = Buffer.from(JSON.stringify({ alg: 'ES256', kid: KEY_ID })).toString('base64url');
const payload = Buffer.from(JSON.stringify({ iss: TEAM_ID, iat: now, exp, aud: AUDIENCE, sub: SERVICE_ID })).toString('base64url');

const sign = createSign('SHA256');
sign.update(`${header}.${payload}`);
const signature = sign.sign({ key: privateKey, dsaEncoding: 'ieee-p1363' }).toString('base64url');

console.log('\n=== Apple client_secret JWT (Supabase に貼り付ける) ===\n');
console.log(`${header}.${payload}.${signature}`);
console.log('\n有効期限: 180日');
