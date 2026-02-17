"""
Database seed script - Creates initial data for the AI OpEx Platform
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.core.database import engine, SessionLocal
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.site import Site
from app.models.supervisor_site import SupervisorSite
from app.models.issue import Issue, IssueStatus, IssuePriority
from app.models.issue_assignment import IssueAssignment, AssignmentStatus
from app.models.call_log import CallLog, CallStatus
from app.models.issue_image import IssueImage, ImageType, AIFlag
from app.models.complaint import Complaint, ComplaintStatus
from app.models.issue_history import IssueHistory
from app.models.problem_solver_skill import ProblemSolverSkill
from app.models.escalation_rule import EscalationRule

def seed_database():
    db = SessionLocal()
    
    try:
        # Check if already seeded
        existing_users = db.query(User).count()
        if existing_users > 0:
            print("Database already seeded. Skipping...")
            return
        
        print("Seeding database...")
        
        # 1. Create Users
        users = [
            User(
                username="manager1",
                password_hash=get_password_hash("manager123"),
                name="Vikram Singh",
                email="vikram@opex.com",
                phone="+91 9876543210",
                role=UserRole.manager,
                avatar_url="https://ui-avatars.com/api/?name=Vikram+Singh&background=3b82f6&color=fff"
            ),
            User(
                username="supervisor1",
                password_hash=get_password_hash("super123"),
                name="Priya Sharma",
                email="priya@opex.com",
                phone="+91 9876543211",
                role=UserRole.supervisor,
                avatar_url="https://ui-avatars.com/api/?name=Priya+Sharma&background=8b5cf6&color=fff"
            ),
            User(
                username="supervisor2",
                password_hash=get_password_hash("super123"),
                name="Raj Kumar",
                email="raj@opex.com",
                phone="+91 9876543212",
                role=UserRole.supervisor,
                avatar_url="https://ui-avatars.com/api/?name=Raj+Kumar&background=8b5cf6&color=fff"
            ),
            User(
                username="solver1",
                password_hash=get_password_hash("solver123"),
                name="Arun Patel",
                email="arun@opex.com",
                phone="+91 9876543213",
                role=UserRole.problem_solver,
                avatar_url="https://ui-avatars.com/api/?name=Arun+Patel&background=16a34a&color=fff"
            ),
            User(
                username="solver2",
                password_hash=get_password_hash("solver123"),
                name="Meera Reddy",
                email="meera@opex.com",
                phone="+91 9876543214",
                role=UserRole.problem_solver,
                avatar_url="https://ui-avatars.com/api/?name=Meera+Reddy&background=16a34a&color=fff"
            ),
            User(
                username="solver3",
                password_hash=get_password_hash("solver123"),
                name="Suresh Menon",
                email="suresh@opex.com",
                phone="+91 9876543215",
                role=UserRole.problem_solver,
                avatar_url="https://ui-avatars.com/api/?name=Suresh+Menon&background=16a34a&color=fff"
            ),
        ]
        db.add_all(users)
        db.commit()
        print(f"Created {len(users)} users")
        
        # 2. Create Sites
        sites = [
            Site(name="Guindy Tech Park", location="Chennai", latitude=13.0067, longitude=80.2206, address="Plot 45, Industrial Estate, Guindy, Chennai 600032"),
            Site(name="Taramani Innovation Hub", location="Chennai", latitude=12.9855, longitude=80.2437, address="TICEL Bio Park, Taramani, Chennai 600113"),
            Site(name="Ambattur Manufacturing Unit", location="Chennai", latitude=13.1143, longitude=80.1548, address="Industrial Estate, Ambattur, Chennai 600058"),
            Site(name="Vepery Industrial Complex", location="Chennai", latitude=13.0878, longitude=80.2585, address="Perambur High Road, Vepery, Chennai 600007"),
            Site(name="Perungudi Data Center", location="Chennai", latitude=12.9629, longitude=80.2422, address="OMR Road, Perungudi, Chennai 600096"),
        ]
        db.add_all(sites)
        db.commit()
        print(f"Created {len(sites)} sites")
        
        # 3. Create Supervisor-Site assignments
        supervisor_sites = [
            SupervisorSite(supervisor_id=2, site_id=1),  # Priya -> Guindy
            SupervisorSite(supervisor_id=2, site_id=2),  # Priya -> Taramani
            SupervisorSite(supervisor_id=3, site_id=3),  # Raj -> Ambattur
            SupervisorSite(supervisor_id=3, site_id=4),  # Raj -> Vepery
            SupervisorSite(supervisor_id=3, site_id=5),  # Raj -> Perungudi
        ]
        db.add_all(supervisor_sites)
        db.commit()
        print(f"Created {len(supervisor_sites)} supervisor-site assignments")
        
        # 4. Create Problem Solver Skills
        skills = [
            ProblemSolverSkill(solver_id=4, skill_type="Electrical", proficiency_level="expert"),
            ProblemSolverSkill(solver_id=4, skill_type="Safety", proficiency_level="intermediate"),
            ProblemSolverSkill(solver_id=5, skill_type="Plumbing", proficiency_level="expert"),
            ProblemSolverSkill(solver_id=5, skill_type="HVAC", proficiency_level="intermediate"),
            ProblemSolverSkill(solver_id=6, skill_type="Mechanical", proficiency_level="expert"),
            ProblemSolverSkill(solver_id=6, skill_type="Building", proficiency_level="expert"),
        ]
        db.add_all(skills)
        db.commit()
        print(f"Created {len(skills)} solver skills")
        
        # 5. Create Issues
        now = datetime.utcnow()
        issues = [
            Issue(title="Water leakage in main hall", description="Major water leakage from ceiling affecting work area", issue_type="Plumbing", priority=IssuePriority.high, status=IssueStatus.COMPLETED, site_id=4, raised_by_user_id=2, deadline_at=now - timedelta(days=2)),
            Issue(title="Electrical panel malfunction", description="Panel B3 showing intermittent failures", issue_type="Electrical", priority=IssuePriority.high, status=IssueStatus.COMPLETED, site_id=3, raised_by_user_id=3, deadline_at=now - timedelta(days=1)),
            Issue(title="AC unit not cooling", description="Central AC in Block A not maintaining temperature", issue_type="HVAC", priority=IssuePriority.high, status=IssueStatus.COMPLETED, site_id=1, raised_by_user_id=2, deadline_at=now - timedelta(days=3)),
            Issue(title="Broken window in conference room", description="Glass cracked, safety hazard", issue_type="Building", priority=IssuePriority.medium, status=IssueStatus.COMPLETED, site_id=2, raised_by_user_id=2, deadline_at=now - timedelta(days=4)),
            Issue(title="Elevator maintenance required", description="Strange noise from elevator motor", issue_type="Mechanical", priority=IssuePriority.high, status=IssueStatus.COMPLETED, site_id=5, raised_by_user_id=3, deadline_at=now - timedelta(days=5)),
            Issue(title="Fire alarm system check", description="Annual maintenance pending", issue_type="Safety", priority=IssuePriority.high, status=IssueStatus.COMPLETED, site_id=1, raised_by_user_id=2, deadline_at=now - timedelta(days=6)),
            Issue(title="Sewage backup - urgent", description="Sewage backup in basement parking", issue_type="Plumbing", priority=IssuePriority.high, status=IssueStatus.ESCALATED, site_id=4, raised_by_user_id=3, deadline_at=now - timedelta(days=1)),
            Issue(title="Generator not starting", description="Emergency generator failed to start during test", issue_type="Electrical", priority=IssuePriority.high, status=IssueStatus.ESCALATED, site_id=1, raised_by_user_id=2, deadline_at=now + timedelta(days=1)),
            Issue(title="Roof leak during rain", description="Water seeping through roof in server room", issue_type="Building", priority=IssuePriority.high, status=IssueStatus.IN_PROGRESS, site_id=5, raised_by_user_id=3, deadline_at=now + timedelta(days=2)),
            Issue(title="Parking barrier malfunction", description="Entry barrier not responding", issue_type="Mechanical", priority=IssuePriority.medium, status=IssueStatus.IN_PROGRESS, site_id=2, raised_by_user_id=2, deadline_at=now + timedelta(days=3)),
            Issue(title="CCTV camera offline", description="Security camera in Section C not working", issue_type="Safety", priority=IssuePriority.medium, status=IssueStatus.IN_PROGRESS, site_id=3, raised_by_user_id=3, deadline_at=now + timedelta(days=2)),
            Issue(title="Intercom system failure", description="Intercom not working in Building B", issue_type="Electrical", priority=IssuePriority.medium, status=IssueStatus.IN_PROGRESS, site_id=4, raised_by_user_id=2, deadline_at=now + timedelta(days=4)),
            Issue(title="Plumbing repair - cafeteria", description="Sink not draining properly", issue_type="Plumbing", priority=IssuePriority.medium, status=IssueStatus.IN_PROGRESS, site_id=1, raised_by_user_id=2, deadline_at=now + timedelta(days=5)),
            Issue(title="Emergency exit sign broken", description="Exit sign in stairwell C not illuminating", issue_type="Safety", priority=IssuePriority.high, status=IssueStatus.IN_PROGRESS, site_id=5, raised_by_user_id=3, deadline_at=now + timedelta(days=1)),
            Issue(title="Roof leak during rain", description="Multiple areas showing water damage", issue_type="Building", priority=IssuePriority.medium, status=IssueStatus.IN_PROGRESS, site_id=4, raised_by_user_id=2, deadline_at=now - timedelta(days=1)),
            Issue(title="Emergency exit sign broken", description="Sign needs replacement", issue_type="Safety", priority=IssuePriority.high, status=IssueStatus.IN_PROGRESS, site_id=1, raised_by_user_id=2, deadline_at=now - timedelta(days=3)),
            Issue(title="Flickering lights in lobby", description="Multiple lights flickering, possible wiring issue", issue_type="Electrical", priority=IssuePriority.medium, status=IssueStatus.ASSIGNED, site_id=2, raised_by_user_id=2, deadline_at=now + timedelta(days=5)),
            Issue(title="Power socket sparking", description="Socket near reception area showing sparks", issue_type="Electrical", priority=IssuePriority.high, status=IssueStatus.OPEN, site_id=2, raised_by_user_id=2, deadline_at=now - timedelta(days=3)),
            Issue(title="Roof leak during rain", description="Water damage to ceiling tiles", issue_type="Building", priority=IssuePriority.medium, status=IssueStatus.OPEN, site_id=4, raised_by_user_id=3, deadline_at=now + timedelta(days=4)),
            Issue(title="HVAC duct cleaning required", description="Annual cleaning pending", issue_type="HVAC", priority=IssuePriority.low, status=IssueStatus.OPEN, site_id=3, raised_by_user_id=3, deadline_at=now + timedelta(days=14)),
            Issue(title="Bathroom tiles broken", description="Tiles in men's restroom cracked", issue_type="Building", priority=IssuePriority.low, status=IssueStatus.COMPLETED, site_id=1, raised_by_user_id=2, deadline_at=now - timedelta(days=7)),
            Issue(title="UPS system beeping", description="UPS showing low battery warning", issue_type="Electrical", priority=IssuePriority.high, status=IssueStatus.COMPLETED, site_id=5, raised_by_user_id=3, deadline_at=now - timedelta(days=2)),
        ]
        db.add_all(issues)
        db.commit()
        print(f"Created {len(issues)} issues")
        
        # 6. Create Issue Assignments for in-progress and completed issues
        assignments = [
            IssueAssignment(issue_id=1, assigned_to_solver_id=5, assigned_by_user_id=2, status=AssignmentStatus.COMPLETED, completed_at=now - timedelta(days=1)),
            IssueAssignment(issue_id=2, assigned_to_solver_id=4, assigned_by_user_id=3, status=AssignmentStatus.COMPLETED, completed_at=now),
            IssueAssignment(issue_id=3, assigned_to_solver_id=5, assigned_by_user_id=2, status=AssignmentStatus.COMPLETED, completed_at=now - timedelta(days=2)),
            IssueAssignment(issue_id=4, assigned_to_solver_id=6, assigned_by_user_id=2, status=AssignmentStatus.COMPLETED, completed_at=now - timedelta(days=3)),
            IssueAssignment(issue_id=5, assigned_to_solver_id=6, assigned_by_user_id=3, status=AssignmentStatus.COMPLETED, completed_at=now - timedelta(days=4)),
            IssueAssignment(issue_id=6, assigned_to_solver_id=4, assigned_by_user_id=2, status=AssignmentStatus.COMPLETED, completed_at=now - timedelta(days=5)),
            IssueAssignment(issue_id=9, assigned_to_solver_id=6, assigned_by_user_id=3, status=AssignmentStatus.ACTIVE, due_date=now + timedelta(days=2)),
            IssueAssignment(issue_id=10, assigned_to_solver_id=6, assigned_by_user_id=2, status=AssignmentStatus.ACTIVE, due_date=now + timedelta(days=3)),
            IssueAssignment(issue_id=11, assigned_to_solver_id=4, assigned_by_user_id=3, status=AssignmentStatus.ACTIVE, due_date=now + timedelta(days=2)),
            IssueAssignment(issue_id=12, assigned_to_solver_id=4, assigned_by_user_id=2, status=AssignmentStatus.ACTIVE, due_date=now + timedelta(days=4)),
            IssueAssignment(issue_id=13, assigned_to_solver_id=5, assigned_by_user_id=2, status=AssignmentStatus.ACTIVE, due_date=now + timedelta(days=5)),
            IssueAssignment(issue_id=17, assigned_to_solver_id=4, assigned_by_user_id=2, status=AssignmentStatus.ACTIVE, due_date=now + timedelta(days=5)),
        ]
        db.add_all(assignments)
        db.commit()
        print(f"Created {len(assignments)} assignments")
        
        # 7. Create Complaints
        complaints = [
            Complaint(issue_id=7, raised_by_user_id=1, target_solver_id=5, complaint_details="Solver did not respond to calls for 2 days", status=ComplaintStatus.OPEN),
            Complaint(issue_id=8, raised_by_user_id=2, target_solver_id=4, complaint_details="Work quality not satisfactory, issue recurred", status=ComplaintStatus.INVESTIGATING),
            Complaint(issue_id=15, raised_by_user_id=3, target_solver_id=6, complaint_details="Deadline missed without communication", status=ComplaintStatus.OPEN),
        ]
        db.add_all(complaints)
        db.commit()
        print(f"Created {len(complaints)} complaints")
        
        # 8. Create Escalation Rules
        escalation_rules = [
            EscalationRule(issue_type="Electrical", priority="high", max_response_hours=4, escalation_after_hours=8),
            EscalationRule(issue_type="Electrical", priority="medium", max_response_hours=8, escalation_after_hours=24),
            EscalationRule(issue_type="Plumbing", priority="high", max_response_hours=4, escalation_after_hours=8),
            EscalationRule(issue_type="Safety", priority="high", max_response_hours=2, escalation_after_hours=4),
            EscalationRule(issue_type="HVAC", priority="high", max_response_hours=6, escalation_after_hours=12),
        ]
        db.add_all(escalation_rules)
        db.commit()
        print(f"Created {len(escalation_rules)} escalation rules")
        
        print("\\n✅ Database seeding completed successfully!")
        print("\\nTest credentials:")
        print("  Manager: manager1 / manager123")
        print("  Supervisor: supervisor1 / super123")
        print("  Solver: solver1 / solver123")
        
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
