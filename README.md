# Listenism 🎵

> A university music platform connecting emerging student artists with their campus audience.

Listenism is a web-based music platform designed to support emerging university artists who wish to share their original music and build a fan base within the university community. Student musicians can upload and manage their songs while listeners can discover, stream, and follow music created by fellow students.

---

## Table of Contents

- [Project Description](#project-description)
- [System Architecture Overview](#system-architecture-overview)
- [User Roles & Permissions](#user-roles--permissions)
- [Technology Stack](#technology-stack)
- [Installation & Setup](#installation--setup)
- [How to Run the System](#how-to-run-the-system)
- [Screenshots](#screenshots)

---

## Project Description

Many student musicians lack an accessible platform where new artists can upload and manage their songs while listeners can discover, stream, and interact with music created by their peers. Listenism solves this by providing:

- **Artists** — a place to upload original music, manage their profile, and grow a following
- **Listeners** — a personalized feed, AI-powered recommendations, and social features like likes and comments
- **Community** — collaboration and connection within the university music ecosystem

---

## System Architecture Overview

Listenism uses a **Modular Monolith** architecture for the backend, with a separate ML service for AI recommendations.

```
listenism/
├── backend/        # Python · FastAPI  (Modular Monolith)
├── frontend/       # Next.js · TypeScript
├── ml/             # Python · FastAPI  (AI Recommendation service)
├── docker-compose.yml
└── .env.example
```

### Architecture Diagram

```
┌─────────────────────────────────────────────┐
│              Browser (Next.js)              │
└─────────────────────┬───────────────────────┘
                      │ HTTPS / REST
┌─────────────────────▼───────────────────────┐
│           API Gateway  (auth · rate limit)  │
└─────────────────────┬───────────────────────┘
                      │
┌─────────────────────▼───────────────────────┐
│         Backend — Modular Monolith           │
│  ┌──────────┐ ┌──────────┐ ┌─────────────┐  │
│  │   auth   │ │  music   │ │   social    │  │
│  └──────────┘ └──────────┘ └─────────────┘  │
│  ┌────────────────────────────────────────┐  │
│  │        recommendation module           │  │
│  │    (calls ML service via HTTP)         │  │
│  └────────────────────────────────────────┘  │
└──────┬──────────────────────────────┬────────┘
       │                              │ internal HTTP
┌──────▼───────┐             ┌────────▼────────┐
│  Data layer  │             │   ML service    │
│  PostgreSQL  │             │  FastAPI +      │
│  Redis       │             │  scikit-learn   │
│  S3 / MinIO  │             │  (retrain nightly)│
└──────────────┘             └─────────────────┘
```

### Backend Module Structure

Each module follows a layered architecture internally:

```
app/modules/<module>/
├── router.py       # FastAPI route definitions
├── service.py      # Business logic
├── repository.py   # Database queries (SQLAlchemy)
└── schemas.py      # Pydantic request/response models
```

---

## User Roles & Permissions

| Feature | Listener | Artist | Admin |
|---|---|---|---|
| Browse & search songs | ✅ | ✅ | ✅ |
| Stream music | ✅ | ✅ | ✅ |
| Like & comment | ✅ | ✅ | ✅ |
| Follow artists | ✅ | ✅ | ✅ |
| Receive AI recommendations | ✅ | ✅ | ✅ |
| Upload songs | ❌ | ✅ | ✅ |
| Manage own profile & songs | ❌ | ✅ | ✅ |
| View artist analytics | ❌ | ✅ | ✅ |
| Manage all users | ❌ | ❌ | ✅ |
| Remove inappropriate content | ❌ | ❌ | ✅ |

> A user registers as either a **Listener** or an **Artist**. Artists have all Listener permissions plus the ability to upload and manage music.

---

## Technology Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| Next.js | 14+ | React framework, App Router |
| TypeScript | 5+ | Type safety |
| Tailwind CSS | 3+ | Styling |
| Zustand | 4+ | Global state (player, auth) |
| Axios | 1+ | HTTP client |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Python | 3.11+ | Runtime |
| FastAPI | 0.110+ | Web framework |
| SQLAlchemy | 2+ | ORM |
| Alembic | 1+ | Database migrations |
| Pydantic | 2+ | Data validation |
| Redis | 7+ | Session & feed cache |

### ML Service
| Technology | Version | Purpose |
|---|---|---|
| Python | 3.11+ | Runtime |
| FastAPI | 0.110+ | Serve recommendation API |
| scikit-learn | 1+ | Collaborative filtering model |
| APScheduler | 3+ | Nightly retrain scheduler |

### Database & Infrastructure
| Technology | Purpose |
|---|---|
| PostgreSQL 15 | Primary database |
| Redis 7 | Cache & sessions |
| MinIO (or AWS S3) | Audio file storage |
| Docker & Docker Compose | Local development |

---

## Installation & Setup

### Prerequisites

- [Docker](https://www.docker.com/) and Docker Compose v2+
- [Node.js](https://nodejs.org/) 18+ (for frontend local dev without Docker)
- [Python](https://www.python.org/) 3.11+ (for backend local dev without Docker)
- [Git](https://git-scm.com/)

### 1. Clone the repository

```bash
git clone https://github.com/your-org/listenism.git
cd listenism
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in the required values. The example file now includes settings for both local development and Docker Compose:

```env
# Database
POSTGRES_USER=listenism
POSTGRES_PASSWORD=your_password
POSTGRES_DB=listenism_db

# Backend
SECRET_KEY=your_secret_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Storage
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=your_minio_password
MINIO_BUCKET=listenism-audio

# ML Service
ML_SERVICE_URL=http://ml:8001

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 3. Install dependencies (for local dev without Docker)

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

**Frontend:**
```bash
cd frontend
npm install
```

**ML Service:**
```bash
cd ml
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

---

## How to Run the System

### Option A — Docker Compose (recommended)

Runs all services (backend, frontend, ml, postgres, redis, minio) with a single command from the repository root:

```bash
docker compose up --build
```

Services will be available at:

| Service | URL |
|---|---|
| Frontend (Next.js) | http://localhost:3000 |
| Backend API (FastAPI) | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |
| ML Service | http://localhost:8001 |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |
| MinIO API | http://localhost:9000 |
| MinIO Console | http://localhost:9001 |

The backend container runs database migrations automatically on startup. MinIO handles song audio and cover uploads.

### Option B — Run each service separately

**1. Start infrastructure (PostgreSQL, Redis, MinIO):**
```bash
docker compose up postgres redis minio -d
```

**2. Run database migrations:**
```bash
cd backend
alembic upgrade head
```

**3. Start the backend:**
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

**4. Start the ML service:**
```bash
cd ml
uvicorn api.main:app --reload --port 8001
```

**5. Start the frontend:**
```bash
cd frontend
npm run dev
```

### Running Tests

**Backend:**
```bash
cd backend
pytest tests/ -v
```

**Frontend:**
```bash
cd frontend
npm run test
```

---

## Screenshots

### Home / Discovery Feed
![Discovery Feed](./screenshots/feed.png)
*Listeners explore new music from university artists, powered by AI recommendations.*

### Artist Profile
![Artist Profile](./screenshots/artist-profile.png)
*Artist profile showing uploaded songs, follower count, and social interactions.*

### Music Player
![Music Player](./screenshots/player.png)
*Persistent audio player with queue management.*

### Upload Song (Artist)
![Upload Song](./screenshots/upload.png)
*Artists upload original music with metadata — title, genre, cover art.*

### Admin Dashboard
![Admin Dashboard](./screenshots/admin.png)
*Admin panel for user management and content moderation.*

---

## License

This project is developed as part of a university course project.