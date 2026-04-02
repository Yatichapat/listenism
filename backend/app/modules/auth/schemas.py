from pydantic import BaseModel, EmailStr


class RegisterRequest(BaseModel):
	email: EmailStr
	password: str
	display_name: str
	role: str = "listener"  # listener, artist, or admin


class LoginRequest(BaseModel):
	email: EmailStr
	password: str


class AuthResponse(BaseModel):
	access_token: str
	token_type: str = "bearer"


class UserPublic(BaseModel):
	id: int
	email: EmailStr
	display_name: str
	role: str = "listener"
	like_count: int = 0
	follower_count: int = 0
