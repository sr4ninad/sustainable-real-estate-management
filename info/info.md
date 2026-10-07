# Verdant — Sustainable Real Estate Management System

**Project information: what it is, how it's built, how to run it, and where it falls short.**

---

## 1. Overview

Verdant is a full-stack real estate management platform where **sustainability is a hard business rule**.
Every property records three green features: solar panels, rainwater harvesting and waste management. A MySQL
trigger refuses to record a sale for any property that has none of them.

The system manages:

- **Properties:** address, type, size, price, energy rating, green certification, availability, listing agent
- **Sustainability features:** the three green features per property, giving a 0–3 "green score"
- **Agents:** the people who list and sell properties
- **Clients:** buyers, sellers and renters
- **Transactions:** closed deals, which automatically mark the property as sold/let
- **Price history:** every price change, logged automatically by a trigger
- **Logins:** separate access for admins, agents and clients

It ships with two user interfaces:

1. **The React app** (`http://localhost:5173`): the main product, for every role.
2. **The Thymeleaf admin console** (`http://localhost:8080`): simple server-rendered pages, for admins only.

---

## 2. Tech stack

### Backend

| Technology | Version | Used for |
|---|---|---|
| Java | 17 | Language |
| Spring Boot | 3.5.13 | Application framework |
| Spring Web (MVC) | via Boot | REST API and admin console controllers |
| Spring Data JPA / Hibernate | via Boot | Database access (entities + repositories) |
| Spring Security | 6 (via Boot) | Login, sessions, roles, CSRF on the admin console |
| Thymeleaf + thymeleaf-extras-springsecurity6 | via Boot | Server-rendered admin console |
| MySQL Connector/J | via Boot | JDBC driver |
| BCrypt | via Spring Security | Password hashing |
| JUnit 5, Mockito, AssertJ, MockMvc, spring-security-test | via Boot | Tests |
| Maven (wrapper `mvnw`) | — | Build |

### Database

| Technology | Used for |
|---|---|
| MySQL 8 | Storage, plus business rules in **triggers**, **stored procedures** and **functions** |

### Frontend

| Technology | Version | Used for |
|---|---|---|
| React | 19.2 | UI |
| Vite | 8 | Dev server (with `/api` proxy) and build |
| React Router | 7 | Routing, role-guarded routes |
| Framer Motion | 12 | Animations (page transitions, modals, drawer, toasts) |
| lucide-react | 1.x | Icons |
| ESLint | 9 | Linting (incl. React Hooks rules) |
| Plain CSS with design tokens | — | Styling, light / dark / auto themes |
| Hand-built SVG charts | — | Column chart, bar list, meters, score ring (no chart library) |

---

## 3. Architecture

```
 Browser
   │
   ├── React app (Vite :5173) ──/api proxy──┐
   │                                        ▼
   └── Admin console ───────────────►  Spring Boot (:8080)
                                         ├─ Security: two filter chains
                                         │    /api/**  → JSON, session cookie, role checks in services
                                         │    other    → Thymeleaf console, ADMIN only, form login + CSRF
                                         ├─ Controllers → Services → Repositories (JPA)
                                         └─ Native calls to stored procedures & functions
                                                   │
                                                   ▼
                                               MySQL 8
                                  tables + triggers + procedures + functions
```

- The React app and the admin console share one session cookie (same host), so an admin signed into the React
  app can open the console without signing in again.
- **Where rules live:**
  - **Database:** sustainability and availability, via the triggers.
  - **Services:** validation and ownership (e.g. "agents can only edit their own listings").
  - **React:** only decides which buttons to show; it never enforces a rule on its own.

### Folder structure

