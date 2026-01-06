# MCP Brain Memory Claude

Serveur MCP (Model Context Protocol) pour la gestion de mémoire de projets et l'intégration Dokploy.

## Vue d'ensemble

Le serveur `brain-memory-claude` fournit trois fonctionnalités principales :

1. **Mémoire de Projet** - Persistance du contexte entre sessions Claude
2. **Code Memory** - Indexation et analyse du codebase
3. **Intégration Dokploy** - Déploiement et gestion d'infrastructure

## Installation

Configurer dans `~/.claude/settings.json` :

```json
{
  "mcpServers": {
    "brain-memory-claude": {
      "command": "node",
      "args": ["/chemin/vers/brain-memory-claude/dist/index.js"],
      "env": {
        "DATABASE_PATH": "/chemin/vers/brain-memory.db"
      }
    }
  }
}
```

---

## 1. Gestion de Projets

### Enregistrement et Contexte

| Outil | Description |
|-------|-------------|
| `register_project` | Enregistre un nouveau projet (path, name, description) |
| `list_projects` | Liste tous les projets enregistrés |
| `get_project_context` | Récupère le contexte complet (décisions, todos, bugs, specs, conventions) |
| `get_project_stats` | Statistiques du projet (fichiers, dossiers, taille) |
| `scan_project_structure` | Scanne et indexe la structure de fichiers |
| `search_files` | Recherche dans la structure indexée |

### Workflow de Démarrage

| Outil | Description |
|-------|-------------|
| `init_project_workflow` | Initialise tout : règles d'agents, scan, import specs, génération CLAUDE.md |
| `get_restore_context` | **AU DÉMARRAGE** - Récupère contexte pour reprendre le travail |
| `save_conversation_summary` | **AVANT FIN SESSION** - Sauvegarde résumé pour reprise |
| `get_continuation_context` | Contexte de continuation (dernière session, tâches en attente) |

### Décisions Architecturales

| Outil | Description |
|-------|-------------|
| `add_decision` | Ajoute une décision (title, description, rationale) |
| `list_decisions` | Liste les décisions (active_only optionnel) |

### Tâches (Todos)

| Outil | Description |
|-------|-------------|
| `add_todo` | Ajoute une tâche (title, priority, category) |
| `list_todos` | Liste les tâches (pending_only optionnel) |
| `update_todo_status` | Met à jour le statut (pending/in_progress/done/cancelled) |

### Bugs

| Outil | Description |
|-------|-------------|
| `add_bug` | Signale un bug (title, severity, file_path) |
| `list_bugs` | Liste les bugs (open_only optionnel) |
| `update_bug_status` | Met à jour le statut (open/in_progress/resolved/wontfix) |

### Spécifications

| Outil | Description |
|-------|-------------|
| `add_spec` | Ajoute une spec (title, content en markdown, category) |
| `list_specs` | Liste les specs |
| `get_spec` | Récupère le contenu complet d'une spec |
| `import_spec_file` | Importe un fichier markdown comme spec |

### Conventions de Code

| Outil | Description |
|-------|-------------|
| `add_convention` | Ajoute une convention (category, rule, example) |
| `list_conventions` | Liste les conventions |

### Design System

| Outil | Description |
|-------|-------------|
| `add_design_token` | Token de design (colors, typography, spacing, etc.) |
| `list_design_tokens` | Liste les tokens |
| `get_design_css` | Génère le CSS des variables |
| `add_design_asset` | Asset design (screenshot, mockup, logo, wireframe) |
| `list_design_assets` | Liste les assets |

### Agents et Recommandations

| Outil | Description |
|-------|-------------|
| `get_recommended_agent` | **AVANT CHAQUE TÂCHE** - Recommande l'agent optimal |
| `add_agent_rule` | Ajoute une règle de recommandation |
| `list_agent_rules` | Liste les règles |
| `log_development_activity` | **APRÈS DEV** - Enregistre l'activité dans le journal |
| `list_development_logs` | Liste les activités récentes |

### CLAUDE.md

