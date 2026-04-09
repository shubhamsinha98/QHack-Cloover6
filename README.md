# Cloover

Cloover is a React + Tailwind CSS sales co-pilot for German residential clean-energy installers. It helps a sales rep:

- create and manage customer records
- generate AI-powered sales briefings
- review financing options
- open report views for each customer
- rehearse conversations in the sales coach

The app uses:

- `React` for the UI
- `Vite` for local development and bundling
- `Tailwind CSS` for styling
- a small local `Node` server for persistence
- the `OpenAI API` for briefing and coaching workflows
- a deployable Node server that can serve the built frontend and the API together

## Run locally

From the project folder:

```bash
cd "/Users/shubhamsinha/Documents/New project"
./start-cloover.sh
```

That script:

- loads Node through `nvm`
- installs dependencies if `node_modules` is missing
- starts the frontend on `http://127.0.0.1:5173`
- starts the local API on `http://127.0.0.1:8787`

Manual run:

```bash
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"
npm install
npm run dev
```

## Environment

Create a `.env` file with:

```bash
OPENAI_API_KEY=your_key_here
VITE_API_BASE_URL=
```

Use `.env.example` as the starter template.

Notes:

- `OPENAI_API_KEY` is used by the backend server.
- `VITE_API_BASE_URL` can stay blank when frontend and backend are served from the same domain.
- For deployed hosting, set these as platform environment variables instead of committing them.

## Root files and folders

### App and build

- `index.html`
  Vite HTML entry file.

- `package.json`
  Project metadata, scripts, and dependencies.

- `package-lock.json`
  Locked dependency tree for reproducible installs.

- `vite.config.js`
  Vite configuration, including frontend dev behavior and API proxying.

- `tailwind.config.js`
  Tailwind design tokens and theme extensions.

- `postcss.config.js`
  PostCSS configuration used by Tailwind.

- `src/`
  Main frontend application source code.

- `src/main.jsx`
  React bootstrap entry that mounts the app.

- `src/App.jsx`
  Main application shell and shared state. Handles tab routing, selected customer state, briefing generation, persistence sync, and cross-tab data flow.

- `src/index.css`
  Global CSS and app-level visual foundation.

### Backend and persistence

- `server.mjs`
  Deployable backend server. Handles user/customer persistence, OpenAI proxy calls, health checks, and can serve the built frontend from `dist/`.

- `data/`
  Local data directory.

- `data/cloover-db.json`
  File-based local database storing users and customers.

- `data/.gitkeep`
  Keeps the `data` folder present in git when empty.

### Launchers and helper scripts

- `start-cloover.sh`
  Main launcher script. Starts both frontend and backend and auto-installs dependencies if needed.

- `Open Cloover.command`
  Double-clickable macOS launcher.

- `scripts/refresh_branch_marker.sh`
  Updates local branch marker metadata used in the working folder.

- `scripts/update_github_package.sh`
  Rebuilds the upload package folder used for GitHub packaging snapshots.

### Git and project hygiene

- `.gitignore`
  Prevents generated files, secrets, and temporary packaging folders from being committed.

- `.env.example`
  Template for local environment variables.

- `.env`
  Real local secrets. Keep this private and do not upload it.

- `CURRENT_BRANCH.txt`
  Convenience marker showing the current branch in a visible file.

## `src/components`

### Core authenticated flow

- `AuthPortal.jsx`
  Sign-in and account-creation screen shown before entering the workspace.

- `CustomersPanel.jsx`
  Main customer intake form. Creates a customer record and starts report generation.

- `PropertyIntakePanel.jsx`
  Compact dropdown-based property questionnaire used inside the customer intake flow.

- `OsmBuildingPicker.jsx`
  OpenStreetMap-based manual roof polygon tool for roof footprint, surface area, and usable roof area inputs.

### Briefing

- `BriefingWorkspace.jsx`
  Wrapper around the briefing flow. Shows customer list state when no report is open and the active briefing when one is selected.

- `BriefingAssumptionsPanel.jsx`
  Editable assumptions form for regenerating a selected customer’s briefing with updated inputs.

- `Briefing.jsx`
  Main briefing report UI. Shows market context, roof sizing, offer tiers, energy prediction, and related report content.

- `LeadInput.jsx`
  Older standalone lead form from the earlier single-screen flow. Still present in the repo, but not the main active intake path now.

### Financing and reports

- `FinancingWorkspace.jsx`
  Customer picker and wrapper for financing reports.

- `FinancingReport.jsx`
  Interactive financing report and quote builder. Includes payment routes, invoice-style equipment breakdown, financing terms, and co-signer handling.

- `ReportsWorkspace.jsx`
  Customer picker and report workspace for the sales rep sheet and leave-behind report.

### Coaching

- `SalesCoach.jsx`
  Objection handling, role-play, direct coach chat, and audio briefing playback. Also supports updating customer facts from conversation context.

### Legacy

- `InstallerCRM.jsx`
  Legacy CRM implementation kept in the repo for reference. It is not the main active flow anymore.

## `src/lib`

- `api.js`
  Frontend helper functions for talking to the local backend.

- `openai.js`
  OpenAI request helpers and model JSON parsing utilities.

- `propertyMetrics.js`
  Shared rule-based property and energy model. Derives electricity and heating estimates from questionnaire data.

- `osmRoofTools.js`
  Roof polygon math, map helpers, roof pitch multipliers, area calculations, and roof-based solar sizing metrics.

- `offers.js`
  Offer scoring and dynamic recommendation logic for choosing the best offer tier.

## Active app structure

After sign-in, the active workspace is organized into these tabs:

- `Customers`
  Create customers and capture property/roof inputs.

- `Briefing`
  Open and regenerate customer-specific AI briefings.

- `Reports`
  View the sales rep sheet and customer leave-behind report for a selected customer.

- `Financing`
  Review the finance report and quote builder for a selected customer.

- `Sales Coach`
  Practice objections, role-play, and use coach chat with audio.

## Notes

- `node_modules/` and `dist/` are generated and should not be committed.
- `Cloover-GitHub-Package/` and `Cloover-GitHub-Package-Versions/` are packaging outputs and should not be treated as source code.
- The local database in `data/cloover-db.json` may contain test or real customer data, so review it before uploading publicly.
- OpenAI calls now run through the backend, which is the safer deployment model.

## Deploy as a web app

This project is now set up to be deployed as a normal web app.

### Recommended deployment shape

- build the frontend with `npm run build`
- run the backend with `npm start`
- host the Node server on a platform like Render, Railway, Fly.io, or a VPS

### Required environment variables

- `OPENAI_API_KEY`
- `PORT`
  Usually provided automatically by the hosting platform

### Deployment behavior

- in development:
  - Vite runs the frontend
  - the Node server runs the API
  - Vite proxies `/api` requests to the backend

- in production:
  - `server.mjs` serves the built frontend from `dist/`
  - the same server also handles `/api/*`

### Typical deploy commands

Build:

```bash
npm install
npm run build
```

Start:

```bash
npm start
```
