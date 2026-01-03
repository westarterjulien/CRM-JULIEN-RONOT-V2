# MCP Brain Memory Claude

Serveur MCP (Model Context Protocol) pour la gestion de mémoire de projets et l'intégration Dokploy.

## Vue d'ensemble

Le serveur `brain-memory-claude` fournit deux fonctionnalités principales :

1. **Mémoire de Projet** - Persistance du contexte entre sessions Claude
2. **Intégration Dokploy** - Déploiement et gestion d'infrastructure

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
