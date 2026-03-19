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
- new requests and new custom request types are shared across signed-in users

When the API is not available or not configured correctly:

- the app falls back to browser `sessionStorage`
- data remains local to the current browser session

Built-in request types still come from the frontend seed data in both modes.

## Important Remaining Limitation

Admin access is still controlled by the in-app password in the UI. Authentication to the site itself is handled by Azure Static Web Apps, but admin authorization is not yet tied to Microsoft Entra roles.

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

If `PORTAL_STORAGE_CONNECTION_STRING` is blank, the API falls back to `AzureWebJobsStorage`.

The API stores data in these Azure Table Storage tables:

- `PortalRequests`
- `PortalRequestTypes`

## Authentication

`staticwebapp.config.json` currently requires authentication for the whole app and redirects unauthenticated users to:

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
