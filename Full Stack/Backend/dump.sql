--
-- PostgreSQL database dump
--

\restrict eL0Df3GUIqRyASgX3l3bCOHwbgtFIo0xscgIMjPUVzSyhCTXZcUNjgrumPXzZ0v

-- Dumped from database version 17.8
-- Dumped by pg_dump version 17.8

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: action_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.action_type_enum AS ENUM (
    'ASSIGN',
    'UPDATE',
    'COMPLETE',
    'REOPEN',
    'COMPLAINT'
);


ALTER TYPE public.action_type_enum OWNER TO postgres;

--
-- Name: ai_flag_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.ai_flag_enum AS ENUM (
    'OK',
    'SUSPECT',
    'NOT_CHECKED'
);


ALTER TYPE public.ai_flag_enum OWNER TO postgres;

--
-- Name: assignment_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.assignment_status_enum AS ENUM (
    'ACTIVE',
    'COMPLETED',
    'REOPENED'
);


ALTER TYPE public.assignment_status_enum OWNER TO postgres;

--
-- Name: call_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.call_status_enum AS ENUM (
    'INITIATED',
    'MISSED',
    'ANSWERED'
);


ALTER TYPE public.call_status_enum OWNER TO postgres;

--
-- Name: chat_role_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.chat_role_enum AS ENUM (
    'USER',
    'AI',
    'SYSTEM'
);


ALTER TYPE public.chat_role_enum OWNER TO postgres;

--
-- Name: image_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.image_type_enum AS ENUM (
    'BEFORE',
    'AFTER'
);


ALTER TYPE public.image_type_enum OWNER TO postgres;

--
-- Name: issue_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.issue_status_enum AS ENUM (
    'OPEN',
    'ASSIGNED',
    'IN_PROGRESS',
    'RESOLVED_PENDING_REVIEW',
    'COMPLETED',
    'REOPENED',
    'ESCALATED'
);


ALTER TYPE public.issue_status_enum OWNER TO postgres;

--
-- Name: priority_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.priority_enum AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH'
);


ALTER TYPE public.priority_enum OWNER TO postgres;

--
-- Name: user_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_role AS ENUM (
    'SUPERVISOR',
    'PROBLEMSOLVER',
    'MANAGER'
);


ALTER TYPE public.user_role OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


ALTER TABLE public.alembic_version OWNER TO postgres;

