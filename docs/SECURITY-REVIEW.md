# Rapport de Sécurité - CRM Luelis v2

> Audit de sécurité complet de l'application
> Date: 6 janvier 2026

---

## Résumé Exécutif

| Sévérité | Nombre | Statut |
|----------|--------|--------|
| **Critique** | 4 | Action immédiate requise |
| **Haute** | 6 | À corriger avant production |
| **Moyenne** | 5 | À corriger avant lancement |
| **Basse** | 4 | Recommandé |
| **Info** | 2 | Surveillance recommandée |

---

## Vulnérabilités Critiques

### 1. Secrets exposés dans le fichier .env

**Localisation:** `/home/CRM v2/.env`

**Problème:**
- Credentials de base de données en clair
- Clé secrète NextAuth exposée
- Clé API DocuSeal exposée
- Secret CRON exposé
- Clé privée VAPID exposée

**Impact:** Compromission complète du système si le fichier est divulgué

**Recommandations:**
```bash
# 1. Utiliser un gestionnaire de secrets
# AWS Secrets Manager, HashiCorp Vault, ou Doppler

# 2. Ne jamais commiter .env
echo ".env" >> .gitignore

# 3. Utiliser .env.example pour la documentation
cp .env .env.example
# Remplacer toutes les valeurs sensibles par des placeholders

# 4. Rotation immédiate de toutes les clés exposées
```

---

### 2. Absence de validation de signature sur les webhooks

**Localisation:**
- `/src/app/api/webhooks/docuseal/route.ts`
- `/src/app/api/revolut/webhook/route.ts`

**Problème:**
- Aucune vérification HMAC sur les payloads entrants
- N'importe qui peut forger des requêtes webhook

**Impact:**
- Factures marquées comme payées sans paiement réel
- Signatures de contrats forgées
- Fraude financière

**Recommandations:**
```typescript
// Exemple pour Revolut webhook
import crypto from 'crypto'

export async function POST(request: Request) {
  const signature = request.headers.get('x-revolut-signature')
  const body = await request.text()

  const expectedSignature = crypto
    .createHmac('sha256', process.env.REVOLUT_WEBHOOK_SECRET!)
    .update(body)
    .digest('hex')

  if (signature !== expectedSignature) {
    return Response.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // Traitement du webhook...
}
```

---

### 3. Endpoint admin non protégé

**Localisation:** `/src/app/api/admin/migrate-prospects/route.ts`

**Problème:** Aucune vérification d'authentification

**Impact:** Migration de données par utilisateur non autorisé

**Correction:**
```typescript
import { auth } from "@/lib/auth"

export async function POST(request: Request) {
  const session = await auth()

  if (!session?.user || session.user.type !== 'super_admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 403 })
  }

  // Suite du code...
}
```

---

### 4. Vulnérabilités XSS

**Localisation:**
- `/src/components/notes/MarkdownPreview.tsx`
- `/src/components/clients/ClientEmailsTab.tsx`

**Problème:** Utilisation de `dangerouslySetInnerHTML` avec du contenu utilisateur

**Impact:** Exécution de JavaScript malveillant, vol de session

**Correction:**
```bash
npm install dompurify @types/dompurify
```

```typescript
import DOMPurify from 'dompurify'

// Avant
<div dangerouslySetInnerHTML={{ __html: content }} />

// Après
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }} />
```

---

## Vulnérabilités Haute Sévérité

### 5. Validation d'entrée insuffisante

**Localisation:** Multiples routes API

**Problème:**
- Pas de validation de schéma (Zod)
- Paramètres de pagination non validés
- Emails non validés sur les invitations

**Correction:**
```bash
npm install zod
```

```typescript
import { z } from 'zod'

const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(15),
})

const ClientSchema = z.object({
  companyName: z.string().min(1).max(255),
  email: z.string().email().optional(),
  siret: z.string().regex(/^\d{14}$/).optional(),
  // ...
})
```

---

### 6. Tokens publics sans expiration

**Localisation:** Routes `/api/public/invoice/[token]` et `/api/public/quote/[token]`

**Problème:** Les tokens d'accès public n'expirent jamais

**Correction:**
```typescript
// Ajouter un champ expiresAt au token
const token = {
  value: crypto.randomBytes(32).toString('hex'),
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 jours
}

// Vérifier l'expiration
if (invoice.publicTokenExpiresAt && invoice.publicTokenExpiresAt < new Date()) {
  return Response.json({ error: 'Token expired' }, { status: 410 })
}
```

---

### 7. Absence de protection CSRF

**Problème:** Pas de tokens CSRF sur les opérations sensibles

**Correction:**
```typescript
// next.config.ts
module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Set-Cookie',
            value: 'SameSite=Strict; Secure; HttpOnly'
          }
        ]
      }
    ]
  }
}
```

---

### 8. Upload de fichiers sans validation MIME

**Localisation:** `/src/app/api/notes/[id]/attachments/route.ts`

**Problème:**
- Seule la taille est validée (10MB)
- Aucune vérification du type MIME
- Risque d'upload de fichiers exécutables

**Correction:**
```bash
npm install file-type
```

```typescript
import { fileTypeFromBuffer } from 'file-type'

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]

const buffer = Buffer.from(await file.arrayBuffer())
const type = await fileTypeFromBuffer(buffer)

if (!type || !ALLOWED_TYPES.includes(type.mime)) {
  return Response.json({ error: 'File type not allowed' }, { status: 400 })
}
```

---

### 9. Tenant ID hardcodé

**Localisation:** Multiples fichiers

**Problème:** `BigInt(1)` utilisé au lieu d'extraire le tenant de la session

**Impact:** Problèmes de multi-tenancy, fuite de données entre tenants