| Outil | Description |
|-------|-------------|
| `generate_claude_md` | Génère et écrit le fichier .claude/CLAUDE.md |
| `preview_claude_md` | Prévisualise sans écrire |
| `check_claude_md` | Vérifie si le fichier existe |

---

## 2. Code Memory (Indexation)

### Indexation de Fichiers

| Outil | Description |
|-------|-------------|
| `scan_codebase` | Scanne tout le codebase (fichiers, classes, fonctions, imports) |
| `get_codebase_overview` | Vue d'ensemble (fichiers par type, entry points) |
| `index_file` | Indexe un fichier avec son hash |
| `get_file_index` | Vérifie si un fichier a changé |
| `search_indexed_files` | Recherche dans l'index |
| `get_file_dependencies` | Dépendances d'un fichier (imports, exports) |

### Éléments de Code

| Outil | Description |
|-------|-------------|
| `add_code_element` | Ajoute un élément (class, interface, function, etc.) |
| `find_code_element` | Recherche par nom |
| `search_code_elements` | Recherche dans le codebase indexé |

### Patterns et Connaissances

| Outil | Description |
|-------|-------------|
| `add_code_pattern` | Enregistre un pattern détecté |
| `list_code_patterns` | Liste les patterns |
| `save_code_knowledge` | Sauvegarde une connaissance apprise |
| `search_code_knowledge` | Recherche dans les connaissances |
| `get_code_context` | Contexte complet du code pour démarrer |

### Sessions de Développement

| Outil | Description |
|-------|-------------|
| `start_dev_session` | Démarre une session avec objectifs |
| `end_dev_session` | Termine avec résumé et notes |
| `get_active_session` | Récupère la session active |
| `add_session_achievement` | Ajoute un accomplissement |

### Changelog

| Outil | Description |
|-------|-------------|
| `log_code_change` | Enregistre un changement (added/modified/deleted/renamed/moved) |
| `get_recent_code_changes` | Récupère les changements récents |

---

## 3. Productivité

### Snippets

| Outil | Description |
|-------|-------------|
| `create_snippet` | Crée un snippet réutilisable avec placeholders |
| `get_snippet` | Récupère un snippet par nom |
| `render_snippet` | Rend un snippet en remplaçant les placeholders |
| `search_snippets` | Recherche des snippets |

### Règles de Qualité

| Outil | Description |
|-------|-------------|
| `add_quality_rule` | Ajoute une règle (naming, structure, security, etc.) |
| `list_quality_rules` | Liste les règles |
| `report_quality_issue` | Signale un problème |
| `list_quality_issues` | Liste les problèmes |
| `mark_quality_issue_fixed` | Marque comme résolu |
| `get_quality_report` | Génère un rapport |

### Commandes Rapides

| Outil | Description |
|-------|-------------|
| `create_quick_command` | Crée une commande de scaffolding |
| `execute_quick_command` | Exécute avec paramètres |
| `preview_quick_command` | Prévisualise le résultat |
| `list_quick_commands` | Liste les commandes |

### Contrats d'API

| Outil | Description |
|-------|-------------|
| `create_api_contract` | Crée un contrat d'API |
| `add_api_endpoint` | Ajoute un endpoint |
| `list_api_contracts` | Liste les contrats |
| `get_api_contract` | Récupère avec endpoints |
| `search_api_endpoints` | Recherche dans tous les contrats |
| `generate_openapi_spec` | Génère spec OpenAPI 3.0 |

---

## 4. Intégration Dokploy

### Serveurs

| Outil | Description |
|-------|-------------|
| `dokploy_add_server` | Enregistre un serveur (url, api_token) |
| `dokploy_list_servers` | Liste les serveurs |
| `dokploy_server_status` | Vérifie la santé |
| `dokploy_update_server` | Met à jour les infos |
| `dokploy_remove_server` | Supprime un serveur |

### Projets et Applications

| Outil | Description |
|-------|-------------|
| `dokploy_list_projects` | Liste les projets Dokploy |
| `dokploy_create_project` | Crée un projet |
| `dokploy_create_app` | Crée une application |
| `dokploy_app_info` | Infos détaillées d'une app |
| `dokploy_delete_app` | Supprime une app |

### Déploiement

