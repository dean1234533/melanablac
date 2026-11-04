// Generates a VAPID key pair for web push. Usage: node scripts/make-vapid.mjs
import { webcrypto as c } from 'node:crypto';
import fs from 'node:fs';
const kp = await c.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign']);
const pub = Buffer.from(await c.subtle.exportKey('raw', kp.publicKey)).toString('base64url');
const jwk = JSON.stringify(await c.subtle.exportKey('jwk', kp.privateKey));
fs.writeFileSync('.dev-vapid-public', pub);
fs.writeFileSync('.dev-vapid-private', `'${jwk}'`);
console.log('VAPID_PUBLIC_KEY=' + pub + '\nVAPID_PRIVATE_JWK=' + jwk);
