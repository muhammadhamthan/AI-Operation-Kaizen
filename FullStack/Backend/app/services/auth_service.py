"""
PURPOSE: JWT token creation + verification.
Used by api/auth.py endpoints.
"""

# from app.core.security import create_access_token, decode_access_token


# class AuthService:
#     @staticmethod
#     def create_token(user_id: int, role: str, name: str) -> str:
#         return create_access_token(
#             data={"sub": user_id, "role": role, "name": name}
#         )

#     @staticmethod
#     def decode_token(token: str) -> dict:
#         return decode_access_token(token)