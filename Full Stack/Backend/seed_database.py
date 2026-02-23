"""
seed_database.py — Complete database seeding script (FIXED)
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session

from app.db.session import engine, SessionLocal
from app.db.base import Base

# ── Import ALL models ────────────────────────────────────
from app.models.user import User
from app.models.site import Site
from app.models.supervisor_site import SupervisorSite         # FIX 1: was SupervisorSite
from app.models.issue import Issue
from app.models.issue_assignment import IssueAssignment
from app.models.call_log import CallLog
from app.models.issue_image import IssueImage
from app.models.complaint import Complaint
from app.models.issue_history import IssueHistory
from app.models.chat_history import ChatHistory
from app.models.problem_solver_skill import ProblemSolverSkill
from app.models.escalation_rule import EscalationRule            # Config table
from app.models.escalation import Escalation                     # FIX 2: was missing

# ── Import ALL enums ─────────────────────────────────────
from app.core.enums import (
    UserRole,
    Priority,
    IssueStatus,
    AssignmentStatus,
    CallStatus,
    ImageType,
    AIFlag,
    ActionType,
    ChatRole,
)

# ── Timestamp helper ─────────────────────────────────────
NOW = datetime.now(timezone.utc)


def days_ago(d: int, hours: int = 0, minutes: int = 0) -> datetime:
    return NOW - timedelta(days=d, hours=hours, minutes=minutes)


def days_later(d: int, hours: int = 0) -> datetime:
    return NOW + timedelta(days=d, hours=hours)


def seed_database():
    db = SessionLocal()

    try:
        existing = db.query(Escalation).count()
        if existing > 0:
            print("⚠️  Database already seeded. Skipping...")
            return

        print("🌱 Starting database seeding...\n")

        seed_users(db)
        seed_sites(db)
        seed_supervisor_sites(db)
        seed_solver_skills(db)
        seed_escalation_rules(db)
        seed_issues(db)
        seed_assignments(db)
        seed_call_logs(db)
        seed_issue_images(db)
        seed_complaints(db)
        seed_issue_history(db)
        seed_chat_history(db)
        seed_escalations(db)

        print("\n" + "=" * 60)
        print("✅ Database seeding completed successfully!")
        print("=" * 60)
        print("\n📋 Summary:")
        print(f"   Users:              {db.query(User).count()}")
        print(f"   Sites:              {db.query(Site).count()}")
        print(f"   Solver Skills:      {db.query(ProblemSolverSkill).count()}")
        print(f"   Escalation Rules:   {db.query(EscalationRule).count()}")
        print(f"   Issues:             {db.query(Issue).count()}")
        print(f"   Assignments:        {db.query(IssueAssignment).count()}")
        print(f"   Call Logs:          {db.query(CallLog).count()}")
        print(f"   Issue Images:       {db.query(IssueImage).count()}")
        print(f"   Complaints:         {db.query(Complaint).count()}")
        print(f"   Issue History:      {db.query(IssueHistory).count()}")
        print(f"   Chat History:       {db.query(ChatHistory).count()}")
        print(f"   Escalations:        {db.query(Escalation).count()}")
        print("\n🔑 Test Login Credentials (phone-based auth):")
        print("   Supervisors: 9100000001, 9100000002, 9100000003")
        print("   Managers:    9100000004, 9100000005")
        print("   Solvers:     9100000006 .. 9100000010")

    except Exception as e:
        db.rollback()
        print(f"\n❌ Error seeding database: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()


# ══════════════════════════════════════════════════════════
# 1. USERS
# ══════════════════════════════════════════════════════════

def seed_users(db: Session):
    users = [
        User(name="Priya Sharma", phone="9100000001", email="priya.sharma@facility.com", role=UserRole.SUPERVISOR, is_active=True),
        User(name="Anil Kumar", phone="9100000002", email="anil.kumar@facility.com", role=UserRole.SUPERVISOR, is_active=True),
        User(name="Geetha Rajan", phone="9100000003", email="geetha.rajan@facility.com", role=UserRole.SUPERVISOR, is_active=True),
        User(name="Rajesh Menon", phone="9100000004", email="rajesh.menon@facility.com", role=UserRole.MANAGER, is_active=True),
        User(name="Lakshmi Narayanan", phone="9100000005", email="lakshmi.n@facility.com", role=UserRole.MANAGER, is_active=True),
        User(name="Ramesh Krishnan", phone="9100000006", email="ramesh.k@facility.com", role=UserRole.PROBLEMSOLVER, is_active=True),
        User(name="Suresh Pillai", phone="9100000007", email="suresh.p@facility.com", role=UserRole.PROBLEMSOLVER, is_active=True),
        User(name="Mohan Thilak", phone="9100000008", email="mohan.t@facility.com", role=UserRole.PROBLEMSOLVER, is_active=True),
        User(name="Kavitha Subramanian", phone="9100000009", email="kavitha.s@facility.com", role=UserRole.PROBLEMSOLVER, is_active=True),
        User(name="Vijay Moorthy", phone="9100000010", email="vijay.m@facility.com", role=UserRole.PROBLEMSOLVER, is_active=True),
    ]
    db.add_all(users)
    db.commit()
    print(f"   ✅ Created {len(users)} users")


# ══════════════════════════════════════════════════════════
# 2. SITES
# ══════════════════════════════════════════════════════════

def seed_sites(db: Session):
    sites = [
        Site(name="Vepery Site", location="Vepery, Chennai", latitude=13.08394400, longitude=80.27001400),
        Site(name="Ambattur Industrial Park", location="Ambattur, Chennai", latitude=13.11369300, longitude=80.15293300),
        Site(name="Guindy Factory", location="Guindy, Chennai", latitude=13.00430200, longitude=80.22637600),
        Site(name="Perungudi Site", location="Perungudi, Chennai", latitude=12.97109900, longitude=80.24537300),
        Site(name="Taramani Tech Park", location="Taramani, Chennai", latitude=12.97018100, longitude=80.25022200),
        Site(name="Chromepet Industrial Area", location="Chromepet, Chennai", latitude=12.93921700, longitude=80.14539300),
        Site(name="Sholinganallur Site", location="Sholinganallur, Chennai", latitude=12.90057100, longitude=80.25974900),
        Site(name="Pallikaranai Factory", location="Pallikaranai, Chennai", latitude=12.97168900, longitude=80.21274700),
        Site(name="Medavakkam Park", location="Medavakkam, Chennai", latitude=12.91384800, longitude=80.19755100),
        Site(name="OMR Tech Hub", location="OMR, Chennai", latitude=12.96658000, longitude=80.25974900),
        Site(name="Porur Manufacturing Unit", location="Porur, Chennai", latitude=13.03530000, longitude=80.15680000),
        Site(name="Velachery Business Center", location="Velachery, Chennai", latitude=12.97920000, longitude=80.22100000),
        Site(name="Adyar Research Lab", location="Adyar, Chennai", latitude=13.00630000, longitude=80.25700000),
        Site(name="Nungambakkam Office", location="Nungambakkam, Chennai", latitude=13.06040000, longitude=80.24260000),
        Site(name="Anna Nagar Complex", location="Anna Nagar, Chennai", latitude=13.08500000, longitude=80.20960000),
        Site(name="Thiruvanmiyur Site", location="Thiruvanmiyur, Chennai", latitude=12.98330000, longitude=80.26820000),
        Site(name="Tambaram Depot", location="Tambaram, Chennai", latitude=12.92500000, longitude=80.12780000),
        Site(name="Avadi Plant", location="Avadi, Chennai", latitude=13.11450000, longitude=80.09700000),
        Site(name="Sriperumbudur Unit", location="Sriperumbudur, Chennai", latitude=12.96850000, longitude=79.94140000),
        Site(name="Mahabalipuram Resort Facility", location="Mahabalipuram, Chennai", latitude=12.61660000, longitude=80.19270000),
    ]
    db.add_all(sites)
    db.commit()
    print(f"   ✅ Created {len(sites)} sites")


# ══════════════════════════════════════════════════════════
# 3. SUPERVISOR-SITE LINKS — FIX 1: use supervisor_sites table
# ══════════════════════════════════════════════════════════

def seed_supervisor_sites(db: Session):
    links = [
        {"supervisor_id": 1, "site_id": 1},
        {"supervisor_id": 1, "site_id": 5},
        {"supervisor_id": 1, "site_id": 10},
        {"supervisor_id": 1, "site_id": 13},
        {"supervisor_id": 1, "site_id": 14},
        {"supervisor_id": 1, "site_id": 15},
        {"supervisor_id": 1, "site_id": 16},
        {"supervisor_id": 2, "site_id": 2},
        {"supervisor_id": 2, "site_id": 3},
        {"supervisor_id": 2, "site_id": 6},
        {"supervisor_id": 2, "site_id": 11},
        {"supervisor_id": 2, "site_id": 17},
        {"supervisor_id": 2, "site_id": 18},
        {"supervisor_id": 2, "site_id": 19},
        {"supervisor_id": 3, "site_id": 4},
        {"supervisor_id": 3, "site_id": 7},
        {"supervisor_id": 3, "site_id": 8},
        {"supervisor_id": 3, "site_id": 9},
        {"supervisor_id": 3, "site_id": 12},
        {"supervisor_id": 3, "site_id": 20},
    ]

    for link in links:
        db.execute(SupervisorSite.insert().values(**link))   # FIX: was SupervisorSite

    db.commit()
    print(f"   ✅ Created {len(links)} supervisor-site links")


# ══════════════════════════════════════════════════════════
# 4. SOLVER SKILLS
# ══════════════════════════════════════════════════════════

def seed_solver_skills(db: Session):
    skills = [
        ProblemSolverSkill(solver_id=6, skill_type="plumbing", site_id=1, priority=10, is_available=True),
        ProblemSolverSkill(solver_id=6, skill_type="plumbing", site_id=None, priority=8, is_available=True),
        ProblemSolverSkill(solver_id=6, skill_type="mechanical", site_id=6, priority=7, is_available=True),
        ProblemSolverSkill(solver_id=6, skill_type="carpentry", site_id=None, priority=5, is_available=True),
        ProblemSolverSkill(solver_id=7, skill_type="electrical", site_id=2, priority=10, is_available=True),
        ProblemSolverSkill(solver_id=7, skill_type="electrical", site_id=None, priority=7, is_available=True),
        ProblemSolverSkill(solver_id=7, skill_type="network", site_id=10, priority=9, is_available=True),
        ProblemSolverSkill(solver_id=7, skill_type="network", site_id=None, priority=6, is_available=True),
        ProblemSolverSkill(solver_id=8, skill_type="hvac", site_id=3, priority=10, is_available=True),
        ProblemSolverSkill(solver_id=8, skill_type="hvac", site_id=None, priority=8, is_available=True),
        ProblemSolverSkill(solver_id=8, skill_type="mechanical", site_id=5, priority=7, is_available=True),
        ProblemSolverSkill(solver_id=8, skill_type="plumbing", site_id=8, priority=6, is_available=True),
        ProblemSolverSkill(solver_id=9, skill_type="painting", site_id=None, priority=10, is_available=True),
        ProblemSolverSkill(solver_id=9, skill_type="carpentry", site_id=4, priority=9, is_available=True),
        ProblemSolverSkill(solver_id=9, skill_type="carpentry", site_id=None, priority=7, is_available=True),
        ProblemSolverSkill(solver_id=9, skill_type="plumbing", site_id=9, priority=5, is_available=True),
        ProblemSolverSkill(solver_id=10, skill_type="electrical", site_id=7, priority=9, is_available=True),
        ProblemSolverSkill(solver_id=10, skill_type="hvac", site_id=12, priority=8, is_available=True),
        ProblemSolverSkill(solver_id=10, skill_type="mechanical", site_id=None, priority=7, is_available=True),
        ProblemSolverSkill(solver_id=10, skill_type="network", site_id=14, priority=6, is_available=False),
    ]
    db.add_all(skills)
    db.commit()
    print(f"   ✅ Created {len(skills)} solver skills")


# ══════════════════════════════════════════════════════════
# 5. ESCALATION RULES — Config table (NO issue_id)
# ══════════════════════════════════════════════════════════

def seed_escalation_rules(db: Session):
    rules = [
        EscalationRule(priority=Priority.HIGH, max_call_attempts=3, max_time_without_response=timedelta(minutes=120), escalate_to_role="manager"),
        EscalationRule(priority=Priority.HIGH, max_call_attempts=2, max_time_without_response=timedelta(minutes=45), escalate_to_role="manager"),
        EscalationRule(priority=Priority.MEDIUM, max_call_attempts=4, max_time_without_response=timedelta(hours=4), escalate_to_role="supervisor"),
        EscalationRule(priority=Priority.MEDIUM, max_call_attempts=3, max_time_without_response=timedelta(hours=2), escalate_to_role="manager"),
        EscalationRule(priority=Priority.LOW, max_call_attempts=6, max_time_without_response=timedelta(hours=8), escalate_to_role="supervisor"),
        EscalationRule(priority=Priority.LOW, max_call_attempts=5, max_time_without_response=timedelta(hours=6), escalate_to_role="manager"),
    ]
    db.add_all(rules)
    db.commit()
    print(f"   ✅ Created {len(rules)} escalation rules")


# ══════════════════════════════════════════════════════════
# 6. ISSUES — 90 issues (identical to your version)
# ══════════════════════════════════════════════════════════

def seed_issues(db: Session):
    issues = []

    completed_data = [
        (1, 1, "Pipe Leakage in Main Hall", "Major water leak from ceiling pipe joint in main hall affecting work area", Priority.HIGH, 15),
        (2, 2, "Electrical Panel Fault Block-B", "Panel B3 showing intermittent failures and tripping breakers", Priority.HIGH, 12),
        (3, 1, "AC Unit Not Cooling Properly", "Central AC in Block A not maintaining set temperature of 24°C", Priority.HIGH, 14),
        (5, 1, "Network Switch Failure", "Core network switch in server room lost connectivity", Priority.HIGH, 10),
        (4, 3, "Broken Window Conference Room", "Glass cracked in 3rd floor conference room posing safety hazard", Priority.MEDIUM, 11),
        (7, 3, "Generator Annual Maintenance", "Yearly maintenance check and oil change for backup generator", Priority.MEDIUM, 20),
        (8, 3, "Bathroom Tiles Replacement", "Cracked tiles in ground floor men's restroom need replacement", Priority.LOW, 18),
        (9, 3, "Parking Lot Light Repair", "Three parking lot lights not functioning in Zone B", Priority.LOW, 16),
        (10, 1, "Fire Alarm System Test", "Quarterly fire alarm system inspection and testing", Priority.HIGH, 8),
        (13, 2, "HVAC Duct Cleaning", "Annual cleaning of HVAC ducts in Building C", Priority.LOW, 25),
        (14, 1, "Office Wall Painting", "Repainting of reception area walls showing wear", Priority.LOW, 22),
        (15, 1, "Water Pump Motor Repair", "Main water pump motor making unusual grinding noise", Priority.HIGH, 7),
        (6, 2, "Roof Waterproofing", "Roof leaking during monsoon in warehouse section", Priority.MEDIUM, 13),
        (11, 2, "UPS Battery Replacement", "UPS system showing low battery warning for server rack", Priority.HIGH, 6),
        (12, 3, "Door Lock Replacement", "Main entrance electronic lock malfunctioning", Priority.MEDIUM, 9),
        (16, 1, "Plumbing Valve Repair Cafeteria", "Hot water valve leaking in staff cafeteria kitchen", Priority.MEDIUM, 10),
        (17, 2, "Intercom System Repair", "Intercom between floors 2 and 3 not working", Priority.LOW, 15),
        (18, 2, "Emergency Light Check", "Monthly emergency lighting inspection", Priority.MEDIUM, 12),
        (19, 3, "Conveyor Belt Alignment", "Production conveyor belt misaligned causing jams", Priority.HIGH, 5),
        (20, 3, "Air Compressor Servicing", "Routine servicing of industrial air compressor", Priority.LOW, 20),
        (3, 2, "Exhaust Fan Replacement", "Kitchen exhaust fan motor burned out", Priority.MEDIUM, 8),
        (5, 1, "Cable Tray Installation", "New cable tray needed for network expansion", Priority.LOW, 18),
        (1, 1, "Toilet Flush Mechanism Repair", "Multiple flush mechanisms broken in 2nd floor restroom", Priority.MEDIUM, 7),
        (8, 3, "Window Sealing Work", "Rain water seeping through window frames in Block D", Priority.MEDIUM, 10),
        (9, 3, "Drainage Pipe Unclogging", "Storm water drain blocked near parking entrance", Priority.HIGH, 4),
    ]

    for i, (site_id, sup_id, title, desc, priority, days_deadline) in enumerate(completed_data):
        created = days_ago(days_deadline + 5, hours=i % 12)
        issues.append(Issue(
            site_id=site_id, raised_by_supervisor_id=sup_id, title=title,
            description=desc, priority=priority, deadline_at=days_ago(days_deadline - 5),
            status=IssueStatus.COMPLETED, track_status="resolved",
            latitude=13.00 + (i * 0.003), longitude=80.20 + (i * 0.002),
            created_at=created, updated_at=days_ago(days_deadline - 6),
        ))

    in_progress_data = [
        (1, 1, "Ceiling Water Stain Repair", "Water stain expanding on 4th floor ceiling near elevator", Priority.MEDIUM, 5),
        (2, 2, "Power Socket Replacement Block-A", "Multiple sockets sparking in open office area", Priority.HIGH, 3),
        (3, 2, "Chiller Plant Vibration Issue", "Excessive vibration in chiller unit #2", Priority.HIGH, 4),
        (4, 3, "Stairwell Handrail Loose", "Handrail on fire escape stairwell wobbly and unsafe", Priority.HIGH, 2),
        (5, 1, "WiFi Access Point Replacement", "Dead zone in meeting room cluster", Priority.MEDIUM, 6),
        (6, 2, "Roller Shutter Repair Warehouse", "Motorized roller shutter stuck halfway", Priority.MEDIUM, 4),
        (7, 3, "Painting Touch-up Corridors", "Scuff marks and damage on main corridor walls", Priority.LOW, 8),
        (8, 3, "Water Heater Malfunction", "Solar water heater not heating in guest block", Priority.MEDIUM, 5),
        (9, 3, "Boundary Wall Crack Repair", "Structural crack in eastern boundary wall", Priority.HIGH, 3),
        (10, 1, "Server Room AC Backup Install", "Secondary AC unit installation for redundancy", Priority.HIGH, 4),
        (11, 2, "Forklift Hydraulic Leak", "Hydraulic fluid leaking from warehouse forklift", Priority.HIGH, 2),
        (12, 3, "False Ceiling Repair", "Ceiling tiles sagging in accounts department", Priority.MEDIUM, 6),
        (13, 2, "Transformer Oil Top-up", "Power transformer oil level below minimum mark", Priority.HIGH, 3),
        (14, 1, "Garden Irrigation Pipe Burst", "Underground irrigation pipe burst near main lawn", Priority.LOW, 7),
        (15, 1, "Security Gate Motor Repair", "Automatic gate not closing fully", Priority.MEDIUM, 4),
    ]

    for i, (site_id, sup_id, title, desc, priority, deadline_days) in enumerate(in_progress_data):
        created = days_ago(3, hours=i * 2)
        issues.append(Issue(
            site_id=site_id, raised_by_supervisor_id=sup_id, title=title,
            description=desc, priority=priority, deadline_at=days_later(deadline_days),
            status=IssueStatus.IN_PROGRESS, track_status="in_progress",
            latitude=13.00 + (i * 0.004), longitude=80.20 + (i * 0.003),
            created_at=created, updated_at=days_ago(1, hours=i),
        ))

    assigned_data = [
        (16, 1, "Pantry Microwave Repair", "Office pantry microwave not heating", Priority.LOW, 7),
        (17, 2, "Loading Dock Light Replacement", "Dock area poorly lit, safety concern", Priority.MEDIUM, 5),
        (18, 2, "AC Thermostat Calibration", "Thermostat reading 3 degrees off in server room", Priority.HIGH, 3),
        (19, 3, "Production Line Conveyor Fix", "Conveyor belt slipping under load", Priority.HIGH, 2),
        (20, 3, "Pest Control — Termite Treatment", "Termite damage found in wooden partitions", Priority.MEDIUM, 6),
        (1, 1, "Overhead Tank Cleaning", "Quarterly water tank cleaning and inspection", Priority.MEDIUM, 8),
        (2, 2, "Earthing System Check", "Annual electrical earthing resistance test", Priority.HIGH, 4),
        (3, 2, "AHU Filter Replacement", "Air handling unit filters due for replacement", Priority.MEDIUM, 5),
        (4, 3, "Wooden Door Frame Repair", "Termite-damaged door frame in storage room", Priority.LOW, 10),
        (5, 1, "CCTV Camera Realignment", "Cameras in parking area misaligned after storm", Priority.MEDIUM, 4),
        (6, 2, "Compressor Room Ventilation", "Ventilation fan failed in compressor room", Priority.HIGH, 3),
        (7, 3, "External Wall Crack Sealing", "Hairline cracks on building exterior wall", Priority.LOW, 12),
    ]

    for i, (site_id, sup_id, title, desc, priority, deadline_days) in enumerate(assigned_data):
        created = days_ago(2, hours=i * 2)
        issues.append(Issue(
            site_id=site_id, raised_by_supervisor_id=sup_id, title=title,
            description=desc, priority=priority, deadline_at=days_later(deadline_days),
            status=IssueStatus.ASSIGNED, track_status="awaiting_solver",
            latitude=13.01 + (i * 0.003), longitude=80.21 + (i * 0.002),
            created_at=created, updated_at=days_ago(1, hours=i + 5),
        ))

    open_data = [
        (8, 3, "Sewage Pump Failure", "Basement sewage pump not activating", Priority.HIGH, 3),
        (9, 3, "Parking Barrier Malfunction", "Entry barrier arm not lifting for vehicles", Priority.MEDIUM, 5),
        (10, 1, "Fiber Optic Cable Damage", "Construction crew damaged fiber line to Building E", Priority.HIGH, 2),
        (11, 2, "Roof Sheet Replacement", "Corroded roofing sheets in warehouse section", Priority.MEDIUM, 8),
        (12, 3, "Lift Motor Overheating", "Service lift motor temperature alarm triggered", Priority.HIGH, 2),
        (13, 2, "Coolant Pipe Leak Lab", "Coolant pipe leaking in R&D laboratory", Priority.HIGH, 3),
        (14, 1, "Reception Desk Repair", "Reception counter laminate peeling off", Priority.LOW, 14),
        (15, 1, "Exterior Painting Needed", "Building facade paint fading and peeling", Priority.LOW, 20),
        (16, 1, "Emergency Generator Test Fail", "Monthly generator test showed low voltage output", Priority.HIGH, 2),
        (17, 2, "Drainage Overflow Issue", "Storm drain overflowing during heavy rain", Priority.HIGH, 3),
        (18, 2, "Welding Machine Breakdown", "Production welding machine #3 not striking arc", Priority.MEDIUM, 5),
        (19, 3, "Chemical Storage Ventilation", "Exhaust fan in chemical storage room failed", Priority.HIGH, 2),
        (20, 3, "Water Softener Malfunction", "Water treatment softener not regenerating", Priority.MEDIUM, 6),
        (1, 1, "Cafeteria Sink Clogged", "Kitchen sink backing up with grey water", Priority.MEDIUM, 4),
        (2, 2, "Distribution Board Humming", "DB in Block C making buzzing noise", Priority.HIGH, 2),
    ]

    for i, (site_id, sup_id, title, desc, priority, deadline_days) in enumerate(open_data):
        created = days_ago(1, hours=i)
        issues.append(Issue(
            site_id=site_id, raised_by_supervisor_id=sup_id, title=title,
            description=desc, priority=priority, deadline_at=days_later(deadline_days),
            status=IssueStatus.OPEN, track_status="awaiting_solver",
            latitude=13.02 + (i * 0.003), longitude=80.22 + (i * 0.002),
            created_at=created, updated_at=created,
        ))

    pending_review_data = [
        (3, 2, "Boiler Pressure Valve Repair", "Pressure relief valve replaced on industrial boiler", Priority.HIGH, 4),
        (4, 3, "Floor Tile Replacement Lobby", "Broken floor tiles replaced in main lobby", Priority.MEDIUM, 6),
        (5, 1, "UPS Firmware Update", "UPS firmware upgraded to latest version", Priority.MEDIUM, 5),
        (6, 2, "Crane Wire Rope Inspection", "Overhead crane wire rope inspected and lubricated", Priority.HIGH, 3),
        (7, 3, "Wall Waterproofing Treatment", "External wall waterproof coating applied", Priority.MEDIUM, 7),
        (10, 1, "Switch Stack Configuration", "Network switch stack reconfigured after failure", Priority.HIGH, 3),
        (11, 2, "Motor Bearing Replacement", "Conveyor motor bearings replaced with SKF grade", Priority.HIGH, 4),
        (12, 3, "Ceiling Fan Speed Control Fix", "Fan regulator replaced in conference room", Priority.LOW, 8),
    ]

    for i, (site_id, sup_id, title, desc, priority, deadline_days) in enumerate(pending_review_data):
        created = days_ago(5, hours=i * 3)
        issues.append(Issue(
            site_id=site_id, raised_by_supervisor_id=sup_id, title=title,
            description=desc, priority=priority, deadline_at=days_later(deadline_days),
            status=IssueStatus.RESOLVED_PENDING_REVIEW, track_status="awaiting_review",
            latitude=13.03 + (i * 0.004), longitude=80.23 + (i * 0.003),
            created_at=created, updated_at=days_ago(1, hours=i * 2),
        ))

    reopened_data = [
        (1, 1, "Pipe Joint Still Leaking", "Previous repair failed, joint leaking again", Priority.HIGH, 3),
        (2, 2, "Electrical Short Recurring", "Same circuit breaker tripping after repair", Priority.HIGH, 2),
        (8, 3, "Water Heater Still Cold", "Solar heater repair ineffective, water still cold", Priority.MEDIUM, 4),
        (9, 3, "Boundary Wall Crack Widening", "Sealed crack reopened after settlement", Priority.HIGH, 3),
        (14, 1, "Irrigation System Leaking Again", "Previous pipe repair failed under pressure", Priority.MEDIUM, 5),
        (3, 2, "Chiller Vibration Returned", "Vibration damping fix did not hold", Priority.HIGH, 2),
        (6, 2, "Shutter Motor Burned Again", "Replacement motor burned out within a week", Priority.MEDIUM, 4),
        (11, 2, "Forklift Leak Persists", "Hydraulic seal replacement did not fix leak", Priority.HIGH, 2),
    ]

    for i, (site_id, sup_id, title, desc, priority, deadline_days) in enumerate(reopened_data):
        created = days_ago(6, hours=i * 2)
        issues.append(Issue(
            site_id=site_id, raised_by_supervisor_id=sup_id, title=title,
            description=desc, priority=priority, deadline_at=days_later(deadline_days),
            status=IssueStatus.REOPENED, track_status="in_progress",
            latitude=13.04 + (i * 0.003), longitude=80.24 + (i * 0.002),
            created_at=created, updated_at=days_ago(0, hours=i + 6),
        ))

    escalated_data = [
        (4, 3, "Lift Motor Complete Failure", "Service lift completely non-functional for 3 days", Priority.HIGH, 1),
        (7, 3, "Chemical Spill Ventilation", "Chemical storage ventilation down — safety hazard", Priority.HIGH, 1),
        (13, 2, "Transformer Overheating", "Power transformer temperature exceeding safe limits", Priority.HIGH, 1),
        (17, 2, "Drainage Flooding Basement", "Basement flooding due to blocked storm drain", Priority.HIGH, 0),
        (19, 3, "Production Line Down", "Critical conveyor failure halting production", Priority.HIGH, 0),
        (20, 3, "Fire Suppression System Fault", "Sprinkler system pressure test failed", Priority.HIGH, 1),
        (18, 2, "Welding Gas Leak Detected", "Gas leak from welding station supply line", Priority.HIGH, 0),
    ]

    for i, (site_id, sup_id, title, desc, priority, deadline_days) in enumerate(escalated_data):
        created = days_ago(4, hours=i * 3)
        issues.append(Issue(
            site_id=site_id, raised_by_supervisor_id=sup_id, title=title,
            description=desc, priority=priority, deadline_at=days_later(deadline_days),
            status=IssueStatus.ESCALATED, track_status="awaiting_review",
            latitude=13.05 + (i * 0.004), longitude=80.25 + (i * 0.003),
            created_at=created, updated_at=days_ago(0, hours=i * 2),
        ))

    db.add_all(issues)
    db.commit()
    print(f"   ✅ Created {len(issues)} issues (25C 15IP 12A 15O 8RPR 8R 7E)")


# ══════════════════════════════════════════════════════════
# 7. ASSIGNMENTS
# ══════════════════════════════════════════════════════════

def seed_assignments(db: Session):
    assignments = []
    solver_cycle = [6, 7, 8, 9, 10]

    # COMPLETED (1-25)
    for i in range(1, 26):
        issue = db.query(Issue).filter(Issue.id == i).first()
        if not issue: continue
        assignments.append(IssueAssignment(
            issue_id=i, assigned_to_solver_id=solver_cycle[(i-1) % 5],
            assigned_by_supervisor_id=issue.raised_by_supervisor_id,
            due_date=issue.deadline_at, status=AssignmentStatus.COMPLETED,
            created_at=issue.created_at + timedelta(hours=1), updated_at=issue.updated_at,
        ))

    # IN_PROGRESS (26-40)
    for i in range(26, 41):
        issue = db.query(Issue).filter(Issue.id == i).first()
        if not issue: continue
        assignments.append(IssueAssignment(
            issue_id=i, assigned_to_solver_id=solver_cycle[(i-1) % 5],
            assigned_by_supervisor_id=issue.raised_by_supervisor_id,
            due_date=issue.deadline_at, status=AssignmentStatus.ACTIVE,
            created_at=issue.created_at + timedelta(hours=1), updated_at=issue.updated_at,
        ))

    # ASSIGNED (41-52)
    for i in range(41, 53):
        issue = db.query(Issue).filter(Issue.id == i).first()
        if not issue: continue
        assignments.append(IssueAssignment(
            issue_id=i, assigned_to_solver_id=solver_cycle[(i-1) % 5],
            assigned_by_supervisor_id=issue.raised_by_supervisor_id,
            due_date=issue.deadline_at, status=AssignmentStatus.ACTIVE,
            created_at=issue.created_at + timedelta(hours=2), updated_at=issue.updated_at,
        ))

    # RESOLVED_PENDING_REVIEW (68-75)
    for i in range(68, 76):
        issue = db.query(Issue).filter(Issue.id == i).first()
        if not issue: continue
        assignments.append(IssueAssignment(
            issue_id=i, assigned_to_solver_id=solver_cycle[(i-1) % 5],
            assigned_by_supervisor_id=issue.raised_by_supervisor_id,
            due_date=issue.deadline_at, status=AssignmentStatus.ACTIVE,
            created_at=issue.created_at + timedelta(hours=1), updated_at=issue.updated_at,
        ))

    # REOPENED (76-83)
    for i in range(76, 84):
        issue = db.query(Issue).filter(Issue.id == i).first()
        if not issue: continue
        assignments.append(IssueAssignment(
            issue_id=i, assigned_to_solver_id=solver_cycle[(i-1) % 5],
            assigned_by_supervisor_id=issue.raised_by_supervisor_id,
            due_date=issue.deadline_at, status=AssignmentStatus.REOPENED,
            created_at=issue.created_at + timedelta(hours=1), updated_at=issue.updated_at,
        ))

    # ESCALATED (84-90)
    for i in range(84, 91):
        issue = db.query(Issue).filter(Issue.id == i).first()
        if not issue: continue
        assignments.append(IssueAssignment(
            issue_id=i, assigned_to_solver_id=solver_cycle[(i-1) % 5],
            assigned_by_supervisor_id=issue.raised_by_supervisor_id,
            due_date=issue.deadline_at, status=AssignmentStatus.ACTIVE,
            created_at=issue.created_at + timedelta(hours=1), updated_at=issue.updated_at,
        ))

    db.add_all(assignments)
    db.commit()
    print(f"   ✅ Created {len(assignments)} assignments")


# ══════════════════════════════════════════════════════════
# 8. CALL LOGS
# ══════════════════════════════════════════════════════════

def seed_call_logs(db: Session):
    call_logs = []
    all_assignments = db.query(IssueAssignment).all()

    for a in all_assignments:
        bt = a.created_at + timedelta(minutes=5)

        if a.status == AssignmentStatus.COMPLETED:
            call_logs.append(CallLog(assignment_id=a.id, solver_id=a.assigned_to_solver_id, attempt_number=1, initiated_at=bt, status=CallStatus.MISSED))
            call_logs.append(CallLog(assignment_id=a.id, solver_id=a.assigned_to_solver_id, attempt_number=2, initiated_at=bt + timedelta(hours=2), answered_at=bt + timedelta(hours=2, seconds=15), ended_at=bt + timedelta(hours=2, minutes=3), status=CallStatus.ANSWERED))

        elif a.status == AssignmentStatus.ACTIVE:
            if a.id % 3 == 0:
                call_logs.append(CallLog(assignment_id=a.id, solver_id=a.assigned_to_solver_id, attempt_number=1, initiated_at=bt, answered_at=bt + timedelta(seconds=10), ended_at=bt + timedelta(minutes=2), status=CallStatus.ANSWERED))
            else:
                call_logs.append(CallLog(assignment_id=a.id, solver_id=a.assigned_to_solver_id, attempt_number=1, initiated_at=bt, status=CallStatus.MISSED))
                call_logs.append(CallLog(assignment_id=a.id, solver_id=a.assigned_to_solver_id, attempt_number=2, initiated_at=bt + timedelta(hours=2), answered_at=bt + timedelta(hours=2, seconds=20), ended_at=bt + timedelta(hours=2, minutes=4), status=CallStatus.ANSWERED))

        elif a.status == AssignmentStatus.REOPENED:
            for attempt in range(1, 5):
                is_last = attempt == 4
                call_logs.append(CallLog(
                    assignment_id=a.id, solver_id=a.assigned_to_solver_id, attempt_number=attempt,
                    initiated_at=bt + timedelta(hours=2 * (attempt - 1)),
                    answered_at=bt + timedelta(hours=2 * (attempt-1), seconds=12) if is_last else None,
                    ended_at=bt + timedelta(hours=2 * (attempt-1), minutes=2) if is_last else None,
                    status=CallStatus.ANSWERED if is_last else CallStatus.MISSED,
                ))

    db.add_all(call_logs)
    db.commit()
    print(f"   ✅ Created {len(call_logs)} call logs")


# ══════════════════════════════════════════════════════════
# 9. ISSUE IMAGES
# ══════════════════════════════════════════════════════════

def seed_issue_images(db: Session):
    images = []
    all_issues = db.query(Issue).all()

    for issue in all_issues:
        images.append(IssueImage(
            issue_id=issue.id, uploaded_by_user_id=issue.raised_by_supervisor_id,
            image_url=f"https://ik.imagekit.io/facility/issues/{issue.id}/before-{issue.id}.jpg",
            image_type=ImageType.BEFORE, ai_flag=AIFlag.NOT_CHECKED, ai_details={},
            created_at=issue.created_at, updated_at=issue.created_at,
        ))

    after_ids = list(range(1, 26)) + list(range(68, 76))
    solver_cycle = [6, 7, 8, 9, 10]

    for idx, iid in enumerate(after_ids):
        conf = 0.88 + (idx % 10) * 0.012
        flag = AIFlag.OK if conf > 0.85 else AIFlag.SUSPECT
        images.append(IssueImage(
            issue_id=iid, uploaded_by_user_id=solver_cycle[idx % 5],
            image_url=f"https://ik.imagekit.io/facility/issues/{iid}/after-{iid}.jpg",
            image_type=ImageType.AFTER, ai_flag=flag,
            ai_details={"confidence": round(conf, 3), "repair_visible": True},
            created_at=days_ago(2, hours=idx), updated_at=days_ago(2, hours=idx),
        ))

    db.add_all(images)
    db.commit()
    print(f"   ✅ Created {len(images)} images")


# ══════════════════════════════════════════════════════════
# 10. COMPLAINTS
# ══════════════════════════════════════════════════════════

def seed_complaints(db: Session):
    complaints_data = [
        (76, "Pipe joint still leaking after repair", "https://ik.imagekit.io/facility/complaints/76.jpg"),
        (77, "Same circuit breaker tripping within hours", None),
        (78, "Water heater still not producing hot water", "https://ik.imagekit.io/facility/complaints/78.jpg"),
        (79, "Boundary wall crack widened after sealing", "https://ik.imagekit.io/facility/complaints/79.jpg"),
        (80, "Irrigation pipe leaking again at same joint", None),
        (81, "Chiller vibration returned worse than before", "https://ik.imagekit.io/facility/complaints/81.jpg"),
        (82, "Shutter motor burned out again within one week", None),
        (83, "Forklift hydraulic leak persists", "https://ik.imagekit.io/facility/complaints/83.jpg"),
        (84, "Lift non-functional for 3 days, no response", "https://ik.imagekit.io/facility/complaints/84.jpg"),
        (85, "Chemical storage ventilation still down", None),
        (86, "Transformer still overheating", "https://ik.imagekit.io/facility/complaints/86.jpg"),
        (87, "Basement still flooding", None),
        (88, "Production line still down", "https://ik.imagekit.io/facility/complaints/88.jpg"),
        (89, "Fire suppression system still faulty", None),
        (90, "Welding gas leak not fully sealed", "https://ik.imagekit.io/facility/complaints/90.jpg"),
        (1, "Pipe repair looks patchy", None),
        (2, "Electrical panel cover not secured", "https://ik.imagekit.io/facility/complaints/2.jpg"),
        (5, "Network still dropping intermittently", None),
        (10, "Fire alarm sensor response slow", "https://ik.imagekit.io/facility/complaints/10.jpg"),
        (15, "Water pump still making noise", None),
        (27, "Power socket using low-quality parts", "https://ik.imagekit.io/facility/complaints/27.jpg"),
        (30, "Handrail repair not following standards", None),
        (35, "Forklift repair taking too long", "https://ik.imagekit.io/facility/complaints/35.jpg"),
        (37, "Transformer work seems rushed", None),
        (68, "Boiler pressure gauge reading off", "https://ik.imagekit.io/facility/complaints/68.jpg"),
        (70, "UPS battery backup time decreased", None),
        (71, "Crane rope inspection report incomplete", "https://ik.imagekit.io/facility/complaints/71.jpg"),
        (73, "Switch config causing intermittent drops", None),
        (74, "Motor bearings alignment off", "https://ik.imagekit.io/facility/complaints/74.jpg"),
        (75, "Fan speed control making humming noise", None),
    ]

    complaints = []
    for idx, (issue_id, details, img_url) in enumerate(complaints_data):
        issue = db.query(Issue).filter(Issue.id == issue_id).first()
        if not issue: continue
        assignment = db.query(IssueAssignment).filter(IssueAssignment.issue_id == issue_id).order_by(IssueAssignment.created_at.desc()).first()
        if not assignment: continue
        complaints.append(Complaint(
            issue_id=issue_id, assignment_id=assignment.id,
            raised_by_supervisor_id=issue.raised_by_supervisor_id,
            target_solver_id=assignment.assigned_to_solver_id,
            complaint_details=details, complaint_image_url=img_url,
            created_at=days_ago(1, hours=idx), updated_at=days_ago(1, hours=idx),
        ))

    db.add_all(complaints)
    db.commit()
    print(f"   ✅ Created {len(complaints)} complaints")


# ══════════════════════════════════════════════════════════
# 11. ISSUE HISTORY
# ══════════════════════════════════════════════════════════

def seed_issue_history(db: Session):
    history = []
    for issue in db.query(Issue).all():
        history.append(IssueHistory(issue_id=issue.id, changed_by_user_id=issue.raised_by_supervisor_id, old_status=None, new_status="OPEN", action_type=ActionType.ASSIGN, details="Issue created via chat", created_at=issue.created_at, updated_at=issue.created_at))

        if issue.status != IssueStatus.OPEN:
            history.append(IssueHistory(issue_id=issue.id, changed_by_user_id=issue.raised_by_supervisor_id, old_status="OPEN", new_status="ASSIGNED", action_type=ActionType.ASSIGN, details="Solver auto-assigned", created_at=issue.created_at + timedelta(hours=1), updated_at=issue.created_at + timedelta(hours=1)))

        if issue.status in [IssueStatus.IN_PROGRESS, IssueStatus.COMPLETED, IssueStatus.RESOLVED_PENDING_REVIEW, IssueStatus.REOPENED, IssueStatus.ESCALATED]:
            history.append(IssueHistory(issue_id=issue.id, changed_by_user_id=None, old_status="ASSIGNED", new_status="IN_PROGRESS", action_type=ActionType.UPDATE, details="Solver started work", created_at=issue.created_at + timedelta(hours=3), updated_at=issue.created_at + timedelta(hours=3)))

        if issue.status == IssueStatus.COMPLETED:
            history.append(IssueHistory(issue_id=issue.id, changed_by_user_id=issue.raised_by_supervisor_id, old_status="RESOLVED_PENDING_REVIEW", new_status="COMPLETED", action_type=ActionType.COMPLETE, details="Supervisor approved", created_at=issue.updated_at, updated_at=issue.updated_at))

        if issue.status == IssueStatus.REOPENED:
            history.append(IssueHistory(issue_id=issue.id, changed_by_user_id=issue.raised_by_supervisor_id, old_status="RESOLVED_PENDING_REVIEW", new_status="REOPENED", action_type=ActionType.COMPLAINT, details="Complaint filed — work unsatisfactory", created_at=issue.updated_at - timedelta(hours=1), updated_at=issue.updated_at - timedelta(hours=1)))

        if issue.status == IssueStatus.ESCALATED:
            history.append(IssueHistory(issue_id=issue.id, changed_by_user_id=None, old_status="IN_PROGRESS", new_status="ESCALATED", action_type=ActionType.UPDATE, details="System escalated — no response", created_at=issue.updated_at, updated_at=issue.updated_at))

    db.add_all(history)
    db.commit()
    print(f"   ✅ Created {len(history)} history entries")


# ══════════════════════════════════════════════════════════
# 12. CHAT HISTORY
# ══════════════════════════════════════════════════════════

def seed_chat_history(db: Session):
    messages = []

    chats = [
        (1, 1, "pipe broken in vepery site need to fix in 5 days", "✅ Issue #1 created: 'Pipe Leakage'. Solver Ramesh assigned."),
        (2, 2, "electrical panel fault in ambattur, urgent", "✅ Issue #2 created: 'Electrical Panel Fault'. Priority: HIGH."),
        (3, 1, "AC not cooling in guindy factory", "✅ Issue #3 created: 'AC Unit Not Cooling'. Solver Mohan assigned."),
        (4, 3, "broken window in perungudi conference room", "✅ Issue #4 created: 'Broken Window'. Solver Kavitha assigned."),
        (5, 1, "network switch down in taramani, critical!", "✅ Issue #5 created: 'Network Switch Failure'. Priority: HIGH."),
    ]

    for issue_id, sup_id, user_msg, ai_msg in chats:
        issue = db.query(Issue).filter(Issue.id == issue_id).first()
        if not issue: continue
        messages.append(ChatHistory(user_id=sup_id, issue_id=issue_id, role_in_chat=ChatRole.USER, message=user_msg, attachments=[], created_at=issue.created_at, updated_at=issue.created_at))
        messages.append(ChatHistory(user_id=None, issue_id=issue_id, role_in_chat=ChatRole.AI, message=ai_msg, attachments=[], created_at=issue.created_at + timedelta(seconds=3), updated_at=issue.created_at + timedelta(seconds=3)))

    solver_updates = [(6, 26, "Started ceiling water stain repair"), (7, 27, "Working on power socket replacement"), (8, 28, "Inspecting chiller vibration"), (9, 29, "Started handrail repair"), (10, 30, "Replacing WiFi access point")]
    for sid, iid, msg in solver_updates:
        messages.append(ChatHistory(user_id=sid, issue_id=iid, role_in_chat=ChatRole.USER, message=msg, attachments=[], created_at=days_ago(2, hours=sid), updated_at=days_ago(2, hours=sid)))
        messages.append(ChatHistory(user_id=None, issue_id=iid, role_in_chat=ChatRole.AI, message=f"✅ Issue #{iid} updated to IN_PROGRESS.", attachments=[], created_at=days_ago(2, hours=sid) + timedelta(seconds=2), updated_at=days_ago(2, hours=sid) + timedelta(seconds=2)))

    complaint_chats = [(1, 76, "work not done properly, still leaking"), (2, 77, "electrical short is back again"), (3, 78, "water heater repair didn't work")]
    for sup, iid, msg in complaint_chats:
        messages.append(ChatHistory(user_id=sup, issue_id=iid, role_in_chat=ChatRole.USER, message=msg, attachments=[], created_at=days_ago(1, hours=sup+3), updated_at=days_ago(1, hours=sup+3)))
        messages.append(ChatHistory(user_id=None, issue_id=iid, role_in_chat=ChatRole.AI, message=f"⚠️ Complaint filed for Issue #{iid}. Reopened.", attachments=[], created_at=days_ago(1, hours=sup+3) + timedelta(seconds=3), updated_at=days_ago(1, hours=sup+3) + timedelta(seconds=3)))

    for iid in range(84, 91):
        messages.append(ChatHistory(user_id=None, issue_id=iid, role_in_chat=ChatRole.SYSTEM, message=f"⚠️ ESCALATION: Issue #{iid} escalated to manager.", attachments=[], created_at=days_ago(0, hours=iid-83), updated_at=days_ago(0, hours=iid-83)))

    general = [(1, None, "what are my open issues?", "📋 You have 8 open issues."), (4, None, "show escalated issues", "⚠️ 7 escalated issues."), (6, None, "what is my assignment?", "👷 4 active assignments.")]
    for uid, iid, umsg, amsg in general:
        messages.append(ChatHistory(user_id=uid, issue_id=iid, role_in_chat=ChatRole.USER, message=umsg, attachments=[], created_at=days_ago(0, hours=3), updated_at=days_ago(0, hours=3)))
        messages.append(ChatHistory(user_id=None, issue_id=iid, role_in_chat=ChatRole.AI, message=amsg, attachments=[], created_at=days_ago(0, hours=3) + timedelta(seconds=2), updated_at=days_ago(0, hours=3) + timedelta(seconds=2)))

    db.add_all(messages)
    db.commit()
    print(f"   ✅ Created {len(messages)} chat messages")


# ══════════════════════════════════════════════════════════
# 13. ESCALATIONS — FIX 3: Use Escalation model, NOT EscalationRule
# ══════════════════════════════════════════════════════════

def seed_escalations(db: Session):
    """
    Creates ESCALATION EVENT records using the Escalation model.
    NOT EscalationRule (that's the config table).
    """
    escalations = []

    # NO_RESPONSE escalations for ESCALATED issues (84-90)
    for issue_id in range(84, 91):
        assignment = db.query(IssueAssignment).filter(IssueAssignment.issue_id == issue_id).first()
        if not assignment: continue

        escalations.append(Escalation(                          # FIX: was EscalationRule
            issue_id=issue_id,
            assignment_id=assignment.id,
            escalation_type="NO_RESPONSE",
            escalated_to_role="manager",
            escalated_by_user_id=None,
            reason=f"Solver failed to answer {3 + (issue_id % 3)} calls over {2 + (issue_id % 4)} hours",
            total_missed_calls=3 + (issue_id % 3),
            time_elapsed_without_response=timedelta(hours=2 + (issue_id % 4)),
            notification_sent=True,
            notification_sent_at=days_ago(0, hours=issue_id - 83),
            resolved=False,
            resolved_at=None,
            created_at=days_ago(0, hours=issue_id - 82),
            updated_at=days_ago(0, hours=issue_id - 83),
        ))

    # DEADLINE_APPROACHING for some IN_PROGRESS issues
    for issue_id in [26, 29, 34, 37, 40]:
        issue = db.query(Issue).filter(Issue.id == issue_id).first()
        if not issue: continue
        assignment = db.query(IssueAssignment).filter(IssueAssignment.issue_id == issue_id).first()
        hours_remaining = 18.5 + (issue_id % 6)

        escalations.append(Escalation(                          # FIX: was EscalationRule
            issue_id=issue_id,
            assignment_id=assignment.id if assignment else None,
            escalation_type="DEADLINE_APPROACHING",
            escalated_to_role="manager",
            escalated_by_user_id=None,
            reason=f"Deadline in {hours_remaining:.1f}h, status still {issue.status.value}",
            total_missed_calls=None,
            time_elapsed_without_response=None,
            notification_sent=True,
            notification_sent_at=days_ago(0, hours=2),
            resolved=False,
            resolved_at=None,
            created_at=days_ago(0, hours=3),
            updated_at=days_ago(0, hours=2),
        ))

    # Resolved historical escalations
    for issue_id, esc_type, reason in [(1, "NO_RESPONSE", "Solver responded after 4 attempts"), (5, "NO_RESPONSE", "Solver answered on 3rd call"), (10, "DEADLINE_APPROACHING", "Completed before deadline")]:
        assignment = db.query(IssueAssignment).filter(IssueAssignment.issue_id == issue_id).first()
        escalations.append(Escalation(                          # FIX: was EscalationRule
            issue_id=issue_id,
            assignment_id=assignment.id if assignment else None,
            escalation_type=esc_type,
            escalated_to_role="manager",
            escalated_by_user_id=None,
            reason=reason,
            total_missed_calls=3 if esc_type == "NO_RESPONSE" else None,
            time_elapsed_without_response=timedelta(hours=3) if esc_type == "NO_RESPONSE" else None,
            notification_sent=True,
            notification_sent_at=days_ago(10),
            resolved=True,
            resolved_at=days_ago(9),
            created_at=days_ago(10, hours=1),
            updated_at=days_ago(9),
        ))

    db.add_all(escalations)
    db.commit()
    print(f"   ✅ Created {len(escalations)} escalation events")


# ══════════════════════════════════════════════════════════
# ENTRY POINT
# ══════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("=" * 60)
    print("🏗️  FACILITY MANAGEMENT SYSTEM — Database Seeder")
    print("=" * 60)
    print()
    print("📦 Ensuring database tables exist...")
    Base.metadata.create_all(bind=engine)
    print("   ✅ Tables verified\n")
    seed_database()