```
Sustainable Real Estate Management System/
├── README.md                 Setup and quick reference
├── info/
│   ├── info.md               This document
│   └── manual-test-cases.md  Click-through checklist (~180 cases) for manual testing
├── backend/
│   ├── db.properties         Local secrets (git-ignored); see db.properties.example
│   └── src/main/java/com/realestate/sustainable_realestate/
│       ├── controller/       REST API + admin console pages
│       ├── service/          Business logic, validation, ownership rules
│       ├── model/            JPA entities (Agent, Client, Property, …)
│       ├── repository/       Spring Data repositories
│       ├── security/         Users, login, roles, account seeding, lockout
│       ├── exception/        ApiException + global JSON error handler
│       ├── dto/              PropertyRequest (property + features in one call)
│       ├── factory/          Factory pattern
│       ├── strategy/         Strategy pattern
│       ├── adapter/          Adapter pattern
│       └── config/           ConfigManager (Singleton), SecurityConfig
├── database/
│   ├── schema.sql            Tables
│   ├── functions.sql         MySQL functions
│   ├── stored-procedures.sql Stored procedures
│   ├── triggers.sql          Triggers
│   ├── seed-data.sql         Demo data
│   ├── run-all.sql           Fresh install (drops + recreates the DB)
│   ├── upgrade.sql           Upgrade an existing DB in place
│   └── tests/trigger-tests.sql
└── frontend/realestate-frontend/src/
    ├── lib/                  API client, formatting, domain helpers, permissions
    ├── context/              Auth, data, toasts/confirm providers
    ├── layout/               App shell, sidebar, command palette, navigation
    ├── components/           UI primitives, table, modal, drawer, charts, forms
    ├── pages/                One file per route (lazy-loaded)
    └── styles/               Design tokens and CSS
```

---

## 4. Users and roles

| Capability | Admin | Agent | Client |
|---|:-:|:-:|:-:|
| Browse properties, sustainability, price history, agents | ✓ | ✓ | ✓ |
| Add properties | ✓ | ✓ (always assigned to themselves) | — |
| Edit / delete a property, toggle its green features | any | own listings only | — |
| Reassign a listing to another agent | ✓ | — | — |
| Record a deal | any property | own listings only | — |
| Edit a deal | any | own listings only | — |
| Delete a deal | ✓ | — | — |
| View clients | all | all | own profile only |
| Add / edit clients | ✓ | ✓ | own contact details (not their type) |
| Delete clients | ✓ | — | — |
| Add / delete agents | ✓ | — | — |
| Edit an agent | any | own profile | — |
| View transactions | all | all | own deals only |
| Agent commission (stored procedure) | any agent | self | — |
| Manage logins (Users & access page) | ✓ | — | — |
| Thymeleaf admin console | ✓ | — | — |
| Change own password | ✓ | ✓ | ✓ |

**Accounts:**
- **Created automatically on first start:** an admin account, plus a demo login for every agent (`agent<id>`) and
  client (`client<id>`) that doesn't have one yet.
- **Created later:** admins make new logins from the **Users & access** page.

| Demo role | Username | Password |
|---|---|---|
| Admin | `admin` | `admin123` (set `ADMIN_PASSWORD`) |
| Agent | `agent1` … `agent5` | `agent123` |
| Client | `client101` … `client108` | `client123` |

---

## 5. Features

### React app

- **Sign-in page:** one-click demo accounts, show/hide password, and a clear message for wrong passwords,
  expired sessions or an unreachable server.
- **Dashboard (admin/agent):**
  - Total portfolio value, sales by month, energy rating distribution, green-feature adoption
  - Top agents and a recent-activity feed
  - Agents also get a "Your performance" section, with commission from a stored procedure.
- **Client home:** the client's deals, the agents who handled them, the greenest available homes, and pricing for
  their client type.
- **Properties:**
  - Card grid or sortable table, with search and filters (status, type, "my listings")
  - A detail drawer showing the green score, values computed by MySQL functions, the agent, transactions and price
    changes
  - The add/edit form saves the property and its green features in one database transaction.
- **Sustainability:**
  - Portfolio green score, feature adoption, and a warning for properties that can't be sold
  - Stored-procedure search by minimum number of features
  - A feature matrix with inline toggles on listings you're allowed to edit
- **Clients:** filter by type, and see deal counts and values.
  - A "Dynamic pricing" explorer shows the Strategy pattern pricing every property for buyers, sellers and renters.
- **Agents:** performance cards (listings, portfolio, closed deals, estimated commission) and contact links.
- **Transactions:**
  - Totals, average deal, and average price achieved against list price
  - The form warns before submitting a sale that the sustainability trigger will reject.
