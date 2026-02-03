# Deploying to Render

Quick steps to deploy this project to Render using the included `render.yaml`.

1. Commit and push your changes to GitHub (branch `main`):

```bash
git add .
git commit -m "Prepare Render deploy: static path, DB SSL, PDF tweaks"
git push origin main
```

2. In Render, create a new Web Service and connect your GitHub repo, or import the `render.yaml` file by adding the service.

3. In the Render dashboard set the following environment variables (do NOT paste real secrets here):
- `DATABASE_URL` = your Postgres connection string
- `SESSION_SECRET` = production session secret
- `NODE_ENV` = production

4. Build & Start commands (already in `render.yaml`):
- Build Command: `npm ci --include=dev && npm run build`
- Start Command: `npm start`

5. After deployment, check the service logs for any startup errors. If migrations are required you can run `npm run db:push` from a shell that has access to the production `DATABASE_URL` (prefer using CI or one-off jobs).

Local quick-run (Windows PowerShell):

```powershell
cd "C:\Users\wali computers\Desktop\amsv3\amsv3"
npm install
npm run build
$env:DATABASE_URL = 'postgresql://<user>:<pass>@<host>:5432/<db>'
$env:DB_SSL = 'true'
node dist/index.cjs
```

Notes:
- Use Render's secrets UI to store `DATABASE_URL` and `SESSION_SECRET`.
- Avoid committing real credentials into the repo.
