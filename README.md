# TSC Operations Portal

Internal request portal built with React and Vite.

## Azure Static Web Apps Prep

This repo is prepared for Azure Static Web Apps with:

- `staticwebapp.config.json` for SPA fallback and sign-in protection
- `.github/workflows/azure-static-web-apps.yml` for GitHub-based deploys
- `api/` Azure Functions for shared request and request-type storage
- a Node engine pin in `package.json` for Azure/Oryx build compatibility

## Current Storage Behavior

The frontend now checks for a shared Azure API at startup.

When the API is available:

- request records are loaded from Azure Table Storage
- custom request types are loaded from Azure Table Storage
- working-group page content is loaded from Azure Table Storage
- approved staff edits to working-group pages are saved back to Azure Table Storage
- new requests and new custom request types are shared across signed-in users

When the API is not available or not configured correctly:

- the app falls back to browser `sessionStorage`
- working-group page editing falls back to browser `localStorage`
- data remains local to the current browser session

Built-in request types still come from the frontend seed data in both modes.

## Important Remaining Limitation

Staff access is currently controlled by the portal's shared allowlist rather than Microsoft Entra roles or groups.

## Azure Setup

1. Push this project to GitHub.
2. In Azure, create a new Static Web App.
3. Connect it to this GitHub repository.
4. Use these build settings:

- App location: `/`
- API location: `api`
- Output location: `dist`
- Branch: `main`

5. Add the deployment token to the GitHub repo as:

- `AZURE_STATIC_WEB_APPS_API_TOKEN`

If Azure generates its own workflow during setup, keep the values above or replace it with the workflow already included in this repo.

## Azure Function App Storage Settings

The managed API in `api/` expects table storage connection strings in application settings.

Required:

- `AzureWebJobsStorage`

Optional but recommended:

- `PORTAL_STORAGE_CONNECTION_STRING`
- `PORTAL_TEAMS_WEBHOOK_URL`

If `PORTAL_STORAGE_CONNECTION_STRING` is blank, the API falls back to `AzureWebJobsStorage`.

If `PORTAL_TEAMS_WEBHOOK_URL` is set to a Microsoft Teams incoming webhook URL, the API posts a best-effort channel notification whenever a new request is submitted. A Teams delivery failure does not block the request from being saved.

The API stores data in these Azure Table Storage tables:

- `PortalRequests`
- `PortalRequestTypes`
- `PortalWorkingGroupPages`

## Authentication

`staticwebapp.config.json` currently keeps public request submission open, while staff inbox and admin flows use Microsoft sign-in and the shared staff allowlist.

The current sign-in path is:

- `/.auth/login/aad`

The config also explicitly protects `/api/*` and pins the managed API runtime to Node 20.

For a real internal rollout, configure Microsoft Entra ID in Azure Static Web Apps and restrict access to your organization tenant.

## Local Commands

- `npm install`
- `npm run dev`
- `npm run build`
- `cd api`
- `npm install`
- `npm start`

## Recommended Next Step

To finish hardening this for internal production use, the next changes should be:

- replace the admin password with Entra-backed roles
- decide whether built-in request types should also become editable in shared storage
- add audit fields if you want to track who changed request statuses or request types