- **Price history:** a timeline of price changes grouped by day, with increase/decrease stats.
- **Users & access (admin):**
  - Create logins linked to an agent or client, with a generated temporary password
  - Reset passwords, and enable, disable or delete logins
  - Safeguards stop you disabling yourself or removing the last active admin.
- **Profile:** edit your own contact details and change your password.
- **Across the app:**
  - **Search and navigation:** `Ctrl/⌘ + K` command palette.
  - **Appearance:** light, dark and auto themes; layouts work down to phone width.
  - **Feedback:** toasts, confirm dialogs, skeleton loaders, empty and error states.
  - **Tables:** paginated.
  - **Accessibility:** modals trap keyboard focus.
  - **Performance:** pages load on demand as separate chunks.

### Admin console (Thymeleaf, admin only)

- Pages for properties, agents, clients, transactions, features and price logs.
- **Security:**
  - All changes are CSRF-protected POST forms, including deletes.
  - Edit buttons fill forms via `data-*` attributes, not inline scripts.
- **Errors:** they come back to the same page as a visible message.

---

## 6. Database

### Tables

| Table | Key columns |
|---|---|
| `Agent` | Agent_ID, Name, Contact_No, Email |
| `Client` | Client_ID, Name, Contact_No, Email, Type (Buyer/Seller/Renter), client_category |
| `Property` | Property_ID, Address, Type, Size, Price, Energy_Efficiency, Green_Certification, Availability_Status, Agent_ID → Agent |
| `Sustainability_Features` | Feature_ID, Property_ID → Property (unique), Solar_Panels, Rainwater_Harvesting, Waste_Management |
| `Transaction` | Transaction_ID, Date, Amount, Property_ID → Property, Client_ID → Client |
| `Property_Update_Log` | Log_ID (auto), Property_ID, Old_Price, New_Price, Updated_At |
| `App_User` | User_ID (auto), Username (unique), Password_Hash (BCrypt), Role, Agent_ID / Client_ID (unique), Enabled, Created_At, Last_Login |

### Triggers

| Trigger | When | What it does |
|---|---|---|
| `trg_check_sustainability` | BEFORE INSERT on Transaction | Blocks the sale if the property is already sold/let, or has zero green features (a missing features record counts as zero) |
| `trg_after_transaction_insert` | AFTER INSERT on Transaction | Marks the property `Unavailable` |
| `trg_after_transaction_delete` | AFTER DELETE on Transaction | Relists the property as `Available` when its last sale is deleted |
| `trg_property_update_log` | AFTER UPDATE on Property | Logs old and new price, only when the price actually changed |

### Functions

| Function | Returns |
|---|---|
| `calculate_price_per_sqft(id)` | Price ÷ size (0 if size unknown) |
| `calculate_property_tax(id)` | 0.1% of price (0 for a missing property) |

### Stored procedures

| Procedure | Returns |
|---|---|
| `get_properties_by_sustainability(min)` | Properties with at least `min` green features |
| `calculate_agent_commission(id)` | Deals closed, total value and 3% commission for an agent |
| `get_properties_by_efficiency()` | Property count per energy rating |
| `get_clients_with_transactions()` | Clients who have at least one deal |

All scripts can be re-run safely (`DROP … IF EXISTS`).
- **Fresh install:** `run-all.sql`, which drops and recreates the database.
- **Existing database:** `upgrade.sql` keeps the data. It has been tested on an old-style schema and is safe to
  run twice.

---

## 7. Design patterns

| Pattern | Class(es) | Purpose |
|---|---|---|
| **Factory** | `PropertyFactory` | Creates a property with category defaults (rating, certification, status). User input overrides them. |
| **Factory** | `ClientFactory` | Validates the client type, creates `BuyerClient` / `SellerClient` / `RenterClient`, and normalises the stored value |
| **Strategy** | `PricingStrategy` + `BuyerStrategy`, `SellerStrategy`, `RenterStrategy` | Prices a property per client type:<br>• buyer = 85.5% of list (5% discount, then 10% promotion)<br>• seller = 110%<br>• renter = 2% per month |
| **Singleton** | `ConfigManager` | Thread-safe, eagerly created holder for every business rate (tax, commission, discounts, markup, rent) |
| **Adapter** | `PropertyAdapter` | Converts raw stored-procedure rows into `Property` objects |

