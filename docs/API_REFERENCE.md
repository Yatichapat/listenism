# Listenism API Reference

Base URL: `/api/v1`

This reference covers the backend HTTP API exposed by the FastAPI app. Most protected endpoints require a bearer access token in the `Authorization` header.

```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

## Conventions

- `200 OK` for successful reads and actions that return a body
- `204 No Content` for deletes
- `401 Unauthorized` when the access token is missing or invalid
- `403 Forbidden` when the current user does not have permission
- `404 Not Found` when the requested resource does not exist
- Multipart upload endpoints use `multipart/form-data`

## Auth

### Register
`POST /auth/register`

Creates a new user account.

Request body:
```json
{
  "email": "user@example.com",
  "password": "secret123",
  "display_name": "User Name",
  "role": "listener"
}
```

Notes:
- `role` defaults to `listener`
- Supported roles are `listener`, `artist`, and `admin`

Response:
```json
{
  "id": 1,
  "email": "user@example.com",
  "display_name": "User Name",
  "role": "listener",
  "like_count": 0,
  "follower_count": 0
}
```

### Login
`POST /auth/login`

Request body:
```json
{
  "email": "user@example.com",
  "password": "secret123"
}
```

Response:
```json
{
  "access_token": "<jwt-access-token>",
  "refresh_token": "<jwt-refresh-token>",
  "token_type": "bearer"
}
```

### Refresh token
`POST /auth/refresh`

Request body:
```json
{
  "refresh_token": "<jwt-refresh-token>"
}
```

Response:
```json
{
  "access_token": "<jwt-access-token>",
  "refresh_token": "<jwt-refresh-token>",
  "token_type": "bearer"
}
```

### Current user
`GET /auth/me`

Returns the authenticated user profile.

### List users
`GET /auth/users`

Admin-only list of users.

Response:
```json
{
  "items": [
    {
      "id": 1,
      "email": "artist@example.com",
      "display_name": "Artist One",
      "role": "artist",
      "like_count": 12,
      "follower_count": 30
    }
  ]
}
```

### Delete user
`DELETE /auth/users/{target_user_id}`

Admin-only user deletion.

## Music

### List songs
`GET /music/songs`

Lists all songs.

### Newest songs
`GET /music/songs/newest?limit=10`

### Hot songs
`GET /music/songs/hot?limit=10`

### Personalized recommendations
`GET /music/songs/recommended?limit=10`

Requires authentication.

### Following feed
`GET /music/songs/feed?limit=20`

Requires authentication. Returns songs posted by followed artists.

### Genre fallback for cold start
`GET /music/songs/fallback/genre?limit=10`

Requires authentication. Used when recommendation data is sparse.

### My uploaded songs
`GET /music/songs/mine`

Requires authentication and artist access.

### Liked songs
`GET /music/songs/liked`

Requires authentication. Returns the current user’s liked songs.

Notes:
- This endpoint is the source of truth for the "Liked Songs" collection.
- "Liked Songs" is not created through `POST /music/playlists` and is not returned by `GET /music/playlists`.
- In the frontend, it may be rendered like a playlist card, but it remains backed by the likes system.

### Create playlist
`POST /music/playlists`

Requires authentication. Only `listener` and `artist` roles are allowed.

Request body:
```json
{
  "name": "Road Trip"
}
```

Returns the created playlist object in the same shape as `GET /music/playlists` items.

### List my playlists
`GET /music/playlists`

Requires authentication. Only `listener` and `artist` roles are allowed.

Response:
```json
{
  "items": [
    {
      "id": 12,
      "user_id": 3,
      "name": "Road Trip",
      "created_at": "2026-04-12T09:30:00Z",
      "songs": [
        {
          "id": 99,
          "title": "Night Drive",
          "artist_name": "Artist Name",
          "genre": "synthwave",
          "audio_url": "https://...",
          "cover_url": null,
          "like_count": 10,
          "view_count": 140,
          "created_at": "2026-04-11T19:00:00Z",
          "artist_id": 8,
          "album_id": null,
          "position": 1
        }
      ]
    }
  ]
}
```

### Rename playlist
`PATCH /music/playlists/{playlist_id}`

Requires authentication. Only `listener` and `artist` roles are allowed.

Request body:
```json
{
  "name": "Late Night"
}
```

Returns the updated playlist object in the same shape as `GET /music/playlists` items.

### Delete playlist
`DELETE /music/playlists/{playlist_id}`

Requires authentication. Only `listener` and `artist` roles are allowed.

### Add song to playlist
`POST /music/playlists/{playlist_id}/songs`

Requires authentication. Only `listener` and `artist` roles are allowed.

Request body:
```json
{
  "song_id": 99
}
```

Returns the updated playlist object with songs re-indexed by `position`.

### Remove song from playlist
`DELETE /music/playlists/{playlist_id}/songs/{song_id}`

Requires authentication. Only `listener` and `artist` roles are allowed.

Returns the updated playlist object with contiguous `position` values after removal.
### Newest albums
`GET /music/albums/newest?limit=10`

### Album details
`GET /music/albums/{album_id}`

Returns album metadata and tracks.

### Hot artists
`GET /music/artists/hot?limit=10`

### Newest artists
`GET /music/artists/newest?limit=10`

### Create song
`POST /music/songs`

Creates a new song record.

Request body:
```json
{
  "title": "Song Title",
  "artist_name": "Artist Name",
  "genre": "pop"
}
```

Requires authentication and artist access.

### Upload song or album
`POST /music/songs/upload`

Multipart upload endpoint.

Form fields:
- `upload_type`: `single` or `album`
- `title`: song title for single uploads
- `genre`: optional genre
- `album_title`: album title for album uploads
- `track_titles`: repeated form field for album track names
- `audio_file`: single audio file
- `audio_files`: repeated audio files for album uploads
- `cover_file`: optional cover image

### Update my song
`PATCH /music/songs/{song_id}`

Multipart update endpoint for the owner’s own song.

Form fields:
- `title`
- `genre`
- `cover_file`

### Delete my song
`DELETE /music/songs/{song_id}`

Requires authentication and ownership.

### Delete song as admin
`DELETE /music/songs/admin/{song_id}`

Admin-only deletion.

### Record listen event
`POST /music/songs/{song_id}/listen`

Records a play/listen event for analytics.

Response:
```json
{
  "message": "Listen event recorded"
}
```

### Artist analytics
`GET /music/analytics/artist`

Requires artist authentication.

Response:
```json
{
  "artist_id": 1,
  "artist_name": "Artist Name",
  "follower_count": 25,
  "total_songs": 8,
  "total_plays": 103,
  "top_songs": [
    {
      "id": 10,
      "title": "Top Track",
      "genre": "indie",
      "play_count": 42,
      "like_count": 18
    }
  ]
}
```

## Social

### Follow artist
`POST /social/follow`

Request body:
```json
{
  "artist_id": 12
}
```

### Unfollow artist
`POST /social/unfollow`

Request body:
```json
{
  "artist_id": 12
}
```

### Like song
`POST /social/like`

Request body:
```json
{
  "song_id": 99
}
```

### Unlike song
`POST /social/unlike`

Request body:
```json
{
  "song_id": 99
}
```

### Comment on song
`POST /social/comment`

Request body:
```json
{
  "song_id": 99,
  "content": "Great track."
}
```

### List comments
`GET /social/comments?song_id=99`

Public endpoint. Does not require authentication.

Response:
```json
{
  "items": [
    {
      "id": 1,
      "song_id": 99,
      "user_id": 3,
      "user_name": "Listener One",
      "content": "Great track.",
      "created_at": "2026-04-11T10:00:00Z"
    }
  ]
}
```

### Update my comment
`PATCH /social/comment/{comment_id}`

Requires authentication. You can only update your own comment.

Request body:
```json
{
  "content": "Updated comment text"
}
```

### Delete my comment
`DELETE /social/comment/{comment_id}`

Requires authentication. You can only delete your own comment.

### Report song
`POST /social/report/song`

Request body:
```json
{
  "song_id": 99,
  "reason": "Inappropriate content"
}
```

### Report user
`POST /social/report/user`

Request body:
```json
{
  "user_id": 3,
  "reason": "Spam"
}
```

### List song reports
`GET /social/reports/songs`

Admin-only.

### List user reports
`GET /social/reports/users`

Admin-only.

## Recommendation

### For you
`GET /recommendation/for-you?limit=10`

Requires authentication.

This endpoint proxies the recommendation service and returns personalized song suggestions.

## Response Models

Common entity fields returned by the API:

### Song
- `id`
- `title`
- `artist_name`
- `genre`
- `audio_url`
- `cover_url`
- `view_count`
- `like_count`

### Album
- `id`
- `title`
- `artist_name`
- `cover_url`

### Artist
- `id`
- `name`
- `followers_count`
- `avatar_url`

## Related Links

- [Project README](../README.md)
- [Specification](./specification.md)
