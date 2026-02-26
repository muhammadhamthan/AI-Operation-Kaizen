from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.user import User
from app.core.security import get_password_hash

def update_existing_user_passwords():
    db: Session = SessionLocal()

    users = db.query(User).all()

    for user in users:
        user.password_hash = get_password_hash(user.phone)

    db.commit()
    db.close()

    print("✅ All users password updated to hashed phone number")


if __name__ == "__main__":
    update_existing_user_passwords()