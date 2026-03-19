#!/usr/bin/env node
/**
 * scripts/hash-passwords.mjs
 *
 * Génère les hashes bcrypt des mots de passe à coller dans le .env
 *
 * Usage :
 *   node scripts/hash-passwords.mjs
 *
 * Puis copier les valeurs dans votre .env.local et dans
 * les variables d'environnement Vercel.
 */

import bcrypt from 'bcryptjs'
import crypto from 'crypto'

const SALT_ROUNDS = 12

// ── Mots de passe à changer en production ─────────────────
// Remplacez ces valeurs par vos vrais mots de passe AVANT de lancer le script
const passwords = {
  CAISSIER:  'caisse2024',
  CUISINIER: 'cuisine2024',
  CHEF:      'chef2024',
  ADMIN:     'admin2024',
}

console.log('\n🔐  Génération des hashes bcrypt...\n')
console.log('━'.repeat(60))

for (const [role, password] of Object.entries(passwords)) {
  const hash = await bcrypt.hash(password, SALT_ROUNDS)
  console.log(`AUTH_HASH_${role}=${hash}`)
}

// Générer un JWT_SECRET fort
const jwtSecret = crypto.randomBytes(48).toString('base64url')
console.log(`\nJWT_SECRET=${jwtSecret}`)

console.log('\n━'.repeat(60))
console.log('\n✅  Copiez ces lignes dans votre .env.local et dans Vercel > Settings > Environment Variables')
console.log('⚠️   Ne committez JAMAIS le fichier .env.local dans git\n')
