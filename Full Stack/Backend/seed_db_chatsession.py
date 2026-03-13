from sqlalchemy.orm import Session
from app.models.chat_history import ChatHistory
from app.models.chat_session import ChatSession
from app.core.enums import ChatRole
from app.db.session import engine, SessionLocal


def migrate_chat_sessions(db: Session):
    print("🔄 Migrating chat history into sessions...")

    sessions_created = 0

    issue_ids = (
        db.query(ChatHistory.issue_id)
        .filter(ChatHistory.issue_id.isnot(None))
        .distinct()
        .all()
    )

    for (issue_id,) in issue_ids:
        first_msg = (
            db.query(ChatHistory)
            .filter(
                ChatHistory.issue_id == issue_id,
                ChatHistory.role_in_chat == ChatRole.USER
            )
            .order_by(ChatHistory.created_at.asc())
            .first()
        )

        title = (
            first_msg.message[:50]
            if first_msg
            else f"Issue #{issue_id} Discussion"
        )

        session = ChatSession(
            user_id=first_msg.user_id if first_msg else 1,
            issue_id=issue_id,
            title=title,
            is_active=True,
        )

        db.add(session)
        db.flush()

        db.query(ChatHistory).filter(
            ChatHistory.issue_id == issue_id
        ).update(
            {"session_id": session.id},
            synchronize_session=False
        )

        sessions_created += 1

    db.commit()

    print(f"✅ Created {sessions_created} chat sessions")


db = SessionLocal()
migrate_chat_sessions(db)