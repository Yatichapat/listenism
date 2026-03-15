from pydantic import BaseModel, EmailStr


class RegisterRequest(BaseModel):
	email: EmailStr
	password: str
	display_name: str


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