Also used: layered architecture (controller → service → repository) and DTOs (`PropertyRequest`). Services and
controllers use constructor injection.

### GRASP principles: where they are in the code

| Principle | Where |
|---|---|
| **Controller** | `PropertyController`, `ClientController`, `AgentController`, `TransactionController`, etc. receive every request and hand it to a service. They hold no business logic. |
| **Information Expert** | Each responsibility sits with the class that owns the data: `AuthUser` answers role questions (`isAdmin()`, `isAgent()`); `CurrentUser` decides listing ownership; `ConfigManager` owns the business rates; `PropertyAdapter` knows the stored procedure's column layout. |
| **Indirection** | Services sit between controllers and repositories. The `PricingStrategy` interface sits between `PropertyService` and the concrete pricing classes. `GlobalExceptionHandler` sits between exceptions and HTTP responses. |
| **Low coupling / high cohesion** | Controllers only do HTTP, services only do rules, repositories only do data access. Each package has one purpose (`security`, `exception`, `strategy`, `factory`, …). |

### SOLID principles: where they are in the code

| Principle | Where |
|---|---|
| **SRP** (single responsibility) | Controllers handle HTTP, services handle business rules, repositories handle persistence. `Validation` only checks input; `LoginAttemptService` only tracks failed logins; `AccountSeeder` only creates accounts. |
| **OCP** (open/closed) | A new pricing rule is a new class implementing `PricingStrategy`; the existing strategies don't change. Caveat: `PricingStrategy.forClientType()` still needs one new line to select it. |
| **DIP** (dependency inversion) | Services depend on repository interfaces and the `PricingStrategy` abstraction, not concrete implementations. Spring injects every dependency through constructors. |

---

## 8. REST API

All `/api/**` endpoints need a signed-in session, except login and logout.

**Error format:** errors are JSON: `{ timestamp, status, error, message, path }`.

**Status codes used:**

| Code | Meaning |
|---|---|
| 400 | Invalid input |
| 401 | Not signed in |
| 403 | Not allowed |
| 404 | Not found |
| 409 | Conflict: ID already in use, or the record is still linked to other data |
| 422 | Sale blocked by the sustainability trigger |
| 429 | Too many login attempts |

| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/auth/password` |
| Users (admin) | `GET, POST /api/users` · `PUT, DELETE /api/users/{id}` |
| Properties | `GET, POST /api/properties` · `GET, PUT, DELETE /api/properties/{id}` · `POST /api/properties/full` · `PUT /api/properties/{id}/full` |
| Property reports | `GET /api/properties/filter/{min}` · `/efficiency` · `/adapted/{min}` · `/with-strategy/{type}` · `/price/{type}/{price}` |
| MySQL functions | `GET /api/functions/price-per-sqft/{id}` · `GET /api/functions/property-tax/{id}` |
| Features | `GET, POST /api/features` · `PUT, DELETE /api/features/{id}` |
| Clients | `GET, POST /api/clients` · `GET /api/clients/with-transactions` · `GET, PUT, DELETE /api/clients/{id}` |
| Agents | `GET, POST /api/agents` · `PUT, DELETE /api/agents/{id}` · `GET /api/agents/{id}/commission` |
| Transactions | `GET, POST /api/transactions` · `PUT, DELETE /api/transactions/{id}` |
| Price log | `GET /api/logs` |

`POST` always **creates**: it returns 409 if the ID exists and never overwrites. `PUT` **updates**.

---

## 9. Security

- **Passwords:** hashed with BCrypt, never returned by the API.
- **Sessions:** session-cookie login, `SameSite=Lax`, 8-hour timeout, new session ID on login (prevents session
  fixation).
- **Two security chains:**
  - **API:** JSON 401/403 responses; CSRF off, relying on the JSON-only API and `SameSite=Lax` cookies.
  - **Admin console:** ADMIN only, form login, CSRF tokens on every form.
- **Where rules are enforced:** role and ownership checks run in the service layer, so they apply to the API and
  the admin console alike.
- **Brute force:** 5 failed attempts lock a username for 2 minutes.
- **Admin safeguards:** you can't disable or delete your own account or the last active admin.
- **Secrets:**
  - DB credentials and the admin password live in `backend/db.properties`, which git ignores.
  - Environment variables with the same names override them.
- **Database schema:** Hibernate never alters it (`ddl-auto=none`); `schema.sql` is the source of truth.

---

## 10. Configuration

### Backend (`backend/db.properties` or environment variables)

| Name | Default | Purpose |
|---|---|---|
| `DB_URL` | `jdbc:mysql://localhost:3306/sustainable_real_estate` | Database |
| `DB_USERNAME` / `DB_PASSWORD` | `root` / *(empty)* | Database login |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | `admin` / `admin123` | Admin account created on first start |
| `DEMO_USERS` | `true` | Create demo logins for agents and clients |
| `DEMO_AGENT_PASSWORD` / `DEMO_CLIENT_PASSWORD` | `agent123` / `client123` | Demo passwords |
| `FRONTEND_ORIGIN` | `http://localhost:5173` | Allowed CORS origin for non-proxied calls |

