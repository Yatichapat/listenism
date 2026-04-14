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

The architecture is organized into four layers.

1. **Client layer**
The client layer consists of a React + Next.js web application that communicates with the backend over HTTPS REST.

2. **Gateway layer**
The gateway layer contains an API Gateway that serves as the single entry point for all requests, handling JWT verification, rate limiting, and routing.

3. **Backend layer**
The backend layer is a Modular Monolith built with FastAPI, composed of four modules:
- **Auth** (registration, login, token management)
- **Music** (uploads, streaming, search, playlists)
- **Social** (likes, follows, comments)
- **Recommendation** (personalized suggestions with fallback logic)

4. **Infrastructure layer**
The infrastructure layer is divided into two parts:
- A **data layer** consisting of PostgreSQL, Redis, and MinIO for storage and caching
- A separate **ML service** powered by scikit-learn and APScheduler, which periodically processes listen events in batch to generate recommendations stored back into Redis

This separation ensures the ML workload is fully decoupled from the core backend, allowing independent scaling and graceful degradation if the ML service becomes unavailable.

### 4.3 Module Structure

Each backend module follows a layered architecture internally. Modules communicate only through public service interfaces.

Typical internal structure:

```text
app/modules/<module>/
   router.py      # HTTP routes
   service.py     # Business logic and module public interface
   repository.py  # Data access
   schemas.py     # Request/response DTOs
```

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

- **Docker & Docker Compose** — Container orchestration
  - [Install Docker Desktop](https://www.docker.com/products/docker-desktop)
  - Includes Docker Compose
- **Git** — Version control

### Docker Setup

```bash
git clone https://github.com/yourusername/listenism.git
cd listenism
docker compose up --build
```

### Local Setup

Backend:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
python -m app.scripts.bootstrap_admin
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Environment variables are loaded from `.env` at the project root. At minimum, set `DATABASE_URL`, `SECRET_KEY`, `S3_*`, and `ML_SERVICE_URL` for local runs.

### Optional: Seed Demo Data

Use these commands if you want sample users, songs, albums, and social activity in the database.

Docker:

```bash
docker compose exec backend python -m app.scripts.seed
docker compose exec backend python scripts/seed_discover.py
```

Local:

```bash
cd backend
source .venv/bin/activate
python -m app.scripts.seed
python scripts/seed_discover.py
```

---

## Screenshots

### Authentication Flow
- **Login Page** — Email/password authentication with role selection during signup
- **Registration Page** — Create account with listener/artist role choice
<img width="1352" height="753" alt="ภาพถ่ายหน้าจอ 2569-04-13 เวลา 21 21 25" src="https://github.com/user-attachments/assets/99d682e8-3c50-4a9b-a313-4da3489a177f" />
<img width="1351" height="755" alt="ภาพถ่ายหน้าจอ 2569-04-13 เวลา 21 25 40" src="https://github.com/user-attachments/assets/ce703bac-720f-44bd-829a-d921808a3aef" />

### Home Page
- **Trending Section** — Recently uploaded songs
- **AI Recommendations** — Personalized song recommendations (authenticated users only)
- **Top Artists** — Most followed artists
- **Hot Songs** — Most liked/commented songs
<img width="1352" height="794" alt="ภาพถ่ายหน้าจอ 2569-04-14 เวลา 10 15 05" src="https://github.com/user-attachments/assets/339acd6b-e09a-4e58-a33e-51b681c99423" />
<img width="1351" height="795" alt="ภาพถ่ายหน้าจอ 2569-04-14 เวลา 10 14 57" src="https://github.com/user-attachments/assets/3c776b1a-8375-42d2-a417-6148fc695911" />
<img width="1352" height="795" alt="ภาพถ่ายหน้าจอ 2569-04-14 เวลา 10 14 48" src="https://github.com/user-attachments/assets/f944ab49-447b-4f35-880d-f97715fdd053" />

### Artist Features
- **Upload Song** — Form to upload audio file, title, description, album selection
- **Manage Albums** — Create albums, set cover images
- **Song Settings** — Edit song metadata, delete songs, view upload history
<img width="1352" height="795" alt="ภาพถ่ายหน้าจอ 2569-04-14 เวลา 10 16 30" src="https://github.com/user-attachments/assets/252b9d87-5b0b-43a4-8ba9-8728f212804e" />
<img width="1345" height="794" alt="ภาพถ่ายหน้าจอ 2569-04-14 เวลา 10 16 22" src="https://github.com/user-attachments/assets/5c90aff9-f913-499b-bdfa-86bcdd07d551" />
<img width="1352" height="793" alt="ภาพถ่ายหน้าจอ 2569-04-14 เวลา 10 16 11" src="https://github.com/user-attachments/assets/af0dfde0-524f-4f8a-ba27-e56770c535f0" />

### Admin Dashboard
- **User Management** — View/manage user accounts and roles
- **Content Moderation** — Review flagged songs and reports
- **Analytics** — Platform statistics (total users, songs, plays)<img width="1352" height="797" alt="ภาพถ่ายหน้าจอ 2569-04-14 เวลา 10 24 41" src="https://github.com/user-attachments/assets/d4c4a4d6-3bc0-423d-a19a-469b3b5c8daa" />
<img width="1350" height="794" alt="ภาพถ่ายหน้าจอ 2569-04-14 เวลา 10 24 23" src="https://github.com/user-attachments/assets/cdb40d28-0b15-4eb5-8b31-a6c9db9659d0" />
<img width="1352" height="794" alt="ภาพถ่ายหน้าจอ 2569-04-14 เวลา 10 24 11" src="https://github.com/user-attachments/assets/201ee313-f7aa-4577-8c28-f3a8adf3864d" />
<img width="1352" height="796" alt="ภาพถ่ายหน้าจอ 2569-04-14 เวลา 10 23 36" src="https://github.com/user-attachments/assets/b94ad537-444b-4f7e-b7c0-e97e4b81213a" />

### Social Features
- **Comments Section** — Users can comment, edit, and delete their own comments
- **Like Button** — Single-click to like/unlike songs and it will save in their liked songs
- **Save Button** - Click to save/unsave songs and it will save in their playlists
<img width="1352" height="792" alt="ภาพถ่ายหน้าจอ 2569-04-14 เวลา 10 25 03" src="https://github.com/user-attachments/assets/5395e7ce-cc69-405b-b67f-2ce17edd0aa1" />
<img width="1346" height="791" alt="ภาพถ่ายหน้าจอ 2569-04-14 เวลา 10 27 28" src="https://github.com/user-attachments/assets/90425f7c-c45d-4807-9805-32da625dda79" />
<img width="1349" height="792" alt="ภาพถ่ายหน้าจอ 2569-04-14 เวลา 10 29 29" src="https://github.com/user-attachments/assets/3d9523bf-d250-4257-9e73-337b015729bd" />