| Outil | Description |
|-------|-------------|
| `dokploy_deploy` | Déclenche un déploiement |
| `dokploy_redeploy` | Redéploie |
| `dokploy_start` | Démarre une app arrêtée |
| `dokploy_stop` | Arrête une app |
| `dokploy_restart` | Redémarre (reload) |
| `dokploy_list_deployments` | Historique des déploiements |
| `dokploy_cancel_deployment` | Annule un déploiement en cours |

### Configuration

| Outil | Description |
|-------|-------------|
| `dokploy_set_env` | Définit les variables d'environnement |
| `dokploy_add_domain` | Ajoute un domaine |
| `dokploy_list_domains` | Liste les domaines |
| `dokploy_remove_domain` | Supprime un domaine |
| `dokploy_generate_domain` | Génère un domaine traefik.me |

### Traefik

| Outil | Description |
|-------|-------------|
| `dokploy_read_traefik_config` | Lit la config Traefik d'une app |
| `dokploy_update_traefik_config` | Met à jour la config |
| `dokploy_read_global_traefik_config` | Config globale du serveur |
| `dokploy_update_global_traefik_config` | Met à jour config globale |
| `dokploy_read_traefik_middlewares` | Lit les middlewares |
| `dokploy_update_traefik_middlewares` | Met à jour les middlewares |
| `dokploy_add_redirect` | Ajoute une redirection URL |

### Bases de Données

| Outil | Description |
|-------|-------------|
| `dokploy_create_database` | Crée une BDD (postgres, mysql, mongo, redis, mariadb) |
| `dokploy_database_info` | Infos d'une BDD |
| `dokploy_deploy_database` | Déploie une BDD |

### Docker Compose

| Outil | Description |
|-------|-------------|
| `dokploy_create_compose` | Crée un service Compose |
| `dokploy_compose_templates` | Liste les templates disponibles |

### Containers et Backups

| Outil | Description |
|-------|-------------|
| `dokploy_containers` | Liste les containers Docker |
| `dokploy_restart_container` | Redémarre un container |
| `dokploy_list_certificates` | Liste les certificats SSL |
| `dokploy_create_backup` | Configure un backup |
| `dokploy_manual_backup` | Lance un backup manuel |

### API Générique

| Outil | Description |
|-------|-------------|
| `dokploy_api` | Appelle n'importe quel endpoint tRPC |
| `dokploy_list_endpoints` | Liste tous les endpoints (266 disponibles) |

### Liaison Projet-Dokploy

| Outil | Description |
|-------|-------------|
| `link_project_to_dokploy` | Lie un projet Brain Memory à une app Dokploy |
| `unlink_project_from_dokploy` | Supprime la liaison |
| `list_project_dokploy_links` | Liste les liaisons |
| `deploy_linked_project` | Déploie un projet lié |

---

## Workflow Recommandé

### Début de Session

```
1. get_restore_context(path, depth="standard")
2. get_recommended_agent(path, task_description)
3. Commencer le travail
```

### Pendant le Développement

```
1. log_development_activity() après chaque feature/fix significatif
2. add_decision() pour les choix architecturaux importants
3. add_convention() pour les patterns à suivre
```

### Fin de Session

```
1. save_conversation_summary(path, summary, key_decisions, unfinished_tasks)
```

### Déploiement

```
1. git push (déclenche auto-deploy si configuré)
   OU
2. dokploy_deploy(application_id) / deploy_linked_project(path)
```

---

## Catégories d'Endpoints Dokploy

| Catégorie | Endpoints |
|-----------|-----------|
| application | 22 |
| compose | 16 |
| postgres/mysql/mongo/redis/mariadb | 11 chacun |
| admin | 9 |
| settings | 9 |
| backup | 8 |
| domain | 8 |
| cluster/server | 7 |
| user | 7 |
| destination/docker/gitProvider/notification/organization/registry/schedule/sshKey | 5-6 |
| deployment/previewDeployment/project | 4-6 |
| github/gitlab/gitea/bitbucket/stripe/swarm/rollbacks | 3 |

---

## Configuration

Le serveur MCP est configuré dans `~/.claude/settings.json` :

