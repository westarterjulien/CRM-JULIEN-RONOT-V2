# Documentation API - CRM Luelis v2

> Documentation complète de toutes les routes API du CRM
> Générée le 6 janvier 2026

---

## Table des matières

1. [Authentification](#authentification)
2. [Clients](#clients)
3. [Factures](#factures)
4. [Devis](#devis)
5. [Contrats](#contrats)
6. [Notes](#notes)
7. [Tickets](#tickets)
8. [Domaines](#domaines)
9. [Abonnements](#abonnements)
10. [Trésorerie](#trésorerie)
11. [Services](#services)
12. [Utilisateurs](#utilisateurs)
13. [Paiements Revolut](#paiements-revolut)
14. [Intégration GoCardless](#intégration-gocardless)
15. [Portail Client](#portail-client)
16. [Paramètres](#paramètres)
17. [Routes Publiques](#routes-publiques)
18. [Notifications](#notifications)
19. [Divers](#divers)

---

## Informations générales

### Base URL
```
https://crm.julienronot.fr/api
```

### Authentification
La plupart des endpoints nécessitent une authentification via session NextAuth.js. Les cookies de session sont automatiquement envoyés avec chaque requête.

### Format des réponses
Toutes les réponses sont en JSON. Les BigInt sont sérialisés en strings.

### Codes d'erreur communs
| Code | Description |
|------|-------------|
| 401 | Non authentifié |
| 403 | Accès refusé |
| 404 | Ressource non trouvée |
| 500 | Erreur serveur |

---

## Authentification

### POST /api/auth/[...nextauth]
Handler NextAuth.js pour toutes les opérations d'authentification (login, logout, callbacks).

### GET /api/auth/me
Récupère les informations de l'utilisateur connecté.

**Réponse:**
```json
{
  "id": "string",
  "name": "string",
  "email": "string",
  "type": "string",
  "clientId": "string | null",
  "clientName": "string | null"
}
```

### POST /api/auth/forgot-password
Demande de réinitialisation de mot de passe.

**Body:**
```json
{
  "email": "string"
}
```

### POST /api/auth/reset-password
Réinitialisation du mot de passe avec token.

**Body:**
```json
{
  "token": "string",
  "password": "string"
}
```

### POST /api/auth/accept-invitation
Acceptation d'une invitation utilisateur.

**Body:**
```json
{
  "token": "string",
  "name": "string",
  "password": "string"
}
```

### POST /api/auth/impersonate
Impersonation d'un utilisateur (admin uniquement).

**Body:**
```json
{
  "userId": "string"
}
```

---

## Clients

### GET /api/clients
Liste tous les clients avec filtrage et pagination.

**Query Parameters:**
| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| page | integer | 1 | Numéro de page |
| perPage | integer | 15 | Éléments par page |
| search | string | - | Recherche textuelle |
| status | string | all | Filtre: all, active, prospect, inactive |
| sortBy | string | companyName | Champ de tri |
| sortOrder | string | asc | Ordre: asc, desc |

**Réponse:**
```json
{
  "clients": [...],
  "stats": {
    "total": 0,
    "active": 0,
    "prospect": 0,
    "inactive": 0
  },
  "pagination": {
    "page": 1,
    "perPage": 15,
    "total": 0,
    "totalPages": 0
  }
}
```

### POST /api/clients
Crée un nouveau client.

**Body:**
```json
{
  "companyName": "string (required)",
  "client_type": "company | individual",
  "first_name": "string",
  "last_name": "string",
  "email": "string",
  "phone": "string",
  "siret": "string",
  "siren": "string",
  "vatNumber": "string",
  "apeCode": "string",
  "legalForm": "string",
  "capital": "number",
  "address": "string",
  "postalCode": "string",
  "city": "string",
  "country": "string (default: France)",
  "website": "string",
  "contactFirstname": "string",
  "contactLastname": "string",
  "contactEmail": "string",
  "contactPhone": "string",
  "notes": "string",
  "status": "prospect | active | inactive"
}
```

### GET /api/clients/[id]
Récupère les détails d'un client.

### PUT /api/clients/[id]
Met à jour un client.

### DELETE /api/clients/[id]
Supprime un client.

### GET /api/clients/[id]/services
Liste les services assignés à un client.

### POST /api/clients/[id]/services
Ajoute un service à un client.

### DELETE /api/clients/[id]/services/[serviceId]
Retire un service d'un client.

### GET /api/clients/[id]/users
Liste les utilisateurs du portail client.

---

## Factures

### GET /api/invoices
Liste toutes les factures avec statistiques.

**Query Parameters:**
| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| page | integer | 1 | Numéro de page |
| perPage | integer | 15 | Éléments par page |
| search | string | - | Recherche textuelle |
| status | string | all | draft, sent, pending, paid, overdue, cancelled |
| clientId | bigint | - | Filtrer par client |
| sortBy | string | createdAt | Champ de tri |
| sortOrder | string | desc | Ordre: asc, desc |
| dateFrom | ISO date | - | Date de début |
| dateTo | ISO date | - | Date de fin |

**Réponse:**
```json
{
  "invoices": [
    {
      "id": "string",
      "invoiceNumber": "FAC-2025-0001",
      "status": "draft",
      "totalHt": 1000.00,
      "totalTtc": 1200.00,
      "issueDate": "2025-01-01T00:00:00.000Z",
      "dueDate": "2025-01-31T00:00:00.000Z",
      "paymentDate": null,
      "paymentMethod": null,
      "client": {
        "id": "string",
        "companyName": "string",
        "email": "string"
      }
    }
  ],
  "stats": {
    "counts": {
      "total": 0,
      "draft": 0,
      "sent": 0,
      "pending": 0,
      "paid": 0,
      "overdue": 0,
      "cancelled": 0
    },
    "amounts": {
      "paidThisYear": 0,
      "pending": 0,
      "totalThisYear": 0
    }
  },
  "pagination": {...}
}
```

### POST /api/invoices
Crée une nouvelle facture.

**Body:**
```json
{
  "clientId": "string (required)",
  "issueDate": "ISO date (required)",
  "dueDate": "ISO date (required)",
  "status": "draft",
  "invoiceType": "standard | proforma | avoir",
  "items": [
    {
      "description": "string (required)",
      "quantity": 1,
      "unit": "unité",
      "unitPriceHt": 100.00,
      "vatRate": 20,
      "serviceId": "string (optional)"
    }
  ],
  "discountType": "percentage | fixed",
  "discountValue": 0,
  "paymentMethod": "string",
  "notes": "string"
}
```

### GET /api/invoices/[id]
Récupère les détails d'une facture.

### PUT /api/invoices/[id]
Met à jour une facture ou effectue une action spéciale.

**Actions spéciales (via `action` dans le body):**
- `markPaid` - Marquer comme payée
- `markSent` - Marquer comme envoyée
- `duplicate` - Dupliquer la facture

### DELETE /api/invoices/[id]
Supprime une facture.

### POST /api/invoices/[id]/send
Envoie la facture par email.

### POST /api/invoices/[id]/send-email
Envoie une notification email.

### PUT /api/invoices/[id]/due-date
Met à jour la date d'échéance.

### POST /api/invoices/[id]/mark-paid
Marque la facture comme payée.

**Body:**
```json
{
  "paymentDate": "ISO date",
  "paymentMethod": "virement | cb | cheque | especes | prelevement",
  "paymentNotes": "string"
}
```

### GET /api/invoices/[id]/pdf
Génère le PDF de la facture.

### GET /api/invoices/[id]/download
Télécharge la facture (PDF).

### GET /api/invoices/[id]/reconcile-suggestions
Récupère les suggestions de rapprochement bancaire.

---

## Devis

### GET /api/quotes
Liste tous les devis.

**Query Parameters:**
| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| page | integer | 1 | Numéro de page |
| perPage | integer | 15 | Éléments par page |
| search | string | - | Recherche textuelle |
| status | string | all | draft, sent, accepted, rejected, expired, converted |

### POST /api/quotes
Crée un nouveau devis.

**Body:**
```json
{
  "clientId": "string (required)",
  "issueDate": "ISO date (required)",
  "validUntil": "ISO date (required)",
  "status": "draft",
  "items": [
    {
      "description": "string",
      "quantity": 1,
      "unit": "unité",
      "unitPriceHt": 100.00,
      "vatRate": 20,
      "serviceId": "string (optional)"
    }
  ],
  "notes": "string"
}
```

### GET /api/quotes/[id]
Récupère les détails d'un devis.

### PUT /api/quotes/[id]
Met à jour un devis.

### DELETE /api/quotes/[id]
Supprime un devis.

### GET /api/quotes/[id]/pdf
Génère le PDF du devis.

### GET /api/quotes/[id]/download
Télécharge le devis (PDF).

### POST /api/quotes/[id]/actions
Effectue une action sur le devis.

**Body:**
```json
{
  "action": "convert_to_invoice | mark_sent | mark_accepted | mark_rejected"
}
```

### POST /api/quotes/[id]/generate-contract
Génère un contrat à partir du devis.

---

## Contrats

### GET /api/contracts/[id]
Récupère les détails d'un contrat avec documents, champs et signataires.

### PUT /api/contracts/[id]
Met à jour un contrat (seulement en statut draft).

**Body:**
```json
{
  "title": "string",
  "description": "string",
  "content": "string",
  "expirationDays": 30,
  "lockOrder": false,
  "signerReminders": true
}
```

### DELETE /api/contracts/[id]
Supprime un contrat (seulement en statut draft).

### POST /api/contracts/[id]/documents
Ajoute un document au contrat.

### GET /api/contracts/[id]/fields
Récupère les champs de signature.

### POST /api/contracts/[id]/fields
Crée un champ de signature.

### GET /api/contracts/[id]/signers
Récupère les signataires.

### POST /api/contracts/[id]/signers
Ajoute un signataire.

**Body:**
```json
{
  "name": "string",
  "email": "string",
  "role": "signer | approver",
  "order": 1
}
```

### POST /api/contracts/[id]/send-emails
Envoie les emails de demande de signature.

### POST /api/contracts/[id]/signing-urls
Génère les URLs de signature.

### GET /api/contracts/[id]/sync
Synchronise le statut avec DocuSeal.

### POST /api/contracts/[id]/reset
Réinitialise le contrat (efface les signatures).

### GET /api/contracts/[id]/download
Télécharge le contrat signé.

---

## Notes

### GET /api/notes
Liste les notes avec filtrage avancé.

**Query Parameters:**
| Paramètre | Type | Description |
|-----------|------|-------------|
| search | string | Recherche textuelle |
| type | string | all, quick, note, todo |
| tagId | bigint | Filtrer par tag |
| entityType | string | client, invoice, quote, subscription, domain, ticket, contract, project |
| entityId | bigint | Filtrer par entité |
| archived | boolean | Notes archivées |
| recycled | boolean | Notes supprimées |
| page | integer | Numéro de page |
| limit | integer | Éléments par page |

### POST /api/notes
Crée une nouvelle note.

**Body:**
```json
{
  "content": "string",
  "type": "note | quick | todo",
  "isTop": false,
  "reminderAt": "ISO datetime | null",
  "entityLinks": [
    {
      "entityType": "client",
      "entityId": "string"
    }
  ],
  "tagIds": ["string"]
}
```

### GET /api/notes/[id]
Récupère une note avec commentaires et historique.

### PUT /api/notes/[id]
Met à jour une note (sauvegarde l'historique).

### DELETE /api/notes/[id]
Supprime une note.

**Query Parameters:**
- `permanent=true` - Suppression définitive (sinon mise à la corbeille)

### GET /api/notes/[id]/attachments
Liste les pièces jointes.

### POST /api/notes/[id]/attachments
Ajoute une pièce jointe (multipart/form-data).

### DELETE /api/notes/[id]/attachments/[attachmentId]
Supprime une pièce jointe.

### GET /api/notes/tags
Liste tous les tags.

### POST /api/notes/tags
Crée un tag.

**Body:**
```json
{
  "name": "string",
  "color": "#8B5CF6",
  "icon": "tag"
}
```

### DELETE /api/notes/tags/[id]
Supprime un tag.

### GET /api/notes/entity/[type]/[entityId]
Récupère les notes liées à une entité spécifique.

---

## Tickets

### GET /api/tickets
Liste les tickets avec filtrage.

**Query Parameters:**
| Paramètre | Type | Description |
|-----------|------|-------------|
| search | string | Recherche textuelle |
| status | string | new, open, pending, resolved |
| priority | string | low, normal, high, urgent |
| clientId | bigint | Filtrer par client |
| assignedTo | bigint | Filtrer par assigné |
| page | integer | Numéro de page |
| limit | integer | Éléments par page |

### POST /api/tickets
Crée un nouveau ticket.

**Body:**
```json
{
  "subject": "string (required)",
  "senderEmail": "string (required)",
  "senderName": "string",
  "clientId": "string",
  "status": "new",
  "priority": "normal",
  "assignedTo": "string",
  "tags": "string",
  "content": "string"
}
```

### GET /api/tickets/[id]
Récupère les détails d'un ticket.

### PUT /api/tickets/[id]
Met à jour un ticket.

### DELETE /api/tickets/[id]
Supprime un ticket.

### GET /api/tickets/count
Compte les tickets par statut.

### GET /api/tickets/settings
Récupère les paramètres du système de tickets.

### PUT /api/tickets/settings
Met à jour les paramètres.

### POST /api/tickets/settings/test-slack
Teste l'intégration Slack.

### POST /api/tickets/settings/test-openai
Teste l'intégration OpenAI.

### POST /api/tickets/settings/test-o365
Teste l'intégration Office 365.

---

## Domaines

### GET /api/domains
Liste tous les domaines.

### POST /api/domains
Ajoute un nouveau domaine.

**Body:**
```json
{
  "name": "example.com",
  "clientId": "string",
  "registrar": "ovh | cloudflare | other",
  "expirationDate": "ISO date",
  "autoRenew": true,
  "notes": "string"
}
```

### GET /api/domains/[id]
Récupère les détails d'un domaine.

### PUT /api/domains/[id]
Met à jour un domaine.

### DELETE /api/domains/[id]
Supprime un domaine.

### GET /api/domains/[id]/dns
Récupère les enregistrements DNS.

### POST /api/domains/[id]/dns
Met à jour les enregistrements DNS.

### GET /api/domains/[id]/nameservers
Récupère les serveurs de noms.

### PUT /api/domains/[id]/nameservers
Met à jour les serveurs de noms.

### POST /api/domains/[id]/create-invoice
Crée une facture pour le renouvellement.

### GET /api/domains/check-renewals
Vérifie les domaines à renouveler.

### POST /api/domains/sync
Synchronise avec l'API OVH.

### GET /api/domains/renewals
Récupère les informations de renouvellement.

---

## Abonnements

### GET /api/subscriptions
Liste tous les abonnements.

### POST /api/subscriptions
Crée un nouvel abonnement.

**Body:**
```json
{
  "clientId": "string (required)",
  "name": "string (required)",
  "description": "string",
  "priceHt": 100.00,
  "vatRate": 20,
  "billingCycle": "monthly | quarterly | yearly",
  "startDate": "ISO date",
  "nextBillingDate": "ISO date",
  "status": "active"
}
```

### GET /api/subscriptions/[id]
Récupère les détails d'un abonnement.

### PUT /api/subscriptions/[id]
Met à jour un abonnement.

### DELETE /api/subscriptions/[id]
Supprime un abonnement.

---

## Trésorerie

### GET /api/treasury/accounts
Liste les comptes bancaires.

### POST /api/treasury/accounts
Crée un nouveau compte bancaire.

### GET /api/treasury/accounts/[id]
Récupère les détails d'un compte.

### PUT /api/treasury/accounts/[id]
Met à jour un compte.

### GET /api/treasury/transactions
Liste les transactions bancaires.

**Query Parameters:**
| Paramètre | Type | Description |
|-----------|------|-------------|
| accountId | bigint | Filtrer par compte |
| dateFrom | ISO date | Date de début |
| dateTo | ISO date | Date de fin |
| type | string | credit, debit |
| reconciled | boolean | Transactions rapprochées |

### POST /api/treasury/transactions
Crée une transaction manuelle.

### GET /api/treasury/transactions/[id]
Récupère les détails d'une transaction.

### PUT /api/treasury/transactions/[id]
Met à jour une transaction.

---

## Services

### GET /api/services
Liste tous les services.

### POST /api/services
Crée un nouveau service.

**Body:**
```json
{
  "name": "string (required)",
  "description": "string",
  "categoryId": "string",
  "priceHt": 100.00,
  "vatRate": 20,
  "unit": "unité | heure | jour | mois",
  "isActive": true
}
```

### GET /api/services/[id]
Récupère les détails d'un service.

### PUT /api/services/[id]
Met à jour un service.

### DELETE /api/services/[id]
Supprime un service.

### GET /api/services/categories
Liste les catégories de services.

### POST /api/services/categories
Crée une catégorie.

### GET /api/services/categories/[id]
Récupère les détails d'une catégorie.

### PUT /api/services/categories/[id]
Met à jour une catégorie.

### DELETE /api/services/categories/[id]
Supprime une catégorie.

---

## Utilisateurs

### GET /api/users
Liste tous les utilisateurs.

**Query Parameters:**
| Paramètre | Type | Description |
|-----------|------|-------------|
| search | string | Recherche textuelle |
| role | string | super_admin, tenant_owner, tenant_admin, tenant_user, client |
| status | string | active, inactive, all |

### POST /api/users
Crée un nouvel utilisateur.

**Body:**
```json
{
  "name": "string (required)",
  "email": "string (required)",
  "password": "string (required)",
  "role": "tenant_user",
  "isActive": true,
  "slackUserId": "string"
}
```

### GET /api/users/[id]
Récupère les détails d'un utilisateur.

### PUT /api/users/[id]
Met à jour un utilisateur.

### DELETE /api/users/[id]
Supprime un utilisateur.

### POST /api/users/o365-connect
Connecte un compte Office 365.

### GET /api/users/o365-callback
Callback OAuth2 pour Office 365.

### POST /api/users/o365-disconnect
Déconnecte le compte Office 365.

### GET /api/users/calendar-status
Statut de synchronisation du calendrier.

### GET /api/users/today-events
Événements du jour.

### GET /api/users/next-event
Prochain événement.

---

## Paiements Revolut

### POST /api/revolut/test
Teste la connexion API Revolut.

**Body:**
```json
{
  "apiKey": "string (required)",
  "environment": "sandbox | production"
}
```

### POST /api/revolut/payment-link
Crée un lien de paiement pour une facture.

**Body:**
```json
{
  "invoiceId": "string (required)",
  "amount": 100.00,
  "currency": "EUR",
  "description": "string"
}
```

**Réponse:**
```json
{
  "success": true,
  "paymentLink": "https://...",
  "orderId": "string",
  "orderState": "pending"
}
```

### POST /api/revolut/webhook
Webhook pour les notifications de paiement Revolut.

### GET /api/revolut/webhook
Vérification du endpoint webhook.

### POST /api/revolut/check-payment
Vérifie le statut d'un paiement.

**Body:**
```json
{
  "invoiceId": "string (required)"
}
```

**Réponse:**
```json
{
  "status": "pending | paid | no_link | error | processing | authorised | cancelled | failed",
  "message": "string",
  "orderId": "string",
  "orderState": "string",
  "paidAt": "ISO datetime"
}
```

---

## Intégration GoCardless

### POST /api/gocardless/connect
Initie une connexion bancaire.

**Body:**
```json
{
  "institutionId": "string (required)",
  "institutionName": "string",
  "institutionLogo": "string",
  "maxHistoricalDays": 90
}
```

**Réponse:**
```json
{
  "success": true,
  "requisitionId": "string",
  "link": "https://... (URL OAuth)",
  "reference": "string"
}
```

### GET /api/gocardless/callback
Callback OAuth GoCardless.

### GET /api/gocardless/connections
Liste les connexions bancaires.

### POST /api/gocardless/connections
Crée une nouvelle connexion.

### GET /api/gocardless/institutions
Liste les banques disponibles.

**Query Parameters:**
- `country` - Code pays (ex: FR)

### POST /api/gocardless/sync
Synchronise les données bancaires.

### GET /api/gocardless/rate-limit
Statut du rate limit API.

### POST /api/gocardless/process-pending
Traite les transactions en attente.

### POST /api/gocardless/reprocess
Retraite les transactions échouées.

---

## Portail Client

Ces endpoints sont accessibles aux utilisateurs de type "client".

### GET /api/client-portal/dashboard
Tableau de bord du portail client.

### GET /api/client-portal/invoices
Liste les factures du client.

### GET /api/client-portal/invoices/[id]
Détails d'une facture.

### GET /api/client-portal/quotes
Liste les devis du client.

### GET /api/client-portal/quotes/[id]
Détails d'un devis.

### GET /api/client-portal/contracts
Liste les contrats du client.

### GET /api/client-portal/contracts/[id]
Détails d'un contrat.

### GET /api/client-portal/contracts/[id]/download
Télécharge un contrat signé.

### GET /api/client-portal/services
Liste les services du client.

### GET /api/client-portal/users
Liste les utilisateurs du compte client.

### POST /api/client-portal/users
Ajoute un utilisateur au compte.

### GET /api/client-portal/users/[id]
Détails d'un utilisateur.

### PUT /api/client-portal/users/[id]
Met à jour un utilisateur.

---

## Paramètres

### GET /api/settings
Récupère les paramètres de l'application.

### PUT /api/settings
Met à jour les paramètres.

### POST /api/settings/smtp/test
Teste la configuration email.

**Body:**
```json
{
  "host": "smtp.example.com",
  "port": 587,
  "secure": false,
  "user": "string",
  "password": "string",
  "from": "noreply@example.com"
}
```

### POST /api/settings/ovh/test
Teste les credentials OVH.

### POST /api/settings/ovh/authorize
Génère l'URL d'autorisation OVH.

### POST /api/settings/cloudflare/test
Teste les credentials Cloudflare.

### POST /api/settings/logo
Upload du logo entreprise (multipart/form-data).

### GET /api/settings/azure-groups
Récupère les groupes Azure AD.

---

## Routes Publiques

Ces endpoints ne nécessitent pas d'authentification.

### GET /api/public/invoice/[token]
Affiche une facture publiquement (via token unique).
Incrémente le compteur de vues.

### GET /api/public/quote/[token]
Affiche un devis publiquement.

### POST /api/public/quote/[token]/respond
Permet au client de répondre au devis.

**Body:**
```json
{
  "status": "accepted | rejected",
  "notes": "string"
}
```

---

## Notifications

### GET /api/notifications
Liste les notifications de l'utilisateur.

### POST /api/notifications
Crée une notification.

### GET /api/notifications/[id]
Détails d'une notification.

### PUT /api/notifications/[id]
Met à jour (marquer comme lue, etc.).

### DELETE /api/notifications/[id]
Supprime une notification.

### GET /api/push/vapid-key
Récupère la clé VAPID publique.

### POST /api/push/subscribe
S'abonne aux notifications push.

### POST /api/push/test
Envoie une notification push de test.

---

## Divers

### GET /api/releases
Récupère les releases GitHub de l'application.

### GET /api/statistics
Statistiques globales de l'application.

### GET /api/tenant
Informations du tenant courant.

### GET /api/tenant/signer-info
Informations du signataire par défaut.

### POST /api/admin/migrate-prospects
Migration des prospects en clients (admin uniquement).

### POST /api/ai/generate-contract
Génère un contrat via IA.

### POST /api/ai/improve-text
Améliore un texte via IA.

### POST /api/webhooks/docuseal
Webhook DocuSeal pour les événements de signature.

### POST /api/prelevements
Crée un prélèvement SEPA.

### POST /api/prelevements/pain008
Génère un fichier PAIN.008 pour virement bancaire.

### GET /api/deployments/status
Statut des déploiements (pour l'app desktop).

### GET /api/email-templates
Liste les modèles d'email.

### POST /api/email-templates
Crée un modèle d'email.

### GET /api/email-templates/[id]
Détails d'un modèle.

### PUT /api/email-templates/[id]
Met à jour un modèle.

### DELETE /api/email-templates/[id]
Supprime un modèle.

---

## Statistiques

**Total des routes API: 185**

| Catégorie | Nombre |
|-----------|--------|
| Authentification | 6 |
| Clients | 9 |
| Factures | 12 |
| Devis | 8 |
| Contrats | 13 |
| Notes | 12 |
| Tickets | 11 |
| Domaines | 13 |
| Utilisateurs | 11 |
| Paiements Revolut | 5 |
| GoCardless | 9 |
| Abonnements | 5 |
| Trésorerie | 8 |
| Services | 10 |
| Notifications | 8 |
| Paramètres | 8 |
| Routes Publiques | 3 |
| Portail Client | 13 |
| Divers | 21 |

---

*Documentation générée automatiquement - CRM Luelis v2*
