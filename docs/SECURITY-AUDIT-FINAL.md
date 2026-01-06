# AUDIT DE SÉCURITÉ COMPLET - CRM v2

**Date:** 6 janvier 2026
**Version:** 1.0.0
**Statut:** CRITIQUE - Corrections urgentes requises

---

## RÉSUMÉ EXÉCUTIF

L'audit de sécurité complet du CRM v2 a révélé **67 vulnérabilités** réparties comme suit:

| Sévérité | Nombre | % |
|----------|--------|---|
| **CRITIQUE** | 18 | 27% |
| **HAUTE** | 24 | 36% |
| **MOYENNE** | 19 | 28% |
| **BASSE** | 6 | 9% |

### Zones les plus affectées:
1. **Webhooks & Paiements** - Aucune signature HMAC (fraude possible)
2. **Autorisation** - IDOR massif (accès aux données d'autres clients)
3. **Multi-tenant** - Tenant ID hardcodé à `BigInt(1)`
4. **XSS** - 11 instances de `dangerouslySetInnerHTML` sans sanitization
5. **Secrets** - Fichier `.env` exposé avec tous les credentials

---

## 1. VULNÉRABILITÉS CRITIQUES (18)

### 1.1 WEBHOOKS SANS SIGNATURE (3 vulnérabilités)

| Fichier | Ligne | Impact |
|---------|-------|--------|
| `/src/app/api/revolut/webhook/route.ts` | 34 | Fraude paiement - factures marquées payées sans vérification |
| `/src/app/api/webhooks/docuseal/route.ts` | 46 | Contrats modifiés sans authentification |
| `/src/app/api/telegram/webhook/route.ts` | * | Accès CRM via Telegram sans signature |

**Exploit Revolut:**
```bash
curl -X POST https://crm.example.com/api/revolut/webhook \
  -H "Content-Type: application/json" \
  -d '{"event":"ORDER_COMPLETED","data":{"metadata":{"invoice_id":"999"}}}'
```
**Résultat:** Facture #999 marquée payée sans paiement réel.

---

### 1.2 IDOR - ACCÈS DIRECT AUX RESSOURCES (5 vulnérabilités)

| Route | Problème |
|-------|----------|
| `GET /api/invoices/[id]` | Aucune vérification `clientId` - accès à toutes factures |
| `GET /api/quotes/[id]` | Aucune vérification - accès à tous devis |
| `GET /api/contracts/[id]` | Aucune vérification - accès à tous contrats |
| `GET /api/clients/[id]` | Aucune vérification - accès à tous clients |
| `DELETE /api/*/[id]` | Suppression de n'importe quelle ressource |

**Pattern vulnérable récurrent:**
```typescript
// MAUVAIS - Pas de filtre tenant/client
const invoice = await prisma.invoice.findUnique({
  where: { id: BigInt(id) }
})
```

---

### 1.3 TENANT_ID HARDCODÉ (3 vulnérabilités)

**45+ fichiers** utilisent `BigInt(1)` au lieu de `session.user.tenantId`:

| Fichier | Ligne |
|---------|-------|
| `/src/app/api/notes/route.ts` | 104 |
| `/src/app/api/users/route.ts` | 15, 83, 99 |
| `/src/lib/email.ts` | 3 occurrences |

**Impact:** Mode multi-tenant désactivé. Toutes les données fusionnées.

---

### 1.4 UPLOADS SANS AUTHENTIFICATION (2 vulnérabilités)

| Fichier | Problème |
|---------|----------|
| `/src/app/api/settings/logo/route.ts` | **Aucune auth()** - upload public |
| `/src/app/api/settings/logo/route.ts` | SVG accepté - XSS via `<svg onload="">` |

---

### 1.5 AUTHENTIFICATION (5 vulnérabilités)

| Problème | Impact |
|----------|--------|
| Auto-enregistrement Microsoft SSO en `tenant_admin` | Escalade privilèges |
| Tokens d'invitation stockés en clair | Accès BD = compromission |
| Aucun rate limiting sur login | Brute force illimité |
| Sessions JWT sans revalidation utilisateur | User désactivé garde accès 8h |
| Impersonation sans audit trail | Actions non traçables |

---

## 2. VULNÉRABILITÉS HAUTES (24)

### 2.1 XSS - 11 instances `dangerouslySetInnerHTML`

| Fichier | Ligne | Contexte |
|---------|-------|----------|
| `ClientEmailsTab.tsx` | 278, 357 | Corps email non sanitisé |
| `MarkdownPreview.tsx` | 151, 168, 176, 184, 194, 202, 214 | Markdown vers HTML |
| `contracts/[id]/page.tsx` | 485 | Contenu IA non sanitisé |
| `tickets/[id]/page.tsx` | 693 | HTML messages tickets |

**Solution:** Installer `isomorphic-dompurify` et sanitiser tous les contenus.

---

### 2.2 ORDER BY DYNAMIQUE - Injection possible (3 fichiers)

| Fichier | Ligne |
|---------|-------|
| `/src/app/api/clients/route.ts` | 41 |
| `/src/app/api/invoices/route.ts` | 64 |
| `/src/app/api/contracts/route.ts` | 45 |

**Pattern vulnérable:**
```typescript
const sortBy = searchParams.get("sortBy") || "createdAt"
orderBy: { [sortBy]: sortOrder }  // Non validé!
```

---

### 2.3 VALIDATION ENTRÉES MANQUANTE (6 problèmes)

- Pagination sans limite max (`perPage=1000000` → DoS)
- IDs non validés (`BigInt("malicious")` → crash)
- Dates non validées (`new Date("invalid")` → données corrompues)
- Montants négatifs acceptés (`quantity: -1000` → crédits frauduleux)
- Enums non whitelistés
- Webhooks sans timestamp check (replay attacks)

---

### 2.4 SECRETS EXPOSÉS

**Fichier `.env` en repo avec:**
- `DATABASE_URL` avec mot de passe en clair
- `NEXTAUTH_SECRET`
- `DOCUSEAL_API_KEY`
- `VAPID_PRIVATE_KEY`
- 3x `DOKPLOY_*_TOKEN`
- `CRON_SECRET`

**Action:** Révoquer TOUS ces secrets immédiatement.

---

### 2.5 HEADERS SÉCURITÉ MANQUANTS

Aucun header configuré dans `next.config.ts`:
- ❌ Content-Security-Policy
- ❌ X-Frame-Options
- ❌ X-Content-Type-Options
- ❌ Strict-Transport-Security
- ❌ Referrer-Policy

---

## 3. VULNÉRABILITÉS MOYENNES (19)

### 3.1 Validation

- 88/183 fichiers API seulement utilisent Zod
- `error.message` exposé au client (révèle structure)
- Pas de CORS configuré
- State OAuth non signé
- bcrypt rounds inconsistants (10 vs 12)

### 3.2 Logging

- Stack traces loggés en production
- Payloads webhooks complets loggés
- Données métier exposées dans logs

### 3.3 Uploads

- Pas de validation MIME serveur (client-side only)
- Pas de vérification magic bytes
- Pas de limite taille sur `/api/contracts/[id]/documents`
- Double extension bypass possible (`shell.php.pdf`)

---

## 4. PLAN DE CORRECTION

### Phase 1 - URGENCE (24-48h)

| # | Tâche | Fichiers |
|---|-------|----------|
| 1 | Ajouter signature HMAC webhooks | 3 fichiers |
| 2 | Ajouter auth() sur settings/logo | 1 fichier |
| 3 | Révoquer tous les secrets exposés | Infra |
| 4 | Ajouter filtre tenant_id/clientId | 50+ fichiers |

### Phase 2 - CRITIQUE (1 semaine)

| # | Tâche |
|---|-------|
| 5 | Installer DOMPurify + sanitiser XSS |
| 6 | Ajouter headers sécurité |
| 7 | Créer middleware validation inputs |
| 8 | Whitelist orderBy/status/enums |
| 9 | Ajouter rate limiting |

### Phase 3 - IMPORTANTE (2 semaines)

| # | Tâche |
|---|-------|
| 10 | Standardiser gestion erreurs |
| 11 | Migrer next-auth stable |
| 12 | Validation uploads (magic bytes) |
| 13 | PKCE pour OAuth |
| 14 | Audit logging actions sensibles |

---

## 5. FICHIERS PRIORITAIRES À CORRIGER

```
🔴 CRITIQUE:
/src/app/api/revolut/webhook/route.ts
/src/app/api/webhooks/docuseal/route.ts
/src/app/api/telegram/webhook/route.ts
/src/app/api/settings/logo/route.ts
/src/app/api/invoices/[id]/route.ts
/src/app/api/quotes/[id]/route.ts
/src/app/api/clients/[id]/route.ts
/src/middleware.ts (ajouter headers)
/next.config.ts (ajouter security headers)

🟡 HAUTE:
/src/components/clients/ClientEmailsTab.tsx
/src/components/notes/MarkdownPreview.tsx
/src/app/(dashboard)/contracts/[id]/page.tsx
/src/app/(dashboard)/tickets/[id]/page.tsx
Tous les fichiers avec BigInt(1)
```

---

## 6. CODE DE CORRECTION TYPE

### 6.1 Signature Webhook Revolut

```typescript
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  const signature = request.headers.get('Revolut-Signature')
  const payload = await request.text()

  const expected = crypto
    .createHmac('sha256', process.env.REVOLUT_WEBHOOK_SECRET!)
    .update(payload)
    .digest('hex')

  if (!crypto.timingSafeEqual(Buffer.from(signature || ''), Buffer.from(expected))) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // ... reste du code
}
```

### 6.2 Filtre tenant_id/clientId

```typescript
// AVANT (vulnérable)
const invoice = await prisma.invoice.findUnique({
  where: { id: BigInt(id) }
})

// APRÈS (sécurisé)
const invoice = await prisma.invoice.findFirst({
  where: {
    id: BigInt(id),
    tenant_id: session.user.tenantId,
    // OU pour client portal:
    clientId: session.user.clientId
  }
})
```

### 6.3 Headers Sécurité

```typescript
// next.config.ts
async headers() {
  return [{
    source: '/(.*)',
    headers: [
      { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'" },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    ]
  }]
}
```

### 6.4 Sanitization XSS

```typescript
import DOMPurify from 'isomorphic-dompurify'

// Utilisation
<div dangerouslySetInnerHTML={{
  __html: DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a', 'ul', 'li'],
    ALLOWED_ATTR: ['href', 'target', 'rel']
  })
}} />
```

---

## 7. CONCLUSION

Le CRM v2 présente des **risques de sécurité critiques** permettant:
- Fraude financière (webhooks non signés)
- Vol de données (IDOR massif)
- XSS stocké (sanitization absente)
- Compromission complète (secrets exposés)

**Recommandation:** Suspendre le déploiement production jusqu'à correction des 18 vulnérabilités critiques.

---

*Rapport généré par Claude Code - Audit de sécurité automatisé*
