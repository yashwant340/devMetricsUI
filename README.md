# DevMetrics

DevMetrics is a GitHub analytics platform that syncs repository activity, computes metrics snapshots, and shows trends, comparisons, and insights in a dashboard.

## Project Structure

- `Dev-Metrics/` - React frontend
- `develop/` - Spring Boot backend

## Features

- GitHub OAuth login
- connect and disconnect repositories
- sync pull requests, commits, reviews, and contributors
- sync full commit history on the first pass, then fetch only new commits on later syncs
- view repository health metrics
- compare two repositories side by side
- view trends with sparklines and historical snapshots
- show lightweight insight cards from recent metric changes
- soft-disconnect repositories so historical data stays intact

## Tech Stack

Frontend:

- React
- TypeScript
- Vite
- React Router

Backend:

- Spring Boot
- Spring Security
- Spring Data JPA
- PostgreSQL
- JWT cookies
- OAuth2 client

## Architecture

The project is split into two apps:

### Frontend

The frontend handles:

- session restoration
- repo selection and comparison
- data fetching
- metric cards, sparklines, and insights
- loading states and modal flows

Main files:

- `src/pages/Dashboard.tsx`
- `src/components/ConnectRepoModel.tsx`
- `src/components/CompareReposModal.tsx`
- `src/hooks/useRepositories.tsx`
- `src/hooks/useMetrics.tsx`
- `src/hooks/useApi.tsx`

### Backend

The backend handles:

- GitHub OAuth authentication
- repository sync
- metric computation
- persistence
- API endpoints for repositories and metrics

Main files:

- `src/main/java/com/devMetrics/develop/controller/AuthController.java`
- `src/main/java/com/devMetrics/develop/controller/RepositoryController.java`
- `src/main/java/com/devMetrics/develop/controller/SyncController.java`
- `src/main/java/com/devMetrics/develop/controller/MetricsController.java`
- `src/main/java/com/devMetrics/develop/service/RepositoryService.java`
- `src/main/java/com/devMetrics/develop/service/SyncService.java`
- `src/main/java/com/devMetrics/develop/service/MetricsComputationService.java`
- `src/main/java/com/devMetrics/develop/service/GitHubApiService.java`

## How It Works

1. User signs in with GitHub OAuth.
2. Backend stores access and refresh JWT cookies.
3. Frontend restores the session with `/api/auth/me`.
4. User connects a repository.
5. Backend fetches GitHub data and stores PRs, commits, reviews, and contributors.
6. Backend computes a metrics snapshot and saves it.
7. Frontend loads latest metrics and history.
8. Dashboard renders trends, comparison, and insights.

Sync behavior:

- the first sync for a repo fetches its full commit history
- later syncs fetch only commits newer than the latest stored commit
- commit totals are cumulative over time
- health score comparisons still come from saved snapshot history

## Data Model

Main entities:

- `User`
- `Repository`
- `Contributor`
- `PullRequest`
- `PrReview`
- `Commit`
- `MetricsSnapshot`

Repository disconnect is soft-delete style:

- the row is kept
- `connected` is set to `false`
- related history remains valid

## Setup

Frontend:

```bash
npm install
npm run dev
```

Backend:

```bash
./mvnw spring-boot:run
```

## Build

Frontend:

```bash
npm run build
npm run lint
```

Backend:

```bash
./mvnw test
```
