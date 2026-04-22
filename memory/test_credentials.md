# Kairox AI OpEx — Test Credentials

All credentials live in `/app/frontend/src/mocks/users.js`. The real login
flow hits the Render backend (`src/services/api.js`), so whether these
credentials actually log a user in depends on the backend database having
matching user records. The mock file is used by any mock-service features
added in later priorities.

## Roles in this build (4)

| Role token     | Prompt label         | Notes                                  |
|----------------|----------------------|----------------------------------------|
| `problem_solver` | Problem Solver     | Existing MVP role, unchanged          |
| `supervisor`     | Supervisor         | Existing MVP role, unchanged          |
| `manager`        | Managing Director  | MVP `manager` **IS** the MD — no rename |
| `customer_md`    | Customer's MD      | **NEW** in v3.0                       |

## Test accounts

### Supervisors (existing — from MVP)
| username      | password    | name           | phone           | sites |
|---------------|-------------|----------------|-----------------|-------|
| `supervisor1` | `super123`  | Rajesh Kumar   | +91 98765 43210 | 1,2   |
| `supervisor2` | `super123`  | Priya Sharma   | +91 98765 43211 | 3,4   |
| `supervisor3` | `super123`  | Arun Patel     | +91 98765 43212 | 5     |

### Managing Directors (`manager` = MD)
| username    | password     | name          | phone           |
|-------------|--------------|---------------|-----------------|
| `manager1`  | `manager123` | Vikram Singh  | +91 98765 43213 |
| `manager2`  | `manager123` | Meera Reddy   | +91 98765 43214 |

### Problem Solvers (existing — from MVP)
| username  | password     | name           | skill       |
|-----------|--------------|----------------|-------------|
| `solver1` | `solver123`  | Suresh Babu    | Plumbing    |
| `solver2` | `solver123`  | Karthik Rajan  | Electrical  |
| `solver3` | `solver123`  | Mohammed Ali   | HVAC        |
| `solver4` | `solver123`  | Deepak Verma   | Maintenance |
| `solver5` | `solver123`  | Ravi Shankar   | Electrical  |

### Customer's MDs (**NEW — added for Kairox v3.0**)
| username     | password   | name          | company         | assigned sites |
|--------------|-----------|---------------|-----------------|----------------|
| `customer1`  | `cust123` | Anita Desai   | Desai Holdings  | 1, 2           |
| `customer2`  | `cust123` | Harish Menon  | Menon Infra     | 3, 4, 5        |

## Backend compatibility note

The Render backend currently recognises the 3 MVP roles. For these new
`customer_md` accounts to log in against the real backend, the backend
must add:

1. The `customer_md` value to its user-role enum, AND
2. A row for each customer user in its `users` table with the same
   phone/password hash.

Until the backend adds this, customer-MD logins will fail at the
`POST /api/v1/auth/login` call. The frontend is ready; only the backend
add/migration is blocking. **[BACKEND-GAP]** is logged in the prompt
Section 19 consolidated list.

## Role → tab-set verification (Priority 1)

After login, each role should see exactly these bottom tabs (order fixed):

- **Problem Solver:** Dashboard | Issues | Chat | Profile   *(4 tabs)*
- **Supervisor:**     Dashboard | Issues | Sites | Solvers | MD | Budget | Chat | Profile   *(8 tabs)*
- **Manager (MD):**   Dashboard | Issues | Sites | Supervisors | Customer MD | Budget | Chat | Profile   *(8 tabs)*
- **Customer's MD:**  Dashboard | Issues | MD | Budget | Chat | Profile   *(6 tabs)*

Any tab outside a role's set is hidden via expo-router's `href: null` on
the corresponding `<Tabs.Screen>`, and a deep-linked navigation attempt
lands on the RoleGuard EmptyState with the lock icon.