```json
{
  "mcpServers": {
    "brain-memory-claude": {
      "command": "node",
      "args": ["/path/to/brain-memory-claude/dist/index.js"],
      "env": {
        "DATABASE_PATH": "/path/to/brain-memory.db"
      }
    }
  }
}
```

---

## Base de Données

SQLite locale stockant :
- Projets et leur structure
- Décisions, todos, bugs, specs, conventions
- Design tokens et assets
- Index de code (fichiers, éléments, patterns)
- Sessions de développement
- Serveurs Dokploy et liaisons

---

## Référence des Paramètres

### init_project_workflow

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `path` | string | ✅ | Chemin absolu du projet |
| `name` | string | ✅ | Nom du projet |
| `description` | string | | Description du projet |
| `spec_file` | string | | Chemin vers le cahier des charges (markdown) |
| `spec_content` | string | | Contenu du cahier des charges en markdown |

### get_restore_context

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `path` | string | ✅ | Chemin absolu du projet |
| `depth` | string | | `minimal`, `standard` (défaut), ou `full` |
| `focus` | string | | Domaine à prioriser (ex: "auth", "api", "frontend") |

### save_conversation_summary

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `path` | string | ✅ | Chemin du projet |
| `summary` | string | ✅ | Résumé de ce qui a été fait |
| `key_decisions` | string[] | | Décisions importantes prises |
| `key_learnings` | string[] | | Points appris sur le code |
| `files_discussed` | string[] | | Fichiers principaux discutés |
| `unfinished_tasks` | string[] | | Tâches à reprendre |
| `important_context` | string | | Contexte crucial pour la prochaine session |

### add_decision

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `path` | string | ✅ | Chemin du projet |
| `title` | string | ✅ | Titre de la décision |
| `description` | string | | Description détaillée |
| `rationale` | string | | Justification |

### add_convention

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `path` | string | ✅ | Chemin du projet |
| `category` | string | ✅ | `naming`, `structure`, `patterns`, etc. |
| `rule` | string | ✅ | La règle à suivre |
| `example` | string | | Exemple d'application |

### add_todo

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `path` | string | ✅ | Chemin du projet |
| `title` | string | ✅ | Titre de la tâche |
| `description` | string | | Description détaillée |
| `priority` | string | | `low`, `medium`, `high`, `critical` |
| `category` | string | | `feature`, `bugfix`, `refactor`, `docs`, etc. |

### add_bug

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `path` | string | ✅ | Chemin du projet |
| `title` | string | ✅ | Titre du bug |
| `description` | string | | Description détaillée |
| `severity` | string | | `low`, `medium`, `high`, `critical` |
| `file_path` | string | | Fichier concerné |

### get_recommended_agent

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `path` | string | ✅ | Chemin du projet |
| `task_description` | string | ✅ | Description de la tâche à effectuer |

### log_development_activity

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `path` | string | ✅ | Chemin du projet |
| `activity_type` | string | ✅ | `feature`, `bugfix`, `refactor`, `config`, `docs`, `test` |
| `summary` | string | ✅ | Résumé de l'activité |
| `agent_used` | string | | Agent utilisé |
| `files_modified` | string[] | | Fichiers modifiés |
| `decisions_made` | string[] | | Décisions prises |