### Frontend (`.env` in `frontend/realestate-frontend`)

| Name | Default | Purpose |
|---|---|---|
| `VITE_BACKEND_URL` | `http://localhost:8080` | Dev proxy target |
| `VITE_API_URL` | *(empty)* | Call the backend directly instead of via the proxy |
| `VITE_ADMIN_CONSOLE_URL` | `http://localhost:8080/` | Admin console link |
| `VITE_SHOW_DEMO_LOGINS` | `true` | Show demo shortcuts on the sign-in page |

---

## 11. Running the project

```bash
# 1. Database (from the project root)
mysql -u root -p < database/run-all.sql        # fresh install — DROPS the database
# or
mysql -u root -p < database/upgrade.sql        # keep an existing database

# 2. Backend (port 8080)
cd backend
cp db.properties.example db.properties         # set DB_PASSWORD, ADMIN_PASSWORD
./mvnw spring-boot:run

# 3. Frontend (port 5173)
cd frontend/realestate-frontend
npm install
npm run dev
```

**Requirements:**
- JDK 17+
- Node.js 20+ (built and tested with Node 24)
- MySQL 8

---

## 12. Testing

| Suite | Command | What it covers | Result |
|---|---|---|---|
| Backend unit tests | `./mvnw test` | Patterns (Factory, Strategy, Singleton, Adapter), property validation and ownership rules; no database needed | 16 pass |
| Backend integration tests | `./mvnw test -Pintegration` | Real MySQL + seed data: login and logout, each role's permissions, 409/400/422 responses, triggers, functions, procedures, admin console access, CSRF, user management. Every test is rolled back. | 22 pass |
| SQL tests | `mysql … < database/tests/trigger-tests.sql` | All triggers, both functions and the commission calculation, inside a rolled-back transaction | 11 pass |
| Frontend | `npm run lint && npm run build` | Lint rules and production build | Clean |

The React app was also checked in a real browser against the running backend: sign-in as each role, navigation,
permissions, the blocked-sale message and the admin console. Those scripted checks are not part of the repository.

**Manual testing:** `info/manual-test-cases.md` is a click-through checklist of about 180 cases. It covers every
role, page, validation message and edge case, with the exact values to expect from the seed data. Tests that change
data are marked ✏️, and the checklist explains how to reset the data afterwards.

**Bugs the tests found (now fixed):**
- **MySQL functions always returned 0:** local variables named like columns (`price`, `size`) shadowed the columns.
- **Admin console failed to render:** a template fragment named `head` clashed with the HTML `<head>` tag.

---

## 13. Limitations and known weaknesses

### Data and business logic

- **Money is stored as `double` in Java** (`DECIMAL` in MySQL). Rounding drift is possible on large or fractional
  amounts. Switching to `BigDecimal` means changing the entity classes.
- **IDs are entered by hand** for agents, clients, properties and transactions (only logs and users auto-increment).
  - The UI suggests the next free ID, and the API rejects duplicates with 409.
  - Two users adding records at the same moment can still collide, and one of them has to retry.
- **Business rates are defined in two places:** `ConfigManager` in Java and the SQL function/procedure (tax 0.1%,
  commission 3%). They match today, but nothing forces them to stay in sync.
- **Green features are fixed to three yes/no flags**, one record per property. Adding a new feature type needs a
  schema change.
