# Listenism

## Project Overview
Listenism is a university-focused music platform where student artists upload and manage original songs, and listeners discover music through social interactions and recommendation features. The platform is implemented as a web system with a Next.js frontend, a FastAPI backend, and a dedicated ML service for recommendation inference and model training.

Core product goals:
- Provide a practical publishing channel for student artists.
- Improve discovery through recommendation and social signals.
- Enforce role-based capabilities for listener, artist, and admin.
- Support moderation workflows for reported users and songs.

## System requirements

### Runtime and infrastructure
- Docker + Docker Compose v2 (recommended local run mode).
- Python 3.11+ for backend and ML services.
- Node.js 18+ for frontend local development.
- PostgreSQL 15 as primary relational database.
- Redis 7 for caching/session-related capabilities.
- MinIO (S3-compatible storage) for media objects.

### Services and ports (default local)
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- ML API: http://localhost:8001
- PostgreSQL: localhost:5432
- Redis: localhost:6379
- MinIO API: http://localhost:9000
- MinIO Console: http://localhost:9001

### Environment dependencies
- JWT configuration (`SECRET_KEY`, `ALGORITHM`, token expiry settings).
- Database connectivity (`DATABASE_URL`).
- Object storage (`S3_ENDPOINT_URL`, `S3_BUCKET`, credentials).
- Cross-service link from backend to ML (`ML_SERVICE_URL`).
- Frontend API base URL (`NEXT_PUBLIC_API_URL`).

## Architecture Characteristics
- Modular monolith backend architecture (domain modules separated by router/service/repository/schemas).
- Separate ML microservice for model serving and training concerns.
- RESTful API boundaries between frontend-backend and backend-ML.
- Layered backend module design:
	- Router: HTTP contracts.
	- Service: business rules and orchestration.
	- Repository: database access and query composition.
	- Schemas: request/response validation and typing.
- Role-based access control across protected endpoints using JWT identity and role checks.
- Hybrid recommendation architecture:
	- Backend recommendation module for integration and fallback behavior.
	- ML service for model-based ranking logic.

## Architecture Design

### Frontend
- Next.js App Router application with TypeScript.
- Feature-oriented pages for discover, songs, albums, artist upload, analytics, and admin dashboards.
- API client layer (`services/api`) handles tokenized requests and automatic refresh logic.

### Backend API
- FastAPI app with versioned routers under `/api/v1`.
- Active modules:
	- `auth`: registration, login, token refresh, profile, admin user management.
	- `music`: song and album retrieval, artist uploads, and deletion workflows.
	- `social`: follow/like/comment plus reporting and admin report listing.
	- `recommendation`: recommendation retrieval via ML client.
- Shared middleware and cross-cutting concerns:
	- CORS middleware for frontend origin(s).
	- Unified exception handlers.
	- JWT dependency for authenticated identity resolution.

### ML Service
- Separate FastAPI app exposing `/recommend` and `/health`.
- Model artifacts loaded from disk and used for nearest-neighbor recommendation inference.
- Recommender logic has been decomposed into focused modules:
	- preprocessing/model build,
	- inference/ranking,
	- evaluation metrics.

### Deployment topology (local compose)
- `frontend` depends on `backend`.
- `backend` depends on `postgres` and `minio`.
- `ml` depends on healthy `postgres`.
- Backend applies migrations at startup before serving traffic.

## Database Design

### Main entities
- `users`
	- identity: email, display name, password hash.
	- authorization: role enum (`listener`, `artist`, `admin`).
	- lifecycle: active flag, created timestamp.
- `albums`
	- title, cover URL, artist owner.
- `songs`
	- title, genre, file key, duration, artist owner, optional album linkage.

### Social interaction entities
- `follows`
	- follower -> artist relationship.
	- unique constraint per `(follower_id, artist_id)`.
- `likes`
	- user -> song preference.
	- unique constraint per `(user_id, song_id)`.
- `comments`
	- user-authored text on songs.

### Moderation entities
- `song_reports`
	- reporter -> song with reason.
	- unique constraint per `(reporter_id, song_id)`.
- `user_reports`
	- reporter -> reported user with reason.
	- unique constraint per `(reporter_id, reported_user_id)`.

### Referential behavior
- Core foreign keys mostly use `ON DELETE CASCADE` for ownership and interaction cleanup.
- Song-to-album relation uses nullable linkage with album-side management.
- Service/repository logic includes cleanup paths for dependent records and empty-album pruning.

## Role & Permission Structure

### Listener
- Register/login and maintain authenticated session.
- Discover and stream songs.
- Like/unlike songs.
- Follow/unfollow artists.
- Submit song/user reports.
- Access personalized recommendations.

### Artist
- All listener capabilities.
- Upload single songs or album batches with media assets.
- Manage own uploaded songs.
- View artist analytics views.

### Admin
- Moderation and governance permissions via role checks (not a separate business domain).
- View all users.
- Delete user accounts (with self-delete protection).
- View reported songs and reported users.
- Delete songs as moderation action.

### Enforcement model
- JWT-based identity extraction from bearer tokens.
- Route-level authentication dependency on protected endpoints.
- Service-level role checks for privileged operations.

## Implementation Details

### Authentication and session flow
- Login returns both access and refresh tokens.
- Backend validates token type and user activity.
- Frontend API client retries unauthorized requests using refresh token flow.

### Music upload and media handling
- Upload uses multipart forms with mode switch (`single` or `album`).
- Media bytes are uploaded to S3-compatible storage with generated object keys.
- Cover/audio public URLs are derived for response payloads.
- Service complexity reduced by isolating upload workflow into a dedicated upload service class.

### Recommendation pipeline
- Training path prepares interaction matrices and KNN artifacts.
- Inference path supports user-based and item-based strategies.
- Popularity fallback returns deterministic results when personalized candidates are unavailable.
- Evaluation supports Precision@K, Recall@K, and MAP@K.

### Social and moderation workflow
- Social module handles follow/like/comment/report commands.
- Admin report views are role-gated and returned through social/auth module endpoints.
- Moderation actions (song and account deletion) are guarded and transactional.

### Code quality and maintainability
- Layered module boundaries improve testability and change isolation.
- Recent refactors targeted cyclomatic complexity reduction in recommendation and music upload paths.
- Compatibility facades preserve public imports while internal logic is split into cohesive files.

### Known improvement areas
- Optimize artist follower counting to avoid relationship-based N+1 access patterns.
- Add explicit integration/load tests for high-traffic recommendation and upload endpoints.
- Expand observability (structured metrics/tracing) for backend and ML interactions.