**Correction:**
```typescript
// lib/tenant.ts
export async function getTenantId(session: Session) {
  if (!session?.user?.tenantId) {
    throw new Error('No tenant ID in session')
  }
  return BigInt(session.user.tenantId)
}

// Dans les routes
const tenantId = await getTenantId(session)
```

---

### 10. Pas de rate limiting sur l'authentification

**Localisation:** `/src/app/api/auth/forgot-password/route.ts`

**Problème:** Pas de limite de requêtes

**Impact:** Énumération d'emails, brute force

**Correction:**
```bash
npm install @upstash/ratelimit @upstash/redis
```

```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '1 h'), // 5 requêtes par heure
})

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') ?? 'anonymous'
  const { success } = await ratelimit.limit(ip)

  if (!success) {
    return Response.json({ error: 'Too many requests' }, { status: 429 })
  }

  // Suite...
}
```

---

## Vulnérabilités Moyenne Sévérité

### 11. Impersonation sans audit

**Localisation:** `/src/app/api/auth/impersonate/route.ts`

**Problème:** Aucune trace des sessions d'impersonation

**Correction:**
```typescript
// Créer un log d'audit
await prisma.auditLog.create({
  data: {
    action: 'IMPERSONATE',
    actorId: session.user.id,
    targetId: targetUserId,
    ipAddress: request.headers.get('x-forwarded-for'),
    userAgent: request.headers.get('user-agent'),
    timestamp: new Date(),
  }
})

// Notifier l'utilisateur impersonné
await sendEmail({
  to: targetUser.email,
  subject: 'Accès administrateur à votre compte',
  body: `Un administrateur a accédé à votre compte le ${new Date().toLocaleString()}`
})
```

---

### 12. Headers de sécurité manquants

**Correction dans `next.config.ts`:**
```typescript
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()'
  }
]

module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}
```

---

### 13. Mot de passe faible autorisé

**Localisation:** `/src/app/api/auth/reset-password/route.ts`

**Problème:** Minimum 8 caractères seulement

**Correction:**
```typescript
const PasswordSchema = z.string()
  .min(12, 'Minimum 12 caractères')
  .regex(/[A-Z]/, 'Au moins une majuscule')
  .regex(/[a-z]/, 'Au moins une minuscule')
  .regex(/[0-9]/, 'Au moins un chiffre')
  .regex(/[^A-Za-z0-9]/, 'Au moins un caractère spécial')

// Vérifier contre les mots de passe courants
import commonPasswords from 'common-password-checker'

if (commonPasswords.isCommon(password)) {
  return Response.json({ error: 'Mot de passe trop courant' }, { status: 400 })
}
```

---

### 14. Tokens O365 non chiffrés

**Localisation:** Base de données (schema.prisma)

**Problème:** Access tokens stockés en clair

**Correction:**
```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ENCRYPTION_KEY = Buffer.from(process.env.TOKEN_ENCRYPTION_KEY!, 'hex')
const IV_LENGTH = 16

function encrypt(text: string): string {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag()
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted
}

function decrypt(text: string): string {
  const [ivHex, authTagHex, encryptedText] = text.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const decipher = createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv)
  decipher.setAuthTag(authTag)
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}
```

---

### 15. Validation IBAN manquante

**Correction:**
```typescript
function validateIBAN(iban: string): boolean {
  // Supprimer espaces et mettre en majuscules
  iban = iban.replace(/\s/g, '').toUpperCase()

  // Vérifier le format
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{4,30}$/.test(iban)) {
    return false
  }

  // Réorganiser pour le calcul
  const rearranged = iban.slice(4) + iban.slice(0, 4)

  // Convertir les lettres en chiffres
  const numeric = rearranged.split('').map(char => {
    const code = char.charCodeAt(0)
    return code >= 65 ? (code - 55).toString() : char
  }).join('')

  // Vérifier mod 97
  let remainder = numeric
  while (remainder.length > 2) {
    const block = remainder.slice(0, 9)
    remainder = (parseInt(block, 10) % 97).toString() + remainder.slice(9)
  }

  return parseInt(remainder, 10) % 97 === 1
}
```

---

## Actions Prioritaires

### Immédiat (Cette semaine)
1. ✅ Rotation de tous les secrets exposés
2. ✅ Ajouter validation de signature sur les webhooks
3. ✅ Protéger l'endpoint admin
4. ✅ Installer DOMPurify pour XSS

### Court terme (2 semaines)
5. ⬜ Implémenter rate limiting
6. ⬜ Ajouter validation Zod sur toutes les routes
7. ⬜ Corriger l'upload de fichiers
8. ⬜ Ajouter les headers de sécurité

### Moyen terme (1 mois)
9. ⬜ Audit logging complet
10. ⬜ Chiffrement des tokens
11. ⬜ Tests de pénétration
12. ⬜ Formation équipe sécurité

---

## Outils Recommandés

| Outil | Usage |
|-------|-------|
| `@upstash/ratelimit` | Rate limiting |
| `zod` | Validation de schéma |
| `dompurify` | Sanitization HTML |
| `file-type` | Détection MIME |
| `helmet` | Headers sécurité (si Express) |
| `snyk` | Scan de vulnérabilités |

---

## Checklist de Déploiement Production

- [ ] Tous les secrets dans un gestionnaire sécurisé
- [ ] HTTPS forcé
- [ ] Headers de sécurité configurés
- [ ] Rate limiting activé
- [ ] Logs d'audit activés
- [ ] Backup chiffré de la base de données
- [ ] Monitoring des erreurs (Sentry)
- [ ] Alertes de sécurité configurées

---

*Rapport de sécurité - CRM Luelis v2*
*Confidentiel - Ne pas diffuser*