### add_design_token

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `path` | string | ✅ | Chemin du projet |
| `category` | string | ✅ | `colors`, `typography`, `spacing`, `shadows`, `borders`, `components` |
| `name` | string | ✅ | Nom du token (ex: primary, heading-1) |
| `value` | string | ✅ | Valeur (ex: #8B5CF6, 16px) |
| `css_variable` | string | | Variable CSS (ex: --color-primary) |
| `description` | string | | Description de l'usage |

### dokploy_add_server

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `name` | string | ✅ | Nom du serveur (ex: "Production") |
| `url` | string | ✅ | URL Dokploy (ex: https://dokploy.example.com) |
| `api_token` | string | ✅ | Token API (Settings > Profile > API/CLI) |
| `description` | string | | Description |
| `is_default` | boolean | | Définir comme serveur par défaut |
| `database_host` | string | | URL de la base de données associée |

### dokploy_add_domain

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `host` | string | ✅ | Nom de domaine (ex: app.example.com) |
| `application_id` | string | | ID de l'application |
| `compose_id` | string | | ID du compose (alternatif) |
| `port` | number | | Port interne (défaut: 3000) |
| `https` | boolean | | Activer HTTPS (défaut: true) |
| `certificate_type` | string | | `none`, `letsencrypt`, `custom` |

### dokploy_api (Générique)

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `endpoint` | string | ✅ | Endpoint tRPC (ex: "application.deploy") |
| `params` | object | | Paramètres à envoyer |
| `method` | string | | `query` (GET) ou `mutation` (POST), auto-détecté |
| `server_id` | number | | ID du serveur (optionnel si un seul) |

**Méthodes auto-détectées :**
- `query` (GET) : `.read*`, `.get*`, `.all`, `.one`, `.list*`, `.by*`, `.show*`, `.find*`, `.templates`, `.metrics`
- `mutation` (POST) : `.create`, `.update`, `.delete`, `.deploy`, `.start`, `.stop`, etc.

---

## Exemples d'Utilisation

### Initialiser un nouveau projet

```javascript
// 1. Initialisation complète
init_project_workflow({
  path: "/home/user/mon-projet",
  name: "Mon Projet",
  description: "Description du projet",
  spec_file: "/home/user/cahier-des-charges.md"
})

// 2. Le workflow exécute automatiquement :
// - Création du projet en base
// - Scan de la structure de fichiers
// - Import du cahier des charges
// - Génération des règles d'agents par défaut
// - Génération du fichier .claude/CLAUDE.md
```

### Reprendre le travail après une pause

```javascript
// Au démarrage
const context = get_restore_context({
  path: "/home/user/mon-projet",
  depth: "standard",
  focus: "api"  // Optionnel: prioriser un domaine
})

// Retourne:
// - Session active (si existante)
// - Tâches en cours
// - Décisions récentes
// - Conventions
// - Guide de démarrage rapide
```

### Déployer une application

```javascript
// Option 1: Via l'ID d'application
dokploy_deploy({
  application_id: "abc123",
  server_id: 1
})

// Option 2: Via un projet lié
deploy_linked_project({
  path: "/home/user/mon-projet",
  environment: "production"  // Optionnel
})

// Option 3: Via l'API générique
dokploy_api({
  endpoint: "application.deploy",
  params: { applicationId: "abc123" },
  server_id: 1
})
```

### Configurer un domaine avec SSL

```javascript
dokploy_add_domain({
  host: "app.example.com",
  application_id: "abc123",
  port: 3000,
  https: true,
  certificate_type: "letsencrypt"
})
```

### Sauvegarder avant de terminer

```javascript
save_conversation_summary({
  path: "/home/user/mon-projet",
  summary: "Implémentation de l'authentification OAuth2",
  key_decisions: [
    "Utilisation de NextAuth avec provider Google",
    "Stockage des sessions en base de données"
  ],
  key_learnings: [
    "Le middleware doit vérifier le cookie authjs.session-token",
    "Les routes /api/auth/* doivent être publiques"
  ],
  files_discussed: [
    "src/middleware.ts",
    "src/app/api/auth/[...nextauth]/route.ts"
  ],
  unfinished_tasks: [
    "Ajouter le provider Microsoft",
    "Tests d'intégration"
  ]
})
```

---

## Notes Importantes

1. **Préfixe des outils** : Tous les outils sont préfixés par `mcp__brain-memory-claude__`
   - Exemple: `mcp__brain-memory-claude__get_project_context`

2. **Chemins absolus** : Toujours utiliser des chemins absolus pour le paramètre `path`

3. **IDs de projet** : Certains outils utilisent `project_id` (numérique) au lieu de `path`
   - Utiliser `detect_project` pour obtenir l'ID à partir d'un chemin

4. **Serveur Dokploy par défaut** : Si un seul serveur est configuré, `server_id` est optionnel

5. **Webhooks Dokploy** : L'auto-deploy via webhook GitHub nécessite que le repo soit configuré dans Dokploy