- **Triggers only run on insert and delete.** Editing a transaction doesn't re-check sustainability. Moving a
  transaction to a different property is blocked in the service for this reason.
- **Trigger errors are matched by message text** ("Transaction blocked") in the global error handler. Rewording the
  trigger message would break that mapping.
- **Status is a free-text string in Java** (`Available` / `Unavailable`). It's checked in the service, not by a
  Java enum.
- **No history for anything except price.** There is no record of who created, edited or deleted a record, only
  the application log.

### Security

- **A disabled account stays signed in** until its session expires (up to 8 hours). Disabling doesn't end sessions
  that are already active.
- **Login lockout is in memory and per username.** It resets on restart, doesn't work across multiple servers, and
  doesn't limit by IP address.
- **CSRF protection is off for `/api`.** It relies on `SameSite=Lax` cookies and a JSON-only API. That is fine when
  the app and API share a site, but a cross-site deployment would need CSRF tokens.
- **No HTTPS configuration.** The session cookie isn't marked `Secure`, which is fine locally but must be set in
  production.
- **Demo accounts use well-known passwords.** Set `DEMO_USERS=false`, change `ADMIN_PASSWORD` and set
  `VITE_SHOW_DEMO_LOGINS=false` before any real use.
- **No self-registration, email verification or "forgot password".** Admins create logins and reset passwords.
- **Agents can see every client** by design. There is no per-agent client assignment.

### Scalability and operations

- **Sessions are kept in server memory**, so it runs as a single instance. Running more than one server would need
  a shared session store (e.g. Spring Session + Redis).
- **The React app loads whole tables** on sign-in and after changes. Pagination happens in the browser only;
  there's no server-side paging or filtering. That's fine for hundreds of rows, not tens of thousands.
- **No Docker, CI pipeline or deployment setup.** It runs locally with Maven and Vite.
- **No database migration tool** (e.g. Flyway). Changes are applied with `schema.sql` / `upgrade.sql` by hand.
- **Integration tests need a live MySQL database loaded with `run-all.sql`**, because they depend on the seed data.

### User interface

- **No property photos.** Cards use an illustration based on property type.
- **Currency and number formats are fixed to India (₹, lakh/crore).** There's no localisation.
- **The Thymeleaf admin console is basic.** It's a separate, simpler UI from the React app and covers only core
  create/delete actions.
- **No frontend unit tests.** The frontend is checked with lint, build, and scripted browser runs that aren't in
  the repository.
- **Agent performance stats are hidden from clients**, because the API only gives a client their own transactions.

### Housekeeping

- **Lombok is still listed in `pom.xml`** but no longer used.
- **The client subclasses aren't JPA entities.** `BuyerClient`, `SellerClient` and `RenterClient` exist for the
  Factory pattern; client records themselves are always saved as `Client`.

---

## 14. Possible next steps

1. Switch money fields to `BigDecimal`, and add Flyway migrations.
2. End active sessions when an account is disabled, and add IP-based rate limiting.
3. Add server-side pagination and search.
4. Add Docker Compose (MySQL + backend + frontend) and a CI workflow running all three test suites.
5. Add property photo uploads and an audit log of who changed what.
6. Add frontend tests (Vitest + Testing Library) and end-to-end tests (Playwright) to the repository.

---

## 15. Resume summary

**Sustainable Real Estate Management System** | Spring Boot, React, MySQL, Spring Security, REST APIs

- Architected a full-stack property management platform following MVC architecture with Spring Boot and React,
  implementing GRASP patterns (Controller, Information Expert, Indirection) and SOLID principles (SRP, OCP, DIP) to
  achieve low coupling and high cohesion, alongside Factory, Strategy and Singleton patterns and role-based access
  control for admins, agents and clients.
- Designed a normalized 7-table MySQL schema with triggers, stored procedures and functions that block sales of
  non-sustainable properties and automate price-audit logging, and built secured RESTful APIs on a layered
  Controller-Service-Repository architecture serving a React dashboard, backed by 38 automated unit and integration
  tests.

Every claim above maps to the code: see §7 for GRASP, SOLID and the patterns, §6 for the database, §9 for security
and §12 for the tests.
