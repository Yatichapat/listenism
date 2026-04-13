# Listenism 🎵

> A university music platform connecting emerging student artists with their campus audience.

Listenism is a web-based music platform designed to support emerging university artists who wish to share their original music and build a fan base within the university community. Student musicians can upload and manage their songs while listeners can discover, stream, and interact with music created by their peers.

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

### Key Features

- 🎼 **Music Upload** — Artists can upload original songs with metadata and cover art
- 🤖 **AI Recommendations** — Collaborative filtering recommendations powered by ML service
- 👥 **Social Features** — Follow artists, like songs, and comment on tracks
- 🎵 **Album Management** — Organize songs into albums with cover images
- 🔐 **Authentication** — Secure JWT-based authentication with role-based access
- 📱 **Responsive UI** — Modern web interface with Next.js and Tailwind CSS

---

## System Architecture Overview

Listenism follows a microservices architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Next.js)                      │
│              (http://localhost:3000)                         │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ REST API
                           │
        ┌──────────────────┴─────────────────┐
        │                                    │
┌───────▼─────────┐              ┌───────────▼──────┐
│  Backend API    │              │   ML Service     │
│  (FastAPI)      │              │   (Flask)        │
│  Port: 8000     │              │   Port: 8001     │
└───────┬─────────┘              └──────────────────┘
        │
        ├────────────────┬──────────────┬─────────────┐
        │                │              │             │
┌───────▼────────┐ ┌─────▼─────┐ ┌──────▼────┐ ┌──────▼───┐
│  PostgreSQL    │ │   Redis   │ │  MinIO    │ │ Alembic  │
│  Port: 5432    │ │ Port:6379 │ │ Port:9000 │ │ Migrations
│                │ │           │ │           │ │          │
│ - Users        │ │ - Cache   │ │ - Audio   │ │- Schema  │
│ - Songs        │ │ - Sessions│ │ - Images  │ │ Version  │
│ - Albums       │ │           │ │           │ │          │
│ - Comments     │ └───────────┘ └───────────┘ └──────────┘
│ - Likes        │
│ - Follows      │
└────────────────┘
```

### Architecture Components

| Component | Purpose | Technology |
|-----------|---------|-----------|
| **Frontend** | User interface and client-side logic | Next.js 16, React, TypeScript, Tailwind CSS |
| **Backend API** | Core business logic and data management | FastAPI, SQLAlchemy, Python 3.12 |
| **Database** | Persistent data storage | PostgreSQL 15 |
| **Cache** | Session and data caching | Redis |
| **Object Storage** | Audio files and cover images | MinIO (S3-compatible) |
| **ML Service** | AI-powered recommendations | Flask, scikit-learn, collaborative filtering |
| **Migrations** | Database schema versioning | Alembic |

### Data Flow

1. **User Authentication**: Users register/login → JWT tokens issued → stored in browser/session
2. **Music Upload**: Artist uploads song → stored in MinIO → metadata saved to PostgreSQL
3. **Music Discovery**: User views home → Frontend fetches songs from backend → ML service provides recommendations for authenticated users
4. **Social Interactions**: Like/comment/follow operations persist to database → real-time updates on UI
5. **Recommendations**: ML service analyzes user-song interactions → returns personalized recommendations

---

## User Roles & Permissions

Listenism implements three distinct user roles with different capabilities:

### 1. **Listener** (Default role)
Students who discover and enjoy music on the platform.

**Permissions:**
- ✅ Browse and search songs and albums
- ✅ Stream audio (view songs)
- ✅ Like songs and albums
- ✅ Comment on songs
- ✅ Follow artists
- ✅ Receive AI-powered recommendations
- ✅ View user profiles
- ❌ Upload songs
- ❌ Create albums
- ❌ Moderate content (as admin)

### 2. **Artist** (Self-assigned during registration)
Student musicians who share their original music.

**Permissions:**
- ✅ All Listener permissions
- ✅ Upload and manage songs
- ✅ Create and manage albums
- ✅ Edit/delete own songs and albums
- ✅ View song statistics and analytics
- ✅ Edit profile information
- ❌ Delete other artists' content
- ❌ Moderation features

### 3. **Admin** (System-assigned)
Platform administrators managing the ecosystem.

**Permissions:**
- ✅ View user management dashboard
- ✅ View content moderation dashboard
- ✅ View platform analytics
- ✅ Flag/report songs for moderation
- ✅ View user reports
- ✅ Monitor system health
- ❌ Directly delete user content (designed for admin review workflow)

### Authorization Flow

- **Registration**: New users default to `listener` role
- **Artist Activation**: Users can select "artist" role during signup or profile settings
- **Admin Assignment**: Only existing admins can promote users to admin via admin panel
- **Token-Based**: JWT tokens include user role; backend validates permissions per endpoint

---

## Technology Stack

### Frontend
- **Framework**: Next.js 16 (React 18)
- **Language**: TypeScript
- **Styling**: Tailwind CSS with PostCSS
- **HTTP Client**: Fetch API (with server/client-side URL differentiation)
- **State Management**: React hooks (useState, useEffect)
- **Form Handling**: Native HTML forms with React

### Backend
- **Framework**: FastAPI
- **Language**: Python 3.12
- **ORM**: SQLAlchemy 2.0
- **Database**: PostgreSQL 15
- **Migrations**: Alembic
- **Authentication**: JWT (PyJWT)
- **Password Hashing**: bcrypt
- **File Upload**: Multipart/form-data to MinIO
- **Environment**: python-dotenv

### Machine Learning
- **Framework**: Flask
- **Algorithm**: Collaborative Filtering (scikit-learn NearestNeighbors)
- **Model Storage**: Pickle (.pkl files)
- **Data Processing**: NumPy, Pandas (generated demo data)

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Object Storage**: MinIO (S3-compatible)
- **Caching**: Redis
- **Reverse Proxy**: None (direct service access)

### Development Tools
- **Code Style**: Black (Python), ESLint (JavaScript/TypeScript)
- **Package Management**: pip (Python), npm (Node.js)
- **Linting**: Pylint (Python), ESLint (TypeScript)

---

## Installation & Setup

### Prerequisites

Before you begin, ensure you have the following installed:

- **Docker & Docker Compose** — Container orchestration
  - [Install Docker Desktop](https://www.docker.com/products/docker-desktop)
  - Includes both Docker and Docker Compose

- **Git** — Version control
  ```bash
  git clone https://github.com/yourusername/listenism.git
  cd listenism
  ```

### Option 1: Docker Setup

Docker Compose automatically sets up all services with proper networking and environment variables.

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/listenism.git
   cd listenism
   ```

2. **Verify docker-compose.yml**
   Ensure all services are configured:
   ```bash
   docker compose config
   ```

3. **Build and start services**
   ```bash
   docker compose up --build
   ```

4. **Wait for services to be ready**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - MinIO Console: http://localhost:9001
   - PostgreSQL: localhost:5432

### Option 2: Local Development Setup

**Backend Setup:**
```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file (copy from .env.example if available)
cp .env.example .env  # Configure database, S3, etc.

# Run database migrations
alembic upgrade head

# Bootstrap admin account
python -m app.scripts.bootstrap_admin

# Start backend server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend Setup:**
```bash
# In new terminal, navigate to frontend
cd frontend

# Install dependencies
npm install

# Create .env.local file
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
echo "INTERNAL_API_URL=http://localhost:8000" >> .env.local

# Start development server
npm run dev
```

**ML Service Setup:**
```bash
# In new terminal, navigate to ML directory
cd ml

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start Flask server
python api/main.py
```

### Environment Variables

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL=postgresql://listenism:listenism_password@localhost:5432/listenism_db

# JWT
SECRET_KEY=your-secret-key-here-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=30

# MinIO/S3
S3_ENDPOINT_URL=http://localhost:9000
S3_PUBLIC_ENDPOINT_URL=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=listenism-audio

# ML Service
ML_SERVICE_URL=http://localhost:8001

# Redis
REDIS_URL=redis://localhost:6379/0

# Admin Bootstrap (Docker only)
ADMIN_EMAIL=admin@listenism.edu
ADMIN_PASSWORD=admin123
ADMIN_DISPLAY_NAME=System Admin
ADMIN_BOOTSTRAP_ENABLED=true
```

---

## How to Run the System

### Using Docker Compose

```bash
# Start all services in the background
docker compose up -d

# View logs
docker compose logs -f

# Stop all services
docker compose down

# Stop and remove all data (clean slate)
docker compose down -v
```

### Accessing the Application

| Service | URL | Notes |
|---------|-----|-------|
| **Frontend** | http://localhost:3000 | Next.js app, start here |
| **Backend API** | http://localhost:8000 | FastAPI docs at /docs |
| **MinIO Console** | http://localhost:9001 | S3 storage management |
| **Database** | localhost:5432 | PostgreSQL (psql CLI) |

### First Time Setup in Docker

1. **Wait for backend to be ready** (check logs for "Uvicorn running on")

2. **Create admin account** (automatically done if env vars set):
   ```bash
   docker compose exec backend python -m app.scripts.bootstrap_admin
   ```

3. **Seed demo data**:
   ```bash
   docker compose exec backend python -m app.scripts.seed
   ```

4. **Login to frontend** at http://localhost:3000
   - Email: `admin@listenism.edu` (or your ADMIN_EMAIL)
   - Password: `admin123` (or your ADMIN_PASSWORD)

### Local Development Workflow

```bash
# Terminal 1: Backend
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload

# Terminal 2: Frontend
cd frontend
npm run dev

# Terminal 3: ML Service
cd ml
source venv/bin/activate
python api/main.py
```

### Database Management

**Connect to PostgreSQL directly**:
```bash
psql -h localhost -p 5432 -U listenism -d listenism_db
```

**Run migrations**:
```bash
cd backend
alembic upgrade head  # Apply all migrations
alembic downgrade -1  # Rollback one migration
alembic current       # Show current version
```

**Reset database** (caution: deletes all data):
```bash
docker compose down -v
docker compose up
```

---

## Screenshots

### Authentication Flow
- **Login Page** — Email/password authentication with role selection during signup
- **Registration Page** — Create account with listener/artist role choice

### Home Page
- **Trending Section** — Recently uploaded songs
- **AI Recommendations** — Personalized song recommendations (authenticated users only)
- **Top Artists** — Most followed artists
- **Hot Songs** — Most liked/commented songs

### Music Discovery
- **Browse Albums** — Grid view of all albums with cover art
- **Song Details** — Full song info, comments, and social interactions
- **Artist Profile** — Artist bio, follower count, all their songs/albums

### Artist Features
- **Upload Song** — Form to upload audio file, title, description, album selection
- **Manage Albums** — Create albums, set cover images
- **Song Settings** — Edit song metadata, delete songs, view upload history

### Admin Dashboard
- **User Management** — View/manage user accounts and roles
- **Content Moderation** — Review flagged songs and reports
- **Analytics** — Platform statistics (total users, songs, plays)
- **System Health** — Backend health check, service status

### Social Features
- **Comments Section** — Users can comment, edit, and delete their own comments
- **Like Button** — Single-click to like/unlike songs
- **Follow Button** — Follow/unfollow artists and receive updates

---

## Project Structure

```
listenism/
├── backend/                    # FastAPI REST API
│   ├── app/
│   │   ├── main.py            # FastAPI app setup
│   │   ├── models/            # SQLAlchemy ORM models
│   │   ├── modules/           # Domain modules (auth, music, social, recommendation)
│   │   ├── scripts/           # Setup scripts (seed, bootstrap_admin)
│   │   ├── infrastructure/    # Database and storage configs
│   │   └── shared/            # Shared utilities (config, exceptions, logger)
│   ├── alembic/               # Database migrations
│   ├── requirements.txt        # Python dependencies
│   └── Dockerfile             # Backend container image
│
├── frontend/                  # Next.js React application
│   ├── src/
│   │   ├── app/              # Next.js app directory (pages, layouts)
│   │   ├── components/       # React components (Navbar, Cards, etc.)
│   │   ├── services/         # API client services
│   │   ├── types/            # TypeScript interfaces
│   │   ├── hooks/            # Custom React hooks
│   │   └── mockupData/       # Demo data for development
│   ├── package.json           # Node.js dependencies
│   ├── tsconfig.json          # TypeScript configuration
│   ├── tailwind.config.ts     # Tailwind CSS customization
│   └── Dockerfile             # Frontend container image
│
├── ml/                        # Machine Learning service
│   ├── api/
│   │   ├── main.py           # Flask app entry point
│   │   └── router.py         # ML endpoints
│   ├── models/               # Trained models storage
│   ├── pipelines/            # ML pipeline scripts
│   ├── requirements.txt       # Python dependencies
│   └── Dockerfile            # ML container image
│
├── docker-compose.yml         # Multi-container orchestration
├── README.md                  # This file
└── docs/                      # Documentation
    └── specification.md       # Detailed system specification
```

---

## Development Guidelines

### Code Quality

- **Python**: Follow PEP 8 standards, format with Black
  ```bash
  black app/ tests/
  ```

- **TypeScript/JavaScript**: Follow ESLint rules
  ```bash
  npm run lint
  ```

### Testing

- Backend tests (todo):
  ```bash
  pytest backend/test/
  ```

- Frontend tests (todo):
  ```bash
  npm test
  ```

### Git Workflow

1. Create feature branch
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Commit with meaningful messages
   ```bash
   git commit -m "feat: add comment editing functionality"
   ```

3. Push and create Pull Request
   ```bash
   git push origin feature/your-feature-name
   ```

---

## Troubleshooting

### Backend won't start
- Check PostgreSQL is running: `docker compose ps | grep postgres`
- Check logs: `docker compose logs backend`
- Verify environment variables in `.env`

### Frontend can't connect to backend
- Backend should be at `http://backend:8000` inside Docker or `http://localhost:8000` locally
- Check INTERNAL_API_URL and NEXT_PUBLIC_API_URL environment variables

### File uploads fail
- Verify MinIO is running: `docker compose ps | grep minio`
- Check S3 credentials in `.env`
- Ensure S3_BUCKET exists in MinIO

### Database not migrated
- Run migrations manually: `docker compose exec backend alembic upgrade head`
- Check Alembic versions: `docker compose exec backend alembic current`

---

## Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Submit a Pull Request with description

---

## License

This project is licensed under the MIT License — see LICENSE file for details.

---

## Support

For questions or issues:
- Open an issue on GitHub
- Check the [specification](docs/specification.md) for detailed features
- Review the [REPORT.md](REPORT.md) for project progress

---

**Happy listening! 🎵**
