# Sepehr Panel

Sepehr Panel is one portable repository containing:

- Next.js 16 frontend
- ASP.NET Core 8 REST API
- MySQL 8 database
- Docker Compose configuration for all three services

The inventory workspace includes an equipment overview dashboard, table and grid catalog views, asset tags and serial numbers, categories, team assignment, locations, lifecycle status and condition, supplier and purchasing details, warranty alerts, stock adjustments, and a per-user activity history.

The active issue board persists data through the API. Local browser storage is retained only as an offline fallback.

## First-time setup

Requirements for development are Node.js 20+, .NET SDK 8, Docker Desktop, and Git.

Create your private environment file:

```powershell
Copy-Item .env.example .env
```

Edit `.env` and replace every password, the JWT key, and `DOCKERHUB_USERNAME`.

Install frontend and backend dependencies:

```powershell
npm ci
dotnet restore backend/SepehrPanel.Api/SepehrPanel.Api.csproj
```

## Create or update the database migration

Migration files are intentionally not generated automatically. Run this once from the repository root and commit the generated files:

```powershell
dotnet tool restore
docker compose up -d mysql
dotnet tool run dotnet-ef migrations add KanbanEquipmentInventoryAudit --project backend/SepehrPanel.Api/SepehrPanel.Api.csproj --startup-project backend/SepehrPanel.Api/SepehrPanel.Api.csproj --output-dir Data/Migrations
dotnet tool run dotnet-ef database update --project backend/SepehrPanel.Api/SepehrPanel.Api.csproj --startup-project backend/SepehrPanel.Api/SepehrPanel.Api.csproj
```

The repository pins EF Core CLI 8 locally, so no global EF installation is required. After the migration exists, the Docker API automatically applies pending migrations whenever it starts. This makes subsequent installations on other systems automatic.

## Run everything with Docker

```powershell
docker compose up -d --build
docker compose ps
```

Open:

- Application: `http://localhost:3000`
- API: `http://localhost:5000`
- MySQL: `localhost:3306`

Stop the application without deleting data:

```powershell
docker compose down
```

To intentionally remove the local database volume too:

```powershell
docker compose down -v
```

The initial accounts are seeded at startup. Their passwords come from `.env`:

- `admin` / `SEED_ADMIN_PASSWORD`
- `sepehr.one` / `SEED_USER_ONE_PASSWORD`
- `sepehr.two` / `SEED_USER_TWO_PASSWORD`

Change all three passwords before a public deployment. The inventory seed data includes one record created by each standard user so attribution is immediately visible after login.

## Run without Docker

Start MySQL first, then run these in separate terminals:

```powershell
dotnet run --project backend/SepehrPanel.Api/SepehrPanel.Api.csproj
```

```powershell
npm run dev
```

Swagger is available in Development at `http://localhost:5000/swagger`.

## Verify before publishing

```powershell
npm run typecheck
npm test
npm run build
dotnet build backend/SepehrPanel.Api/SepehrPanel.Api.csproj
docker compose config --quiet
```

## Upload to GitHub

Create an empty repository on GitHub without a generated README or `.gitignore`. Then run:

```powershell
git add .
git commit -m "Set up Sepehr Panel frontend API and MySQL"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/sepehr-panel.git
git push -u origin main
```

If `origin` already exists, replace the remote command with:

```powershell
git remote set-url origin https://github.com/YOUR_USERNAME/sepehr-panel.git
```

Never commit `.env`; only `.env.example` should be shared.

## Run from GitHub on another system

```powershell
git clone https://github.com/YOUR_USERNAME/sepehr-panel.git
Set-Location sepehr-panel
Copy-Item .env.example .env
```

Set strong secrets in `.env`, then run:

```powershell
docker compose up -d --build
```

Because the committed migration is applied automatically by the API, no .NET or Node installation is needed on the second system; it only needs Git and Docker Desktop.

## Publish images to Docker Hub

Set `DOCKERHUB_REPOSITORY`, `API_IMAGE_TAG`, and `WEB_IMAGE_TAG` in `.env`, then:

```powershell
docker login
docker compose build
docker compose push api web
```

This publishes:

- `farzanehmajd/sepehr-panel:api-latest`
- `farzanehmajd/sepehr-panel:web-latest`

On another system, copy `docker-compose.yml` and `.env` (or clone the Git repository), then run without rebuilding:

```powershell
docker compose pull api web
docker compose up -d --no-build
```

MySQL data is stored in the named Docker volume `sepehr_mysql`. Docker images do not contain your database records; use `mysqldump` and restore when moving existing production data.

## Production notes

- Put the web service behind HTTPS using a reverse proxy or managed hosting platform.
- Use long random values for `JWT_KEY`, database passwords, and the initial administrator password.
- Set `Demo__AllowAnonymousIssues=false` for a private production board.
- Restrict or remove the public MySQL `3306` port when deploying to a server.
- Back up MySQL regularly.
- Review `npm audit` before public deployment; the dormant XLSX/export dependency currently reports an upstream security advisory.

## API endpoints

- `GET /health`
- `POST /api/login`
- `POST /api/refresh`
- `GET/POST/PUT/DELETE /api/issues`
- `/api/project`
- `/api/task`
- `/api/board`
- `/api/card`
- `/api/inventory`
- `/api/time-entry`
- `/api/user`

Successful API payloads use the existing frontend format: `{ "result": ... }`.
