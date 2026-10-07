# Verdant — Sustainable Real Estate Management System

A full-stack real estate platform where **sustainability is enforced by the database**: a property with no green
features (solar panels, rainwater harvesting, waste management) simply can't be sold.

- **Backend:** Java 17, Spring Boot 3.5, Spring Data JPA, Spring Security, Thymeleaf
- **Database:** MySQL 8 with triggers, stored procedures and functions
- **Frontend:** React 19, Vite, React Router, Framer Motion

## Features

| Area | What it does |
|---|---|
| Sign-in & roles | Session login with three roles (below), brute-force lockout, admin user management |
| Dashboard | Portfolio value, sales by month, energy ratings, green-feature adoption, top agents, activity feed |
| Properties | Card grid or sortable table, filters, detail drawer with values computed by MySQL functions |
| Sustainability | Feature matrix with inline toggles; stored-procedure search by number of green features |
| Clients & agents | Contact details, deal history, pricing by client type (Strategy pattern) |
| Transactions | Warns before a sale the database will block; sold properties are marked automatically |
| Price history | Timeline built by a trigger that logs every price change |
| Admin console | Server-rendered Thymeleaf pages at `http://localhost:8080` (admins only) |

### Roles

| | Admin | Agent | Client |
|---|---|---|---|
| Browse properties, sustainability, price history, agents | ✓ | ✓ | ✓ |
| Add properties / edit & delete listings | all | own listings | — |
| Record deals | any property | own listings | — |
| Delete deals | ✓ | — | — |
| See clients | all | all | own profile |
| Add / edit clients | ✓ | ✓ | own contact details |
| Manage agents | ✓ | own profile | — |
| See transactions | all | all | own deals |
| Manage logins (Users & access) + admin console | ✓ | — | — |

Rules are enforced by the backend; the UI only hides what a role can't do.

## Getting started

### 1. Database

**Fresh install** (drops and recreates `sustainable_real_estate` with demo data):

```bash
mysql -u root -p < database/run-all.sql
```

**Keep an existing database** (adds the login table and installs the fixed triggers, functions and procedures):

```bash
mysql -u root -p < database/upgrade.sql
```

Run both from the project root.

### 2. Backend (port 8080)

```bash
cd backend
cp db.properties.example db.properties   # then set DB_PASSWORD (and ADMIN_PASSWORD)
./mvnw spring-boot:run
```

On first start the backend creates the admin account and a demo login for every agent and client.

### 3. Frontend (port 5173)

```bash
cd frontend/realestate-frontend
npm install
npm run dev
```

Open http://localhost:5173. Vite proxies `/api` to the backend, so sign-in cookies work without CORS setup.

### Demo accounts

| Role | Username | Password |
|---|---|---|
| Admin | `admin` | `admin123` (set `ADMIN_PASSWORD` in `db.properties`) |
| Agent | `agent1` … `agent5` | `agent123` |
| Client | `client101` … `client108` | `client123` |

Turn off demo logins with `DEMO_USERS=false`, and hide the login-page shortcuts with `VITE_SHOW_DEMO_LOGINS=false`.

## Database design

Tables: `Agent`, `Client`, `Property`, `Sustainability_Features`, `Transaction`, `Property_Update_Log`, `App_User`.

| Object | Purpose |
|---|---|
| `trg_check_sustainability` | Blocks a sale if the property is already sold or has no green features |
| `trg_after_transaction_insert` | Marks the property Unavailable after a sale |
| `trg_after_transaction_delete` | Relists the property when its sale is deleted |
| `trg_property_update_log` | Records every price change (not status-only updates) |
| `calculate_price_per_sqft`, `calculate_property_tax` | Values shown in the property drawer |
| `calculate_agent_commission` | 3% of an agent's closed deals (agent dashboard) |
| `get_properties_by_sustainability` | "Find green properties" search |
| `get_properties_by_efficiency`, `get_clients_with_transactions` | Reporting endpoints |

## Design patterns (backend)

- **Factory:** `PropertyFactory` sets category defaults; `ClientFactory` validates and types clients
- **Strategy:** `BuyerStrategy`, `SellerStrategy`, `RenterStrategy` price a property per client type
- **Singleton:** `ConfigManager` holds every business rate in one place
- **Adapter:** `PropertyAdapter` turns stored-procedure rows into `Property` objects

## Tests

```bash
cd backend
./mvnw test                  # unit tests (no database needed)
./mvnw test -Pintegration    # + end-to-end API tests against MySQL loaded with run-all.sql (changes are rolled back)
mysql -u root -p < database/tests/trigger-tests.sql   # triggers, functions, procedures (rolled back)
```

```bash
cd frontend/realestate-frontend
npm run lint && npm run build
```

## Project structure

```
backend/     Spring Boot app: controller, service, model, repository, security, exception,
             factory / strategy / adapter / config (patterns), templates (admin console)
database/    schema, functions, procedures, triggers, seed data, upgrade script, SQL tests
frontend/    React app (see frontend/realestate-frontend/README.md)
```
