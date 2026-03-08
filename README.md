# Listenism
## Project Overview
Listenism is a web-based music platform designed to support emerging university artists who wish to share their original music and build a fan base within the university community.

 Many student musicians lack accessible platform where new artists can upload and manage their song while listeners can discover, stream, and follow music created by fellow students.

 The platform encourages collaboration within the university music community and helps student artists grow their audience while allowing listeners to explore new music from their peers.

## System Architecture Overview
The system follows a Layered Architecture combined with a client-server model to ensure seperation of concerns, scalability, and maintainability.

The architecture is divided into four main layers.

### Presentation Layer
This layer represents the user interface of the system.

Users can browse music, manage playlists, upload songs, and access personalized recommendations through the web interface.

### Business Layer
This layer contains the application logic that corrodinates the system's functionality.

It processes requests from the presentation layer, handles authentication, manages user actions and invokes services related to music management, playlists, and recommendations.

### Persistant Layer
It defines the rules and structures of the system, including users, songs, playlists, and artist profiles. This layer ensures that the system follows consistent business rules.

### Database Layer
It handles stroing user accounts, manage songs metadata, saving playlists and iteractions 

## User Roles & Permissions
### Listener
Listeners are users who listen to music on the platform.

**Permissions**
- Register and log in
- Browse songs and artist profiles
- Stream music
- Like songs
- Follow artists
- Create and manage playlists

### Artist
Artists are users who upload and manage their own music

**Permissions**
- Upload songs
- Edit song details
- Delete their own songs
- Manage their profile
- View follower count

### Admin
Admins manage the overall platform and ensure that the content follows community guidelines.

**Permissions**
- Manage users
- Remove inappropriate content
- Monitor reported songs
- Manage platform data

## Technology Stack
### Frontend
- React / Next.js
- TailwindCSS

### Backend
- FastAPI
- Python

### Database
- PostgreSQL

### Version Control
- Git

### Container
- Docker

## Installation & Setup Instructions
### Clone the Repository
``` bash

git clone https://github.com/Yatichapat/listenism.git
cd listenism

```