--
-- Name: call_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.call_logs (
    id integer NOT NULL,
    assignment_id integer NOT NULL,
    solver_id integer NOT NULL,
    attempt_number integer NOT NULL,
    initiated_at timestamp with time zone NOT NULL,
    answered_at timestamp with time zone,
    ended_at timestamp with time zone,
    status public.call_status_enum NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.call_logs OWNER TO postgres;

--
-- Name: COLUMN call_logs.assignment_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.call_logs.assignment_id IS 'Links call to the specific assignment';


--
-- Name: COLUMN call_logs.solver_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.call_logs.solver_id IS 'The problem solver who was called';


--
-- Name: COLUMN call_logs.attempt_number; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.call_logs.attempt_number IS 'Retry sequence: 1, 2, 3...';


--
-- Name: COLUMN call_logs.initiated_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.call_logs.initiated_at IS 'When the Twilio call was placed';


--
-- Name: COLUMN call_logs.answered_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.call_logs.answered_at IS 'When solver picked up (NULL if missed)';


--
-- Name: COLUMN call_logs.ended_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.call_logs.ended_at IS 'When call terminated (NULL if still ongoing)';


--
-- Name: COLUMN call_logs.status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.call_logs.status IS 'INITIATED | MISSED | ANSWERED';


--
-- Name: call_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.call_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.call_logs_id_seq OWNER TO postgres;

--
-- Name: call_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.call_logs_id_seq OWNED BY public.call_logs.id;


--
-- Name: chat_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chat_history (
    id integer NOT NULL,
    user_id integer,
    issue_id integer,
    role_in_chat public.chat_role_enum NOT NULL,
    message text NOT NULL,
    attachments jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.chat_history OWNER TO postgres;

--
-- Name: COLUMN chat_history.user_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.chat_history.user_id IS 'NULL for SYSTEM or AI messages';


--
-- Name: COLUMN chat_history.issue_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.chat_history.issue_id IS 'NULL for general chat not tied to an issue';


--
-- Name: COLUMN chat_history.role_in_chat; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.chat_history.role_in_chat IS 'USER | AI | SYSTEM';


--
-- Name: COLUMN chat_history.message; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.chat_history.message IS 'Message content';


--
-- Name: COLUMN chat_history.attachments; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.chat_history.attachments IS 'Array of file URLs: ["s3://bucket/photo.jpg"]';


--
-- Name: chat_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.chat_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.chat_history_id_seq OWNER TO postgres;

--
-- Name: chat_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.chat_history_id_seq OWNED BY public.chat_history.id;


--
-- Name: complaints; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.complaints (
    id integer NOT NULL,
    issue_id integer NOT NULL,
    assignment_id integer NOT NULL,
    raised_by_supervisor_id integer NOT NULL,
    target_solver_id integer NOT NULL,
    complaint_details text NOT NULL,
    complaint_image_url character varying(500),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.complaints OWNER TO postgres;

--
-- Name: COLUMN complaints.raised_by_supervisor_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.complaints.raised_by_supervisor_id IS 'Supervisor who filed the complaint';


--
-- Name: COLUMN complaints.target_solver_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.complaints.target_solver_id IS 'Solver whose work is being contested';


--
-- Name: COLUMN complaints.complaint_details; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.complaints.complaint_details IS 'Description of what is wrong with the repair';


--
-- Name: COLUMN complaints.complaint_image_url; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.complaints.complaint_image_url IS 'Optional evidence photo URL';


--
-- Name: complaints_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.complaints_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.complaints_id_seq OWNER TO postgres;

--
-- Name: complaints_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.complaints_id_seq OWNED BY public.complaints.id;


--
-- Name: escalation_rules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.escalation_rules (
    id integer NOT NULL,
    priority public.priority_enum NOT NULL,
    max_call_attempts integer NOT NULL,
    max_time_without_response interval NOT NULL,
    escalate_to_role character varying(50) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.escalation_rules OWNER TO postgres;

--
-- Name: escalation_rules_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.escalation_rules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.escalation_rules_id_seq OWNER TO postgres;

--
-- Name: escalation_rules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.escalation_rules_id_seq OWNED BY public.escalation_rules.id;


--
-- Name: escalations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.escalations (
    id integer NOT NULL,
    issue_id integer NOT NULL,
    assignment_id integer,
    escalation_type character varying(30) NOT NULL,
    escalated_to_role character varying(20) NOT NULL,
    escalated_by_user_id integer,
    reason text NOT NULL,
    total_missed_calls integer,
    time_elapsed_without_response interval,
    notification_sent boolean NOT NULL,
    notification_sent_at timestamp with time zone,
    resolved boolean NOT NULL,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.escalations OWNER TO postgres;

--
-- Name: escalations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.escalations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.escalations_id_seq OWNER TO postgres;

--
-- Name: escalations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.escalations_id_seq OWNED BY public.escalations.id;


--
-- Name: issue_assignments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.issue_assignments (
    id integer NOT NULL,
    issue_id integer NOT NULL,
    assigned_to_solver_id integer NOT NULL,
    assigned_by_supervisor_id integer NOT NULL,
    due_date timestamp with time zone,
    status public.assignment_status_enum NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.issue_assignments OWNER TO postgres;

--
-- Name: issue_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.issue_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.issue_assignments_id_seq OWNER TO postgres;

--
-- Name: issue_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.issue_assignments_id_seq OWNED BY public.issue_assignments.id;


--
-- Name: issue_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.issue_history (
    id integer NOT NULL,
    issue_id integer NOT NULL,
    changed_by_user_id integer,
    old_status character varying(50),
    new_status character varying(50),
    action_type public.action_type_enum NOT NULL,
    details text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.issue_history OWNER TO postgres;

--
-- Name: COLUMN issue_history.changed_by_user_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.issue_history.changed_by_user_id IS 'User who made the change (NULL for system actions)';


--
-- Name: COLUMN issue_history.old_status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.issue_history.old_status IS 'Previous status (NULL for creation)';


--
-- Name: COLUMN issue_history.new_status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.issue_history.new_status IS 'New status after the action';


--
-- Name: COLUMN issue_history.action_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.issue_history.action_type IS 'ASSIGN | UPDATE | COMPLETE | REOPEN | COMPLAINT';


--
-- Name: COLUMN issue_history.details; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.issue_history.details IS 'Human-readable description of what happened';


--
-- Name: issue_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.issue_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.issue_history_id_seq OWNER TO postgres;

--
-- Name: issue_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.issue_history_id_seq OWNED BY public.issue_history.id;


--
-- Name: issue_images; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.issue_images (
    id integer NOT NULL,
    issue_id integer NOT NULL,
    uploaded_by_user_id integer NOT NULL,
    image_url character varying(500) NOT NULL,
    image_type public.image_type_enum NOT NULL,
    ai_flag public.ai_flag_enum NOT NULL,
    ai_details jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.issue_images OWNER TO postgres;

--
-- Name: COLUMN issue_images.issue_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.issue_images.issue_id IS 'Which issue this image belongs to';


--
-- Name: COLUMN issue_images.uploaded_by_user_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.issue_images.uploaded_by_user_id IS 'Supervisor (BEFORE) or solver (AFTER)';


--
-- Name: COLUMN issue_images.image_url; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.issue_images.image_url IS 'ImageKit CDN URL';


--
-- Name: COLUMN issue_images.image_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.issue_images.image_type IS 'BEFORE = initial problem photo, AFTER = completion photo';


--
-- Name: COLUMN issue_images.ai_flag; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.issue_images.ai_flag IS 'OK | SUSPECT | NOT_CHECKED — AI verification result';


--
-- Name: COLUMN issue_images.ai_details; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.issue_images.ai_details IS 'AI analysis: {"confidence": 0.92, "leak_detected": false}';


--
-- Name: issue_images_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.issue_images_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.issue_images_id_seq OWNER TO postgres;

--
-- Name: issue_images_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.issue_images_id_seq OWNED BY public.issue_images.id;


--
-- Name: issues; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.issues (
    id integer NOT NULL,
    site_id integer NOT NULL,
    raised_by_supervisor_id integer NOT NULL,
    title character varying(200) NOT NULL,
    description text NOT NULL,
    priority public.priority_enum NOT NULL,
    deadline_at timestamp with time zone,
    status public.issue_status_enum NOT NULL,
    track_status character varying(100),
    latitude numeric(10,8),
    longitude numeric(11,8),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.issues OWNER TO postgres;

--
-- Name: issues_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.issues_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.issues_id_seq OWNER TO postgres;

--
-- Name: issues_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.issues_id_seq OWNED BY public.issues.id;


--
-- Name: problem_solver_skills; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.problem_solver_skills (
    id integer NOT NULL,
    solver_id integer NOT NULL,
    skill_type character varying(50) NOT NULL,
    site_id integer,
    priority integer NOT NULL,
    is_available boolean NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.problem_solver_skills OWNER TO postgres;

--
-- Name: COLUMN problem_solver_skills.solver_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.problem_solver_skills.solver_id IS 'The problem solver';


--
-- Name: COLUMN problem_solver_skills.skill_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.problem_solver_skills.skill_type IS 'plumber, electrician, hvac, carpentry, painting, network, mechanical, etc.';


--
-- Name: COLUMN problem_solver_skills.site_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.problem_solver_skills.site_id IS 'NULL = works at all sites';


--
-- Name: COLUMN problem_solver_skills.priority; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.problem_solver_skills.priority IS '1-10 scale, higher = preferred solver for this skill+site';


--
-- Name: COLUMN problem_solver_skills.is_available; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.problem_solver_skills.is_available IS 'FALSE when solver is on leave or unavailable';


--
-- Name: problem_solver_skills_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.problem_solver_skills_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.problem_solver_skills_id_seq OWNER TO postgres;

--
-- Name: problem_solver_skills_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.problem_solver_skills_id_seq OWNED BY public.problem_solver_skills.id;


--
-- Name: sites; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sites (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    location character varying(200),
    latitude numeric(10,8),
    longitude numeric(11,8),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.sites OWNER TO postgres;

--
-- Name: COLUMN sites.name; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.sites.name IS 'Site identification name';


--
-- Name: COLUMN sites.location; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.sites.location IS 'Human-readable address';


--
-- Name: COLUMN sites.latitude; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.sites.latitude IS 'GPS latitude for location matching';


--
-- Name: COLUMN sites.longitude; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.sites.longitude IS 'GPS longitude for location matching';


--
-- Name: sites_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sites_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sites_id_seq OWNER TO postgres;

--
-- Name: sites_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sites_id_seq OWNED BY public.sites.id;


--
-- Name: supervisor_sites; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.supervisor_sites (
    supervisor_id integer NOT NULL,
    site_id integer NOT NULL,
    is_active boolean
);


ALTER TABLE public.supervisor_sites OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    phone character varying(20) NOT NULL,
    email character varying(100),
    role public.user_role NOT NULL,
    is_active boolean NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: COLUMN users.phone; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.phone IS 'Used for authentication and Twilio calling';


--
-- Name: COLUMN users.email; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.email IS 'Used for escalation email notifications';


--
-- Name: COLUMN users.role; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.role IS 'supervisor | problemsolver | manager';


--
-- Name: COLUMN users.is_active; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.is_active IS 'Soft delete / deactivation flag';


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: call_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.call_logs ALTER COLUMN id SET DEFAULT nextval('public.call_logs_id_seq'::regclass);


--
-- Name: chat_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_history ALTER COLUMN id SET DEFAULT nextval('public.chat_history_id_seq'::regclass);


--
-- Name: complaints id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.complaints ALTER COLUMN id SET DEFAULT nextval('public.complaints_id_seq'::regclass);


--
-- Name: escalation_rules id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.escalation_rules ALTER COLUMN id SET DEFAULT nextval('public.escalation_rules_id_seq'::regclass);


--
-- Name: escalations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.escalations ALTER COLUMN id SET DEFAULT nextval('public.escalations_id_seq'::regclass);


--
-- Name: issue_assignments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.issue_assignments ALTER COLUMN id SET DEFAULT nextval('public.issue_assignments_id_seq'::regclass);


--
-- Name: issue_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.issue_history ALTER COLUMN id SET DEFAULT nextval('public.issue_history_id_seq'::regclass);


--
-- Name: issue_images id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.issue_images ALTER COLUMN id SET DEFAULT nextval('public.issue_images_id_seq'::regclass);


--
-- Name: issues id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.issues ALTER COLUMN id SET DEFAULT nextval('public.issues_id_seq'::regclass);


--
-- Name: problem_solver_skills id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.problem_solver_skills ALTER COLUMN id SET DEFAULT nextval('public.problem_solver_skills_id_seq'::regclass);


--
-- Name: sites id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sites ALTER COLUMN id SET DEFAULT nextval('public.sites_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.alembic_version (version_num) FROM stdin;
d0d28cd50e50
\.


--
-- Data for Name: call_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.call_logs (id, assignment_id, solver_id, attempt_number, initiated_at, answered_at, ended_at, status, updated_at) FROM stdin;
1	1	6	1	2026-01-31 17:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
2	1	6	2	2026-01-31 19:00:13.703505+05:30	2026-01-31 19:00:28.703505+05:30	2026-01-31 19:03:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
3	2	7	1	2026-02-03 16:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
4	2	7	2	2026-02-03 18:00:13.703505+05:30	2026-02-03 18:00:28.703505+05:30	2026-02-03 18:03:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
5	3	8	1	2026-02-01 15:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
6	3	8	2	2026-02-01 17:00:13.703505+05:30	2026-02-01 17:00:28.703505+05:30	2026-02-01 17:03:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
7	4	9	1	2026-02-05 14:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
8	4	9	2	2026-02-05 16:00:13.703505+05:30	2026-02-05 16:00:28.703505+05:30	2026-02-05 16:03:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
9	5	10	1	2026-02-04 13:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
10	5	10	2	2026-02-04 15:00:13.703505+05:30	2026-02-04 15:00:28.703505+05:30	2026-02-04 15:03:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
11	6	6	1	2026-01-26 12:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
12	6	6	2	2026-01-26 14:00:13.703505+05:30	2026-01-26 14:00:28.703505+05:30	2026-01-26 14:03:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
13	7	7	1	2026-01-28 11:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
14	7	7	2	2026-01-28 13:00:13.703505+05:30	2026-01-28 13:00:28.703505+05:30	2026-01-28 13:03:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
15	8	8	1	2026-01-30 10:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
16	8	8	2	2026-01-30 12:00:13.703505+05:30	2026-01-30 12:00:28.703505+05:30	2026-01-30 12:03:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
17	9	9	1	2026-02-07 09:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
18	9	9	2	2026-02-07 11:00:13.703505+05:30	2026-02-07 11:00:28.703505+05:30	2026-02-07 11:03:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
19	10	10	1	2026-01-21 08:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
20	10	10	2	2026-01-21 10:00:13.703505+05:30	2026-01-21 10:00:28.703505+05:30	2026-01-21 10:03:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
21	11	6	1	2026-01-24 07:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
22	11	6	2	2026-01-24 09:00:13.703505+05:30	2026-01-24 09:00:28.703505+05:30	2026-01-24 09:03:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
23	12	7	1	2026-02-08 06:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
24	12	7	2	2026-02-08 08:00:13.703505+05:30	2026-02-08 08:00:28.703505+05:30	2026-02-08 08:03:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
25	13	8	1	2026-02-02 17:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
26	13	8	2	2026-02-02 19:00:13.703505+05:30	2026-02-02 19:00:28.703505+05:30	2026-02-02 19:03:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
27	14	9	1	2026-02-09 16:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
28	14	9	2	2026-02-09 18:00:13.703505+05:30	2026-02-09 18:00:28.703505+05:30	2026-02-09 18:03:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
29	15	10	1	2026-02-06 15:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
30	15	10	2	2026-02-06 17:00:13.703505+05:30	2026-02-06 17:00:28.703505+05:30	2026-02-06 17:03:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
31	16	6	1	2026-02-05 14:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
32	16	6	2	2026-02-05 16:00:13.703505+05:30	2026-02-05 16:00:28.703505+05:30	2026-02-05 16:03:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
33	17	7	1	2026-01-31 13:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
34	17	7	2	2026-01-31 15:00:13.703505+05:30	2026-01-31 15:00:28.703505+05:30	2026-01-31 15:03:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
35	18	8	1	2026-02-03 12:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
36	18	8	2	2026-02-03 14:00:13.703505+05:30	2026-02-03 14:00:28.703505+05:30	2026-02-03 14:03:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
37	19	9	1	2026-02-10 11:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
38	19	9	2	2026-02-10 13:00:13.703505+05:30	2026-02-10 13:00:28.703505+05:30	2026-02-10 13:03:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
39	20	10	1	2026-01-26 10:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
40	20	10	2	2026-01-26 12:00:13.703505+05:30	2026-01-26 12:00:28.703505+05:30	2026-01-26 12:03:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
41	21	6	1	2026-02-07 09:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
42	21	6	2	2026-02-07 11:00:13.703505+05:30	2026-02-07 11:00:28.703505+05:30	2026-02-07 11:03:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
43	22	7	1	2026-01-28 08:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
44	22	7	2	2026-01-28 10:00:13.703505+05:30	2026-01-28 10:00:28.703505+05:30	2026-01-28 10:03:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
45	23	8	1	2026-02-08 07:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
46	23	8	2	2026-02-08 09:00:13.703505+05:30	2026-02-08 09:00:28.703505+05:30	2026-02-08 09:03:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
47	24	9	1	2026-02-05 06:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
48	24	9	2	2026-02-05 08:00:13.703505+05:30	2026-02-05 08:00:28.703505+05:30	2026-02-05 08:03:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
49	25	10	1	2026-02-11 17:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
50	25	10	2	2026-02-11 19:00:13.703505+05:30	2026-02-11 19:00:28.703505+05:30	2026-02-11 19:03:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
51	26	6	1	2026-02-17 17:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
52	26	6	2	2026-02-17 19:00:13.703505+05:30	2026-02-17 19:00:33.703505+05:30	2026-02-17 19:04:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
53	27	7	1	2026-02-17 15:00:13.703505+05:30	2026-02-17 15:00:23.703505+05:30	2026-02-17 15:02:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
54	28	8	1	2026-02-17 13:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
55	28	8	2	2026-02-17 15:00:13.703505+05:30	2026-02-17 15:00:33.703505+05:30	2026-02-17 15:04:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
56	29	9	1	2026-02-17 11:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
57	29	9	2	2026-02-17 13:00:13.703505+05:30	2026-02-17 13:00:33.703505+05:30	2026-02-17 13:04:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
58	30	10	1	2026-02-17 09:00:13.703505+05:30	2026-02-17 09:00:23.703505+05:30	2026-02-17 09:02:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
59	31	6	1	2026-02-17 07:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
60	31	6	2	2026-02-17 09:00:13.703505+05:30	2026-02-17 09:00:33.703505+05:30	2026-02-17 09:04:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
61	32	7	1	2026-02-17 05:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
62	32	7	2	2026-02-17 07:00:13.703505+05:30	2026-02-17 07:00:33.703505+05:30	2026-02-17 07:04:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
63	33	8	1	2026-02-17 03:00:13.703505+05:30	2026-02-17 03:00:23.703505+05:30	2026-02-17 03:02:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
64	34	9	1	2026-02-17 01:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
65	34	9	2	2026-02-17 03:00:13.703505+05:30	2026-02-17 03:00:33.703505+05:30	2026-02-17 03:04:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
66	35	10	1	2026-02-16 23:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
67	35	10	2	2026-02-17 01:00:13.703505+05:30	2026-02-17 01:00:33.703505+05:30	2026-02-17 01:04:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
68	36	6	1	2026-02-16 21:00:13.703505+05:30	2026-02-16 21:00:23.703505+05:30	2026-02-16 21:02:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
69	37	7	1	2026-02-16 19:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
70	37	7	2	2026-02-16 21:00:13.703505+05:30	2026-02-16 21:00:33.703505+05:30	2026-02-16 21:04:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
71	38	8	1	2026-02-16 17:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
72	38	8	2	2026-02-16 19:00:13.703505+05:30	2026-02-16 19:00:33.703505+05:30	2026-02-16 19:04:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
73	39	9	1	2026-02-16 15:00:13.703505+05:30	2026-02-16 15:00:23.703505+05:30	2026-02-16 15:02:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
74	40	10	1	2026-02-16 13:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
75	40	10	2	2026-02-16 15:00:13.703505+05:30	2026-02-16 15:00:33.703505+05:30	2026-02-16 15:04:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
76	41	6	1	2026-02-18 18:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
77	41	6	2	2026-02-18 20:00:13.703505+05:30	2026-02-18 20:00:33.703505+05:30	2026-02-18 20:04:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
78	42	7	1	2026-02-18 16:00:13.703505+05:30	2026-02-18 16:00:23.703505+05:30	2026-02-18 16:02:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
79	43	8	1	2026-02-18 14:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
80	43	8	2	2026-02-18 16:00:13.703505+05:30	2026-02-18 16:00:33.703505+05:30	2026-02-18 16:04:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
81	44	9	1	2026-02-18 12:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
82	44	9	2	2026-02-18 14:00:13.703505+05:30	2026-02-18 14:00:33.703505+05:30	2026-02-18 14:04:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
83	45	10	1	2026-02-18 10:00:13.703505+05:30	2026-02-18 10:00:23.703505+05:30	2026-02-18 10:02:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
84	46	6	1	2026-02-18 08:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
85	46	6	2	2026-02-18 10:00:13.703505+05:30	2026-02-18 10:00:33.703505+05:30	2026-02-18 10:04:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
86	47	7	1	2026-02-18 06:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
87	47	7	2	2026-02-18 08:00:13.703505+05:30	2026-02-18 08:00:33.703505+05:30	2026-02-18 08:04:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
88	48	8	1	2026-02-18 04:00:13.703505+05:30	2026-02-18 04:00:23.703505+05:30	2026-02-18 04:02:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
89	49	9	1	2026-02-18 02:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
90	49	9	2	2026-02-18 04:00:13.703505+05:30	2026-02-18 04:00:33.703505+05:30	2026-02-18 04:04:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
91	50	10	1	2026-02-18 00:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
92	50	10	2	2026-02-18 02:00:13.703505+05:30	2026-02-18 02:00:33.703505+05:30	2026-02-18 02:04:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
93	51	6	1	2026-02-17 22:00:13.703505+05:30	2026-02-17 22:00:23.703505+05:30	2026-02-17 22:02:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
94	52	7	1	2026-02-17 20:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
95	52	7	2	2026-02-17 22:00:13.703505+05:30	2026-02-17 22:00:33.703505+05:30	2026-02-17 22:04:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
96	53	8	1	2026-02-15 17:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
97	53	8	2	2026-02-15 19:00:13.703505+05:30	2026-02-15 19:00:33.703505+05:30	2026-02-15 19:04:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
98	54	9	1	2026-02-15 14:00:13.703505+05:30	2026-02-15 14:00:23.703505+05:30	2026-02-15 14:02:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
99	55	10	1	2026-02-15 11:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
100	55	10	2	2026-02-15 13:00:13.703505+05:30	2026-02-15 13:00:33.703505+05:30	2026-02-15 13:04:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
101	56	6	1	2026-02-15 08:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
102	56	6	2	2026-02-15 10:00:13.703505+05:30	2026-02-15 10:00:33.703505+05:30	2026-02-15 10:04:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
103	57	7	1	2026-02-15 05:00:13.703505+05:30	2026-02-15 05:00:23.703505+05:30	2026-02-15 05:02:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
104	58	8	1	2026-02-15 02:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
105	58	8	2	2026-02-15 04:00:13.703505+05:30	2026-02-15 04:00:33.703505+05:30	2026-02-15 04:04:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
106	59	9	1	2026-02-14 23:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
107	59	9	2	2026-02-15 01:00:13.703505+05:30	2026-02-15 01:00:33.703505+05:30	2026-02-15 01:04:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
108	60	10	1	2026-02-14 20:00:13.703505+05:30	2026-02-14 20:00:23.703505+05:30	2026-02-14 20:02:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
109	61	6	1	2026-02-14 17:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
110	61	6	2	2026-02-14 19:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
111	61	6	3	2026-02-14 21:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
112	61	6	4	2026-02-14 23:00:13.703505+05:30	2026-02-14 23:00:25.703505+05:30	2026-02-14 23:02:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
113	62	7	1	2026-02-14 15:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
114	62	7	2	2026-02-14 17:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
115	62	7	3	2026-02-14 19:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
116	62	7	4	2026-02-14 21:00:13.703505+05:30	2026-02-14 21:00:25.703505+05:30	2026-02-14 21:02:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
117	63	8	1	2026-02-14 13:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
118	63	8	2	2026-02-14 15:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
119	63	8	3	2026-02-14 17:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
120	63	8	4	2026-02-14 19:00:13.703505+05:30	2026-02-14 19:00:25.703505+05:30	2026-02-14 19:02:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
121	64	9	1	2026-02-14 11:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
122	64	9	2	2026-02-14 13:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
123	64	9	3	2026-02-14 15:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
124	64	9	4	2026-02-14 17:00:13.703505+05:30	2026-02-14 17:00:25.703505+05:30	2026-02-14 17:02:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
125	65	10	1	2026-02-14 09:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
126	65	10	2	2026-02-14 11:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
127	65	10	3	2026-02-14 13:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
128	65	10	4	2026-02-14 15:00:13.703505+05:30	2026-02-14 15:00:25.703505+05:30	2026-02-14 15:02:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
129	66	6	1	2026-02-14 07:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
130	66	6	2	2026-02-14 09:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
131	66	6	3	2026-02-14 11:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
132	66	6	4	2026-02-14 13:00:13.703505+05:30	2026-02-14 13:00:25.703505+05:30	2026-02-14 13:02:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
133	67	7	1	2026-02-14 05:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
134	67	7	2	2026-02-14 07:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
135	67	7	3	2026-02-14 09:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
136	67	7	4	2026-02-14 11:00:13.703505+05:30	2026-02-14 11:00:25.703505+05:30	2026-02-14 11:02:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
137	68	8	1	2026-02-14 03:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
138	68	8	2	2026-02-14 05:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
139	68	8	3	2026-02-14 07:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
140	68	8	4	2026-02-14 09:00:13.703505+05:30	2026-02-14 09:00:25.703505+05:30	2026-02-14 09:02:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
141	69	9	1	2026-02-16 17:00:13.703505+05:30	2026-02-16 17:00:23.703505+05:30	2026-02-16 17:02:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
142	70	10	1	2026-02-16 14:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
143	70	10	2	2026-02-16 16:00:13.703505+05:30	2026-02-16 16:00:33.703505+05:30	2026-02-16 16:04:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
144	71	6	1	2026-02-16 11:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
145	71	6	2	2026-02-16 13:00:13.703505+05:30	2026-02-16 13:00:33.703505+05:30	2026-02-16 13:04:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
146	72	7	1	2026-02-16 08:00:13.703505+05:30	2026-02-16 08:00:23.703505+05:30	2026-02-16 08:02:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
147	73	8	1	2026-02-16 05:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
148	73	8	2	2026-02-16 07:00:13.703505+05:30	2026-02-16 07:00:33.703505+05:30	2026-02-16 07:04:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
149	74	9	1	2026-02-16 02:00:13.703505+05:30	\N	\N	MISSED	2026-02-20 15:55:14.187804+05:30
150	74	9	2	2026-02-16 04:00:13.703505+05:30	2026-02-16 04:00:33.703505+05:30	2026-02-16 04:04:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
151	75	10	1	2026-02-15 23:00:13.703505+05:30	2026-02-15 23:00:23.703505+05:30	2026-02-15 23:02:13.703505+05:30	ANSWERED	2026-02-20 15:55:14.187804+05:30
\.


--
-- Data for Name: chat_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.chat_history (id, user_id, issue_id, role_in_chat, message, attachments, created_at, updated_at) FROM stdin;
1	1	1	USER	pipe broken in vepery site need to fix in 5 days	[]	2026-01-31 15:55:13.703505+05:30	2026-01-31 15:55:13.703505+05:30
2	\N	1	AI	✅ Issue #1 created: 'Pipe Leakage'. Solver Ramesh assigned.	[]	2026-01-31 15:55:16.703505+05:30	2026-01-31 15:55:16.703505+05:30
3	2	2	USER	electrical panel fault in ambattur, urgent	[]	2026-02-03 14:55:13.703505+05:30	2026-02-03 14:55:13.703505+05:30
4	\N	2	AI	✅ Issue #2 created: 'Electrical Panel Fault'. Priority: HIGH.	[]	2026-02-03 14:55:16.703505+05:30	2026-02-03 14:55:16.703505+05:30
5	1	3	USER	AC not cooling in guindy factory	[]	2026-02-01 13:55:13.703505+05:30	2026-02-01 13:55:13.703505+05:30
6	\N	3	AI	✅ Issue #3 created: 'AC Unit Not Cooling'. Solver Mohan assigned.	[]	2026-02-01 13:55:16.703505+05:30	2026-02-01 13:55:16.703505+05:30
7	3	4	USER	broken window in perungudi conference room	[]	2026-02-05 12:55:13.703505+05:30	2026-02-05 12:55:13.703505+05:30
8	\N	4	AI	✅ Issue #4 created: 'Broken Window'. Solver Kavitha assigned.	[]	2026-02-05 12:55:16.703505+05:30	2026-02-05 12:55:16.703505+05:30
9	1	5	USER	network switch down in taramani, critical!	[]	2026-02-04 11:55:13.703505+05:30	2026-02-04 11:55:13.703505+05:30
10	\N	5	AI	✅ Issue #5 created: 'Network Switch Failure'. Priority: HIGH.	[]	2026-02-04 11:55:16.703505+05:30	2026-02-04 11:55:16.703505+05:30
11	6	26	USER	Started ceiling water stain repair	[]	2026-02-18 09:55:13.703505+05:30	2026-02-18 09:55:13.703505+05:30
12	\N	26	AI	✅ Issue #26 updated to IN_PROGRESS.	[]	2026-02-18 09:55:15.703505+05:30	2026-02-18 09:55:15.703505+05:30
13	7	27	USER	Working on power socket replacement	[]	2026-02-18 08:55:13.703505+05:30	2026-02-18 08:55:13.703505+05:30
14	\N	27	AI	✅ Issue #27 updated to IN_PROGRESS.	[]	2026-02-18 08:55:15.703505+05:30	2026-02-18 08:55:15.703505+05:30
15	8	28	USER	Inspecting chiller vibration	[]	2026-02-18 07:55:13.703505+05:30	2026-02-18 07:55:13.703505+05:30
16	\N	28	AI	✅ Issue #28 updated to IN_PROGRESS.	[]	2026-02-18 07:55:15.703505+05:30	2026-02-18 07:55:15.703505+05:30
17	9	29	USER	Started handrail repair	[]	2026-02-18 06:55:13.703505+05:30	2026-02-18 06:55:13.703505+05:30
18	\N	29	AI	✅ Issue #29 updated to IN_PROGRESS.	[]	2026-02-18 06:55:15.703505+05:30	2026-02-18 06:55:15.703505+05:30
19	10	30	USER	Replacing WiFi access point	[]	2026-02-18 05:55:13.703505+05:30	2026-02-18 05:55:13.703505+05:30
20	\N	30	AI	✅ Issue #30 updated to IN_PROGRESS.	[]	2026-02-18 05:55:15.703505+05:30	2026-02-18 05:55:15.703505+05:30
21	1	76	USER	work not done properly, still leaking	[]	2026-02-19 11:55:13.703505+05:30	2026-02-19 11:55:13.703505+05:30
22	\N	76	AI	⚠️ Complaint filed for Issue #76. Reopened.	[]	2026-02-19 11:55:16.703505+05:30	2026-02-19 11:55:16.703505+05:30
23	2	77	USER	electrical short is back again	[]	2026-02-19 10:55:13.703505+05:30	2026-02-19 10:55:13.703505+05:30
24	\N	77	AI	⚠️ Complaint filed for Issue #77. Reopened.	[]	2026-02-19 10:55:16.703505+05:30	2026-02-19 10:55:16.703505+05:30
25	3	78	USER	water heater repair didn't work	[]	2026-02-19 09:55:13.703505+05:30	2026-02-19 09:55:13.703505+05:30
26	\N	78	AI	⚠️ Complaint filed for Issue #78. Reopened.	[]	2026-02-19 09:55:16.703505+05:30	2026-02-19 09:55:16.703505+05:30
27	\N	84	SYSTEM	⚠️ ESCALATION: Issue #84 escalated to manager.	[]	2026-02-20 14:55:13.703505+05:30	2026-02-20 14:55:13.703505+05:30
28	\N	85	SYSTEM	⚠️ ESCALATION: Issue #85 escalated to manager.	[]	2026-02-20 13:55:13.703505+05:30	2026-02-20 13:55:13.703505+05:30
29	\N	86	SYSTEM	⚠️ ESCALATION: Issue #86 escalated to manager.	[]	2026-02-20 12:55:13.703505+05:30	2026-02-20 12:55:13.703505+05:30
30	\N	87	SYSTEM	⚠️ ESCALATION: Issue #87 escalated to manager.	[]	2026-02-20 11:55:13.703505+05:30	2026-02-20 11:55:13.703505+05:30
31	\N	88	SYSTEM	⚠️ ESCALATION: Issue #88 escalated to manager.	[]	2026-02-20 10:55:13.703505+05:30	2026-02-20 10:55:13.703505+05:30
32	\N	89	SYSTEM	⚠️ ESCALATION: Issue #89 escalated to manager.	[]	2026-02-20 09:55:13.703505+05:30	2026-02-20 09:55:13.703505+05:30
33	\N	90	SYSTEM	⚠️ ESCALATION: Issue #90 escalated to manager.	[]	2026-02-20 08:55:13.703505+05:30	2026-02-20 08:55:13.703505+05:30
34	1	\N	USER	what are my open issues?	[]	2026-02-20 12:55:13.703505+05:30	2026-02-20 12:55:13.703505+05:30
35	\N	\N	AI	📋 You have 8 open issues.	[]	2026-02-20 12:55:15.703505+05:30	2026-02-20 12:55:15.703505+05:30
36	4	\N	USER	show escalated issues	[]	2026-02-20 12:55:13.703505+05:30	2026-02-20 12:55:13.703505+05:30
37	\N	\N	AI	⚠️ 7 escalated issues.	[]	2026-02-20 12:55:15.703505+05:30	2026-02-20 12:55:15.703505+05:30
38	6	\N	USER	what is my assignment?	[]	2026-02-20 12:55:13.703505+05:30	2026-02-20 12:55:13.703505+05:30
39	\N	\N	AI	👷 4 active assignments.	[]	2026-02-20 12:55:15.703505+05:30	2026-02-20 12:55:15.703505+05:30
40	1	\N	USER	Pipe Leakage in Main Halle	[]	2026-02-20 18:27:45.10009+05:30	2026-02-20 18:27:45.10009+05:30
41	\N	\N	AI	❌ Something went wrong: cannot unpack non-iterable NoneType object. Please try again.	[]	2026-02-20 18:27:45.3968+05:30	2026-02-20 18:27:45.3968+05:30
42	1	\N	USER	Pipe Leakage in Main Halle	[]	2026-02-20 18:28:08.508356+05:30	2026-02-20 18:28:08.508356+05:30
43	\N	\N	AI	❌ Something went wrong: cannot unpack non-iterable NoneType object. Please try again.	[]	2026-02-20 18:28:08.742562+05:30	2026-02-20 18:28:08.742562+05:30
44	1	\N	USER	Pipe Leakage in Main Halle	[]	2026-02-20 18:31:04.285704+05:30	2026-02-20 18:31:04.285704+05:30
45	\N	\N	AI	❌ Couldn't find site 'Main Halle'. Available: Vepery Site, Taramani Tech Park, OMR Tech Hub, Adyar Research Lab, Nungambakkam Office, Anna Nagar Complex, Thiruvanmiyur Site	[]	2026-02-20 18:31:04.541244+05:30	2026-02-20 18:31:04.541244+05:30
46	1	\N	USER	what works have done today	[]	2026-02-20 18:32:36.596255+05:30	2026-02-20 18:32:36.596255+05:30
47	\N	\N	AI	📋 31 issue(s):\n\n🟡 #92 — Pipe Leakage in Main Halle [medium] (ASSIGNED)\n🟡 #91 — Pipe Leakage in Main Halle [medium] (ASSIGNED)\n🔴 #55 — Fiber Optic Cable Damage [high] (OPEN)\n🔴 #58 — Coolant Pipe Leak Lab [high] (OPEN)\n🔴 #59 — Reception Desk Repair [low] (OPEN)\n🔴 #60 — Exterior Painting Needed [low] (OPEN)\n🔴 #61 — Emergency Generator Test Fail [high] (OPEN)\n🔴 #66 — Cafeteria Sink Clogged [medium] (OPEN)\n🟡 #41 — Pantry Microwave Repair [low] (ASSIGNED)\n🟡 #46 — Overhead Tank Cleaning [medium] (ASSIGNED)\n🟡 #50 — CCTV Camera Realignment [medium] (ASSIGNED)\n🔵 #26 — Ceiling Water Stain Repair [medium] (IN_PROGRESS)\n🔵 #30 — WiFi Access Point Replacement [medium] (IN_PROGRESS)\n🔵 #35 — Server Room AC Backup Install [high] (IN_PROGRESS)\n🔵 #38 — Transformer Oil Top-up [high] (IN_PROGRESS)	[]	2026-02-20 18:32:36.845491+05:30	2026-02-20 18:32:36.845491+05:30
48	1	\N	USER	what all supervisor id's	[]	2026-02-20 18:35:16.284924+05:30	2026-02-20 18:35:16.284924+05:30
49	\N	\N	AI	📋 31 issue(s):\n\n🟡 #92 — Pipe Leakage in Main Halle [medium] (ASSIGNED)\n🟡 #91 — Pipe Leakage in Main Halle [medium] (ASSIGNED)\n🔴 #55 — Fiber Optic Cable Damage [high] (OPEN)\n🔴 #58 — Coolant Pipe Leak Lab [high] (OPEN)\n🔴 #59 — Reception Desk Repair [low] (OPEN)\n🔴 #60 — Exterior Painting Needed [low] (OPEN)\n🔴 #61 — Emergency Generator Test Fail [high] (OPEN)\n🔴 #66 — Cafeteria Sink Clogged [medium] (OPEN)\n🟡 #41 — Pantry Microwave Repair [low] (ASSIGNED)\n🟡 #46 — Overhead Tank Cleaning [medium] (ASSIGNED)\n🟡 #50 — CCTV Camera Realignment [medium] (ASSIGNED)\n🔵 #26 — Ceiling Water Stain Repair [medium] (IN_PROGRESS)\n🔵 #30 — WiFi Access Point Replacement [medium] (IN_PROGRESS)\n🔵 #35 — Server Room AC Backup Install [high] (IN_PROGRESS)\n🔵 #38 — Transformer Oil Top-up [high] (IN_PROGRESS)	[]	2026-02-20 18:35:16.606262+05:30	2026-02-20 18:35:16.606262+05:30
50	1	\N	USER	what all supervisor id's	[]	2026-02-20 18:35:28.763868+05:30	2026-02-20 18:35:28.763868+05:30
51	\N	\N	AI	📋 31 issue(s):\n\n🟡 #92 — Pipe Leakage in Main Halle [medium] (ASSIGNED)\n🟡 #91 — Pipe Leakage in Main Halle [medium] (ASSIGNED)\n🔴 #55 — Fiber Optic Cable Damage [high] (OPEN)\n🔴 #58 — Coolant Pipe Leak Lab [high] (OPEN)\n🔴 #59 — Reception Desk Repair [low] (OPEN)\n🔴 #60 — Exterior Painting Needed [low] (OPEN)\n🔴 #61 — Emergency Generator Test Fail [high] (OPEN)\n🔴 #66 — Cafeteria Sink Clogged [medium] (OPEN)\n🟡 #41 — Pantry Microwave Repair [low] (ASSIGNED)\n🟡 #46 — Overhead Tank Cleaning [medium] (ASSIGNED)\n🟡 #50 — CCTV Camera Realignment [medium] (ASSIGNED)\n🔵 #26 — Ceiling Water Stain Repair [medium] (IN_PROGRESS)\n🔵 #30 — WiFi Access Point Replacement [medium] (IN_PROGRESS)\n🔵 #35 — Server Room AC Backup Install [high] (IN_PROGRESS)\n🔵 #38 — Transformer Oil Top-up [high] (IN_PROGRESS)	[]	2026-02-20 18:35:29.087149+05:30	2026-02-20 18:35:29.087149+05:30
52	1	\N	USER	give superviosr id's	[]	2026-02-20 18:35:46.659139+05:30	2026-02-20 18:35:46.659139+05:30
53	\N	\N	AI	📋 31 issue(s):\n\n🟡 #92 — Pipe Leakage in Main Halle [medium] (ASSIGNED)\n🟡 #91 — Pipe Leakage in Main Halle [medium] (ASSIGNED)\n🔴 #55 — Fiber Optic Cable Damage [high] (OPEN)\n🔴 #58 — Coolant Pipe Leak Lab [high] (OPEN)\n🔴 #59 — Reception Desk Repair [low] (OPEN)\n🔴 #60 — Exterior Painting Needed [low] (OPEN)\n🔴 #61 — Emergency Generator Test Fail [high] (OPEN)\n🔴 #66 — Cafeteria Sink Clogged [medium] (OPEN)\n🟡 #41 — Pantry Microwave Repair [low] (ASSIGNED)\n🟡 #46 — Overhead Tank Cleaning [medium] (ASSIGNED)\n🟡 #50 — CCTV Camera Realignment [medium] (ASSIGNED)\n🔵 #26 — Ceiling Water Stain Repair [medium] (IN_PROGRESS)\n🔵 #30 — WiFi Access Point Replacement [medium] (IN_PROGRESS)\n🔵 #35 — Server Room AC Backup Install [high] (IN_PROGRESS)\n🔵 #38 — Transformer Oil Top-up [high] (IN_PROGRESS)	[]	2026-02-20 18:35:46.988251+05:30	2026-02-20 18:35:46.988251+05:30
54	1	\N	USER	whoru	[]	2026-02-20 18:36:21.035851+05:30	2026-02-20 18:36:21.035851+05:30
55	\N	\N	AI	Hello Priya Sharma, I'm a facility management assistant chatbot 🙋. I'm here to help you with any issues or questions you may have regarding the facilities. You can report issues, check the status of ongoing work, view your assignments, or file a complaint. How can I assist you today?	[]	2026-02-20 18:36:21.357134+05:30	2026-02-20 18:36:21.357134+05:30
56	1	\N	USER	i need to know all the superviosr namesand their contact details	[]	2026-02-20 18:36:52.346136+05:30	2026-02-20 18:36:52.346136+05:30
57	\N	\N	AI	Hello Priya Sharma, I'm happy to help you. However, I need to clarify that I don't have direct access to real-time contact information. But I can guide you on how to obtain the list of supervisor names and their contact details.\n\nYou can try the following options:\n\n1. Check the company's internal directory or employee database.\n2. Visit the facility management website or portal to see if they have a list of supervisors and their contact information.\n3. Reach out to the HR department or administrative office to request the list of supervisors and their contact details.\n\nIf you're still having trouble finding the information, you can also try filing a request through our system, and I'll do my best to assist you further. 😊	[]	2026-02-20 18:36:52.700997+05:30	2026-02-20 18:36:52.700997+05:30
58	1	\N	USER	supervisor id 1 phone number	[]	2026-02-20 18:37:47.197316+05:30	2026-02-20 18:37:47.197316+05:30
59	\N	\N	AI	Hello Priya Sharma, I'd be happy to help you with that. 📞 Unfortunately, I don't have direct access to real-time contact information. However, I can guide you on how to find the supervisor's phone number. \n\nYou can try checking the facility management portal or the company directory for the supervisor's contact details. If you're unable to find the information, you can also report an issue or submit a request, and I'll do my best to assist you further. Would you like to proceed with reporting an issue or checking the status of an existing request?	[]	2026-02-20 18:37:47.516477+05:30	2026-02-20 18:37:47.516477+05:30
60	1	\N	USER	phone number of supervisor id 1	[]	2026-02-20 18:38:23.658785+05:30	2026-02-20 18:38:23.658785+05:30
61	\N	\N	AI	📋 31 issue(s):\n\n🟡 #92 — Pipe Leakage in Main Halle [medium] (ASSIGNED)\n🟡 #91 — Pipe Leakage in Main Halle [medium] (ASSIGNED)\n🔴 #55 — Fiber Optic Cable Damage [high] (OPEN)\n🔴 #58 — Coolant Pipe Leak Lab [high] (OPEN)\n🔴 #59 — Reception Desk Repair [low] (OPEN)\n🔴 #60 — Exterior Painting Needed [low] (OPEN)\n🔴 #61 — Emergency Generator Test Fail [high] (OPEN)\n🔴 #66 — Cafeteria Sink Clogged [medium] (OPEN)\n🟡 #41 — Pantry Microwave Repair [low] (ASSIGNED)\n🟡 #46 — Overhead Tank Cleaning [medium] (ASSIGNED)\n🟡 #50 — CCTV Camera Realignment [medium] (ASSIGNED)\n🔵 #26 — Ceiling Water Stain Repair [medium] (IN_PROGRESS)\n🔵 #30 — WiFi Access Point Replacement [medium] (IN_PROGRESS)\n🔵 #35 — Server Room AC Backup Install [high] (IN_PROGRESS)\n🔵 #38 — Transformer Oil Top-up [high] (IN_PROGRESS)	[]	2026-02-20 18:38:23.985741+05:30	2026-02-20 18:38:23.985741+05:30
62	1	\N	USER	status of all issues	[]	2026-02-20 18:43:47.103078+05:30	2026-02-20 18:43:47.103078+05:30
63	\N	\N	AI	📋 31 issue(s):\n\n🟡 #92 — Pipe Leakage in Main Halle [medium] (ASSIGNED)\n🟡 #91 — Pipe Leakage in Main Halle [medium] (ASSIGNED)\n🔴 #55 — Fiber Optic Cable Damage [high] (OPEN)\n🔴 #58 — Coolant Pipe Leak Lab [high] (OPEN)\n🔴 #59 — Reception Desk Repair [low] (OPEN)\n🔴 #60 — Exterior Painting Needed [low] (OPEN)\n🔴 #61 — Emergency Generator Test Fail [high] (OPEN)\n🔴 #66 — Cafeteria Sink Clogged [medium] (OPEN)\n🟡 #41 — Pantry Microwave Repair [low] (ASSIGNED)\n🟡 #46 — Overhead Tank Cleaning [medium] (ASSIGNED)\n🟡 #50 — CCTV Camera Realignment [medium] (ASSIGNED)\n🔵 #26 — Ceiling Water Stain Repair [medium] (IN_PROGRESS)\n🔵 #30 — WiFi Access Point Replacement [medium] (IN_PROGRESS)\n🔵 #35 — Server Room AC Backup Install [high] (IN_PROGRESS)\n🔵 #38 — Transformer Oil Top-up [high] (IN_PROGRESS)	[]	2026-02-20 18:43:47.433678+05:30	2026-02-20 18:43:47.433678+05:30
64	1	\N	USER	query_issues of site id 1	[]	2026-02-20 18:44:36.730082+05:30	2026-02-20 18:44:36.730082+05:30
65	\N	\N	AI	📋 31 issue(s):\n\n🟡 #92 — Pipe Leakage in Main Halle [medium] (ASSIGNED)\n🟡 #91 — Pipe Leakage in Main Halle [medium] (ASSIGNED)\n🔴 #55 — Fiber Optic Cable Damage [high] (OPEN)\n🔴 #58 — Coolant Pipe Leak Lab [high] (OPEN)\n🔴 #59 — Reception Desk Repair [low] (OPEN)\n🔴 #60 — Exterior Painting Needed [low] (OPEN)\n🔴 #61 — Emergency Generator Test Fail [high] (OPEN)\n🔴 #66 — Cafeteria Sink Clogged [medium] (OPEN)\n🟡 #41 — Pantry Microwave Repair [low] (ASSIGNED)\n🟡 #46 — Overhead Tank Cleaning [medium] (ASSIGNED)\n🟡 #50 — CCTV Camera Realignment [medium] (ASSIGNED)\n🔵 #26 — Ceiling Water Stain Repair [medium] (IN_PROGRESS)\n🔵 #30 — WiFi Access Point Replacement [medium] (IN_PROGRESS)\n🔵 #35 — Server Room AC Backup Install [high] (IN_PROGRESS)\n🔵 #38 — Transformer Oil Top-up [high] (IN_PROGRESS)	[]	2026-02-20 18:44:36.984772+05:30	2026-02-20 18:44:36.984772+05:30
66	1	\N	USER	query_issues of site id 4	[]	2026-02-20 18:45:06.502169+05:30	2026-02-20 18:45:06.502169+05:30
67	\N	\N	AI	📋 31 issue(s):\n\n🟡 #92 — Pipe Leakage in Main Halle [medium] (ASSIGNED)\n🟡 #91 — Pipe Leakage in Main Halle [medium] (ASSIGNED)\n🔴 #55 — Fiber Optic Cable Damage [high] (OPEN)\n🔴 #58 — Coolant Pipe Leak Lab [high] (OPEN)\n🔴 #59 — Reception Desk Repair [low] (OPEN)\n🔴 #60 — Exterior Painting Needed [low] (OPEN)\n🔴 #61 — Emergency Generator Test Fail [high] (OPEN)\n🔴 #66 — Cafeteria Sink Clogged [medium] (OPEN)\n🟡 #41 — Pantry Microwave Repair [low] (ASSIGNED)\n🟡 #46 — Overhead Tank Cleaning [medium] (ASSIGNED)\n🟡 #50 — CCTV Camera Realignment [medium] (ASSIGNED)\n🔵 #26 — Ceiling Water Stain Repair [medium] (IN_PROGRESS)\n🔵 #30 — WiFi Access Point Replacement [medium] (IN_PROGRESS)\n🔵 #35 — Server Room AC Backup Install [high] (IN_PROGRESS)\n🔵 #38 — Transformer Oil Top-up [high] (IN_PROGRESS)	[]	2026-02-20 18:45:06.753439+05:30	2026-02-20 18:45:06.753439+05:30
68	1	\N	USER	query_issues of site id 4	[]	2026-02-20 19:07:00.925168+05:30	2026-02-20 19:07:00.925168+05:30
69	\N	\N	AI	❌ Could not fetch data: connection to server at "localhost" (::1), port 5432 failed: FATAL:  password authentication failed for user "postgres"\n. Please try rephrasing your question.	[]	2026-02-20 19:07:01.190795+05:30	2026-02-20 19:07:01.190795+05:30
70	1	\N	USER	query_issues of site id 4	[]	2026-02-20 19:07:49.208931+05:30	2026-02-20 19:07:49.208931+05:30
71	\N	\N	AI	📋 31 issue(s):\n\n🟡 #92 — Pipe Leakage in Main Halle [medium] (ASSIGNED)\n🟡 #91 — Pipe Leakage in Main Halle [medium] (ASSIGNED)\n🔴 #55 — Fiber Optic Cable Damage [high] (OPEN)\n🔴 #58 — Coolant Pipe Leak Lab [high] (OPEN)\n🔴 #59 — Reception Desk Repair [low] (OPEN)\n🔴 #60 — Exterior Painting Needed [low] (OPEN)\n🔴 #61 — Emergency Generator Test Fail [high] (OPEN)\n🔴 #66 — Cafeteria Sink Clogged [medium] (OPEN)\n🟡 #41 — Pantry Microwave Repair [low] (ASSIGNED)\n🟡 #46 — Overhead Tank Cleaning [medium] (ASSIGNED)\n🟡 #50 — CCTV Camera Realignment [medium] (ASSIGNED)\n🔵 #26 — Ceiling Water Stain Repair [medium] (IN_PROGRESS)\n🔵 #30 — WiFi Access Point Replacement [medium] (IN_PROGRESS)\n🔵 #35 — Server Room AC Backup Install [high] (IN_PROGRESS)\n🔵 #38 — Transformer Oil Top-up [high] (IN_PROGRESS)	[]	2026-02-20 19:07:49.487556+05:30	2026-02-20 19:07:49.487556+05:30
72	1	\N	USER	use sql command to get the superviosr 1 details	[]	2026-02-20 19:08:26.554005+05:30	2026-02-20 19:08:26.554005+05:30
73	\N	\N	AI	To get the Supervisor 1 details, you can use the following SQL command:\n\n```sql\nSELECT * \nFROM Employees \nWHERE EmployeeID = (SELECT Supervisor1ID \n                    FROM Employees \n                    WHERE EmployeeName = 'Priya Sharma');\n```\n\nAlternatively, if you have a separate table for supervisors, you can use:\n\n```sql\nSELECT S.* \nFROM Supervisors S \nJOIN Employees E ON S.SupervisorID = E.Supervisor1ID \nWHERE E.EmployeeName = 'Priya Sharma';\n```\n\nPlease replace the table and column names with the actual names used in your database. \n\nIf you need help with the exact syntax or have further questions, feel free to ask 📊.	[]	2026-02-20 19:08:26.814377+05:30	2026-02-20 19:08:26.814377+05:30
74	1	\N	USER	use sql command to get the superviosr 1 details	[]	2026-02-20 19:21:32.401865+05:30	2026-02-20 19:21:32.401865+05:30
75	\N	\N	AI	To get the Supervisor 1 details, you can use the following SQL command:\n\n```sql\nSELECT * \nFROM Employees \nWHERE EmployeeID = (SELECT Supervisor1ID \n                    FROM Employees \n                    WHERE EmployeeName = 'Priya Sharma');\n```\n\nThis command assumes that you have a table named `Employees` with columns `EmployeeID`, `EmployeeName`, and `Supervisor1ID`. \n\nIf you want to get the details of Priya Sharma's supervisor, you would need to replace `'Priya Sharma'` with the actual `EmployeeName` or `EmployeeID` of Priya Sharma.\n\nAlternatively, if you have a separate table for supervisors, the query would be:\n\n```sql\nSELECT S.* \nFROM Supervisors S \nJOIN Employees E ON S.SupervisorID = E.Supervisor1ID \nWHERE E.EmployeeName = 'Priya Sharma';\n```\n\nPlease replace the table and column names according to your actual database schema. 😊	[]	2026-02-20 19:21:32.719155+05:30	2026-02-20 19:21:32.719155+05:30
76	1	\N	USER	use sql command to get the superviosr 1 details	[]	2026-02-20 19:24:31.062659+05:30	2026-02-20 19:24:31.062659+05:30
77	\N	\N	AI	❌ Something went wrong: connection to server at "localhost" (::1), port 5432 failed: FATAL:  password authentication failed for user "postgres"\n. Please try again.	[]	2026-02-20 19:24:31.371797+05:30	2026-02-20 19:24:31.371797+05:30
78	1	\N	USER	use sql command to get the superviosr 1 details	[]	2026-02-20 19:25:09.681217+05:30	2026-02-20 19:25:09.681217+05:30
79	\N	\N	AI	❌ Something went wrong: connection to server at "localhost" (::1), port 5432 failed: FATAL:  password authentication failed for user "postgres"\n. Please try again.	[]	2026-02-20 19:25:09.97774+05:30	2026-02-20 19:25:09.97774+05:30
80	1	\N	USER	issue in a vepary siote	[]	2026-02-20 19:35:13.109581+05:30	2026-02-20 19:35:13.109581+05:30
81	\N	\N	AI	❌ Something went wrong: cannot access local variable 'result' where it is not associated with a value. Please try again.	[]	2026-02-20 19:35:13.375024+05:30	2026-02-20 19:35:13.375024+05:30
82	1	\N	USER	issue in a vepary siote	[]	2026-02-20 19:37:08.642079+05:30	2026-02-20 19:37:08.642079+05:30
83	1	\N	USER	issue in a vepary siote	[]	2026-02-20 19:38:38.751899+05:30	2026-02-20 19:38:38.751899+05:30
84	1	\N	USER	issue in a vepary siote	[]	2026-02-20 19:43:20.458269+05:30	2026-02-20 19:43:20.458269+05:30
85	1	\N	USER	issue in a vepary siote	[]	2026-02-20 19:47:50.332753+05:30	2026-02-20 19:47:50.332753+05:30
86	\N	\N	AI	❌ Something went wrong: connection to server at "localhost" (::1), port 5432 failed: FATAL:  password authentication failed for user "postgres"\n	[]	2026-02-20 19:47:50.476547+05:30	2026-02-20 19:47:50.476547+05:30
87	1	\N	USER	issue in a vepary siote	[]	2026-02-20 19:50:40.171041+05:30	2026-02-20 19:50:40.171041+05:30
88	\N	\N	AI	❌ Something went wrong: psycopg2.connect() argument after ** must be a mapping, not str	[]	2026-02-20 19:50:40.190449+05:30	2026-02-20 19:50:40.190449+05:30
89	1	\N	USER	issue in a vepary siote	[]	2026-02-20 20:01:06.527754+05:30	2026-02-20 20:01:06.527754+05:30
90	\N	\N	AI	❌ Something went wrong: 'str' object has no attribute 'chat'	[]	2026-02-20 20:01:06.564969+05:30	2026-02-20 20:01:06.564969+05:30
91	1	\N	USER	issue in a vepary siote	[]	2026-02-20 20:02:49.840787+05:30	2026-02-20 20:02:49.840787+05:30
92	\N	\N	AI	❌ Something went wrong: 'str' object has no attribute 'chat'	[]	2026-02-20 20:02:49.862898+05:30	2026-02-20 20:02:49.862898+05:30
93	1	\N	USER	issue in a vepary siote	[]	2026-02-20 20:07:12.614947+05:30	2026-02-20 20:07:12.614947+05:30
94	\N	\N	AI	❌ Something went wrong: 'str' object has no attribute 'chat'	[]	2026-02-20 20:07:12.634194+05:30	2026-02-20 20:07:12.634194+05:30
95	1	\N	USER	issue in a vepary siote	[]	2026-02-20 20:08:59.448997+05:30	2026-02-20 20:08:59.448997+05:30
96	\N	\N	AI	No issues found in Vepary site.	[]	2026-02-20 20:09:00.595812+05:30	2026-02-20 20:09:00.595812+05:30
97	1	\N	USER	name of supervisor id 2	[]	2026-02-20 20:09:35.736078+05:30	2026-02-20 20:09:35.736078+05:30
98	\N	\N	AI	The name of the supervisor with id 2 is Anil Kumar.	[]	2026-02-20 20:09:37.219402+05:30	2026-02-20 20:09:37.219402+05:30
\.


--
-- Data for Name: complaints; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.complaints (id, issue_id, assignment_id, raised_by_supervisor_id, target_solver_id, complaint_details, complaint_image_url, created_at, updated_at) FROM stdin;
1	76	61	1	6	Pipe joint still leaking after repair	https://ik.imagekit.io/facility/complaints/76.jpg	2026-02-19 15:55:13.703505+05:30	2026-02-19 15:55:13.703505+05:30
2	77	62	2	7	Same circuit breaker tripping within hours	\N	2026-02-19 14:55:13.703505+05:30	2026-02-19 14:55:13.703505+05:30
3	78	63	3	8	Water heater still not producing hot water	https://ik.imagekit.io/facility/complaints/78.jpg	2026-02-19 13:55:13.703505+05:30	2026-02-19 13:55:13.703505+05:30
4	79	64	3	9	Boundary wall crack widened after sealing	https://ik.imagekit.io/facility/complaints/79.jpg	2026-02-19 12:55:13.703505+05:30	2026-02-19 12:55:13.703505+05:30
5	80	65	1	10	Irrigation pipe leaking again at same joint	\N	2026-02-19 11:55:13.703505+05:30	2026-02-19 11:55:13.703505+05:30
6	81	66	2	6	Chiller vibration returned worse than before	https://ik.imagekit.io/facility/complaints/81.jpg	2026-02-19 10:55:13.703505+05:30	2026-02-19 10:55:13.703505+05:30
7	82	67	2	7	Shutter motor burned out again within one week	\N	2026-02-19 09:55:13.703505+05:30	2026-02-19 09:55:13.703505+05:30
8	83	68	2	8	Forklift hydraulic leak persists	https://ik.imagekit.io/facility/complaints/83.jpg	2026-02-19 08:55:13.703505+05:30	2026-02-19 08:55:13.703505+05:30
9	84	69	3	9	Lift non-functional for 3 days, no response	https://ik.imagekit.io/facility/complaints/84.jpg	2026-02-19 07:55:13.703505+05:30	2026-02-19 07:55:13.703505+05:30
10	85	70	3	10	Chemical storage ventilation still down	\N	2026-02-19 06:55:13.703505+05:30	2026-02-19 06:55:13.703505+05:30
11	86	71	2	6	Transformer still overheating	https://ik.imagekit.io/facility/complaints/86.jpg	2026-02-19 05:55:13.703505+05:30	2026-02-19 05:55:13.703505+05:30
12	87	72	2	7	Basement still flooding	\N	2026-02-19 04:55:13.703505+05:30	2026-02-19 04:55:13.703505+05:30
13	88	73	3	8	Production line still down	https://ik.imagekit.io/facility/complaints/88.jpg	2026-02-19 03:55:13.703505+05:30	2026-02-19 03:55:13.703505+05:30
14	89	74	3	9	Fire suppression system still faulty	\N	2026-02-19 02:55:13.703505+05:30	2026-02-19 02:55:13.703505+05:30
15	90	75	2	10	Welding gas leak not fully sealed	https://ik.imagekit.io/facility/complaints/90.jpg	2026-02-19 01:55:13.703505+05:30	2026-02-19 01:55:13.703505+05:30
16	1	1	1	6	Pipe repair looks patchy	\N	2026-02-19 00:55:13.703505+05:30	2026-02-19 00:55:13.703505+05:30
17	2	2	2	7	Electrical panel cover not secured	https://ik.imagekit.io/facility/complaints/2.jpg	2026-02-18 23:55:13.703505+05:30	2026-02-18 23:55:13.703505+05:30
18	5	5	3	10	Network still dropping intermittently	\N	2026-02-18 22:55:13.703505+05:30	2026-02-18 22:55:13.703505+05:30
19	10	10	2	10	Fire alarm sensor response slow	https://ik.imagekit.io/facility/complaints/10.jpg	2026-02-18 21:55:13.703505+05:30	2026-02-18 21:55:13.703505+05:30
20	15	15	3	10	Water pump still making noise	\N	2026-02-18 20:55:13.703505+05:30	2026-02-18 20:55:13.703505+05:30
21	27	27	2	7	Power socket using low-quality parts	https://ik.imagekit.io/facility/complaints/27.jpg	2026-02-18 19:55:13.703505+05:30	2026-02-18 19:55:13.703505+05:30
22	30	30	1	10	Handrail repair not following standards	\N	2026-02-18 18:55:13.703505+05:30	2026-02-18 18:55:13.703505+05:30
23	35	35	1	10	Forklift repair taking too long	https://ik.imagekit.io/facility/complaints/35.jpg	2026-02-18 17:55:13.703505+05:30	2026-02-18 17:55:13.703505+05:30
24	37	37	3	7	Transformer work seems rushed	\N	2026-02-18 16:55:13.703505+05:30	2026-02-18 16:55:13.703505+05:30
25	68	53	2	8	Boiler pressure gauge reading off	https://ik.imagekit.io/facility/complaints/68.jpg	2026-02-18 15:55:13.703505+05:30	2026-02-18 15:55:13.703505+05:30
26	70	55	1	10	UPS battery backup time decreased	\N	2026-02-18 14:55:13.703505+05:30	2026-02-18 14:55:13.703505+05:30
27	71	56	2	6	Crane rope inspection report incomplete	https://ik.imagekit.io/facility/complaints/71.jpg	2026-02-18 13:55:13.703505+05:30	2026-02-18 13:55:13.703505+05:30
28	73	58	1	8	Switch config causing intermittent drops	\N	2026-02-18 12:55:13.703505+05:30	2026-02-18 12:55:13.703505+05:30
29	74	59	2	9	Motor bearings alignment off	https://ik.imagekit.io/facility/complaints/74.jpg	2026-02-18 11:55:13.703505+05:30	2026-02-18 11:55:13.703505+05:30
30	75	60	3	10	Fan speed control making humming noise	\N	2026-02-18 10:55:13.703505+05:30	2026-02-18 10:55:13.703505+05:30
\.


--
-- Data for Name: escalation_rules; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.escalation_rules (id, priority, max_call_attempts, max_time_without_response, escalate_to_role, created_at, updated_at) FROM stdin;
1	HIGH	3	02:00:00	manager	2026-02-20 15:55:13.810995+05:30	2026-02-20 15:55:13.810995+05:30
2	HIGH	2	00:45:00	manager	2026-02-20 15:55:13.810995+05:30	2026-02-20 15:55:13.810995+05:30
3	MEDIUM	4	04:00:00	supervisor	2026-02-20 15:55:13.810995+05:30	2026-02-20 15:55:13.810995+05:30
4	MEDIUM	3	02:00:00	manager	2026-02-20 15:55:13.810995+05:30	2026-02-20 15:55:13.810995+05:30
5	LOW	6	08:00:00	supervisor	2026-02-20 15:55:13.810995+05:30	2026-02-20 15:55:13.810995+05:30
6	LOW	5	06:00:00	manager	2026-02-20 15:55:13.810995+05:30	2026-02-20 15:55:13.810995+05:30
\.


--
-- Data for Name: escalations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.escalations (id, issue_id, assignment_id, escalation_type, escalated_to_role, escalated_by_user_id, reason, total_missed_calls, time_elapsed_without_response, notification_sent, notification_sent_at, resolved, resolved_at, created_at, updated_at) FROM stdin;
1	84	69	NO_RESPONSE	manager	\N	Solver failed to answer 3 calls over 2 hours	3	02:00:00	t	2026-02-20 14:55:13.703505+05:30	f	\N	2026-02-20 13:55:13.703505+05:30	2026-02-20 14:55:13.703505+05:30
2	85	70	NO_RESPONSE	manager	\N	Solver failed to answer 4 calls over 3 hours	4	03:00:00	t	2026-02-20 13:55:13.703505+05:30	f	\N	2026-02-20 12:55:13.703505+05:30	2026-02-20 13:55:13.703505+05:30
3	86	71	NO_RESPONSE	manager	\N	Solver failed to answer 5 calls over 4 hours	5	04:00:00	t	2026-02-20 12:55:13.703505+05:30	f	\N	2026-02-20 11:55:13.703505+05:30	2026-02-20 12:55:13.703505+05:30
4	87	72	NO_RESPONSE	manager	\N	Solver failed to answer 3 calls over 5 hours	3	05:00:00	t	2026-02-20 11:55:13.703505+05:30	f	\N	2026-02-20 10:55:13.703505+05:30	2026-02-20 11:55:13.703505+05:30
5	88	73	NO_RESPONSE	manager	\N	Solver failed to answer 4 calls over 2 hours	4	02:00:00	t	2026-02-20 10:55:13.703505+05:30	f	\N	2026-02-20 09:55:13.703505+05:30	2026-02-20 10:55:13.703505+05:30
6	89	74	NO_RESPONSE	manager	\N	Solver failed to answer 5 calls over 3 hours	5	03:00:00	t	2026-02-20 09:55:13.703505+05:30	f	\N	2026-02-20 08:55:13.703505+05:30	2026-02-20 09:55:13.703505+05:30
7	90	75	NO_RESPONSE	manager	\N	Solver failed to answer 3 calls over 4 hours	3	04:00:00	t	2026-02-20 08:55:13.703505+05:30	f	\N	2026-02-20 07:55:13.703505+05:30	2026-02-20 08:55:13.703505+05:30
8	26	26	DEADLINE_APPROACHING	manager	\N	Deadline in 20.5h, status still IN_PROGRESS	\N	\N	t	2026-02-20 13:55:13.703505+05:30	f	\N	2026-02-20 12:55:13.703505+05:30	2026-02-20 13:55:13.703505+05:30
9	29	29	DEADLINE_APPROACHING	manager	\N	Deadline in 23.5h, status still IN_PROGRESS	\N	\N	t	2026-02-20 13:55:13.703505+05:30	f	\N	2026-02-20 12:55:13.703505+05:30	2026-02-20 13:55:13.703505+05:30
10	34	34	DEADLINE_APPROACHING	manager	\N	Deadline in 22.5h, status still IN_PROGRESS	\N	\N	t	2026-02-20 13:55:13.703505+05:30	f	\N	2026-02-20 12:55:13.703505+05:30	2026-02-20 13:55:13.703505+05:30
11	37	37	DEADLINE_APPROACHING	manager	\N	Deadline in 19.5h, status still IN_PROGRESS	\N	\N	t	2026-02-20 13:55:13.703505+05:30	f	\N	2026-02-20 12:55:13.703505+05:30	2026-02-20 13:55:13.703505+05:30
12	40	40	DEADLINE_APPROACHING	manager	\N	Deadline in 22.5h, status still IN_PROGRESS	\N	\N	t	2026-02-20 13:55:13.703505+05:30	f	\N	2026-02-20 12:55:13.703505+05:30	2026-02-20 13:55:13.703505+05:30
13	1	1	NO_RESPONSE	manager	\N	Solver responded after 4 attempts	3	03:00:00	t	2026-02-10 15:55:13.703505+05:30	t	2026-02-11 15:55:13.703505+05:30	2026-02-10 14:55:13.703505+05:30	2026-02-11 15:55:13.703505+05:30
14	5	5	NO_RESPONSE	manager	\N	Solver answered on 3rd call	3	03:00:00	t	2026-02-10 15:55:13.703505+05:30	t	2026-02-11 15:55:13.703505+05:30	2026-02-10 14:55:13.703505+05:30	2026-02-11 15:55:13.703505+05:30
15	10	10	DEADLINE_APPROACHING	manager	\N	Completed before deadline	\N	\N	t	2026-02-10 15:55:13.703505+05:30	t	2026-02-11 15:55:13.703505+05:30	2026-02-10 14:55:13.703505+05:30	2026-02-11 15:55:13.703505+05:30
\.


--
-- Data for Name: issue_assignments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.issue_assignments (id, issue_id, assigned_to_solver_id, assigned_by_supervisor_id, due_date, status, created_at, updated_at) FROM stdin;
1	1	6	1	2026-02-10 15:55:13.703505+05:30	COMPLETED	2026-01-31 16:55:13.703505+05:30	2026-02-11 15:55:13.703505+05:30
2	2	7	2	2026-02-13 15:55:13.703505+05:30	COMPLETED	2026-02-03 15:55:13.703505+05:30	2026-02-14 15:55:13.703505+05:30
3	3	8	1	2026-02-11 15:55:13.703505+05:30	COMPLETED	2026-02-01 14:55:13.703505+05:30	2026-02-12 15:55:13.703505+05:30
4	4	9	1	2026-02-15 15:55:13.703505+05:30	COMPLETED	2026-02-05 13:55:13.703505+05:30	2026-02-16 15:55:13.703505+05:30
5	5	10	3	2026-02-14 15:55:13.703505+05:30	COMPLETED	2026-02-04 12:55:13.703505+05:30	2026-02-15 15:55:13.703505+05:30
6	6	6	3	2026-02-05 15:55:13.703505+05:30	COMPLETED	2026-01-26 11:55:13.703505+05:30	2026-02-06 15:55:13.703505+05:30
7	7	7	3	2026-02-07 15:55:13.703505+05:30	COMPLETED	2026-01-28 10:55:13.703505+05:30	2026-02-08 15:55:13.703505+05:30
8	8	8	3	2026-02-09 15:55:13.703505+05:30	COMPLETED	2026-01-30 09:55:13.703505+05:30	2026-02-10 15:55:13.703505+05:30
9	9	9	1	2026-02-17 15:55:13.703505+05:30	COMPLETED	2026-02-07 08:55:13.703505+05:30	2026-02-18 15:55:13.703505+05:30
10	10	10	2	2026-01-31 15:55:13.703505+05:30	COMPLETED	2026-01-21 07:55:13.703505+05:30	2026-02-01 15:55:13.703505+05:30
11	11	6	1	2026-02-03 15:55:13.703505+05:30	COMPLETED	2026-01-24 06:55:13.703505+05:30	2026-02-04 15:55:13.703505+05:30
12	12	7	1	2026-02-18 15:55:13.703505+05:30	COMPLETED	2026-02-08 05:55:13.703505+05:30	2026-02-19 15:55:13.703505+05:30
13	13	8	2	2026-02-12 15:55:13.703505+05:30	COMPLETED	2026-02-02 16:55:13.703505+05:30	2026-02-13 15:55:13.703505+05:30
14	14	9	2	2026-02-19 15:55:13.703505+05:30	COMPLETED	2026-02-09 15:55:13.703505+05:30	2026-02-20 15:55:13.703505+05:30
15	15	10	3	2026-02-16 15:55:13.703505+05:30	COMPLETED	2026-02-06 14:55:13.703505+05:30	2026-02-17 15:55:13.703505+05:30
16	16	6	1	2026-02-15 15:55:13.703505+05:30	COMPLETED	2026-02-05 13:55:13.703505+05:30	2026-02-16 15:55:13.703505+05:30
17	17	7	2	2026-02-10 15:55:13.703505+05:30	COMPLETED	2026-01-31 12:55:13.703505+05:30	2026-02-11 15:55:13.703505+05:30
18	18	8	2	2026-02-13 15:55:13.703505+05:30	COMPLETED	2026-02-03 11:55:13.703505+05:30	2026-02-14 15:55:13.703505+05:30
19	19	9	3	2026-02-20 15:55:13.703505+05:30	COMPLETED	2026-02-10 10:55:13.703505+05:30	2026-02-21 15:55:13.703505+05:30
20	20	10	3	2026-02-05 15:55:13.703505+05:30	COMPLETED	2026-01-26 09:55:13.703505+05:30	2026-02-06 15:55:13.703505+05:30
21	21	6	2	2026-02-17 15:55:13.703505+05:30	COMPLETED	2026-02-07 08:55:13.703505+05:30	2026-02-18 15:55:13.703505+05:30
22	22	7	1	2026-02-07 15:55:13.703505+05:30	COMPLETED	2026-01-28 07:55:13.703505+05:30	2026-02-08 15:55:13.703505+05:30
23	23	8	1	2026-02-18 15:55:13.703505+05:30	COMPLETED	2026-02-08 06:55:13.703505+05:30	2026-02-19 15:55:13.703505+05:30
24	24	9	3	2026-02-15 15:55:13.703505+05:30	COMPLETED	2026-02-05 05:55:13.703505+05:30	2026-02-16 15:55:13.703505+05:30
25	25	10	3	2026-02-21 15:55:13.703505+05:30	COMPLETED	2026-02-11 16:55:13.703505+05:30	2026-02-22 15:55:13.703505+05:30
26	26	6	1	2026-02-25 15:55:13.703505+05:30	ACTIVE	2026-02-17 16:55:13.703505+05:30	2026-02-19 15:55:13.703505+05:30
27	27	7	2	2026-02-23 15:55:13.703505+05:30	ACTIVE	2026-02-17 14:55:13.703505+05:30	2026-02-19 14:55:13.703505+05:30
28	28	8	2	2026-02-24 15:55:13.703505+05:30	ACTIVE	2026-02-17 12:55:13.703505+05:30	2026-02-19 13:55:13.703505+05:30
29	29	9	3	2026-02-22 15:55:13.703505+05:30	ACTIVE	2026-02-17 10:55:13.703505+05:30	2026-02-19 12:55:13.703505+05:30
30	30	10	1	2026-02-26 15:55:13.703505+05:30	ACTIVE	2026-02-17 08:55:13.703505+05:30	2026-02-19 11:55:13.703505+05:30
31	31	6	2	2026-02-24 15:55:13.703505+05:30	ACTIVE	2026-02-17 06:55:13.703505+05:30	2026-02-19 10:55:13.703505+05:30
32	32	7	3	2026-02-28 15:55:13.703505+05:30	ACTIVE	2026-02-17 04:55:13.703505+05:30	2026-02-19 09:55:13.703505+05:30
33	33	8	3	2026-02-25 15:55:13.703505+05:30	ACTIVE	2026-02-17 02:55:13.703505+05:30	2026-02-19 08:55:13.703505+05:30
34	34	9	3	2026-02-23 15:55:13.703505+05:30	ACTIVE	2026-02-17 00:55:13.703505+05:30	2026-02-19 07:55:13.703505+05:30
35	35	10	1	2026-02-24 15:55:13.703505+05:30	ACTIVE	2026-02-16 22:55:13.703505+05:30	2026-02-19 06:55:13.703505+05:30
36	36	6	2	2026-02-22 15:55:13.703505+05:30	ACTIVE	2026-02-16 20:55:13.703505+05:30	2026-02-19 05:55:13.703505+05:30
37	37	7	3	2026-02-26 15:55:13.703505+05:30	ACTIVE	2026-02-16 18:55:13.703505+05:30	2026-02-19 04:55:13.703505+05:30
38	38	8	2	2026-02-23 15:55:13.703505+05:30	ACTIVE	2026-02-16 16:55:13.703505+05:30	2026-02-19 03:55:13.703505+05:30
39	39	9	1	2026-02-27 15:55:13.703505+05:30	ACTIVE	2026-02-16 14:55:13.703505+05:30	2026-02-19 02:55:13.703505+05:30
40	40	10	1	2026-02-24 15:55:13.703505+05:30	ACTIVE	2026-02-16 12:55:13.703505+05:30	2026-02-19 01:55:13.703505+05:30
41	41	6	1	2026-02-27 15:55:13.703505+05:30	ACTIVE	2026-02-18 17:55:13.703505+05:30	2026-02-19 10:55:13.703505+05:30
42	42	7	2	2026-02-25 15:55:13.703505+05:30	ACTIVE	2026-02-18 15:55:13.703505+05:30	2026-02-19 09:55:13.703505+05:30
43	43	8	2	2026-02-23 15:55:13.703505+05:30	ACTIVE	2026-02-18 13:55:13.703505+05:30	2026-02-19 08:55:13.703505+05:30
44	44	9	3	2026-02-22 15:55:13.703505+05:30	ACTIVE	2026-02-18 11:55:13.703505+05:30	2026-02-19 07:55:13.703505+05:30
45	45	10	3	2026-02-26 15:55:13.703505+05:30	ACTIVE	2026-02-18 09:55:13.703505+05:30	2026-02-19 06:55:13.703505+05:30
46	46	6	1	2026-02-28 15:55:13.703505+05:30	ACTIVE	2026-02-18 07:55:13.703505+05:30	2026-02-19 05:55:13.703505+05:30
47	47	7	2	2026-02-24 15:55:13.703505+05:30	ACTIVE	2026-02-18 05:55:13.703505+05:30	2026-02-19 04:55:13.703505+05:30
48	48	8	2	2026-02-25 15:55:13.703505+05:30	ACTIVE	2026-02-18 03:55:13.703505+05:30	2026-02-19 03:55:13.703505+05:30
49	49	9	3	2026-03-02 15:55:13.703505+05:30	ACTIVE	2026-02-18 01:55:13.703505+05:30	2026-02-19 02:55:13.703505+05:30
50	50	10	1	2026-02-24 15:55:13.703505+05:30	ACTIVE	2026-02-17 23:55:13.703505+05:30	2026-02-19 01:55:13.703505+05:30
51	51	6	2	2026-02-23 15:55:13.703505+05:30	ACTIVE	2026-02-17 21:55:13.703505+05:30	2026-02-19 00:55:13.703505+05:30
52	52	7	3	2026-03-04 15:55:13.703505+05:30	ACTIVE	2026-02-17 19:55:13.703505+05:30	2026-02-18 23:55:13.703505+05:30
53	68	8	2	2026-02-24 15:55:13.703505+05:30	ACTIVE	2026-02-15 16:55:13.703505+05:30	2026-02-19 15:55:13.703505+05:30
54	69	9	3	2026-02-26 15:55:13.703505+05:30	ACTIVE	2026-02-15 13:55:13.703505+05:30	2026-02-19 13:55:13.703505+05:30
55	70	10	1	2026-02-25 15:55:13.703505+05:30	ACTIVE	2026-02-15 10:55:13.703505+05:30	2026-02-19 11:55:13.703505+05:30
56	71	6	2	2026-02-23 15:55:13.703505+05:30	ACTIVE	2026-02-15 07:55:13.703505+05:30	2026-02-19 09:55:13.703505+05:30
57	72	7	3	2026-02-27 15:55:13.703505+05:30	ACTIVE	2026-02-15 04:55:13.703505+05:30	2026-02-19 07:55:13.703505+05:30
58	73	8	1	2026-02-23 15:55:13.703505+05:30	ACTIVE	2026-02-15 01:55:13.703505+05:30	2026-02-19 05:55:13.703505+05:30
59	74	9	2	2026-02-24 15:55:13.703505+05:30	ACTIVE	2026-02-14 22:55:13.703505+05:30	2026-02-19 03:55:13.703505+05:30
60	75	10	3	2026-02-28 15:55:13.703505+05:30	ACTIVE	2026-02-14 19:55:13.703505+05:30	2026-02-19 01:55:13.703505+05:30
61	76	6	1	2026-02-23 15:55:13.703505+05:30	REOPENED	2026-02-14 16:55:13.703505+05:30	2026-02-20 09:55:13.703505+05:30
62	77	7	2	2026-02-22 15:55:13.703505+05:30	REOPENED	2026-02-14 14:55:13.703505+05:30	2026-02-20 08:55:13.703505+05:30
63	78	8	3	2026-02-24 15:55:13.703505+05:30	REOPENED	2026-02-14 12:55:13.703505+05:30	2026-02-20 07:55:13.703505+05:30
64	79	9	3	2026-02-23 15:55:13.703505+05:30	REOPENED	2026-02-14 10:55:13.703505+05:30	2026-02-20 06:55:13.703505+05:30
65	80	10	1	2026-02-25 15:55:13.703505+05:30	REOPENED	2026-02-14 08:55:13.703505+05:30	2026-02-20 05:55:13.703505+05:30
66	81	6	2	2026-02-22 15:55:13.703505+05:30	REOPENED	2026-02-14 06:55:13.703505+05:30	2026-02-20 04:55:13.703505+05:30
67	82	7	2	2026-02-24 15:55:13.703505+05:30	REOPENED	2026-02-14 04:55:13.703505+05:30	2026-02-20 03:55:13.703505+05:30
68	83	8	2	2026-02-22 15:55:13.703505+05:30	REOPENED	2026-02-14 02:55:13.703505+05:30	2026-02-20 02:55:13.703505+05:30
69	84	9	3	2026-02-21 15:55:13.703505+05:30	ACTIVE	2026-02-16 16:55:13.703505+05:30	2026-02-20 15:55:13.703505+05:30
70	85	10	3	2026-02-21 15:55:13.703505+05:30	ACTIVE	2026-02-16 13:55:13.703505+05:30	2026-02-20 13:55:13.703505+05:30
71	86	6	2	2026-02-21 15:55:13.703505+05:30	ACTIVE	2026-02-16 10:55:13.703505+05:30	2026-02-20 11:55:13.703505+05:30
72	87	7	2	2026-02-20 15:55:13.703505+05:30	ACTIVE	2026-02-16 07:55:13.703505+05:30	2026-02-20 09:55:13.703505+05:30
73	88	8	3	2026-02-20 15:55:13.703505+05:30	ACTIVE	2026-02-16 04:55:13.703505+05:30	2026-02-20 07:55:13.703505+05:30
74	89	9	3	2026-02-21 15:55:13.703505+05:30	ACTIVE	2026-02-16 01:55:13.703505+05:30	2026-02-20 05:55:13.703505+05:30
75	90	10	2	2026-02-20 15:55:13.703505+05:30	ACTIVE	2026-02-15 22:55:13.703505+05:30	2026-02-20 03:55:13.703505+05:30
76	91	10	1	2026-02-25 18:27:46.151358+05:30	ACTIVE	2026-02-20 18:27:45.3968+05:30	2026-02-20 18:27:45.3968+05:30
77	92	10	1	2026-02-25 18:28:09.382713+05:30	ACTIVE	2026-02-20 18:28:08.742562+05:30	2026-02-20 18:28:08.742562+05:30
\.


--
-- Data for Name: issue_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.issue_history (id, issue_id, changed_by_user_id, old_status, new_status, action_type, details, created_at, updated_at) FROM stdin;
1	1	1	\N	OPEN	ASSIGN	Issue created via chat	2026-01-31 15:55:13.703505+05:30	2026-01-31 15:55:13.703505+05:30
2	1	1	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-01-31 16:55:13.703505+05:30	2026-01-31 16:55:13.703505+05:30
3	1	\N	ASSIGNED	IN_PROGRESS	UPDATE	Solver started work	2026-01-31 18:55:13.703505+05:30	2026-01-31 18:55:13.703505+05:30
4	1	1	RESOLVED_PENDING_REVIEW	COMPLETED	COMPLETE	Supervisor approved	2026-02-11 15:55:13.703505+05:30	2026-02-11 15:55:13.703505+05:30
5	2	2	\N	OPEN	ASSIGN	Issue created via chat	2026-02-03 14:55:13.703505+05:30	2026-02-03 14:55:13.703505+05:30
6	2	2	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-02-03 15:55:13.703505+05:30	2026-02-03 15:55:13.703505+05:30
7	2	\N	ASSIGNED	IN_PROGRESS	UPDATE	Solver started work	2026-02-03 17:55:13.703505+05:30	2026-02-03 17:55:13.703505+05:30
8	2	2	RESOLVED_PENDING_REVIEW	COMPLETED	COMPLETE	Supervisor approved	2026-02-14 15:55:13.703505+05:30	2026-02-14 15:55:13.703505+05:30
9	3	1	\N	OPEN	ASSIGN	Issue created via chat	2026-02-01 13:55:13.703505+05:30	2026-02-01 13:55:13.703505+05:30
10	3	1	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-02-01 14:55:13.703505+05:30	2026-02-01 14:55:13.703505+05:30
11	3	\N	ASSIGNED	IN_PROGRESS	UPDATE	Solver started work	2026-02-01 16:55:13.703505+05:30	2026-02-01 16:55:13.703505+05:30
12	3	1	RESOLVED_PENDING_REVIEW	COMPLETED	COMPLETE	Supervisor approved	2026-02-12 15:55:13.703505+05:30	2026-02-12 15:55:13.703505+05:30
13	4	1	\N	OPEN	ASSIGN	Issue created via chat	2026-02-05 12:55:13.703505+05:30	2026-02-05 12:55:13.703505+05:30
14	4	1	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-02-05 13:55:13.703505+05:30	2026-02-05 13:55:13.703505+05:30
15	4	\N	ASSIGNED	IN_PROGRESS	UPDATE	Solver started work	2026-02-05 15:55:13.703505+05:30	2026-02-05 15:55:13.703505+05:30
16	4	1	RESOLVED_PENDING_REVIEW	COMPLETED	COMPLETE	Supervisor approved	2026-02-16 15:55:13.703505+05:30	2026-02-16 15:55:13.703505+05:30
17	5	3	\N	OPEN	ASSIGN	Issue created via chat	2026-02-04 11:55:13.703505+05:30	2026-02-04 11:55:13.703505+05:30
18	5	3	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-02-04 12:55:13.703505+05:30	2026-02-04 12:55:13.703505+05:30
19	5	\N	ASSIGNED	IN_PROGRESS	UPDATE	Solver started work	2026-02-04 14:55:13.703505+05:30	2026-02-04 14:55:13.703505+05:30
20	5	3	RESOLVED_PENDING_REVIEW	COMPLETED	COMPLETE	Supervisor approved	2026-02-15 15:55:13.703505+05:30	2026-02-15 15:55:13.703505+05:30
21	6	3	\N	OPEN	ASSIGN	Issue created via chat	2026-01-26 10:55:13.703505+05:30	2026-01-26 10:55:13.703505+05:30
22	6	3	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-01-26 11:55:13.703505+05:30	2026-01-26 11:55:13.703505+05:30
23	6	\N	ASSIGNED	IN_PROGRESS	UPDATE	Solver started work	2026-01-26 13:55:13.703505+05:30	2026-01-26 13:55:13.703505+05:30
24	6	3	RESOLVED_PENDING_REVIEW	COMPLETED	COMPLETE	Supervisor approved	2026-02-06 15:55:13.703505+05:30	2026-02-06 15:55:13.703505+05:30
25	7	3	\N	OPEN	ASSIGN	Issue created via chat	2026-01-28 09:55:13.703505+05:30	2026-01-28 09:55:13.703505+05:30
26	7	3	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-01-28 10:55:13.703505+05:30	2026-01-28 10:55:13.703505+05:30
27	7	\N	ASSIGNED	IN_PROGRESS	UPDATE	Solver started work	2026-01-28 12:55:13.703505+05:30	2026-01-28 12:55:13.703505+05:30
28	7	3	RESOLVED_PENDING_REVIEW	COMPLETED	COMPLETE	Supervisor approved	2026-02-08 15:55:13.703505+05:30	2026-02-08 15:55:13.703505+05:30
29	8	3	\N	OPEN	ASSIGN	Issue created via chat	2026-01-30 08:55:13.703505+05:30	2026-01-30 08:55:13.703505+05:30
30	8	3	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-01-30 09:55:13.703505+05:30	2026-01-30 09:55:13.703505+05:30
31	8	\N	ASSIGNED	IN_PROGRESS	UPDATE	Solver started work	2026-01-30 11:55:13.703505+05:30	2026-01-30 11:55:13.703505+05:30
32	8	3	RESOLVED_PENDING_REVIEW	COMPLETED	COMPLETE	Supervisor approved	2026-02-10 15:55:13.703505+05:30	2026-02-10 15:55:13.703505+05:30
33	9	1	\N	OPEN	ASSIGN	Issue created via chat	2026-02-07 07:55:13.703505+05:30	2026-02-07 07:55:13.703505+05:30
34	9	1	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-02-07 08:55:13.703505+05:30	2026-02-07 08:55:13.703505+05:30
35	9	\N	ASSIGNED	IN_PROGRESS	UPDATE	Solver started work	2026-02-07 10:55:13.703505+05:30	2026-02-07 10:55:13.703505+05:30
36	9	1	RESOLVED_PENDING_REVIEW	COMPLETED	COMPLETE	Supervisor approved	2026-02-18 15:55:13.703505+05:30	2026-02-18 15:55:13.703505+05:30
37	10	2	\N	OPEN	ASSIGN	Issue created via chat	2026-01-21 06:55:13.703505+05:30	2026-01-21 06:55:13.703505+05:30
38	10	2	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-01-21 07:55:13.703505+05:30	2026-01-21 07:55:13.703505+05:30
39	10	\N	ASSIGNED	IN_PROGRESS	UPDATE	Solver started work	2026-01-21 09:55:13.703505+05:30	2026-01-21 09:55:13.703505+05:30
40	10	2	RESOLVED_PENDING_REVIEW	COMPLETED	COMPLETE	Supervisor approved	2026-02-01 15:55:13.703505+05:30	2026-02-01 15:55:13.703505+05:30
41	11	1	\N	OPEN	ASSIGN	Issue created via chat	2026-01-24 05:55:13.703505+05:30	2026-01-24 05:55:13.703505+05:30
42	11	1	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-01-24 06:55:13.703505+05:30	2026-01-24 06:55:13.703505+05:30
43	11	\N	ASSIGNED	IN_PROGRESS	UPDATE	Solver started work	2026-01-24 08:55:13.703505+05:30	2026-01-24 08:55:13.703505+05:30
44	11	1	RESOLVED_PENDING_REVIEW	COMPLETED	COMPLETE	Supervisor approved	2026-02-04 15:55:13.703505+05:30	2026-02-04 15:55:13.703505+05:30
45	12	1	\N	OPEN	ASSIGN	Issue created via chat	2026-02-08 04:55:13.703505+05:30	2026-02-08 04:55:13.703505+05:30
46	12	1	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-02-08 05:55:13.703505+05:30	2026-02-08 05:55:13.703505+05:30
47	12	\N	ASSIGNED	IN_PROGRESS	UPDATE	Solver started work	2026-02-08 07:55:13.703505+05:30	2026-02-08 07:55:13.703505+05:30
48	12	1	RESOLVED_PENDING_REVIEW	COMPLETED	COMPLETE	Supervisor approved	2026-02-19 15:55:13.703505+05:30	2026-02-19 15:55:13.703505+05:30
49	13	2	\N	OPEN	ASSIGN	Issue created via chat	2026-02-02 15:55:13.703505+05:30	2026-02-02 15:55:13.703505+05:30
50	13	2	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-02-02 16:55:13.703505+05:30	2026-02-02 16:55:13.703505+05:30
51	13	\N	ASSIGNED	IN_PROGRESS	UPDATE	Solver started work	2026-02-02 18:55:13.703505+05:30	2026-02-02 18:55:13.703505+05:30
52	13	2	RESOLVED_PENDING_REVIEW	COMPLETED	COMPLETE	Supervisor approved	2026-02-13 15:55:13.703505+05:30	2026-02-13 15:55:13.703505+05:30
53	14	2	\N	OPEN	ASSIGN	Issue created via chat	2026-02-09 14:55:13.703505+05:30	2026-02-09 14:55:13.703505+05:30
54	14	2	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-02-09 15:55:13.703505+05:30	2026-02-09 15:55:13.703505+05:30
55	14	\N	ASSIGNED	IN_PROGRESS	UPDATE	Solver started work	2026-02-09 17:55:13.703505+05:30	2026-02-09 17:55:13.703505+05:30
56	14	2	RESOLVED_PENDING_REVIEW	COMPLETED	COMPLETE	Supervisor approved	2026-02-20 15:55:13.703505+05:30	2026-02-20 15:55:13.703505+05:30
57	15	3	\N	OPEN	ASSIGN	Issue created via chat	2026-02-06 13:55:13.703505+05:30	2026-02-06 13:55:13.703505+05:30
58	15	3	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-02-06 14:55:13.703505+05:30	2026-02-06 14:55:13.703505+05:30
59	15	\N	ASSIGNED	IN_PROGRESS	UPDATE	Solver started work	2026-02-06 16:55:13.703505+05:30	2026-02-06 16:55:13.703505+05:30
60	15	3	RESOLVED_PENDING_REVIEW	COMPLETED	COMPLETE	Supervisor approved	2026-02-17 15:55:13.703505+05:30	2026-02-17 15:55:13.703505+05:30
61	16	1	\N	OPEN	ASSIGN	Issue created via chat	2026-02-05 12:55:13.703505+05:30	2026-02-05 12:55:13.703505+05:30
62	16	1	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-02-05 13:55:13.703505+05:30	2026-02-05 13:55:13.703505+05:30
63	16	\N	ASSIGNED	IN_PROGRESS	UPDATE	Solver started work	2026-02-05 15:55:13.703505+05:30	2026-02-05 15:55:13.703505+05:30
64	16	1	RESOLVED_PENDING_REVIEW	COMPLETED	COMPLETE	Supervisor approved	2026-02-16 15:55:13.703505+05:30	2026-02-16 15:55:13.703505+05:30
65	17	2	\N	OPEN	ASSIGN	Issue created via chat	2026-01-31 11:55:13.703505+05:30	2026-01-31 11:55:13.703505+05:30
66	17	2	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-01-31 12:55:13.703505+05:30	2026-01-31 12:55:13.703505+05:30
67	17	\N	ASSIGNED	IN_PROGRESS	UPDATE	Solver started work	2026-01-31 14:55:13.703505+05:30	2026-01-31 14:55:13.703505+05:30
68	17	2	RESOLVED_PENDING_REVIEW	COMPLETED	COMPLETE	Supervisor approved	2026-02-11 15:55:13.703505+05:30	2026-02-11 15:55:13.703505+05:30
69	18	2	\N	OPEN	ASSIGN	Issue created via chat	2026-02-03 10:55:13.703505+05:30	2026-02-03 10:55:13.703505+05:30
70	18	2	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-02-03 11:55:13.703505+05:30	2026-02-03 11:55:13.703505+05:30
71	18	\N	ASSIGNED	IN_PROGRESS	UPDATE	Solver started work	2026-02-03 13:55:13.703505+05:30	2026-02-03 13:55:13.703505+05:30
72	18	2	RESOLVED_PENDING_REVIEW	COMPLETED	COMPLETE	Supervisor approved	2026-02-14 15:55:13.703505+05:30	2026-02-14 15:55:13.703505+05:30
73	19	3	\N	OPEN	ASSIGN	Issue created via chat	2026-02-10 09:55:13.703505+05:30	2026-02-10 09:55:13.703505+05:30
74	19	3	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-02-10 10:55:13.703505+05:30	2026-02-10 10:55:13.703505+05:30
75	19	\N	ASSIGNED	IN_PROGRESS	UPDATE	Solver started work	2026-02-10 12:55:13.703505+05:30	2026-02-10 12:55:13.703505+05:30
76	19	3	RESOLVED_PENDING_REVIEW	COMPLETED	COMPLETE	Supervisor approved	2026-02-21 15:55:13.703505+05:30	2026-02-21 15:55:13.703505+05:30
77	20	3	\N	OPEN	ASSIGN	Issue created via chat	2026-01-26 08:55:13.703505+05:30	2026-01-26 08:55:13.703505+05:30
78	20	3	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-01-26 09:55:13.703505+05:30	2026-01-26 09:55:13.703505+05:30
79	20	\N	ASSIGNED	IN_PROGRESS	UPDATE	Solver started work	2026-01-26 11:55:13.703505+05:30	2026-01-26 11:55:13.703505+05:30
80	20	3	RESOLVED_PENDING_REVIEW	COMPLETED	COMPLETE	Supervisor approved	2026-02-06 15:55:13.703505+05:30	2026-02-06 15:55:13.703505+05:30
81	21	2	\N	OPEN	ASSIGN	Issue created via chat	2026-02-07 07:55:13.703505+05:30	2026-02-07 07:55:13.703505+05:30
82	21	2	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-02-07 08:55:13.703505+05:30	2026-02-07 08:55:13.703505+05:30
83	21	\N	ASSIGNED	IN_PROGRESS	UPDATE	Solver started work	2026-02-07 10:55:13.703505+05:30	2026-02-07 10:55:13.703505+05:30
84	21	2	RESOLVED_PENDING_REVIEW	COMPLETED	COMPLETE	Supervisor approved	2026-02-18 15:55:13.703505+05:30	2026-02-18 15:55:13.703505+05:30
85	22	1	\N	OPEN	ASSIGN	Issue created via chat	2026-01-28 06:55:13.703505+05:30	2026-01-28 06:55:13.703505+05:30
86	22	1	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-01-28 07:55:13.703505+05:30	2026-01-28 07:55:13.703505+05:30
87	22	\N	ASSIGNED	IN_PROGRESS	UPDATE	Solver started work	2026-01-28 09:55:13.703505+05:30	2026-01-28 09:55:13.703505+05:30
88	22	1	RESOLVED_PENDING_REVIEW	COMPLETED	COMPLETE	Supervisor approved	2026-02-08 15:55:13.703505+05:30	2026-02-08 15:55:13.703505+05:30
89	23	1	\N	OPEN	ASSIGN	Issue created via chat	2026-02-08 05:55:13.703505+05:30	2026-02-08 05:55:13.703505+05:30
90	23	1	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-02-08 06:55:13.703505+05:30	2026-02-08 06:55:13.703505+05:30
91	23	\N	ASSIGNED	IN_PROGRESS	UPDATE	Solver started work	2026-02-08 08:55:13.703505+05:30	2026-02-08 08:55:13.703505+05:30
92	23	1	RESOLVED_PENDING_REVIEW	COMPLETED	COMPLETE	Supervisor approved	2026-02-19 15:55:13.703505+05:30	2026-02-19 15:55:13.703505+05:30
93	24	3	\N	OPEN	ASSIGN	Issue created via chat	2026-02-05 04:55:13.703505+05:30	2026-02-05 04:55:13.703505+05:30
94	24	3	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-02-05 05:55:13.703505+05:30	2026-02-05 05:55:13.703505+05:30
95	24	\N	ASSIGNED	IN_PROGRESS	UPDATE	Solver started work	2026-02-05 07:55:13.703505+05:30	2026-02-05 07:55:13.703505+05:30
96	24	3	RESOLVED_PENDING_REVIEW	COMPLETED	COMPLETE	Supervisor approved	2026-02-16 15:55:13.703505+05:30	2026-02-16 15:55:13.703505+05:30
97	25	3	\N	OPEN	ASSIGN	Issue created via chat	2026-02-11 15:55:13.703505+05:30	2026-02-11 15:55:13.703505+05:30
98	25	3	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-02-11 16:55:13.703505+05:30	2026-02-11 16:55:13.703505+05:30
99	25	\N	ASSIGNED	IN_PROGRESS	UPDATE	Solver started work	2026-02-11 18:55:13.703505+05:30	2026-02-11 18:55:13.703505+05:30
100	25	3	RESOLVED_PENDING_REVIEW	COMPLETED	COMPLETE	Supervisor approved	2026-02-22 15:55:13.703505+05:30	2026-02-22 15:55:13.703505+05:30
101	26	1	\N	OPEN	ASSIGN	Issue created via chat	2026-02-17 15:55:13.703505+05:30	2026-02-17 15:55:13.703505+05:30
102	26	1	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-02-17 16:55:13.703505+05:30	2026-02-17 16:55:13.703505+05:30
103	26	\N	ASSIGNED	IN_PROGRESS	UPDATE	Solver started work	2026-02-17 18:55:13.703505+05:30	2026-02-17 18:55:13.703505+05:30
104	27	2	\N	OPEN	ASSIGN	Issue created via chat	2026-02-17 13:55:13.703505+05:30	2026-02-17 13:55:13.703505+05:30
105	27	2	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-02-17 14:55:13.703505+05:30	2026-02-17 14:55:13.703505+05:30
106	27	\N	ASSIGNED	IN_PROGRESS	UPDATE	Solver started work	2026-02-17 16:55:13.703505+05:30	2026-02-17 16:55:13.703505+05:30
107	28	2	\N	OPEN	ASSIGN	Issue created via chat	2026-02-17 11:55:13.703505+05:30	2026-02-17 11:55:13.703505+05:30
108	28	2	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-02-17 12:55:13.703505+05:30	2026-02-17 12:55:13.703505+05:30
109	28	\N	ASSIGNED	IN_PROGRESS	UPDATE	Solver started work	2026-02-17 14:55:13.703505+05:30	2026-02-17 14:55:13.703505+05:30
110	29	3	\N	OPEN	ASSIGN	Issue created via chat	2026-02-17 09:55:13.703505+05:30	2026-02-17 09:55:13.703505+05:30
111	29	3	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-02-17 10:55:13.703505+05:30	2026-02-17 10:55:13.703505+05:30
112	29	\N	ASSIGNED	IN_PROGRESS	UPDATE	Solver started work	2026-02-17 12:55:13.703505+05:30	2026-02-17 12:55:13.703505+05:30
113	30	1	\N	OPEN	ASSIGN	Issue created via chat	2026-02-17 07:55:13.703505+05:30	2026-02-17 07:55:13.703505+05:30
114	30	1	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-02-17 08:55:13.703505+05:30	2026-02-17 08:55:13.703505+05:30
115	30	\N	ASSIGNED	IN_PROGRESS	UPDATE	Solver started work	2026-02-17 10:55:13.703505+05:30	2026-02-17 10:55:13.703505+05:30
116	31	2	\N	OPEN	ASSIGN	Issue created via chat	2026-02-17 05:55:13.703505+05:30	2026-02-17 05:55:13.703505+05:30
117	31	2	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-02-17 06:55:13.703505+05:30	2026-02-17 06:55:13.703505+05:30
118	31	\N	ASSIGNED	IN_PROGRESS	UPDATE	Solver started work	2026-02-17 08:55:13.703505+05:30	2026-02-17 08:55:13.703505+05:30
119	32	3	\N	OPEN	ASSIGN	Issue created via chat	2026-02-17 03:55:13.703505+05:30	2026-02-17 03:55:13.703505+05:30
120	32	3	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-02-17 04:55:13.703505+05:30	2026-02-17 04:55:13.703505+05:30
121	32	\N	ASSIGNED	IN_PROGRESS	UPDATE	Solver started work	2026-02-17 06:55:13.703505+05:30	2026-02-17 06:55:13.703505+05:30
122	33	3	\N	OPEN	ASSIGN	Issue created via chat	2026-02-17 01:55:13.703505+05:30	2026-02-17 01:55:13.703505+05:30
123	33	3	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-02-17 02:55:13.703505+05:30	2026-02-17 02:55:13.703505+05:30
124	33	\N	ASSIGNED	IN_PROGRESS	UPDATE	Solver started work	2026-02-17 04:55:13.703505+05:30	2026-02-17 04:55:13.703505+05:30
125	34	3	\N	OPEN	ASSIGN	Issue created via chat	2026-02-16 23:55:13.703505+05:30	2026-02-16 23:55:13.703505+05:30
126	34	3	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-02-17 00:55:13.703505+05:30	2026-02-17 00:55:13.703505+05:30
127	34	\N	ASSIGNED	IN_PROGRESS	UPDATE	Solver started work	2026-02-17 02:55:13.703505+05:30	2026-02-17 02:55:13.703505+05:30
128	35	1	\N	OPEN	ASSIGN	Issue created via chat	2026-02-16 21:55:13.703505+05:30	2026-02-16 21:55:13.703505+05:30
129	35	1	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-02-16 22:55:13.703505+05:30	2026-02-16 22:55:13.703505+05:30
130	35	\N	ASSIGNED	IN_PROGRESS	UPDATE	Solver started work	2026-02-17 00:55:13.703505+05:30	2026-02-17 00:55:13.703505+05:30
131	36	2	\N	OPEN	ASSIGN	Issue created via chat	2026-02-16 19:55:13.703505+05:30	2026-02-16 19:55:13.703505+05:30
132	36	2	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-02-16 20:55:13.703505+05:30	2026-02-16 20:55:13.703505+05:30
133	36	\N	ASSIGNED	IN_PROGRESS	UPDATE	Solver started work	2026-02-16 22:55:13.703505+05:30	2026-02-16 22:55:13.703505+05:30
134	37	3	\N	OPEN	ASSIGN	Issue created via chat	2026-02-16 17:55:13.703505+05:30	2026-02-16 17:55:13.703505+05:30
135	37	3	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-02-16 18:55:13.703505+05:30	2026-02-16 18:55:13.703505+05:30
136	37	\N	ASSIGNED	IN_PROGRESS	UPDATE	Solver started work	2026-02-16 20:55:13.703505+05:30	2026-02-16 20:55:13.703505+05:30
137	38	2	\N	OPEN	ASSIGN	Issue created via chat	2026-02-16 15:55:13.703505+05:30	2026-02-16 15:55:13.703505+05:30
138	38	2	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-02-16 16:55:13.703505+05:30	2026-02-16 16:55:13.703505+05:30
139	38	\N	ASSIGNED	IN_PROGRESS	UPDATE	Solver started work	2026-02-16 18:55:13.703505+05:30	2026-02-16 18:55:13.703505+05:30
140	39	1	\N	OPEN	ASSIGN	Issue created via chat	2026-02-16 13:55:13.703505+05:30	2026-02-16 13:55:13.703505+05:30
141	39	1	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-02-16 14:55:13.703505+05:30	2026-02-16 14:55:13.703505+05:30
142	39	\N	ASSIGNED	IN_PROGRESS	UPDATE	Solver started work	2026-02-16 16:55:13.703505+05:30	2026-02-16 16:55:13.703505+05:30
143	40	1	\N	OPEN	ASSIGN	Issue created via chat	2026-02-16 11:55:13.703505+05:30	2026-02-16 11:55:13.703505+05:30
144	40	1	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-02-16 12:55:13.703505+05:30	2026-02-16 12:55:13.703505+05:30
145	40	\N	ASSIGNED	IN_PROGRESS	UPDATE	Solver started work	2026-02-16 14:55:13.703505+05:30	2026-02-16 14:55:13.703505+05:30
146	41	1	\N	OPEN	ASSIGN	Issue created via chat	2026-02-18 15:55:13.703505+05:30	2026-02-18 15:55:13.703505+05:30
147	41	1	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-02-18 16:55:13.703505+05:30	2026-02-18 16:55:13.703505+05:30
148	42	2	\N	OPEN	ASSIGN	Issue created via chat	2026-02-18 13:55:13.703505+05:30	2026-02-18 13:55:13.703505+05:30
149	42	2	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-02-18 14:55:13.703505+05:30	2026-02-18 14:55:13.703505+05:30
150	43	2	\N	OPEN	ASSIGN	Issue created via chat	2026-02-18 11:55:13.703505+05:30	2026-02-18 11:55:13.703505+05:30
151	43	2	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-02-18 12:55:13.703505+05:30	2026-02-18 12:55:13.703505+05:30
152	44	3	\N	OPEN	ASSIGN	Issue created via chat	2026-02-18 09:55:13.703505+05:30	2026-02-18 09:55:13.703505+05:30
153	44	3	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-02-18 10:55:13.703505+05:30	2026-02-18 10:55:13.703505+05:30
154	45	3	\N	OPEN	ASSIGN	Issue created via chat	2026-02-18 07:55:13.703505+05:30	2026-02-18 07:55:13.703505+05:30
155	45	3	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-02-18 08:55:13.703505+05:30	2026-02-18 08:55:13.703505+05:30
156	46	1	\N	OPEN	ASSIGN	Issue created via chat	2026-02-18 05:55:13.703505+05:30	2026-02-18 05:55:13.703505+05:30
157	46	1	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-02-18 06:55:13.703505+05:30	2026-02-18 06:55:13.703505+05:30
158	47	2	\N	OPEN	ASSIGN	Issue created via chat	2026-02-18 03:55:13.703505+05:30	2026-02-18 03:55:13.703505+05:30
159	47	2	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-02-18 04:55:13.703505+05:30	2026-02-18 04:55:13.703505+05:30
160	48	2	\N	OPEN	ASSIGN	Issue created via chat	2026-02-18 01:55:13.703505+05:30	2026-02-18 01:55:13.703505+05:30
161	48	2	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-02-18 02:55:13.703505+05:30	2026-02-18 02:55:13.703505+05:30
162	49	3	\N	OPEN	ASSIGN	Issue created via chat	2026-02-17 23:55:13.703505+05:30	2026-02-17 23:55:13.703505+05:30
163	49	3	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-02-18 00:55:13.703505+05:30	2026-02-18 00:55:13.703505+05:30
164	50	1	\N	OPEN	ASSIGN	Issue created via chat	2026-02-17 21:55:13.703505+05:30	2026-02-17 21:55:13.703505+05:30
165	50	1	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-02-17 22:55:13.703505+05:30	2026-02-17 22:55:13.703505+05:30
166	51	2	\N	OPEN	ASSIGN	Issue created via chat	2026-02-17 19:55:13.703505+05:30	2026-02-17 19:55:13.703505+05:30
167	51	2	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-02-17 20:55:13.703505+05:30	2026-02-17 20:55:13.703505+05:30
168	52	3	\N	OPEN	ASSIGN	Issue created via chat	2026-02-17 17:55:13.703505+05:30	2026-02-17 17:55:13.703505+05:30
169	52	3	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-02-17 18:55:13.703505+05:30	2026-02-17 18:55:13.703505+05:30
170	53	3	\N	OPEN	ASSIGN	Issue created via chat	2026-02-19 15:55:13.703505+05:30	2026-02-19 15:55:13.703505+05:30
171	54	3	\N	OPEN	ASSIGN	Issue created via chat	2026-02-19 14:55:13.703505+05:30	2026-02-19 14:55:13.703505+05:30
172	55	1	\N	OPEN	ASSIGN	Issue created via chat	2026-02-19 13:55:13.703505+05:30	2026-02-19 13:55:13.703505+05:30
173	56	2	\N	OPEN	ASSIGN	Issue created via chat	2026-02-19 12:55:13.703505+05:30	2026-02-19 12:55:13.703505+05:30
174	57	3	\N	OPEN	ASSIGN	Issue created via chat	2026-02-19 11:55:13.703505+05:30	2026-02-19 11:55:13.703505+05:30
175	58	2	\N	OPEN	ASSIGN	Issue created via chat	2026-02-19 10:55:13.703505+05:30	2026-02-19 10:55:13.703505+05:30
176	59	1	\N	OPEN	ASSIGN	Issue created via chat	2026-02-19 09:55:13.703505+05:30	2026-02-19 09:55:13.703505+05:30
177	60	1	\N	OPEN	ASSIGN	Issue created via chat	2026-02-19 08:55:13.703505+05:30	2026-02-19 08:55:13.703505+05:30
178	61	1	\N	OPEN	ASSIGN	Issue created via chat	2026-02-19 07:55:13.703505+05:30	2026-02-19 07:55:13.703505+05:30
179	62	2	\N	OPEN	ASSIGN	Issue created via chat	2026-02-19 06:55:13.703505+05:30	2026-02-19 06:55:13.703505+05:30
180	63	2	\N	OPEN	ASSIGN	Issue created via chat	2026-02-19 05:55:13.703505+05:30	2026-02-19 05:55:13.703505+05:30
181	64	3	\N	OPEN	ASSIGN	Issue created via chat	2026-02-19 04:55:13.703505+05:30	2026-02-19 04:55:13.703505+05:30
182	65	3	\N	OPEN	ASSIGN	Issue created via chat	2026-02-19 03:55:13.703505+05:30	2026-02-19 03:55:13.703505+05:30
183	66	1	\N	OPEN	ASSIGN	Issue created via chat	2026-02-19 02:55:13.703505+05:30	2026-02-19 02:55:13.703505+05:30
184	67	2	\N	OPEN	ASSIGN	Issue created via chat	2026-02-19 01:55:13.703505+05:30	2026-02-19 01:55:13.703505+05:30
185	68	2	\N	OPEN	ASSIGN	Issue created via chat	2026-02-15 15:55:13.703505+05:30	2026-02-15 15:55:13.703505+05:30
186	68	2	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-02-15 16:55:13.703505+05:30	2026-02-15 16:55:13.703505+05:30
187	68	\N	ASSIGNED	IN_PROGRESS	UPDATE	Solver started work	2026-02-15 18:55:13.703505+05:30	2026-02-15 18:55:13.703505+05:30
188	69	3	\N	OPEN	ASSIGN	Issue created via chat	2026-02-15 12:55:13.703505+05:30	2026-02-15 12:55:13.703505+05:30
189	69	3	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-02-15 13:55:13.703505+05:30	2026-02-15 13:55:13.703505+05:30
190	69	\N	ASSIGNED	IN_PROGRESS	UPDATE	Solver started work	2026-02-15 15:55:13.703505+05:30	2026-02-15 15:55:13.703505+05:30
191	70	1	\N	OPEN	ASSIGN	Issue created via chat	2026-02-15 09:55:13.703505+05:30	2026-02-15 09:55:13.703505+05:30
192	70	1	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-02-15 10:55:13.703505+05:30	2026-02-15 10:55:13.703505+05:30
193	70	\N	ASSIGNED	IN_PROGRESS	UPDATE	Solver started work	2026-02-15 12:55:13.703505+05:30	2026-02-15 12:55:13.703505+05:30
194	71	2	\N	OPEN	ASSIGN	Issue created via chat	2026-02-15 06:55:13.703505+05:30	2026-02-15 06:55:13.703505+05:30
195	71	2	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-02-15 07:55:13.703505+05:30	2026-02-15 07:55:13.703505+05:30
196	71	\N	ASSIGNED	IN_PROGRESS	UPDATE	Solver started work	2026-02-15 09:55:13.703505+05:30	2026-02-15 09:55:13.703505+05:30
197	72	3	\N	OPEN	ASSIGN	Issue created via chat	2026-02-15 03:55:13.703505+05:30	2026-02-15 03:55:13.703505+05:30
198	72	3	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-02-15 04:55:13.703505+05:30	2026-02-15 04:55:13.703505+05:30
199	72	\N	ASSIGNED	IN_PROGRESS	UPDATE	Solver started work	2026-02-15 06:55:13.703505+05:30	2026-02-15 06:55:13.703505+05:30
200	73	1	\N	OPEN	ASSIGN	Issue created via chat	2026-02-15 00:55:13.703505+05:30	2026-02-15 00:55:13.703505+05:30
201	73	1	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-02-15 01:55:13.703505+05:30	2026-02-15 01:55:13.703505+05:30
202	73	\N	ASSIGNED	IN_PROGRESS	UPDATE	Solver started work	2026-02-15 03:55:13.703505+05:30	2026-02-15 03:55:13.703505+05:30
203	74	2	\N	OPEN	ASSIGN	Issue created via chat	2026-02-14 21:55:13.703505+05:30	2026-02-14 21:55:13.703505+05:30
204	74	2	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-02-14 22:55:13.703505+05:30	2026-02-14 22:55:13.703505+05:30
205	74	\N	ASSIGNED	IN_PROGRESS	UPDATE	Solver started work	2026-02-15 00:55:13.703505+05:30	2026-02-15 00:55:13.703505+05:30
206	75	3	\N	OPEN	ASSIGN	Issue created via chat	2026-02-14 18:55:13.703505+05:30	2026-02-14 18:55:13.703505+05:30
207	75	3	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-02-14 19:55:13.703505+05:30	2026-02-14 19:55:13.703505+05:30
208	75	\N	ASSIGNED	IN_PROGRESS	UPDATE	Solver started work	2026-02-14 21:55:13.703505+05:30	2026-02-14 21:55:13.703505+05:30
209	76	1	\N	OPEN	ASSIGN	Issue created via chat	2026-02-14 15:55:13.703505+05:30	2026-02-14 15:55:13.703505+05:30
210	76	1	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-02-14 16:55:13.703505+05:30	2026-02-14 16:55:13.703505+05:30
211	76	\N	ASSIGNED	IN_PROGRESS	UPDATE	Solver started work	2026-02-14 18:55:13.703505+05:30	2026-02-14 18:55:13.703505+05:30
212	76	1	RESOLVED_PENDING_REVIEW	REOPENED	COMPLAINT	Complaint filed — work unsatisfactory	2026-02-20 08:55:13.703505+05:30	2026-02-20 08:55:13.703505+05:30
213	77	2	\N	OPEN	ASSIGN	Issue created via chat	2026-02-14 13:55:13.703505+05:30	2026-02-14 13:55:13.703505+05:30
214	77	2	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-02-14 14:55:13.703505+05:30	2026-02-14 14:55:13.703505+05:30
215	77	\N	ASSIGNED	IN_PROGRESS	UPDATE	Solver started work	2026-02-14 16:55:13.703505+05:30	2026-02-14 16:55:13.703505+05:30
216	77	2	RESOLVED_PENDING_REVIEW	REOPENED	COMPLAINT	Complaint filed — work unsatisfactory	2026-02-20 07:55:13.703505+05:30	2026-02-20 07:55:13.703505+05:30
217	78	3	\N	OPEN	ASSIGN	Issue created via chat	2026-02-14 11:55:13.703505+05:30	2026-02-14 11:55:13.703505+05:30
218	78	3	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-02-14 12:55:13.703505+05:30	2026-02-14 12:55:13.703505+05:30
219	78	\N	ASSIGNED	IN_PROGRESS	UPDATE	Solver started work	2026-02-14 14:55:13.703505+05:30	2026-02-14 14:55:13.703505+05:30
220	78	3	RESOLVED_PENDING_REVIEW	REOPENED	COMPLAINT	Complaint filed — work unsatisfactory	2026-02-20 06:55:13.703505+05:30	2026-02-20 06:55:13.703505+05:30
221	79	3	\N	OPEN	ASSIGN	Issue created via chat	2026-02-14 09:55:13.703505+05:30	2026-02-14 09:55:13.703505+05:30
222	79	3	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-02-14 10:55:13.703505+05:30	2026-02-14 10:55:13.703505+05:30
223	79	\N	ASSIGNED	IN_PROGRESS	UPDATE	Solver started work	2026-02-14 12:55:13.703505+05:30	2026-02-14 12:55:13.703505+05:30
224	79	3	RESOLVED_PENDING_REVIEW	REOPENED	COMPLAINT	Complaint filed — work unsatisfactory	2026-02-20 05:55:13.703505+05:30	2026-02-20 05:55:13.703505+05:30
225	80	1	\N	OPEN	ASSIGN	Issue created via chat	2026-02-14 07:55:13.703505+05:30	2026-02-14 07:55:13.703505+05:30
226	80	1	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-02-14 08:55:13.703505+05:30	2026-02-14 08:55:13.703505+05:30
227	80	\N	ASSIGNED	IN_PROGRESS	UPDATE	Solver started work	2026-02-14 10:55:13.703505+05:30	2026-02-14 10:55:13.703505+05:30
228	80	1	RESOLVED_PENDING_REVIEW	REOPENED	COMPLAINT	Complaint filed — work unsatisfactory	2026-02-20 04:55:13.703505+05:30	2026-02-20 04:55:13.703505+05:30
229	81	2	\N	OPEN	ASSIGN	Issue created via chat	2026-02-14 05:55:13.703505+05:30	2026-02-14 05:55:13.703505+05:30
230	81	2	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-02-14 06:55:13.703505+05:30	2026-02-14 06:55:13.703505+05:30
231	81	\N	ASSIGNED	IN_PROGRESS	UPDATE	Solver started work	2026-02-14 08:55:13.703505+05:30	2026-02-14 08:55:13.703505+05:30
232	81	2	RESOLVED_PENDING_REVIEW	REOPENED	COMPLAINT	Complaint filed — work unsatisfactory	2026-02-20 03:55:13.703505+05:30	2026-02-20 03:55:13.703505+05:30
233	82	2	\N	OPEN	ASSIGN	Issue created via chat	2026-02-14 03:55:13.703505+05:30	2026-02-14 03:55:13.703505+05:30
234	82	2	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-02-14 04:55:13.703505+05:30	2026-02-14 04:55:13.703505+05:30
235	82	\N	ASSIGNED	IN_PROGRESS	UPDATE	Solver started work	2026-02-14 06:55:13.703505+05:30	2026-02-14 06:55:13.703505+05:30
236	82	2	RESOLVED_PENDING_REVIEW	REOPENED	COMPLAINT	Complaint filed — work unsatisfactory	2026-02-20 02:55:13.703505+05:30	2026-02-20 02:55:13.703505+05:30
237	83	2	\N	OPEN	ASSIGN	Issue created via chat	2026-02-14 01:55:13.703505+05:30	2026-02-14 01:55:13.703505+05:30
238	83	2	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-02-14 02:55:13.703505+05:30	2026-02-14 02:55:13.703505+05:30
239	83	\N	ASSIGNED	IN_PROGRESS	UPDATE	Solver started work	2026-02-14 04:55:13.703505+05:30	2026-02-14 04:55:13.703505+05:30
240	83	2	RESOLVED_PENDING_REVIEW	REOPENED	COMPLAINT	Complaint filed — work unsatisfactory	2026-02-20 01:55:13.703505+05:30	2026-02-20 01:55:13.703505+05:30
241	84	3	\N	OPEN	ASSIGN	Issue created via chat	2026-02-16 15:55:13.703505+05:30	2026-02-16 15:55:13.703505+05:30
242	84	3	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-02-16 16:55:13.703505+05:30	2026-02-16 16:55:13.703505+05:30
243	84	\N	ASSIGNED	IN_PROGRESS	UPDATE	Solver started work	2026-02-16 18:55:13.703505+05:30	2026-02-16 18:55:13.703505+05:30
244	84	\N	IN_PROGRESS	ESCALATED	UPDATE	System escalated — no response	2026-02-20 15:55:13.703505+05:30	2026-02-20 15:55:13.703505+05:30
245	85	3	\N	OPEN	ASSIGN	Issue created via chat	2026-02-16 12:55:13.703505+05:30	2026-02-16 12:55:13.703505+05:30
246	85	3	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-02-16 13:55:13.703505+05:30	2026-02-16 13:55:13.703505+05:30
247	85	\N	ASSIGNED	IN_PROGRESS	UPDATE	Solver started work	2026-02-16 15:55:13.703505+05:30	2026-02-16 15:55:13.703505+05:30
248	85	\N	IN_PROGRESS	ESCALATED	UPDATE	System escalated — no response	2026-02-20 13:55:13.703505+05:30	2026-02-20 13:55:13.703505+05:30
249	86	2	\N	OPEN	ASSIGN	Issue created via chat	2026-02-16 09:55:13.703505+05:30	2026-02-16 09:55:13.703505+05:30
250	86	2	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-02-16 10:55:13.703505+05:30	2026-02-16 10:55:13.703505+05:30
251	86	\N	ASSIGNED	IN_PROGRESS	UPDATE	Solver started work	2026-02-16 12:55:13.703505+05:30	2026-02-16 12:55:13.703505+05:30
252	86	\N	IN_PROGRESS	ESCALATED	UPDATE	System escalated — no response	2026-02-20 11:55:13.703505+05:30	2026-02-20 11:55:13.703505+05:30
253	87	2	\N	OPEN	ASSIGN	Issue created via chat	2026-02-16 06:55:13.703505+05:30	2026-02-16 06:55:13.703505+05:30
254	87	2	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-02-16 07:55:13.703505+05:30	2026-02-16 07:55:13.703505+05:30
255	87	\N	ASSIGNED	IN_PROGRESS	UPDATE	Solver started work	2026-02-16 09:55:13.703505+05:30	2026-02-16 09:55:13.703505+05:30
256	87	\N	IN_PROGRESS	ESCALATED	UPDATE	System escalated — no response	2026-02-20 09:55:13.703505+05:30	2026-02-20 09:55:13.703505+05:30
257	88	3	\N	OPEN	ASSIGN	Issue created via chat	2026-02-16 03:55:13.703505+05:30	2026-02-16 03:55:13.703505+05:30
258	88	3	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-02-16 04:55:13.703505+05:30	2026-02-16 04:55:13.703505+05:30
259	88	\N	ASSIGNED	IN_PROGRESS	UPDATE	Solver started work	2026-02-16 06:55:13.703505+05:30	2026-02-16 06:55:13.703505+05:30
260	88	\N	IN_PROGRESS	ESCALATED	UPDATE	System escalated — no response	2026-02-20 07:55:13.703505+05:30	2026-02-20 07:55:13.703505+05:30
261	89	3	\N	OPEN	ASSIGN	Issue created via chat	2026-02-16 00:55:13.703505+05:30	2026-02-16 00:55:13.703505+05:30
262	89	3	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-02-16 01:55:13.703505+05:30	2026-02-16 01:55:13.703505+05:30
263	89	\N	ASSIGNED	IN_PROGRESS	UPDATE	Solver started work	2026-02-16 03:55:13.703505+05:30	2026-02-16 03:55:13.703505+05:30
264	89	\N	IN_PROGRESS	ESCALATED	UPDATE	System escalated — no response	2026-02-20 05:55:13.703505+05:30	2026-02-20 05:55:13.703505+05:30
265	90	2	\N	OPEN	ASSIGN	Issue created via chat	2026-02-15 21:55:13.703505+05:30	2026-02-15 21:55:13.703505+05:30
266	90	2	OPEN	ASSIGNED	ASSIGN	Solver auto-assigned	2026-02-15 22:55:13.703505+05:30	2026-02-15 22:55:13.703505+05:30
267	90	\N	ASSIGNED	IN_PROGRESS	UPDATE	Solver started work	2026-02-16 00:55:13.703505+05:30	2026-02-16 00:55:13.703505+05:30
268	90	\N	IN_PROGRESS	ESCALATED	UPDATE	System escalated — no response	2026-02-20 03:55:13.703505+05:30	2026-02-20 03:55:13.703505+05:30
269	91	1	\N	OPEN	ASSIGN	Created via chat by Priya Sharma	2026-02-20 18:27:45.3968+05:30	2026-02-20 18:27:45.3968+05:30
270	91	1	OPEN	ASSIGNED	ASSIGN	Auto-assigned to Vijay Moorthy (skill: mechanical, priority: 7)	2026-02-20 18:27:45.3968+05:30	2026-02-20 18:27:45.3968+05:30
271	92	1	\N	OPEN	ASSIGN	Created via chat by Priya Sharma	2026-02-20 18:28:08.742562+05:30	2026-02-20 18:28:08.742562+05:30
272	92	1	OPEN	ASSIGNED	ASSIGN	Auto-assigned to Vijay Moorthy (skill: mechanical, priority: 7)	2026-02-20 18:28:08.742562+05:30	2026-02-20 18:28:08.742562+05:30
\.


--
-- Data for Name: issue_images; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.issue_images (id, issue_id, uploaded_by_user_id, image_url, image_type, ai_flag, ai_details, created_at, updated_at) FROM stdin;
1	1	1	https://ik.imagekit.io/facility/issues/1/before-1.jpg	BEFORE	NOT_CHECKED	{}	2026-01-31 15:55:13.703505+05:30	2026-01-31 15:55:13.703505+05:30
2	2	2	https://ik.imagekit.io/facility/issues/2/before-2.jpg	BEFORE	NOT_CHECKED	{}	2026-02-03 14:55:13.703505+05:30	2026-02-03 14:55:13.703505+05:30
3	3	1	https://ik.imagekit.io/facility/issues/3/before-3.jpg	BEFORE	NOT_CHECKED	{}	2026-02-01 13:55:13.703505+05:30	2026-02-01 13:55:13.703505+05:30
4	4	1	https://ik.imagekit.io/facility/issues/4/before-4.jpg	BEFORE	NOT_CHECKED	{}	2026-02-05 12:55:13.703505+05:30	2026-02-05 12:55:13.703505+05:30
5	5	3	https://ik.imagekit.io/facility/issues/5/before-5.jpg	BEFORE	NOT_CHECKED	{}	2026-02-04 11:55:13.703505+05:30	2026-02-04 11:55:13.703505+05:30
6	6	3	https://ik.imagekit.io/facility/issues/6/before-6.jpg	BEFORE	NOT_CHECKED	{}	2026-01-26 10:55:13.703505+05:30	2026-01-26 10:55:13.703505+05:30
7	7	3	https://ik.imagekit.io/facility/issues/7/before-7.jpg	BEFORE	NOT_CHECKED	{}	2026-01-28 09:55:13.703505+05:30	2026-01-28 09:55:13.703505+05:30
8	8	3	https://ik.imagekit.io/facility/issues/8/before-8.jpg	BEFORE	NOT_CHECKED	{}	2026-01-30 08:55:13.703505+05:30	2026-01-30 08:55:13.703505+05:30
9	9	1	https://ik.imagekit.io/facility/issues/9/before-9.jpg	BEFORE	NOT_CHECKED	{}	2026-02-07 07:55:13.703505+05:30	2026-02-07 07:55:13.703505+05:30
10	10	2	https://ik.imagekit.io/facility/issues/10/before-10.jpg	BEFORE	NOT_CHECKED	{}	2026-01-21 06:55:13.703505+05:30	2026-01-21 06:55:13.703505+05:30
11	11	1	https://ik.imagekit.io/facility/issues/11/before-11.jpg	BEFORE	NOT_CHECKED	{}	2026-01-24 05:55:13.703505+05:30	2026-01-24 05:55:13.703505+05:30
12	12	1	https://ik.imagekit.io/facility/issues/12/before-12.jpg	BEFORE	NOT_CHECKED	{}	2026-02-08 04:55:13.703505+05:30	2026-02-08 04:55:13.703505+05:30
13	13	2	https://ik.imagekit.io/facility/issues/13/before-13.jpg	BEFORE	NOT_CHECKED	{}	2026-02-02 15:55:13.703505+05:30	2026-02-02 15:55:13.703505+05:30
14	14	2	https://ik.imagekit.io/facility/issues/14/before-14.jpg	BEFORE	NOT_CHECKED	{}	2026-02-09 14:55:13.703505+05:30	2026-02-09 14:55:13.703505+05:30
15	15	3	https://ik.imagekit.io/facility/issues/15/before-15.jpg	BEFORE	NOT_CHECKED	{}	2026-02-06 13:55:13.703505+05:30	2026-02-06 13:55:13.703505+05:30
16	16	1	https://ik.imagekit.io/facility/issues/16/before-16.jpg	BEFORE	NOT_CHECKED	{}	2026-02-05 12:55:13.703505+05:30	2026-02-05 12:55:13.703505+05:30
17	17	2	https://ik.imagekit.io/facility/issues/17/before-17.jpg	BEFORE	NOT_CHECKED	{}	2026-01-31 11:55:13.703505+05:30	2026-01-31 11:55:13.703505+05:30
18	18	2	https://ik.imagekit.io/facility/issues/18/before-18.jpg	BEFORE	NOT_CHECKED	{}	2026-02-03 10:55:13.703505+05:30	2026-02-03 10:55:13.703505+05:30
19	19	3	https://ik.imagekit.io/facility/issues/19/before-19.jpg	BEFORE	NOT_CHECKED	{}	2026-02-10 09:55:13.703505+05:30	2026-02-10 09:55:13.703505+05:30
20	20	3	https://ik.imagekit.io/facility/issues/20/before-20.jpg	BEFORE	NOT_CHECKED	{}	2026-01-26 08:55:13.703505+05:30	2026-01-26 08:55:13.703505+05:30
21	21	2	https://ik.imagekit.io/facility/issues/21/before-21.jpg	BEFORE	NOT_CHECKED	{}	2026-02-07 07:55:13.703505+05:30	2026-02-07 07:55:13.703505+05:30
22	22	1	https://ik.imagekit.io/facility/issues/22/before-22.jpg	BEFORE	NOT_CHECKED	{}	2026-01-28 06:55:13.703505+05:30	2026-01-28 06:55:13.703505+05:30
23	23	1	https://ik.imagekit.io/facility/issues/23/before-23.jpg	BEFORE	NOT_CHECKED	{}	2026-02-08 05:55:13.703505+05:30	2026-02-08 05:55:13.703505+05:30
24	24	3	https://ik.imagekit.io/facility/issues/24/before-24.jpg	BEFORE	NOT_CHECKED	{}	2026-02-05 04:55:13.703505+05:30	2026-02-05 04:55:13.703505+05:30
25	25	3	https://ik.imagekit.io/facility/issues/25/before-25.jpg	BEFORE	NOT_CHECKED	{}	2026-02-11 15:55:13.703505+05:30	2026-02-11 15:55:13.703505+05:30
26	26	1	https://ik.imagekit.io/facility/issues/26/before-26.jpg	BEFORE	NOT_CHECKED	{}	2026-02-17 15:55:13.703505+05:30	2026-02-17 15:55:13.703505+05:30
27	27	2	https://ik.imagekit.io/facility/issues/27/before-27.jpg	BEFORE	NOT_CHECKED	{}	2026-02-17 13:55:13.703505+05:30	2026-02-17 13:55:13.703505+05:30
28	28	2	https://ik.imagekit.io/facility/issues/28/before-28.jpg	BEFORE	NOT_CHECKED	{}	2026-02-17 11:55:13.703505+05:30	2026-02-17 11:55:13.703505+05:30
29	29	3	https://ik.imagekit.io/facility/issues/29/before-29.jpg	BEFORE	NOT_CHECKED	{}	2026-02-17 09:55:13.703505+05:30	2026-02-17 09:55:13.703505+05:30
30	30	1	https://ik.imagekit.io/facility/issues/30/before-30.jpg	BEFORE	NOT_CHECKED	{}	2026-02-17 07:55:13.703505+05:30	2026-02-17 07:55:13.703505+05:30
31	31	2	https://ik.imagekit.io/facility/issues/31/before-31.jpg	BEFORE	NOT_CHECKED	{}	2026-02-17 05:55:13.703505+05:30	2026-02-17 05:55:13.703505+05:30
32	32	3	https://ik.imagekit.io/facility/issues/32/before-32.jpg	BEFORE	NOT_CHECKED	{}	2026-02-17 03:55:13.703505+05:30	2026-02-17 03:55:13.703505+05:30
33	33	3	https://ik.imagekit.io/facility/issues/33/before-33.jpg	BEFORE	NOT_CHECKED	{}	2026-02-17 01:55:13.703505+05:30	2026-02-17 01:55:13.703505+05:30
34	34	3	https://ik.imagekit.io/facility/issues/34/before-34.jpg	BEFORE	NOT_CHECKED	{}	2026-02-16 23:55:13.703505+05:30	2026-02-16 23:55:13.703505+05:30
35	35	1	https://ik.imagekit.io/facility/issues/35/before-35.jpg	BEFORE	NOT_CHECKED	{}	2026-02-16 21:55:13.703505+05:30	2026-02-16 21:55:13.703505+05:30
36	36	2	https://ik.imagekit.io/facility/issues/36/before-36.jpg	BEFORE	NOT_CHECKED	{}	2026-02-16 19:55:13.703505+05:30	2026-02-16 19:55:13.703505+05:30
37	37	3	https://ik.imagekit.io/facility/issues/37/before-37.jpg	BEFORE	NOT_CHECKED	{}	2026-02-16 17:55:13.703505+05:30	2026-02-16 17:55:13.703505+05:30
38	38	2	https://ik.imagekit.io/facility/issues/38/before-38.jpg	BEFORE	NOT_CHECKED	{}	2026-02-16 15:55:13.703505+05:30	2026-02-16 15:55:13.703505+05:30
39	39	1	https://ik.imagekit.io/facility/issues/39/before-39.jpg	BEFORE	NOT_CHECKED	{}	2026-02-16 13:55:13.703505+05:30	2026-02-16 13:55:13.703505+05:30
40	40	1	https://ik.imagekit.io/facility/issues/40/before-40.jpg	BEFORE	NOT_CHECKED	{}	2026-02-16 11:55:13.703505+05:30	2026-02-16 11:55:13.703505+05:30
41	41	1	https://ik.imagekit.io/facility/issues/41/before-41.jpg	BEFORE	NOT_CHECKED	{}	2026-02-18 15:55:13.703505+05:30	2026-02-18 15:55:13.703505+05:30
42	42	2	https://ik.imagekit.io/facility/issues/42/before-42.jpg	BEFORE	NOT_CHECKED	{}	2026-02-18 13:55:13.703505+05:30	2026-02-18 13:55:13.703505+05:30
43	43	2	https://ik.imagekit.io/facility/issues/43/before-43.jpg	BEFORE	NOT_CHECKED	{}	2026-02-18 11:55:13.703505+05:30	2026-02-18 11:55:13.703505+05:30
44	44	3	https://ik.imagekit.io/facility/issues/44/before-44.jpg	BEFORE	NOT_CHECKED	{}	2026-02-18 09:55:13.703505+05:30	2026-02-18 09:55:13.703505+05:30
45	45	3	https://ik.imagekit.io/facility/issues/45/before-45.jpg	BEFORE	NOT_CHECKED	{}	2026-02-18 07:55:13.703505+05:30	2026-02-18 07:55:13.703505+05:30
46	46	1	https://ik.imagekit.io/facility/issues/46/before-46.jpg	BEFORE	NOT_CHECKED	{}	2026-02-18 05:55:13.703505+05:30	2026-02-18 05:55:13.703505+05:30
47	47	2	https://ik.imagekit.io/facility/issues/47/before-47.jpg	BEFORE	NOT_CHECKED	{}	2026-02-18 03:55:13.703505+05:30	2026-02-18 03:55:13.703505+05:30
48	48	2	https://ik.imagekit.io/facility/issues/48/before-48.jpg	BEFORE	NOT_CHECKED	{}	2026-02-18 01:55:13.703505+05:30	2026-02-18 01:55:13.703505+05:30
49	49	3	https://ik.imagekit.io/facility/issues/49/before-49.jpg	BEFORE	NOT_CHECKED	{}	2026-02-17 23:55:13.703505+05:30	2026-02-17 23:55:13.703505+05:30
50	50	1	https://ik.imagekit.io/facility/issues/50/before-50.jpg	BEFORE	NOT_CHECKED	{}	2026-02-17 21:55:13.703505+05:30	2026-02-17 21:55:13.703505+05:30
51	51	2	https://ik.imagekit.io/facility/issues/51/before-51.jpg	BEFORE	NOT_CHECKED	{}	2026-02-17 19:55:13.703505+05:30	2026-02-17 19:55:13.703505+05:30
52	52	3	https://ik.imagekit.io/facility/issues/52/before-52.jpg	BEFORE	NOT_CHECKED	{}	2026-02-17 17:55:13.703505+05:30	2026-02-17 17:55:13.703505+05:30
53	53	3	https://ik.imagekit.io/facility/issues/53/before-53.jpg	BEFORE	NOT_CHECKED	{}	2026-02-19 15:55:13.703505+05:30	2026-02-19 15:55:13.703505+05:30
54	54	3	https://ik.imagekit.io/facility/issues/54/before-54.jpg	BEFORE	NOT_CHECKED	{}	2026-02-19 14:55:13.703505+05:30	2026-02-19 14:55:13.703505+05:30
55	55	1	https://ik.imagekit.io/facility/issues/55/before-55.jpg	BEFORE	NOT_CHECKED	{}	2026-02-19 13:55:13.703505+05:30	2026-02-19 13:55:13.703505+05:30
56	56	2	https://ik.imagekit.io/facility/issues/56/before-56.jpg	BEFORE	NOT_CHECKED	{}	2026-02-19 12:55:13.703505+05:30	2026-02-19 12:55:13.703505+05:30
57	57	3	https://ik.imagekit.io/facility/issues/57/before-57.jpg	BEFORE	NOT_CHECKED	{}	2026-02-19 11:55:13.703505+05:30	2026-02-19 11:55:13.703505+05:30
58	58	2	https://ik.imagekit.io/facility/issues/58/before-58.jpg	BEFORE	NOT_CHECKED	{}	2026-02-19 10:55:13.703505+05:30	2026-02-19 10:55:13.703505+05:30
59	59	1	https://ik.imagekit.io/facility/issues/59/before-59.jpg	BEFORE	NOT_CHECKED	{}	2026-02-19 09:55:13.703505+05:30	2026-02-19 09:55:13.703505+05:30
60	60	1	https://ik.imagekit.io/facility/issues/60/before-60.jpg	BEFORE	NOT_CHECKED	{}	2026-02-19 08:55:13.703505+05:30	2026-02-19 08:55:13.703505+05:30
61	61	1	https://ik.imagekit.io/facility/issues/61/before-61.jpg	BEFORE	NOT_CHECKED	{}	2026-02-19 07:55:13.703505+05:30	2026-02-19 07:55:13.703505+05:30
62	62	2	https://ik.imagekit.io/facility/issues/62/before-62.jpg	BEFORE	NOT_CHECKED	{}	2026-02-19 06:55:13.703505+05:30	2026-02-19 06:55:13.703505+05:30
63	63	2	https://ik.imagekit.io/facility/issues/63/before-63.jpg	BEFORE	NOT_CHECKED	{}	2026-02-19 05:55:13.703505+05:30	2026-02-19 05:55:13.703505+05:30
64	64	3	https://ik.imagekit.io/facility/issues/64/before-64.jpg	BEFORE	NOT_CHECKED	{}	2026-02-19 04:55:13.703505+05:30	2026-02-19 04:55:13.703505+05:30
65	65	3	https://ik.imagekit.io/facility/issues/65/before-65.jpg	BEFORE	NOT_CHECKED	{}	2026-02-19 03:55:13.703505+05:30	2026-02-19 03:55:13.703505+05:30
66	66	1	https://ik.imagekit.io/facility/issues/66/before-66.jpg	BEFORE	NOT_CHECKED	{}	2026-02-19 02:55:13.703505+05:30	2026-02-19 02:55:13.703505+05:30
67	67	2	https://ik.imagekit.io/facility/issues/67/before-67.jpg	BEFORE	NOT_CHECKED	{}	2026-02-19 01:55:13.703505+05:30	2026-02-19 01:55:13.703505+05:30
68	68	2	https://ik.imagekit.io/facility/issues/68/before-68.jpg	BEFORE	NOT_CHECKED	{}	2026-02-15 15:55:13.703505+05:30	2026-02-15 15:55:13.703505+05:30
69	69	3	https://ik.imagekit.io/facility/issues/69/before-69.jpg	BEFORE	NOT_CHECKED	{}	2026-02-15 12:55:13.703505+05:30	2026-02-15 12:55:13.703505+05:30
70	70	1	https://ik.imagekit.io/facility/issues/70/before-70.jpg	BEFORE	NOT_CHECKED	{}	2026-02-15 09:55:13.703505+05:30	2026-02-15 09:55:13.703505+05:30
71	71	2	https://ik.imagekit.io/facility/issues/71/before-71.jpg	BEFORE	NOT_CHECKED	{}	2026-02-15 06:55:13.703505+05:30	2026-02-15 06:55:13.703505+05:30
72	72	3	https://ik.imagekit.io/facility/issues/72/before-72.jpg	BEFORE	NOT_CHECKED	{}	2026-02-15 03:55:13.703505+05:30	2026-02-15 03:55:13.703505+05:30
73	73	1	https://ik.imagekit.io/facility/issues/73/before-73.jpg	BEFORE	NOT_CHECKED	{}	2026-02-15 00:55:13.703505+05:30	2026-02-15 00:55:13.703505+05:30
74	74	2	https://ik.imagekit.io/facility/issues/74/before-74.jpg	BEFORE	NOT_CHECKED	{}	2026-02-14 21:55:13.703505+05:30	2026-02-14 21:55:13.703505+05:30
75	75	3	https://ik.imagekit.io/facility/issues/75/before-75.jpg	BEFORE	NOT_CHECKED	{}	2026-02-14 18:55:13.703505+05:30	2026-02-14 18:55:13.703505+05:30
76	76	1	https://ik.imagekit.io/facility/issues/76/before-76.jpg	BEFORE	NOT_CHECKED	{}	2026-02-14 15:55:13.703505+05:30	2026-02-14 15:55:13.703505+05:30
77	77	2	https://ik.imagekit.io/facility/issues/77/before-77.jpg	BEFORE	NOT_CHECKED	{}	2026-02-14 13:55:13.703505+05:30	2026-02-14 13:55:13.703505+05:30
78	78	3	https://ik.imagekit.io/facility/issues/78/before-78.jpg	BEFORE	NOT_CHECKED	{}	2026-02-14 11:55:13.703505+05:30	2026-02-14 11:55:13.703505+05:30
79	79	3	https://ik.imagekit.io/facility/issues/79/before-79.jpg	BEFORE	NOT_CHECKED	{}	2026-02-14 09:55:13.703505+05:30	2026-02-14 09:55:13.703505+05:30
80	80	1	https://ik.imagekit.io/facility/issues/80/before-80.jpg	BEFORE	NOT_CHECKED	{}	2026-02-14 07:55:13.703505+05:30	2026-02-14 07:55:13.703505+05:30
81	81	2	https://ik.imagekit.io/facility/issues/81/before-81.jpg	BEFORE	NOT_CHECKED	{}	2026-02-14 05:55:13.703505+05:30	2026-02-14 05:55:13.703505+05:30
82	82	2	https://ik.imagekit.io/facility/issues/82/before-82.jpg	BEFORE	NOT_CHECKED	{}	2026-02-14 03:55:13.703505+05:30	2026-02-14 03:55:13.703505+05:30
83	83	2	https://ik.imagekit.io/facility/issues/83/before-83.jpg	BEFORE	NOT_CHECKED	{}	2026-02-14 01:55:13.703505+05:30	2026-02-14 01:55:13.703505+05:30
84	84	3	https://ik.imagekit.io/facility/issues/84/before-84.jpg	BEFORE	NOT_CHECKED	{}	2026-02-16 15:55:13.703505+05:30	2026-02-16 15:55:13.703505+05:30
85	85	3	https://ik.imagekit.io/facility/issues/85/before-85.jpg	BEFORE	NOT_CHECKED	{}	2026-02-16 12:55:13.703505+05:30	2026-02-16 12:55:13.703505+05:30
86	86	2	https://ik.imagekit.io/facility/issues/86/before-86.jpg	BEFORE	NOT_CHECKED	{}	2026-02-16 09:55:13.703505+05:30	2026-02-16 09:55:13.703505+05:30
87	87	2	https://ik.imagekit.io/facility/issues/87/before-87.jpg	BEFORE	NOT_CHECKED	{}	2026-02-16 06:55:13.703505+05:30	2026-02-16 06:55:13.703505+05:30
88	88	3	https://ik.imagekit.io/facility/issues/88/before-88.jpg	BEFORE	NOT_CHECKED	{}	2026-02-16 03:55:13.703505+05:30	2026-02-16 03:55:13.703505+05:30
89	89	3	https://ik.imagekit.io/facility/issues/89/before-89.jpg	BEFORE	NOT_CHECKED	{}	2026-02-16 00:55:13.703505+05:30	2026-02-16 00:55:13.703505+05:30
90	90	2	https://ik.imagekit.io/facility/issues/90/before-90.jpg	BEFORE	NOT_CHECKED	{}	2026-02-15 21:55:13.703505+05:30	2026-02-15 21:55:13.703505+05:30
91	1	6	https://ik.imagekit.io/facility/issues/1/after-1.jpg	AFTER	OK	{"confidence": 0.88, "repair_visible": true}	2026-02-18 15:55:13.703505+05:30	2026-02-18 15:55:13.703505+05:30
92	2	7	https://ik.imagekit.io/facility/issues/2/after-2.jpg	AFTER	OK	{"confidence": 0.892, "repair_visible": true}	2026-02-18 14:55:13.703505+05:30	2026-02-18 14:55:13.703505+05:30
93	3	8	https://ik.imagekit.io/facility/issues/3/after-3.jpg	AFTER	OK	{"confidence": 0.904, "repair_visible": true}	2026-02-18 13:55:13.703505+05:30	2026-02-18 13:55:13.703505+05:30
94	4	9	https://ik.imagekit.io/facility/issues/4/after-4.jpg	AFTER	OK	{"confidence": 0.916, "repair_visible": true}	2026-02-18 12:55:13.703505+05:30	2026-02-18 12:55:13.703505+05:30
95	5	10	https://ik.imagekit.io/facility/issues/5/after-5.jpg	AFTER	OK	{"confidence": 0.928, "repair_visible": true}	2026-02-18 11:55:13.703505+05:30	2026-02-18 11:55:13.703505+05:30
96	6	6	https://ik.imagekit.io/facility/issues/6/after-6.jpg	AFTER	OK	{"confidence": 0.94, "repair_visible": true}	2026-02-18 10:55:13.703505+05:30	2026-02-18 10:55:13.703505+05:30
97	7	7	https://ik.imagekit.io/facility/issues/7/after-7.jpg	AFTER	OK	{"confidence": 0.952, "repair_visible": true}	2026-02-18 09:55:13.703505+05:30	2026-02-18 09:55:13.703505+05:30
98	8	8	https://ik.imagekit.io/facility/issues/8/after-8.jpg	AFTER	OK	{"confidence": 0.964, "repair_visible": true}	2026-02-18 08:55:13.703505+05:30	2026-02-18 08:55:13.703505+05:30
99	9	9	https://ik.imagekit.io/facility/issues/9/after-9.jpg	AFTER	OK	{"confidence": 0.976, "repair_visible": true}	2026-02-18 07:55:13.703505+05:30	2026-02-18 07:55:13.703505+05:30
100	10	10	https://ik.imagekit.io/facility/issues/10/after-10.jpg	AFTER	OK	{"confidence": 0.988, "repair_visible": true}	2026-02-18 06:55:13.703505+05:30	2026-02-18 06:55:13.703505+05:30
101	11	6	https://ik.imagekit.io/facility/issues/11/after-11.jpg	AFTER	OK	{"confidence": 0.88, "repair_visible": true}	2026-02-18 05:55:13.703505+05:30	2026-02-18 05:55:13.703505+05:30
102	12	7	https://ik.imagekit.io/facility/issues/12/after-12.jpg	AFTER	OK	{"confidence": 0.892, "repair_visible": true}	2026-02-18 04:55:13.703505+05:30	2026-02-18 04:55:13.703505+05:30
103	13	8	https://ik.imagekit.io/facility/issues/13/after-13.jpg	AFTER	OK	{"confidence": 0.904, "repair_visible": true}	2026-02-18 03:55:13.703505+05:30	2026-02-18 03:55:13.703505+05:30
104	14	9	https://ik.imagekit.io/facility/issues/14/after-14.jpg	AFTER	OK	{"confidence": 0.916, "repair_visible": true}	2026-02-18 02:55:13.703505+05:30	2026-02-18 02:55:13.703505+05:30
105	15	10	https://ik.imagekit.io/facility/issues/15/after-15.jpg	AFTER	OK	{"confidence": 0.928, "repair_visible": true}	2026-02-18 01:55:13.703505+05:30	2026-02-18 01:55:13.703505+05:30
106	16	6	https://ik.imagekit.io/facility/issues/16/after-16.jpg	AFTER	OK	{"confidence": 0.94, "repair_visible": true}	2026-02-18 00:55:13.703505+05:30	2026-02-18 00:55:13.703505+05:30
107	17	7	https://ik.imagekit.io/facility/issues/17/after-17.jpg	AFTER	OK	{"confidence": 0.952, "repair_visible": true}	2026-02-17 23:55:13.703505+05:30	2026-02-17 23:55:13.703505+05:30
108	18	8	https://ik.imagekit.io/facility/issues/18/after-18.jpg	AFTER	OK	{"confidence": 0.964, "repair_visible": true}	2026-02-17 22:55:13.703505+05:30	2026-02-17 22:55:13.703505+05:30
109	19	9	https://ik.imagekit.io/facility/issues/19/after-19.jpg	AFTER	OK	{"confidence": 0.976, "repair_visible": true}	2026-02-17 21:55:13.703505+05:30	2026-02-17 21:55:13.703505+05:30
110	20	10	https://ik.imagekit.io/facility/issues/20/after-20.jpg	AFTER	OK	{"confidence": 0.988, "repair_visible": true}	2026-02-17 20:55:13.703505+05:30	2026-02-17 20:55:13.703505+05:30
111	21	6	https://ik.imagekit.io/facility/issues/21/after-21.jpg	AFTER	OK	{"confidence": 0.88, "repair_visible": true}	2026-02-17 19:55:13.703505+05:30	2026-02-17 19:55:13.703505+05:30
112	22	7	https://ik.imagekit.io/facility/issues/22/after-22.jpg	AFTER	OK	{"confidence": 0.892, "repair_visible": true}	2026-02-17 18:55:13.703505+05:30	2026-02-17 18:55:13.703505+05:30
113	23	8	https://ik.imagekit.io/facility/issues/23/after-23.jpg	AFTER	OK	{"confidence": 0.904, "repair_visible": true}	2026-02-17 17:55:13.703505+05:30	2026-02-17 17:55:13.703505+05:30
114	24	9	https://ik.imagekit.io/facility/issues/24/after-24.jpg	AFTER	OK	{"confidence": 0.916, "repair_visible": true}	2026-02-17 16:55:13.703505+05:30	2026-02-17 16:55:13.703505+05:30
115	25	10	https://ik.imagekit.io/facility/issues/25/after-25.jpg	AFTER	OK	{"confidence": 0.928, "repair_visible": true}	2026-02-17 15:55:13.703505+05:30	2026-02-17 15:55:13.703505+05:30
116	68	6	https://ik.imagekit.io/facility/issues/68/after-68.jpg	AFTER	OK	{"confidence": 0.94, "repair_visible": true}	2026-02-17 14:55:13.703505+05:30	2026-02-17 14:55:13.703505+05:30
117	69	7	https://ik.imagekit.io/facility/issues/69/after-69.jpg	AFTER	OK	{"confidence": 0.952, "repair_visible": true}	2026-02-17 13:55:13.703505+05:30	2026-02-17 13:55:13.703505+05:30
118	70	8	https://ik.imagekit.io/facility/issues/70/after-70.jpg	AFTER	OK	{"confidence": 0.964, "repair_visible": true}	2026-02-17 12:55:13.703505+05:30	2026-02-17 12:55:13.703505+05:30
119	71	9	https://ik.imagekit.io/facility/issues/71/after-71.jpg	AFTER	OK	{"confidence": 0.976, "repair_visible": true}	2026-02-17 11:55:13.703505+05:30	2026-02-17 11:55:13.703505+05:30
120	72	10	https://ik.imagekit.io/facility/issues/72/after-72.jpg	AFTER	OK	{"confidence": 0.988, "repair_visible": true}	2026-02-17 10:55:13.703505+05:30	2026-02-17 10:55:13.703505+05:30
121	73	6	https://ik.imagekit.io/facility/issues/73/after-73.jpg	AFTER	OK	{"confidence": 0.88, "repair_visible": true}	2026-02-17 09:55:13.703505+05:30	2026-02-17 09:55:13.703505+05:30
122	74	7	https://ik.imagekit.io/facility/issues/74/after-74.jpg	AFTER	OK	{"confidence": 0.892, "repair_visible": true}	2026-02-17 08:55:13.703505+05:30	2026-02-17 08:55:13.703505+05:30
123	75	8	https://ik.imagekit.io/facility/issues/75/after-75.jpg	AFTER	OK	{"confidence": 0.904, "repair_visible": true}	2026-02-17 07:55:13.703505+05:30	2026-02-17 07:55:13.703505+05:30
\.


--
-- Data for Name: issues; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.issues (id, site_id, raised_by_supervisor_id, title, description, priority, deadline_at, status, track_status, latitude, longitude, created_at, updated_at) FROM stdin;
1	1	1	Pipe Leakage in Main Hall	Major water leak from ceiling pipe joint in main hall affecting work area	HIGH	2026-02-10 15:55:13.703505+05:30	COMPLETED	resolved	13.00000000	80.20000000	2026-01-31 15:55:13.703505+05:30	2026-02-11 15:55:13.703505+05:30
2	2	2	Electrical Panel Fault Block-B	Panel B3 showing intermittent failures and tripping breakers	HIGH	2026-02-13 15:55:13.703505+05:30	COMPLETED	resolved	13.00300000	80.20200000	2026-02-03 14:55:13.703505+05:30	2026-02-14 15:55:13.703505+05:30
3	3	1	AC Unit Not Cooling Properly	Central AC in Block A not maintaining set temperature of 24°C	HIGH	2026-02-11 15:55:13.703505+05:30	COMPLETED	resolved	13.00600000	80.20400000	2026-02-01 13:55:13.703505+05:30	2026-02-12 15:55:13.703505+05:30
4	5	1	Network Switch Failure	Core network switch in server room lost connectivity	HIGH	2026-02-15 15:55:13.703505+05:30	COMPLETED	resolved	13.00900000	80.20600000	2026-02-05 12:55:13.703505+05:30	2026-02-16 15:55:13.703505+05:30
5	4	3	Broken Window Conference Room	Glass cracked in 3rd floor conference room posing safety hazard	MEDIUM	2026-02-14 15:55:13.703505+05:30	COMPLETED	resolved	13.01200000	80.20800000	2026-02-04 11:55:13.703505+05:30	2026-02-15 15:55:13.703505+05:30
6	7	3	Generator Annual Maintenance	Yearly maintenance check and oil change for backup generator	MEDIUM	2026-02-05 15:55:13.703505+05:30	COMPLETED	resolved	13.01500000	80.21000000	2026-01-26 10:55:13.703505+05:30	2026-02-06 15:55:13.703505+05:30
7	8	3	Bathroom Tiles Replacement	Cracked tiles in ground floor men's restroom need replacement	LOW	2026-02-07 15:55:13.703505+05:30	COMPLETED	resolved	13.01800000	80.21200000	2026-01-28 09:55:13.703505+05:30	2026-02-08 15:55:13.703505+05:30
8	9	3	Parking Lot Light Repair	Three parking lot lights not functioning in Zone B	LOW	2026-02-09 15:55:13.703505+05:30	COMPLETED	resolved	13.02100000	80.21400000	2026-01-30 08:55:13.703505+05:30	2026-02-10 15:55:13.703505+05:30
9	10	1	Fire Alarm System Test	Quarterly fire alarm system inspection and testing	HIGH	2026-02-17 15:55:13.703505+05:30	COMPLETED	resolved	13.02400000	80.21600000	2026-02-07 07:55:13.703505+05:30	2026-02-18 15:55:13.703505+05:30
10	13	2	HVAC Duct Cleaning	Annual cleaning of HVAC ducts in Building C	LOW	2026-01-31 15:55:13.703505+05:30	COMPLETED	resolved	13.02700000	80.21800000	2026-01-21 06:55:13.703505+05:30	2026-02-01 15:55:13.703505+05:30
11	14	1	Office Wall Painting	Repainting of reception area walls showing wear	LOW	2026-02-03 15:55:13.703505+05:30	COMPLETED	resolved	13.03000000	80.22000000	2026-01-24 05:55:13.703505+05:30	2026-02-04 15:55:13.703505+05:30
12	15	1	Water Pump Motor Repair	Main water pump motor making unusual grinding noise	HIGH	2026-02-18 15:55:13.703505+05:30	COMPLETED	resolved	13.03300000	80.22200000	2026-02-08 04:55:13.703505+05:30	2026-02-19 15:55:13.703505+05:30
13	6	2	Roof Waterproofing	Roof leaking during monsoon in warehouse section	MEDIUM	2026-02-12 15:55:13.703505+05:30	COMPLETED	resolved	13.03600000	80.22400000	2026-02-02 15:55:13.703505+05:30	2026-02-13 15:55:13.703505+05:30
14	11	2	UPS Battery Replacement	UPS system showing low battery warning for server rack	HIGH	2026-02-19 15:55:13.703505+05:30	COMPLETED	resolved	13.03900000	80.22600000	2026-02-09 14:55:13.703505+05:30	2026-02-20 15:55:13.703505+05:30
15	12	3	Door Lock Replacement	Main entrance electronic lock malfunctioning	MEDIUM	2026-02-16 15:55:13.703505+05:30	COMPLETED	resolved	13.04200000	80.22800000	2026-02-06 13:55:13.703505+05:30	2026-02-17 15:55:13.703505+05:30
16	16	1	Plumbing Valve Repair Cafeteria	Hot water valve leaking in staff cafeteria kitchen	MEDIUM	2026-02-15 15:55:13.703505+05:30	COMPLETED	resolved	13.04500000	80.23000000	2026-02-05 12:55:13.703505+05:30	2026-02-16 15:55:13.703505+05:30
17	17	2	Intercom System Repair	Intercom between floors 2 and 3 not working	LOW	2026-02-10 15:55:13.703505+05:30	COMPLETED	resolved	13.04800000	80.23200000	2026-01-31 11:55:13.703505+05:30	2026-02-11 15:55:13.703505+05:30
18	18	2	Emergency Light Check	Monthly emergency lighting inspection	MEDIUM	2026-02-13 15:55:13.703505+05:30	COMPLETED	resolved	13.05100000	80.23400000	2026-02-03 10:55:13.703505+05:30	2026-02-14 15:55:13.703505+05:30
19	19	3	Conveyor Belt Alignment	Production conveyor belt misaligned causing jams	HIGH	2026-02-20 15:55:13.703505+05:30	COMPLETED	resolved	13.05400000	80.23600000	2026-02-10 09:55:13.703505+05:30	2026-02-21 15:55:13.703505+05:30
20	20	3	Air Compressor Servicing	Routine servicing of industrial air compressor	LOW	2026-02-05 15:55:13.703505+05:30	COMPLETED	resolved	13.05700000	80.23800000	2026-01-26 08:55:13.703505+05:30	2026-02-06 15:55:13.703505+05:30
21	3	2	Exhaust Fan Replacement	Kitchen exhaust fan motor burned out	MEDIUM	2026-02-17 15:55:13.703505+05:30	COMPLETED	resolved	13.06000000	80.24000000	2026-02-07 07:55:13.703505+05:30	2026-02-18 15:55:13.703505+05:30
22	5	1	Cable Tray Installation	New cable tray needed for network expansion	LOW	2026-02-07 15:55:13.703505+05:30	COMPLETED	resolved	13.06300000	80.24200000	2026-01-28 06:55:13.703505+05:30	2026-02-08 15:55:13.703505+05:30
23	1	1	Toilet Flush Mechanism Repair	Multiple flush mechanisms broken in 2nd floor restroom	MEDIUM	2026-02-18 15:55:13.703505+05:30	COMPLETED	resolved	13.06600000	80.24400000	2026-02-08 05:55:13.703505+05:30	2026-02-19 15:55:13.703505+05:30
24	8	3	Window Sealing Work	Rain water seeping through window frames in Block D	MEDIUM	2026-02-15 15:55:13.703505+05:30	COMPLETED	resolved	13.06900000	80.24600000	2026-02-05 04:55:13.703505+05:30	2026-02-16 15:55:13.703505+05:30
25	9	3	Drainage Pipe Unclogging	Storm water drain blocked near parking entrance	HIGH	2026-02-21 15:55:13.703505+05:30	COMPLETED	resolved	13.07200000	80.24800000	2026-02-11 15:55:13.703505+05:30	2026-02-22 15:55:13.703505+05:30
26	1	1	Ceiling Water Stain Repair	Water stain expanding on 4th floor ceiling near elevator	MEDIUM	2026-02-25 15:55:13.703505+05:30	IN_PROGRESS	in_progress	13.00000000	80.20000000	2026-02-17 15:55:13.703505+05:30	2026-02-19 15:55:13.703505+05:30
27	2	2	Power Socket Replacement Block-A	Multiple sockets sparking in open office area	HIGH	2026-02-23 15:55:13.703505+05:30	IN_PROGRESS	in_progress	13.00400000	80.20300000	2026-02-17 13:55:13.703505+05:30	2026-02-19 14:55:13.703505+05:30
28	3	2	Chiller Plant Vibration Issue	Excessive vibration in chiller unit #2	HIGH	2026-02-24 15:55:13.703505+05:30	IN_PROGRESS	in_progress	13.00800000	80.20600000	2026-02-17 11:55:13.703505+05:30	2026-02-19 13:55:13.703505+05:30
29	4	3	Stairwell Handrail Loose	Handrail on fire escape stairwell wobbly and unsafe	HIGH	2026-02-22 15:55:13.703505+05:30	IN_PROGRESS	in_progress	13.01200000	80.20900000	2026-02-17 09:55:13.703505+05:30	2026-02-19 12:55:13.703505+05:30
30	5	1	WiFi Access Point Replacement	Dead zone in meeting room cluster	MEDIUM	2026-02-26 15:55:13.703505+05:30	IN_PROGRESS	in_progress	13.01600000	80.21200000	2026-02-17 07:55:13.703505+05:30	2026-02-19 11:55:13.703505+05:30
31	6	2	Roller Shutter Repair Warehouse	Motorized roller shutter stuck halfway	MEDIUM	2026-02-24 15:55:13.703505+05:30	IN_PROGRESS	in_progress	13.02000000	80.21500000	2026-02-17 05:55:13.703505+05:30	2026-02-19 10:55:13.703505+05:30
32	7	3	Painting Touch-up Corridors	Scuff marks and damage on main corridor walls	LOW	2026-02-28 15:55:13.703505+05:30	IN_PROGRESS	in_progress	13.02400000	80.21800000	2026-02-17 03:55:13.703505+05:30	2026-02-19 09:55:13.703505+05:30
33	8	3	Water Heater Malfunction	Solar water heater not heating in guest block	MEDIUM	2026-02-25 15:55:13.703505+05:30	IN_PROGRESS	in_progress	13.02800000	80.22100000	2026-02-17 01:55:13.703505+05:30	2026-02-19 08:55:13.703505+05:30
34	9	3	Boundary Wall Crack Repair	Structural crack in eastern boundary wall	HIGH	2026-02-23 15:55:13.703505+05:30	IN_PROGRESS	in_progress	13.03200000	80.22400000	2026-02-16 23:55:13.703505+05:30	2026-02-19 07:55:13.703505+05:30
35	10	1	Server Room AC Backup Install	Secondary AC unit installation for redundancy	HIGH	2026-02-24 15:55:13.703505+05:30	IN_PROGRESS	in_progress	13.03600000	80.22700000	2026-02-16 21:55:13.703505+05:30	2026-02-19 06:55:13.703505+05:30
36	11	2	Forklift Hydraulic Leak	Hydraulic fluid leaking from warehouse forklift	HIGH	2026-02-22 15:55:13.703505+05:30	IN_PROGRESS	in_progress	13.04000000	80.23000000	2026-02-16 19:55:13.703505+05:30	2026-02-19 05:55:13.703505+05:30
37	12	3	False Ceiling Repair	Ceiling tiles sagging in accounts department	MEDIUM	2026-02-26 15:55:13.703505+05:30	IN_PROGRESS	in_progress	13.04400000	80.23300000	2026-02-16 17:55:13.703505+05:30	2026-02-19 04:55:13.703505+05:30
38	13	2	Transformer Oil Top-up	Power transformer oil level below minimum mark	HIGH	2026-02-23 15:55:13.703505+05:30	IN_PROGRESS	in_progress	13.04800000	80.23600000	2026-02-16 15:55:13.703505+05:30	2026-02-19 03:55:13.703505+05:30
39	14	1	Garden Irrigation Pipe Burst	Underground irrigation pipe burst near main lawn	LOW	2026-02-27 15:55:13.703505+05:30	IN_PROGRESS	in_progress	13.05200000	80.23900000	2026-02-16 13:55:13.703505+05:30	2026-02-19 02:55:13.703505+05:30
40	15	1	Security Gate Motor Repair	Automatic gate not closing fully	MEDIUM	2026-02-24 15:55:13.703505+05:30	IN_PROGRESS	in_progress	13.05600000	80.24200000	2026-02-16 11:55:13.703505+05:30	2026-02-19 01:55:13.703505+05:30
41	16	1	Pantry Microwave Repair	Office pantry microwave not heating	LOW	2026-02-27 15:55:13.703505+05:30	ASSIGNED	awaiting_solver	13.01000000	80.21000000	2026-02-18 15:55:13.703505+05:30	2026-02-19 10:55:13.703505+05:30
42	17	2	Loading Dock Light Replacement	Dock area poorly lit, safety concern	MEDIUM	2026-02-25 15:55:13.703505+05:30	ASSIGNED	awaiting_solver	13.01300000	80.21200000	2026-02-18 13:55:13.703505+05:30	2026-02-19 09:55:13.703505+05:30
43	18	2	AC Thermostat Calibration	Thermostat reading 3 degrees off in server room	HIGH	2026-02-23 15:55:13.703505+05:30	ASSIGNED	awaiting_solver	13.01600000	80.21400000	2026-02-18 11:55:13.703505+05:30	2026-02-19 08:55:13.703505+05:30
44	19	3	Production Line Conveyor Fix	Conveyor belt slipping under load	HIGH	2026-02-22 15:55:13.703505+05:30	ASSIGNED	awaiting_solver	13.01900000	80.21600000	2026-02-18 09:55:13.703505+05:30	2026-02-19 07:55:13.703505+05:30
45	20	3	Pest Control — Termite Treatment	Termite damage found in wooden partitions	MEDIUM	2026-02-26 15:55:13.703505+05:30	ASSIGNED	awaiting_solver	13.02200000	80.21800000	2026-02-18 07:55:13.703505+05:30	2026-02-19 06:55:13.703505+05:30
46	1	1	Overhead Tank Cleaning	Quarterly water tank cleaning and inspection	MEDIUM	2026-02-28 15:55:13.703505+05:30	ASSIGNED	awaiting_solver	13.02500000	80.22000000	2026-02-18 05:55:13.703505+05:30	2026-02-19 05:55:13.703505+05:30
47	2	2	Earthing System Check	Annual electrical earthing resistance test	HIGH	2026-02-24 15:55:13.703505+05:30	ASSIGNED	awaiting_solver	13.02800000	80.22200000	2026-02-18 03:55:13.703505+05:30	2026-02-19 04:55:13.703505+05:30
48	3	2	AHU Filter Replacement	Air handling unit filters due for replacement	MEDIUM	2026-02-25 15:55:13.703505+05:30	ASSIGNED	awaiting_solver	13.03100000	80.22400000	2026-02-18 01:55:13.703505+05:30	2026-02-19 03:55:13.703505+05:30
49	4	3	Wooden Door Frame Repair	Termite-damaged door frame in storage room	LOW	2026-03-02 15:55:13.703505+05:30	ASSIGNED	awaiting_solver	13.03400000	80.22600000	2026-02-17 23:55:13.703505+05:30	2026-02-19 02:55:13.703505+05:30
50	5	1	CCTV Camera Realignment	Cameras in parking area misaligned after storm	MEDIUM	2026-02-24 15:55:13.703505+05:30	ASSIGNED	awaiting_solver	13.03700000	80.22800000	2026-02-17 21:55:13.703505+05:30	2026-02-19 01:55:13.703505+05:30
51	6	2	Compressor Room Ventilation	Ventilation fan failed in compressor room	HIGH	2026-02-23 15:55:13.703505+05:30	ASSIGNED	awaiting_solver	13.04000000	80.23000000	2026-02-17 19:55:13.703505+05:30	2026-02-19 00:55:13.703505+05:30
52	7	3	External Wall Crack Sealing	Hairline cracks on building exterior wall	LOW	2026-03-04 15:55:13.703505+05:30	ASSIGNED	awaiting_solver	13.04300000	80.23200000	2026-02-17 17:55:13.703505+05:30	2026-02-18 23:55:13.703505+05:30
53	8	3	Sewage Pump Failure	Basement sewage pump not activating	HIGH	2026-02-23 15:55:13.703505+05:30	OPEN	awaiting_solver	13.02000000	80.22000000	2026-02-19 15:55:13.703505+05:30	2026-02-19 15:55:13.703505+05:30
54	9	3	Parking Barrier Malfunction	Entry barrier arm not lifting for vehicles	MEDIUM	2026-02-25 15:55:13.703505+05:30	OPEN	awaiting_solver	13.02300000	80.22200000	2026-02-19 14:55:13.703505+05:30	2026-02-19 14:55:13.703505+05:30
55	10	1	Fiber Optic Cable Damage	Construction crew damaged fiber line to Building E	HIGH	2026-02-22 15:55:13.703505+05:30	OPEN	awaiting_solver	13.02600000	80.22400000	2026-02-19 13:55:13.703505+05:30	2026-02-19 13:55:13.703505+05:30
56	11	2	Roof Sheet Replacement	Corroded roofing sheets in warehouse section	MEDIUM	2026-02-28 15:55:13.703505+05:30	OPEN	awaiting_solver	13.02900000	80.22600000	2026-02-19 12:55:13.703505+05:30	2026-02-19 12:55:13.703505+05:30
57	12	3	Lift Motor Overheating	Service lift motor temperature alarm triggered	HIGH	2026-02-22 15:55:13.703505+05:30	OPEN	awaiting_solver	13.03200000	80.22800000	2026-02-19 11:55:13.703505+05:30	2026-02-19 11:55:13.703505+05:30
58	13	2	Coolant Pipe Leak Lab	Coolant pipe leaking in R&D laboratory	HIGH	2026-02-23 15:55:13.703505+05:30	OPEN	awaiting_solver	13.03500000	80.23000000	2026-02-19 10:55:13.703505+05:30	2026-02-19 10:55:13.703505+05:30
59	14	1	Reception Desk Repair	Reception counter laminate peeling off	LOW	2026-03-06 15:55:13.703505+05:30	OPEN	awaiting_solver	13.03800000	80.23200000	2026-02-19 09:55:13.703505+05:30	2026-02-19 09:55:13.703505+05:30
60	15	1	Exterior Painting Needed	Building facade paint fading and peeling	LOW	2026-03-12 15:55:13.703505+05:30	OPEN	awaiting_solver	13.04100000	80.23400000	2026-02-19 08:55:13.703505+05:30	2026-02-19 08:55:13.703505+05:30
61	16	1	Emergency Generator Test Fail	Monthly generator test showed low voltage output	HIGH	2026-02-22 15:55:13.703505+05:30	OPEN	awaiting_solver	13.04400000	80.23600000	2026-02-19 07:55:13.703505+05:30	2026-02-19 07:55:13.703505+05:30
62	17	2	Drainage Overflow Issue	Storm drain overflowing during heavy rain	HIGH	2026-02-23 15:55:13.703505+05:30	OPEN	awaiting_solver	13.04700000	80.23800000	2026-02-19 06:55:13.703505+05:30	2026-02-19 06:55:13.703505+05:30
63	18	2	Welding Machine Breakdown	Production welding machine #3 not striking arc	MEDIUM	2026-02-25 15:55:13.703505+05:30	OPEN	awaiting_solver	13.05000000	80.24000000	2026-02-19 05:55:13.703505+05:30	2026-02-19 05:55:13.703505+05:30
64	19	3	Chemical Storage Ventilation	Exhaust fan in chemical storage room failed	HIGH	2026-02-22 15:55:13.703505+05:30	OPEN	awaiting_solver	13.05300000	80.24200000	2026-02-19 04:55:13.703505+05:30	2026-02-19 04:55:13.703505+05:30
65	20	3	Water Softener Malfunction	Water treatment softener not regenerating	MEDIUM	2026-02-26 15:55:13.703505+05:30	OPEN	awaiting_solver	13.05600000	80.24400000	2026-02-19 03:55:13.703505+05:30	2026-02-19 03:55:13.703505+05:30
66	1	1	Cafeteria Sink Clogged	Kitchen sink backing up with grey water	MEDIUM	2026-02-24 15:55:13.703505+05:30	OPEN	awaiting_solver	13.05900000	80.24600000	2026-02-19 02:55:13.703505+05:30	2026-02-19 02:55:13.703505+05:30
67	2	2	Distribution Board Humming	DB in Block C making buzzing noise	HIGH	2026-02-22 15:55:13.703505+05:30	OPEN	awaiting_solver	13.06200000	80.24800000	2026-02-19 01:55:13.703505+05:30	2026-02-19 01:55:13.703505+05:30
68	3	2	Boiler Pressure Valve Repair	Pressure relief valve replaced on industrial boiler	HIGH	2026-02-24 15:55:13.703505+05:30	RESOLVED_PENDING_REVIEW	awaiting_review	13.03000000	80.23000000	2026-02-15 15:55:13.703505+05:30	2026-02-19 15:55:13.703505+05:30
69	4	3	Floor Tile Replacement Lobby	Broken floor tiles replaced in main lobby	MEDIUM	2026-02-26 15:55:13.703505+05:30	RESOLVED_PENDING_REVIEW	awaiting_review	13.03400000	80.23300000	2026-02-15 12:55:13.703505+05:30	2026-02-19 13:55:13.703505+05:30
70	5	1	UPS Firmware Update	UPS firmware upgraded to latest version	MEDIUM	2026-02-25 15:55:13.703505+05:30	RESOLVED_PENDING_REVIEW	awaiting_review	13.03800000	80.23600000	2026-02-15 09:55:13.703505+05:30	2026-02-19 11:55:13.703505+05:30
71	6	2	Crane Wire Rope Inspection	Overhead crane wire rope inspected and lubricated	HIGH	2026-02-23 15:55:13.703505+05:30	RESOLVED_PENDING_REVIEW	awaiting_review	13.04200000	80.23900000	2026-02-15 06:55:13.703505+05:30	2026-02-19 09:55:13.703505+05:30
72	7	3	Wall Waterproofing Treatment	External wall waterproof coating applied	MEDIUM	2026-02-27 15:55:13.703505+05:30	RESOLVED_PENDING_REVIEW	awaiting_review	13.04600000	80.24200000	2026-02-15 03:55:13.703505+05:30	2026-02-19 07:55:13.703505+05:30
73	10	1	Switch Stack Configuration	Network switch stack reconfigured after failure	HIGH	2026-02-23 15:55:13.703505+05:30	RESOLVED_PENDING_REVIEW	awaiting_review	13.05000000	80.24500000	2026-02-15 00:55:13.703505+05:30	2026-02-19 05:55:13.703505+05:30
74	11	2	Motor Bearing Replacement	Conveyor motor bearings replaced with SKF grade	HIGH	2026-02-24 15:55:13.703505+05:30	RESOLVED_PENDING_REVIEW	awaiting_review	13.05400000	80.24800000	2026-02-14 21:55:13.703505+05:30	2026-02-19 03:55:13.703505+05:30
75	12	3	Ceiling Fan Speed Control Fix	Fan regulator replaced in conference room	LOW	2026-02-28 15:55:13.703505+05:30	RESOLVED_PENDING_REVIEW	awaiting_review	13.05800000	80.25100000	2026-02-14 18:55:13.703505+05:30	2026-02-19 01:55:13.703505+05:30
76	1	1	Pipe Joint Still Leaking	Previous repair failed, joint leaking again	HIGH	2026-02-23 15:55:13.703505+05:30	REOPENED	in_progress	13.04000000	80.24000000	2026-02-14 15:55:13.703505+05:30	2026-02-20 09:55:13.703505+05:30
77	2	2	Electrical Short Recurring	Same circuit breaker tripping after repair	HIGH	2026-02-22 15:55:13.703505+05:30	REOPENED	in_progress	13.04300000	80.24200000	2026-02-14 13:55:13.703505+05:30	2026-02-20 08:55:13.703505+05:30
78	8	3	Water Heater Still Cold	Solar heater repair ineffective, water still cold	MEDIUM	2026-02-24 15:55:13.703505+05:30	REOPENED	in_progress	13.04600000	80.24400000	2026-02-14 11:55:13.703505+05:30	2026-02-20 07:55:13.703505+05:30
79	9	3	Boundary Wall Crack Widening	Sealed crack reopened after settlement	HIGH	2026-02-23 15:55:13.703505+05:30	REOPENED	in_progress	13.04900000	80.24600000	2026-02-14 09:55:13.703505+05:30	2026-02-20 06:55:13.703505+05:30
80	14	1	Irrigation System Leaking Again	Previous pipe repair failed under pressure	MEDIUM	2026-02-25 15:55:13.703505+05:30	REOPENED	in_progress	13.05200000	80.24800000	2026-02-14 07:55:13.703505+05:30	2026-02-20 05:55:13.703505+05:30
81	3	2	Chiller Vibration Returned	Vibration damping fix did not hold	HIGH	2026-02-22 15:55:13.703505+05:30	REOPENED	in_progress	13.05500000	80.25000000	2026-02-14 05:55:13.703505+05:30	2026-02-20 04:55:13.703505+05:30
82	6	2	Shutter Motor Burned Again	Replacement motor burned out within a week	MEDIUM	2026-02-24 15:55:13.703505+05:30	REOPENED	in_progress	13.05800000	80.25200000	2026-02-14 03:55:13.703505+05:30	2026-02-20 03:55:13.703505+05:30
83	11	2	Forklift Leak Persists	Hydraulic seal replacement did not fix leak	HIGH	2026-02-22 15:55:13.703505+05:30	REOPENED	in_progress	13.06100000	80.25400000	2026-02-14 01:55:13.703505+05:30	2026-02-20 02:55:13.703505+05:30
84	4	3	Lift Motor Complete Failure	Service lift completely non-functional for 3 days	HIGH	2026-02-21 15:55:13.703505+05:30	ESCALATED	awaiting_review	13.05000000	80.25000000	2026-02-16 15:55:13.703505+05:30	2026-02-20 15:55:13.703505+05:30
85	7	3	Chemical Spill Ventilation	Chemical storage ventilation down — safety hazard	HIGH	2026-02-21 15:55:13.703505+05:30	ESCALATED	awaiting_review	13.05400000	80.25300000	2026-02-16 12:55:13.703505+05:30	2026-02-20 13:55:13.703505+05:30
86	13	2	Transformer Overheating	Power transformer temperature exceeding safe limits	HIGH	2026-02-21 15:55:13.703505+05:30	ESCALATED	awaiting_review	13.05800000	80.25600000	2026-02-16 09:55:13.703505+05:30	2026-02-20 11:55:13.703505+05:30
87	17	2	Drainage Flooding Basement	Basement flooding due to blocked storm drain	HIGH	2026-02-20 15:55:13.703505+05:30	ESCALATED	awaiting_review	13.06200000	80.25900000	2026-02-16 06:55:13.703505+05:30	2026-02-20 09:55:13.703505+05:30
88	19	3	Production Line Down	Critical conveyor failure halting production	HIGH	2026-02-20 15:55:13.703505+05:30	ESCALATED	awaiting_review	13.06600000	80.26200000	2026-02-16 03:55:13.703505+05:30	2026-02-20 07:55:13.703505+05:30
89	20	3	Fire Suppression System Fault	Sprinkler system pressure test failed	HIGH	2026-02-21 15:55:13.703505+05:30	ESCALATED	awaiting_review	13.07000000	80.26500000	2026-02-16 00:55:13.703505+05:30	2026-02-20 05:55:13.703505+05:30
90	18	2	Welding Gas Leak Detected	Gas leak from welding station supply line	HIGH	2026-02-20 15:55:13.703505+05:30	ESCALATED	awaiting_review	13.07400000	80.26800000	2026-02-15 21:55:13.703505+05:30	2026-02-20 03:55:13.703505+05:30
91	1	1	Pipe Leakage in Main Halle	Pipe Leakage in Main Halle	MEDIUM	2026-02-25 18:27:46.151358+05:30	ASSIGNED	awaiting_solver	13.08394400	80.27001400	2026-02-20 18:27:45.3968+05:30	2026-02-20 18:27:45.3968+05:30
92	1	1	Pipe Leakage in Main Halle	Pipe Leakage in Main Halle	MEDIUM	2026-02-25 18:28:09.382713+05:30	ASSIGNED	awaiting_solver	13.08394400	80.27001400	2026-02-20 18:28:08.742562+05:30	2026-02-20 18:28:08.742562+05:30
\.


--
-- Data for Name: problem_solver_skills; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.problem_solver_skills (id, solver_id, skill_type, site_id, priority, is_available, created_at, updated_at) FROM stdin;
1	6	plumbing	1	10	t	2026-02-20 15:55:13.805809+05:30	2026-02-20 15:55:13.805809+05:30
2	6	plumbing	\N	8	t	2026-02-20 15:55:13.805809+05:30	2026-02-20 15:55:13.805809+05:30
3	6	mechanical	6	7	t	2026-02-20 15:55:13.805809+05:30	2026-02-20 15:55:13.805809+05:30
4	6	carpentry	\N	5	t	2026-02-20 15:55:13.805809+05:30	2026-02-20 15:55:13.805809+05:30
5	7	electrical	2	10	t	2026-02-20 15:55:13.805809+05:30	2026-02-20 15:55:13.805809+05:30
6	7	electrical	\N	7	t	2026-02-20 15:55:13.805809+05:30	2026-02-20 15:55:13.805809+05:30
7	7	network	10	9	t	2026-02-20 15:55:13.805809+05:30	2026-02-20 15:55:13.805809+05:30
8	7	network	\N	6	t	2026-02-20 15:55:13.805809+05:30	2026-02-20 15:55:13.805809+05:30
9	8	hvac	3	10	t	2026-02-20 15:55:13.805809+05:30	2026-02-20 15:55:13.805809+05:30
10	8	hvac	\N	8	t	2026-02-20 15:55:13.805809+05:30	2026-02-20 15:55:13.805809+05:30
11	8	mechanical	5	7	t	2026-02-20 15:55:13.805809+05:30	2026-02-20 15:55:13.805809+05:30
12	8	plumbing	8	6	t	2026-02-20 15:55:13.805809+05:30	2026-02-20 15:55:13.805809+05:30
13	9	painting	\N	10	t	2026-02-20 15:55:13.805809+05:30	2026-02-20 15:55:13.805809+05:30
14	9	carpentry	4	9	t	2026-02-20 15:55:13.805809+05:30	2026-02-20 15:55:13.805809+05:30
15	9	carpentry	\N	7	t	2026-02-20 15:55:13.805809+05:30	2026-02-20 15:55:13.805809+05:30
16	9	plumbing	9	5	t	2026-02-20 15:55:13.805809+05:30	2026-02-20 15:55:13.805809+05:30
17	10	electrical	7	9	t	2026-02-20 15:55:13.805809+05:30	2026-02-20 15:55:13.805809+05:30
18	10	hvac	12	8	t	2026-02-20 15:55:13.805809+05:30	2026-02-20 15:55:13.805809+05:30
19	10	mechanical	\N	7	t	2026-02-20 15:55:13.805809+05:30	2026-02-20 15:55:13.805809+05:30
20	10	network	14	6	f	2026-02-20 15:55:13.805809+05:30	2026-02-20 15:55:13.805809+05:30
\.


--
-- Data for Name: sites; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sites (id, name, location, latitude, longitude, created_at, updated_at) FROM stdin;
1	Vepery Site	Vepery, Chennai	13.08394400	80.27001400	2026-02-20 15:55:13.795076+05:30	2026-02-20 15:55:13.795076+05:30
2	Ambattur Industrial Park	Ambattur, Chennai	13.11369300	80.15293300	2026-02-20 15:55:13.795076+05:30	2026-02-20 15:55:13.795076+05:30
3	Guindy Factory	Guindy, Chennai	13.00430200	80.22637600	2026-02-20 15:55:13.795076+05:30	2026-02-20 15:55:13.795076+05:30
4	Perungudi Site	Perungudi, Chennai	12.97109900	80.24537300	2026-02-20 15:55:13.795076+05:30	2026-02-20 15:55:13.795076+05:30
5	Taramani Tech Park	Taramani, Chennai	12.97018100	80.25022200	2026-02-20 15:55:13.795076+05:30	2026-02-20 15:55:13.795076+05:30
6	Chromepet Industrial Area	Chromepet, Chennai	12.93921700	80.14539300	2026-02-20 15:55:13.795076+05:30	2026-02-20 15:55:13.795076+05:30
7	Sholinganallur Site	Sholinganallur, Chennai	12.90057100	80.25974900	2026-02-20 15:55:13.795076+05:30	2026-02-20 15:55:13.795076+05:30
8	Pallikaranai Factory	Pallikaranai, Chennai	12.97168900	80.21274700	2026-02-20 15:55:13.795076+05:30	2026-02-20 15:55:13.795076+05:30
9	Medavakkam Park	Medavakkam, Chennai	12.91384800	80.19755100	2026-02-20 15:55:13.795076+05:30	2026-02-20 15:55:13.795076+05:30
10	OMR Tech Hub	OMR, Chennai	12.96658000	80.25974900	2026-02-20 15:55:13.795076+05:30	2026-02-20 15:55:13.795076+05:30
11	Porur Manufacturing Unit	Porur, Chennai	13.03530000	80.15680000	2026-02-20 15:55:13.795076+05:30	2026-02-20 15:55:13.795076+05:30
12	Velachery Business Center	Velachery, Chennai	12.97920000	80.22100000	2026-02-20 15:55:13.795076+05:30	2026-02-20 15:55:13.795076+05:30
13	Adyar Research Lab	Adyar, Chennai	13.00630000	80.25700000	2026-02-20 15:55:13.795076+05:30	2026-02-20 15:55:13.795076+05:30
14	Nungambakkam Office	Nungambakkam, Chennai	13.06040000	80.24260000	2026-02-20 15:55:13.795076+05:30	2026-02-20 15:55:13.795076+05:30
15	Anna Nagar Complex	Anna Nagar, Chennai	13.08500000	80.20960000	2026-02-20 15:55:13.795076+05:30	2026-02-20 15:55:13.795076+05:30
16	Thiruvanmiyur Site	Thiruvanmiyur, Chennai	12.98330000	80.26820000	2026-02-20 15:55:13.795076+05:30	2026-02-20 15:55:13.795076+05:30
17	Tambaram Depot	Tambaram, Chennai	12.92500000	80.12780000	2026-02-20 15:55:13.795076+05:30	2026-02-20 15:55:13.795076+05:30
18	Avadi Plant	Avadi, Chennai	13.11450000	80.09700000	2026-02-20 15:55:13.795076+05:30	2026-02-20 15:55:13.795076+05:30
19	Sriperumbudur Unit	Sriperumbudur, Chennai	12.96850000	79.94140000	2026-02-20 15:55:13.795076+05:30	2026-02-20 15:55:13.795076+05:30
20	Mahabalipuram Resort Facility	Mahabalipuram, Chennai	12.61660000	80.19270000	2026-02-20 15:55:13.795076+05:30	2026-02-20 15:55:13.795076+05:30
\.


--
-- Data for Name: supervisor_sites; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.supervisor_sites (supervisor_id, site_id, is_active) FROM stdin;
1	1	t
1	5	t
1	10	t
1	13	t
1	14	t
1	15	t
1	16	t
2	2	t
2	3	t
2	6	t
2	11	t
2	17	t
2	18	t
2	19	t
3	4	t
3	7	t
3	8	t
3	9	t
3	12	t
3	20	t
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, name, phone, email, role, is_active, created_at, updated_at) FROM stdin;
1	Priya Sharma	9100000001	priya.sharma@facility.com	SUPERVISOR	t	2026-02-20 15:55:13.783557+05:30	2026-02-20 15:55:13.783557+05:30
2	Anil Kumar	9100000002	anil.kumar@facility.com	SUPERVISOR	t	2026-02-20 15:55:13.783557+05:30	2026-02-20 15:55:13.783557+05:30
3	Geetha Rajan	9100000003	geetha.rajan@facility.com	SUPERVISOR	t	2026-02-20 15:55:13.783557+05:30	2026-02-20 15:55:13.783557+05:30
4	Rajesh Menon	9100000004	rajesh.menon@facility.com	MANAGER	t	2026-02-20 15:55:13.783557+05:30	2026-02-20 15:55:13.783557+05:30
5	Lakshmi Narayanan	9100000005	lakshmi.n@facility.com	MANAGER	t	2026-02-20 15:55:13.783557+05:30	2026-02-20 15:55:13.783557+05:30
6	Ramesh Krishnan	9100000006	ramesh.k@facility.com	PROBLEMSOLVER	t	2026-02-20 15:55:13.783557+05:30	2026-02-20 15:55:13.783557+05:30
7	Suresh Pillai	9100000007	suresh.p@facility.com	PROBLEMSOLVER	t	2026-02-20 15:55:13.783557+05:30	2026-02-20 15:55:13.783557+05:30
8	Mohan Thilak	9100000008	mohan.t@facility.com	PROBLEMSOLVER	t	2026-02-20 15:55:13.783557+05:30	2026-02-20 15:55:13.783557+05:30
9	Kavitha Subramanian	9100000009	kavitha.s@facility.com	PROBLEMSOLVER	t	2026-02-20 15:55:13.783557+05:30	2026-02-20 15:55:13.783557+05:30
10	Vijay Moorthy	9100000010	vijay.m@facility.com	PROBLEMSOLVER	t	2026-02-20 15:55:13.783557+05:30	2026-02-20 15:55:13.783557+05:30
\.


--
-- Name: call_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.call_logs_id_seq', 151, true);


--
-- Name: chat_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.chat_history_id_seq', 98, true);


--
-- Name: complaints_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.complaints_id_seq', 30, true);


--
-- Name: escalation_rules_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.escalation_rules_id_seq', 6, true);


--
-- Name: escalations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.escalations_id_seq', 15, true);


--
-- Name: issue_assignments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.issue_assignments_id_seq', 77, true);


--
-- Name: issue_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.issue_history_id_seq', 272, true);


--
-- Name: issue_images_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.issue_images_id_seq', 123, true);


--
-- Name: issues_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.issues_id_seq', 92, true);


--
-- Name: problem_solver_skills_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.problem_solver_skills_id_seq', 20, true);


--
-- Name: sites_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sites_id_seq', 20, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 10, true);


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: call_logs call_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.call_logs
    ADD CONSTRAINT call_logs_pkey PRIMARY KEY (id);


--
-- Name: chat_history chat_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_history
    ADD CONSTRAINT chat_history_pkey PRIMARY KEY (id);


--
-- Name: complaints complaints_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.complaints
    ADD CONSTRAINT complaints_pkey PRIMARY KEY (id);


--
-- Name: escalation_rules escalation_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.escalation_rules
    ADD CONSTRAINT escalation_rules_pkey PRIMARY KEY (id);


--
-- Name: escalations escalations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.escalations
    ADD CONSTRAINT escalations_pkey PRIMARY KEY (id);


--
-- Name: issue_assignments issue_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.issue_assignments
    ADD CONSTRAINT issue_assignments_pkey PRIMARY KEY (id);


--
-- Name: issue_history issue_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.issue_history
    ADD CONSTRAINT issue_history_pkey PRIMARY KEY (id);


--
-- Name: issue_images issue_images_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.issue_images
    ADD CONSTRAINT issue_images_pkey PRIMARY KEY (id);


--
-- Name: issues issues_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.issues
    ADD CONSTRAINT issues_pkey PRIMARY KEY (id);


--
-- Name: problem_solver_skills problem_solver_skills_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.problem_solver_skills
    ADD CONSTRAINT problem_solver_skills_pkey PRIMARY KEY (id);


--
-- Name: sites sites_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sites
    ADD CONSTRAINT sites_pkey PRIMARY KEY (id);


--
-- Name: supervisor_sites supervisor_sites_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supervisor_sites
    ADD CONSTRAINT supervisor_sites_pkey PRIMARY KEY (supervisor_id, site_id);


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_assignments_due_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assignments_due_date ON public.issue_assignments USING btree (due_date);


--
-- Name: idx_assignments_issue; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assignments_issue ON public.issue_assignments USING btree (issue_id);


--
-- Name: idx_assignments_solver; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assignments_solver ON public.issue_assignments USING btree (assigned_to_solver_id);


--
-- Name: idx_assignments_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assignments_status ON public.issue_assignments USING btree (status);


--
-- Name: idx_call_logs_assignment; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_call_logs_assignment ON public.call_logs USING btree (assignment_id);


--
-- Name: idx_call_logs_attempt; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_call_logs_attempt ON public.call_logs USING btree (attempt_number);


--
-- Name: idx_call_logs_initiated; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_call_logs_initiated ON public.call_logs USING btree (initiated_at);


--
-- Name: idx_call_logs_solver; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_call_logs_solver ON public.call_logs USING btree (solver_id);


--
-- Name: idx_call_logs_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_call_logs_status ON public.call_logs USING btree (status);


--
-- Name: idx_chat_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chat_created ON public.chat_history USING btree (created_at DESC);


--
-- Name: idx_chat_issue; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chat_issue ON public.chat_history USING btree (issue_id);


--
-- Name: idx_chat_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chat_user ON public.chat_history USING btree (user_id);


--
-- Name: idx_complaints_assignment; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_complaints_assignment ON public.complaints USING btree (assignment_id);


--
-- Name: idx_complaints_issue; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_complaints_issue ON public.complaints USING btree (issue_id);


--
-- Name: idx_complaints_solver; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_complaints_solver ON public.complaints USING btree (target_solver_id);


--
-- Name: idx_escalation_rules_priority; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_escalation_rules_priority ON public.escalation_rules USING btree (priority);


--
-- Name: idx_escalations_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_escalations_created ON public.escalations USING btree (created_at);


--
-- Name: idx_escalations_issue; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_escalations_issue ON public.escalations USING btree (issue_id);


--
-- Name: idx_escalations_resolved; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_escalations_resolved ON public.escalations USING btree (resolved);


--
-- Name: idx_escalations_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_escalations_type ON public.escalations USING btree (escalation_type);


--
-- Name: idx_issue_history_action; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_issue_history_action ON public.issue_history USING btree (action_type);


--
-- Name: idx_issue_history_issue; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_issue_history_issue ON public.issue_history USING btree (issue_id);


--
-- Name: idx_issue_history_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_issue_history_user ON public.issue_history USING btree (changed_by_user_id);


--
-- Name: idx_issue_images_flag; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_issue_images_flag ON public.issue_images USING btree (ai_flag);


--
-- Name: idx_issue_images_issue; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_issue_images_issue ON public.issue_images USING btree (issue_id);


--
-- Name: idx_issue_images_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_issue_images_type ON public.issue_images USING btree (image_type);


--
-- Name: idx_issue_images_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_issue_images_user ON public.issue_images USING btree (uploaded_by_user_id);


--
-- Name: idx_issues_deadline; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_issues_deadline ON public.issues USING btree (deadline_at);


--
-- Name: idx_issues_priority; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_issues_priority ON public.issues USING btree (priority);


--
-- Name: idx_issues_site; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_issues_site ON public.issues USING btree (site_id);


--
-- Name: idx_issues_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_issues_status ON public.issues USING btree (status);


--
-- Name: idx_issues_supervisor; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_issues_supervisor ON public.issues USING btree (raised_by_supervisor_id);


--
-- Name: idx_sites_location; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sites_location ON public.sites USING btree (location);


--
-- Name: idx_sites_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sites_name ON public.sites USING btree (name);


--
-- Name: idx_solver_skills_site; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_solver_skills_site ON public.problem_solver_skills USING btree (site_id);


--
-- Name: idx_solver_skills_skill; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_solver_skills_skill ON public.problem_solver_skills USING btree (skill_type);


--
-- Name: idx_solver_skills_skill_site; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_solver_skills_skill_site ON public.problem_solver_skills USING btree (skill_type, site_id);


--
-- Name: idx_solver_skills_solver; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_solver_skills_solver ON public.problem_solver_skills USING btree (solver_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_phone; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_phone ON public.users USING btree (phone);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: call_logs call_logs_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.call_logs
    ADD CONSTRAINT call_logs_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.issue_assignments(id) ON DELETE CASCADE;


--
-- Name: call_logs call_logs_solver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.call_logs
    ADD CONSTRAINT call_logs_solver_id_fkey FOREIGN KEY (solver_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: chat_history chat_history_issue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_history
    ADD CONSTRAINT chat_history_issue_id_fkey FOREIGN KEY (issue_id) REFERENCES public.issues(id) ON DELETE SET NULL;


--
-- Name: chat_history chat_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_history
    ADD CONSTRAINT chat_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: complaints complaints_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.complaints
    ADD CONSTRAINT complaints_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.issue_assignments(id) ON DELETE CASCADE;


--
-- Name: complaints complaints_issue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.complaints
    ADD CONSTRAINT complaints_issue_id_fkey FOREIGN KEY (issue_id) REFERENCES public.issues(id) ON DELETE CASCADE;


--
-- Name: complaints complaints_raised_by_supervisor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.complaints
    ADD CONSTRAINT complaints_raised_by_supervisor_id_fkey FOREIGN KEY (raised_by_supervisor_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: complaints complaints_target_solver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.complaints
    ADD CONSTRAINT complaints_target_solver_id_fkey FOREIGN KEY (target_solver_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: escalations escalations_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.escalations
    ADD CONSTRAINT escalations_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.issue_assignments(id) ON DELETE SET NULL;


--
-- Name: escalations escalations_escalated_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.escalations
    ADD CONSTRAINT escalations_escalated_by_user_id_fkey FOREIGN KEY (escalated_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: escalations escalations_issue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.escalations
    ADD CONSTRAINT escalations_issue_id_fkey FOREIGN KEY (issue_id) REFERENCES public.issues(id) ON DELETE CASCADE;


--
-- Name: issue_assignments issue_assignments_assigned_by_supervisor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.issue_assignments
    ADD CONSTRAINT issue_assignments_assigned_by_supervisor_id_fkey FOREIGN KEY (assigned_by_supervisor_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: issue_assignments issue_assignments_assigned_to_solver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.issue_assignments
    ADD CONSTRAINT issue_assignments_assigned_to_solver_id_fkey FOREIGN KEY (assigned_to_solver_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: issue_assignments issue_assignments_issue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.issue_assignments
    ADD CONSTRAINT issue_assignments_issue_id_fkey FOREIGN KEY (issue_id) REFERENCES public.issues(id) ON DELETE CASCADE;


--
-- Name: issue_history issue_history_changed_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.issue_history
    ADD CONSTRAINT issue_history_changed_by_user_id_fkey FOREIGN KEY (changed_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: issue_history issue_history_issue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.issue_history
    ADD CONSTRAINT issue_history_issue_id_fkey FOREIGN KEY (issue_id) REFERENCES public.issues(id) ON DELETE CASCADE;


--
-- Name: issue_images issue_images_issue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.issue_images
    ADD CONSTRAINT issue_images_issue_id_fkey FOREIGN KEY (issue_id) REFERENCES public.issues(id) ON DELETE CASCADE;


--
-- Name: issue_images issue_images_uploaded_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.issue_images
    ADD CONSTRAINT issue_images_uploaded_by_user_id_fkey FOREIGN KEY (uploaded_by_user_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: issues issues_raised_by_supervisor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.issues
    ADD CONSTRAINT issues_raised_by_supervisor_id_fkey FOREIGN KEY (raised_by_supervisor_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: issues issues_site_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.issues
    ADD CONSTRAINT issues_site_id_fkey FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE RESTRICT;


--
-- Name: problem_solver_skills problem_solver_skills_site_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.problem_solver_skills
    ADD CONSTRAINT problem_solver_skills_site_id_fkey FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE SET NULL;


--
-- Name: problem_solver_skills problem_solver_skills_solver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.problem_solver_skills
    ADD CONSTRAINT problem_solver_skills_solver_id_fkey FOREIGN KEY (solver_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: supervisor_sites supervisor_sites_site_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supervisor_sites
    ADD CONSTRAINT supervisor_sites_site_id_fkey FOREIGN KEY (site_id) REFERENCES public.sites(id);


--
-- Name: supervisor_sites supervisor_sites_supervisor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supervisor_sites
    ADD CONSTRAINT supervisor_sites_supervisor_id_fkey FOREIGN KEY (supervisor_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

\unrestrict eL0Df3GUIqRyASgX3l3bCOHwbgtFIo0xscgIMjPUVzSyhCTXZcUNjgrumPXzZ0v

