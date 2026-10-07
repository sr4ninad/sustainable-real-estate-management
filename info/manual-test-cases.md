# Manual test checklist

Hands-on test cases for every role, feature and edge case. Tick each box as you go.

- **App:** http://localhost:5173
- **Admin console:** http://localhost:8080
- **Tests that change data** are marked ✏️. Reset anytime (see §0).

---

## 0. Before you start

### Accounts

| Role | Username | Password | Who |
|---|---|---|---|
| Admin | `admin` | `admin123` | Full access |
| Agent | `agent1` | `agent123` | Arjun Kapoor — owns properties **201, 202** |
| Agent | `agent2` | `agent123` | Kavya Menon — owns **203, 205** |
| Agent | `agent4` | `agent123` | Neha Deshpande — owns **206, 208** (no deals) |
| Client | `client101` | `client123` | Aarav Sharma — Buyer, 1 deal (#301) |
| Client | `client108` | `client123` | Meera Joshi — Renter, **no deals** |

### Seed data you'll test against

| ID | Property | Agent | Price | Green score | Status |
|---|---|---|---|---|---|
| 201 | Prestige Lakeside, Bengaluru | Arjun (1) | ₹95 L | 2 | Sold (deal #301) |
| 202 | Palm Grove Villa, Bengaluru | Arjun (1) | ₹2.75 Cr | **3** | **Available** |
| 203 | Hiranandani Towers, Mumbai | Kavya (2) | ₹2.1 Cr | 2 | Sold (#302) |
| 204 | Cyber Hub Offices, Gurugram | Rahul (3) | ₹7.2 Cr | 3 | Sold (#303) |
| 205 | Sea Breeze Residency, Mumbai | Kavya (2) | ₹4.2 Cr | 1 | Sold (#304) |
| 206 | Green Acres, Pune | Neha (4) | ₹1.65 Cr | **0 — can't be sold** | **Available** |
| 207 | Tech Park Plaza, Hyderabad | Siddharth (5) | ₹9.5 Cr | 2 | Sold (#305) |
| 208 | Heritage Flats, Chennai | Neha (4) | ₹74 L | 1 | **Available** |

**Clients with deals:** 101, 103, 104, 106, 107. **Clients without deals:** 102, 105, 108.

### Resetting the data

From the project root, reload the demo data, then **restart the backend** so it recreates the logins:

```
mysql -u root -p < database/run-all.sql
```

Tip: use a normal window for one role and a private/incognito window for another. Each window keeps its own
sign-in.

---

## A. Sign-in and sessions

| # | Steps | Expected | ✓ |
|---|---|---|---|
| A1 | Open http://localhost:5173 while signed out | Login page with photo panel on the left, form on the right, 3 demo account buttons | [ ] |
| A2 | Click **Sign in** with both fields empty | Red message: "Enter your username and password." | [ ] |
| A3 | Username `admin`, password `wrong` | "Invalid username or password." | [ ] |
| A4 | Username `nobody`, any password | Same message as A3 (doesn't reveal whether the user exists) | [ ] |
| A5 | Username `ADMIN` (capitals), password `admin123` | Signs in (usernames aren't case-sensitive) | [ ] |
| A6 | Username `  admin  ` (spaces around), password `admin123` | Signs in (spaces are trimmed) | [ ] |
| A7 | Password `ADMIN123` (wrong case) | Rejected: passwords are case-sensitive | [ ] |
| A8 | Click the 👁 icon in the password field | Password becomes visible; click again hides it | [ ] |
| A9 | Click each demo button (Admin / Agent / Client) | Signs straight in as that role | [ ] |
| A10 | Enter a wrong password for `agent2` **5 times**, then the correct one | 6th attempt: "Too many failed attempts. Try again in a couple of minutes." even with the right password. Works again after ~2 minutes | [ ] |
| A11 | Sign in, then refresh the page (F5) | Still signed in | [ ] |
| A12 | Sidebar account card → ⏻ **Sign out** → Cancel | Stays signed in | [ ] |
| A13 | Sign out → confirm | Back to the login page. Browser **Back** button doesn't reveal app pages | [ ] |
| A14 | Sign in, stop the backend, then click around | Actions fail with a clear error. Refreshing shows "Can't reach the server" with a **Retry** button | [ ] |
| A15 | Restart the backend, then click **Retry** | Login page works again. You need to sign in again, because the restart ends sessions | [ ] |
| A16 | Sign in as admin in one window and agent1 in an incognito window | Both work at the same time, each with its own menu | [ ] |

---

## B. Navigation per role

| # | Steps | Expected | ✓ |
|---|---|---|---|
| B1 | Sign in as **admin**, look at the sidebar | Dashboard, Properties, Sustainability, Clients, Agents, Transactions, Price history, **Admin → Users & access** | [ ] |
| B2 | Sign in as **agent1** | Same as admin **except** no "Users & access" | [ ] |
| B3 | Sign in as **client101** | **My home**, Properties, Sustainability, Agents, **My deals**, Price history. No Clients, no Users | [ ] |
| B4 | As client101, type `http://localhost:5173/clients` in the address bar | Redirected to My home | [ ] |
| B5 | As client101 or agent1, go to `/users` | Redirected to the home page | [ ] |
| B6 | Go to `/does-not-exist` | "Page not found" card with a **Back to dashboard** button | [ ] |
| B7 | Go to old URLs `/features` and `/logs` | Redirect to Sustainability and Price history | [ ] |
| B8 | Check the counts next to menu items (admin) | Properties 8, Clients 8, Agents 5, Transactions 5 | [ ] |
| B9 | As client101, check the count next to "My deals" | 1 | [ ] |
| B10 | Sidebar account card shows name + role | admin → "Administrator · Admin"; agent1 → "Arjun Kapoor · Agent"; client101 → "Aarav Sharma · Client" | [ ] |
| B11 | Sidebar status card → ⟳ refresh | Spinner, then "Synced just now" | [ ] |

---

## C. Dashboard and client home

| # | Steps | Expected | ✓ |
|---|---|---|---|
| C1 | Admin → Dashboard | Hero shows **₹29.1 Cr** portfolio, "8 properties · 3 available now"; glass card: avg green score **1.8/3**, Certified **5/8**, Deals **5** | [ ] |
| C2 | Stat tiles | Sales volume ₹14.4 Cr (5 transactions); Available 3 / 8; Clients 8 (4 buyers · 2 sellers · 2 renters); Green certified 63% | [ ] |
| C3 | Hover the bars in "Sales by month" | Tooltip with month, amount and number of deals. Tallest bar (Mar 26) is labelled ₹7.1 Cr | [ ] |
| C4 | Hover the "Energy efficiency" bars | Tooltip with count and share, e.g. "3 of 8 properties (38%)" for A | [ ] |
| C5 | "Sustainability adoption" meters | Solar 63%, Rainwater 63%, Waste 50%, Certified 63%, All three 25% | [ ] |
| C6 | "Top agents" | Rahul Verma first (₹7.1 Cr), Neha Deshpande last (₹0) | [ ] |
| C7 | "Recent activity" | Mix of sales (⇄ icon) and price changes (↗ up / ↘ down), newest first | [ ] |
| C8 | Click "Add property" / "Record a deal" in the hero | Opens the matching form | [ ] |
| C9 | Sign in as **agent1** → Dashboard | Extra **"Your performance"** row: listings 2 (1 still available), portfolio ₹3.7 Cr, closed deals 1 (₹93 L), commission **₹2.79 L** | [ ] |
| C10 | Sign in as **client101** → My home | "Welcome back, Aarav." Badge **Buyer**; Your deals 1, total ₹93 L | [ ] |
| C11 | Client home → "Your deals" | Prestige Lakeside, #301, 12 Nov 2025, ₹93,00,000 | [ ] |
| C12 | Client home → "Your agents" | Arjun Kapoor with **Call** and **Email** links | [ ] |
| C13 | Client home → "Greenest homes available now" | Palm Grove Villa (3 leaves) and Heritage Flats (1 leaf). **Green Acres is NOT shown** (0 features) | [ ] |
| C14 | Sign in as **client108** (no deals) → My home | "No deals yet" empty state; agents card suggests browsing agents | [ ] |

---

## D. Properties

### Viewing and filtering

| # | Steps | Expected | ✓ |
|---|---|---|---|
| D1 | Properties page, grid view | 8 cards with price, ₹/sq ft, green leaves, energy badge, certification, agent avatar | [ ] |
| D2 | Switch to table view (≡ icon), then reload the page | Table view is remembered | [ ] |
| D3 | Search `Mumbai` | Only 203 and 205 | [ ] |
| D4 | Search `LEED`, then `Arjun` | Certified LEED ones (204, 207); then Arjun's (201, 202) | [ ] |
| D5 | Search `zzzz` | "No properties match" + **Clear filters** button, which resets everything | [ ] |
| D6 | Status filter: Available / Sold | Available = 202, 206, 208; Sold = the other 5. Counts on the buttons match | [ ] |
| D7 | Type filter "Villa" | Only the villas: **202, 206** | [ ] |
| D8 | Sort: Price high→low, Greenest first, Largest first | Order changes correctly (e.g. highest price = Tech Park Plaza) | [ ] |
| D9 | Table view: click column headers | Sorts ascending, then descending, then off (arrow icon changes) | [ ] |
| D10 | As **agent1**, click **My listings** | Only 201 and 202 | [ ] |

### Detail drawer

| # | Steps | Expected | ✓ |
|---|---|---|---|
| D11 | Click property **201** | Drawer slides in: Sold/Let, A, IGBC, ₹95,00,000, green score 2/3 ("Good") | [ ] |
| D12 | "Computed by MySQL" section on 201 | Price per sq ft **₹6,552**, property tax **₹9,500** | [ ] |
| D13 | Transactions section on 201 | #301 · Client #101 · 12 Nov 2025 · ₹93 L, −2.1% vs list | [ ] |
| D14 | Click property **206** | Green score 0/3, all three features ✗ | [ ] |
| D15 | Close the drawer with Esc, the ✕ button, and by clicking outside | All three close it | [ ] |
| D16 | Copy the URL while the drawer is open (e.g. `?id=202`), paste it in a new tab | Opens directly with that property's drawer | [ ] |
| D17 | As **agent1**, open 202 (own) and 203 (not own) | 202 shows **Edit/Delete** buttons; 203 shows no buttons | [ ] |
| D18 | As **client101**, open any property | No Edit/Delete buttons | [ ] |

### Adding and editing ✏️

| # | Steps | Expected | ✓ |
|---|---|---|---|
| D19 | Admin → **Add property** | Form opens with the next free ID suggested (**209**) | [ ] |
| D20 | Submit with everything empty except the ID | Errors: "Address is required", "Enter a price above zero" | [ ] |
| D21 | Change ID to `201` | "ID 201 is already taken" | [ ] |
| D22 | ID `0`, `-5` or `abc` | "Enter a positive whole number" | [ ] |
| D23 | Price `0` or `-100`; size `0` | "Enter a price above zero" / "Size must be a positive number" | [ ] |
| D24 | Type price `5000000` | Hint below shows "₹50 L" | [ ] |
| D25 | Turn all three green toggles **off** | Warning: sales will be blocked by `trg_check_sustainability` | [ ] |
| D26 | Fill in valid data (ID 209, address, price, one feature on) → **Add property** | Toast "Property added"; new card appears; its drawer shows the feature you chose | [ ] |
| D27 | Address with symbols/Unicode, e.g. `Flat 4B, "Rosé" Towers — 北` | Saved and shown exactly as typed | [ ] |
| D28 | Address `<script>alert(1)</script>` | Shown as plain text; **no popup** | [ ] |
| D29 | Address longer than 255 characters | Toast error: "Address can be at most 255 characters." | [ ] |
| D30 | Edit 209: change price | Toast "Property updated"; new entry on **Price history** | [ ] |
| D31 | Edit 209: change only the status | Saved; **no** new Price history entry | [ ] |
| D32 | Open Edit on any property | ID field is locked ("IDs can't be changed") | [ ] |
| D33 | Press Esc or Cancel in the form | Closes without saving | [ ] |
| D34 | As **agent1**, click Add property | "Listing agent" is locked to Arjun Kapoor | [ ] |
| D35 | As agent1, add property 210 | Saved and appears under **My listings** | [ ] |

### Deleting ✏️

| # | Steps | Expected | ✓ |
|---|---|---|---|
| D36 | Admin → delete **201** (has a deal) | Toast "Can't delete this property — It has 1 transaction. Delete those first." Nothing is deleted | [ ] |
| D37 | Delete **209** (created in D26) → Cancel in the confirm box | Nothing happens | [ ] |
| D38 | Delete 209 → confirm | Toast "Property deleted"; card gone; its sustainability record is gone too | [ ] |
| D39 | As **agent2**, try to delete 202 (Arjun's) | No delete button is offered | [ ] |

---

## E. Sustainability

| # | Steps | Expected | ✓ |
|---|---|---|---|
| E1 | Open Sustainability | Score ring **1.8** (avg of 3); 2 fully green, 5 certified, **1 can't be sold** | [ ] |
| E2 | Yellow warning banner | "1 property has no green features…" | [ ] |
| E3 | "Find green properties": **Any** | All 8 properties | [ ] |
| E4 | **1+** / **2+** / **All 3** | 7 / 5 / 2 results (All 3 = Palm Grove Villa, Cyber Hub Offices). The code box updates, e.g. `get_properties_by_sustainability(3)` | [ ] |
| E5 | Click a result | Opens that property's drawer on the Properties page | [ ] |
| E6 | ✏️ Admin → Green Acres (206) → click the **Solar** ✗ | Turns ✓, toast "Solar panels added"; "can't be sold" drops to 0; banner disappears; score becomes Basic | [ ] |
| E7 | ✏️ Click it again | Back to ✗; banner returns | [ ] |
| E8 | As **agent1** | Only rows 201 and 202 have clickable toggles; others are dashed/read-only | [ ] |
| E9 | As **client101** | All toggles read-only | [ ] |
| E10 | Sort the matrix by "Green score" | Highest first, then lowest first | [ ] |

---

## F. Clients (admin and agents)

| # | Steps | Expected | ✓ |
|---|---|---|---|
| F1 | Open Clients | 8 clients; tabs **All 8 · Buyers 4 · Sellers 2 · Renters 2** | [ ] |
| F2 | Click the "Renters" tab, then search `sneha` | Sneha Kulkarni only | [ ] |
| F3 | Phone / Email links | `tel:` and `mailto:` links open your dialer/mail app | [ ] |
| F4 | ✏️ Add client → submit with the name empty | "Name is required" | [ ] |
| F5 | Email `abc@xyz` (no dot) | "Enter a valid email" | [ ] |
| F6 | Phone `12345` or `abcdefghij` | "Enter a valid phone number…" | [ ] |
| F7 | Phone `+91 98765 43210` | Accepted | [ ] |
| F8 | ID `101` | "ID 101 is already taken" | [ ] |
| F9 | ✏️ Valid new client (e.g. 109, Renter) | Toast "Client added"; appears under Renters | [ ] |
| F10 | ✏️ Click a row → change phone → Save | Updated | [ ] |
| F11 | Admin → delete **Aarav Sharma** (has a deal) | "Can't delete this client — has 1 transaction on record." | [ ] |
| F12 | ✏️ Admin → delete **client 109** from F9 | Deleted | [ ] |
| F13 | ✏️ Admin → delete **Meera Joshi (108)**, then try to sign in as `client108` | Deleted; `client108` login no longer works (login removed with the client) | [ ] |
| F14 | As **agent1** | Can Add and Edit; **no delete** buttons | [ ] |
| F15 | "Dynamic pricing" → Buyer | Prestige Lakeside ₹95 L → **₹81,22,500** (−14.5%); formula shows 85.5% | [ ] |
| F16 | Seller tab | ₹95 L → **₹1,04,50,000** (+10%) | [ ] |
| F17 | Renter tab | ₹95 L → **₹1,90,000 /mo** (2%) | [ ] |

---

## G. Agents

| # | Steps | Expected | ✓ |
|---|---|---|---|
| G1 | Admin → Agents | 5 cards with listings, portfolio, closed deals, estimated commission. Top card has a **Top performer** badge | [ ] |
| G2 | Sort by Name A–Z / Largest portfolio | Order changes | [ ] |
| G3 | Click a listing chip on a card | Opens that property | [ ] |
| G4 | ✏️ Admin → Add agent with ID `1` | "ID 1 is already taken" | [ ] |
| G5 | ✏️ Admin → Add agent 6 with valid details | Added (no listings yet) | [ ] |
| G6 | Admin → delete **Arjun Kapoor** (has listings) | "Can't delete this agent — …is the listing agent on 2 properties. Reassign them first." | [ ] |
| G7 | ✏️ Admin → delete agent 6 from G5 | Deleted | [ ] |
| G8 | As **agent1** | "You" badge on own card; pencil only on own card; no Add or Delete | [ ] |
| G9 | ✏️ agent1 edits own phone | Saved | [ ] |
| G10 | As **client101** → Agents | Contact details only — **no stats** (listings, commission hidden) | [ ] |

---

## H. Transactions and database rules

| # | Steps | Expected | ✓ |
|---|---|---|---|
| H1 | Admin → Transactions | 5 deals, newest first; stat tiles: ₹14.4 Cr total, 5 deals, average ₹2.88 Cr | [ ] |
| H2 | "vs list" column | e.g. #301 −2.1% (red), #302 −2.4% | [ ] |
| H3 | Record deal → open the property dropdown | Only **available** properties: 202, 206, 208 (sold ones aren't listed) | [ ] |
| H4 | Pick **206 Green Acres** | Red box: "This sale will be blocked… `trg_check_sustainability`" | [ ] |
| H5 | Pick a client and submit anyway | Toast: "Couldn't record deal — Transaction blocked by the database: this property has no sustainability features…". Nothing saved | [ ] |
| H6 | Pick **202** | Green box "Passes the sustainability check"; amount auto-fills ₹2,75,00,000 | [ ] |
| H7 | Change amount to `0` / empty | "Enter an amount above zero" | [ ] |
| H8 | Transaction ID `301` | "ID 301 is already taken" | [ ] |
| H9 | Try to choose a future date | Date picker doesn't allow dates after today | [ ] |
| H10 | ✏️ Record deal: 202, client **Ananya Iyer**, amount 2,70,00,000 | Toast "Deal recorded"; 202 now shows **Sold / Let**; dashboard counts update | [ ] |
| H11 | Record another deal and open the dropdown | 202 is no longer offered | [ ] |
| H12 | Open Edit on the new deal | Property dropdown is locked; amount and date can change | [ ] |
| H13 | ✏️ Admin → delete the H10 deal → confirm | Toast "Transaction deleted"; **202 back to Available** (relist trigger) | [ ] |
| H14 | As **agent1** → Record deal | Dropdown only shows agent1's available listings (**202**) | [ ] |
| H15 | As agent1 | Pencil only on deal #301 (own listing); no delete buttons | [ ] |
| H16 | As **client101** → My deals | Only #301; no Record deal button; no edit/delete | [ ] |
| H17 | Search "Rohan" / "305" | Filters to the matching deal | [ ] |

---

## I. Price history

| # | Steps | Expected | ✓ |
|---|---|---|---|
| I1 | Open Price history | 4 changes, grouped by day, newest first: Heritage Flats −5.1%, Green Acres +6.5%, Palm Grove −3.5%, Hiranandani +5% | [ ] |
| I2 | Stat tiles | 4 changes · 2 increases · 2 reductions · biggest move shown | [ ] |
| I3 | Filter by property | Only that property's entries | [ ] |
| I4 | ✏️ After D30/H10 | Price edit adds an entry; selling (status change only) does **not** | [ ] |
| I5 | Click a property name | Opens its drawer | [ ] |

---

## J. Users & access (admin only)

| # | Steps | Expected | ✓ |
|---|---|---|---|
| J1 | Open Users & access | 14 logins: 1 admin, 5 agents, 8 clients. Own row says "Manage in Profile" | [ ] |
| J2 | Role tabs and search | Filter correctly | [ ] |
| J3 | "Last sign-in" column | Shows e.g. "just now" for accounts you've used; "Never" otherwise | [ ] |
| J4 | Create login → Agent | Agent dropdown says "Every agent already has a login." (all 5 are linked) | [ ] |
| J5 | ✏️ Create an agent (G5) first, then Create login → Agent → pick them | Username auto-suggests `agent6`; a random password is generated (🪄 makes a new one) | [ ] |
| J6 | Username `ab` or `bad name!` | Error: usernames must be 3–40 letters, numbers, dots, dashes or underscores | [ ] |
| J7 | Username `agent1` or `AGENT1` | "The username "agent1" is already taken." | [ ] |
| J8 | Password `12345` | "Passwords must be at least 6 characters." | [ ] |
| J9 | ✏️ Create the login; sign in with it in incognito | Works as that agent | [ ] |
| J10 | ✏️ Reset password (🔑) on that user | Toast shows the new password; the old one stops working | [ ] |
| J11 | ✏️ Disable the user (👤✕); try signing in with it | "This account has been disabled. Contact an admin." | [ ] |
| J12 | Enable it again | Can sign in again | [ ] |
| J13 | ⚠️ Known limitation: disable a user who is **already signed in** elsewhere | They stay signed in until their session ends (up to 8 h) | [ ] |
| J14 | ✏️ Delete the login | Removed; the agent record itself stays | [ ] |
| J15 | Create login → Admin | No record to link; creates a second admin | [ ] |

---

## K. Profile and password

| # | Steps | Expected | ✓ |
|---|---|---|---|
| K1 | Click your name in the sidebar | Profile page: name, role, username, email, phone, and your listings or deals | [ ] |
| K2 | Admin → Profile | "Admin accounts aren't linked to an agent or client record." | [ ] |
| K3 | Change password with a wrong current password | "Your current password is incorrect." | [ ] |
| K4 | New password `123` | "The new password must be at least 6 characters." | [ ] |
| K5 | New and confirm don't match | "The new passwords don't match." | [ ] |
| K6 | ✏️ Valid change → sign out → sign in | Old password fails; new one works. (Reset data or change it back afterwards) | [ ] |
| K7 | ✏️ As client101 → Edit contact details | **No client-type picker** (clients can't change their type); name/email/phone save | [ ] |
| K8 | After changing the name | The sidebar account card shows the new name | [ ] |

---

## L. General UI

| # | Steps | Expected | ✓ |
|---|---|---|---|
| L1 | Press **Ctrl + K** anywhere | Command palette opens | [ ] |
| L2 | Type `kensington`, `arjun`, `add` | Matching properties, agents and quick actions; ↑ ↓ to move, Enter to open, Esc to close | [ ] |
| L3 | As client101, Ctrl + K → type `client` | No clients or "Add…" actions (not allowed for clients) | [ ] |
| L4 | Theme switcher: Light / Auto / Dark, then reload | Colours change; choice is remembered | [ ] |
| L5 | Browser width ~390 px (DevTools → phone) | Sidebar becomes a ☰ menu; pages stack into one column; no sideways scrolling | [ ] |
| L6 | In any form, press **Tab** repeatedly | Focus cycles inside the dialog, never behind it | [ ] |
| L7 | Tables with more than 10 rows (e.g. Users, 14) | Pager "1–10 of 14" with ‹ › buttons | [ ] |
| L8 | Every success/error message | Appears bottom-right, disappears on its own, has an ✕ | [ ] |
| L9 | Any delete | Always asks for confirmation first | [ ] |

---

## M. Admin console (http://localhost:8080)

| # | Steps | Expected | ✓ |
|---|---|---|---|
| M1 | Open http://localhost:8080 signed out | Its own sign-in page | [ ] |
| M2 | Sign in as `agent1` | "That account isn't an administrator." | [ ] |
| M3 | Sign in as `admin` (or use ↗ in the React sidebar while signed in as admin) | Properties page with the sidebar | [ ] |
| M4 | Click **Edit** on a property | "Update Property" form fills with its values | [ ] |
| M5 | ✏️ Update only the price | Saved; address and other fields unchanged | [ ] |
| M6 | Delete property 201 → OK | Red message top-right: "This property has transactions on record. Delete those first." | [ ] |
| M7 | Agents / Clients / Transactions / Features / Property Logs pages | All load with data | [ ] |
| M8 | ✏️ Add a transaction with the date left empty | Saved with today's date | [ ] |
| M9 | ✏️ Add a client with type left as "Select Type" | Browser asks you to choose a type | [ ] |
| M10 | Sign out | Back to the console sign-in with "You've been signed out." | [ ] |

---

## N. Security spot-checks (in the browser address bar)

| # | Steps | Expected | ✓ |
|---|---|---|---|
| N1 | Signed out, open http://localhost:5173/api/properties | JSON: status 401, "Please sign in to continue." | [ ] |
| N2 | As client101, open `/api/clients` | Only Aarav's own record | [ ] |
| N3 | As client101, open `/api/clients/102` | 403 "You can only view your own profile." | [ ] |
| N4 | As client101, open `/api/transactions` | Only transaction #301 | [ ] |
| N5 | As agent1, open `/api/users` | 403 | [ ] |
| N6 | As admin, open `/api/users` | Lists logins with **no** `passwordHash` field anywhere | [ ] |
| N7 | Open `/api/properties/abc` | 400 "…missing or badly formatted values." | [ ] |
| N8 | Open `/api/properties/999` | 404 "Property 999 not found." | [ ] |

---

## O. Optional: check the database directly

Run these in MySQL (`USE sustainable_real_estate;`):

| # | Query | Expected | ✓ |
|---|---|---|---|
| O1 | `SELECT calculate_price_per_sqft(201), calculate_property_tax(201);` | `6551.72`, `9500.00` | [ ] |
| O2 | `CALL get_properties_by_sustainability(3);` | 202 and 204 | [ ] |
| O3 | `CALL calculate_agent_commission(2);` | Kavya Menon: 2 sales, 6,20,00,000 total, 18,60,000 commission | [ ] |
| O4 | `INSERT INTO Transaction VALUES (999, CURDATE(), 100, 206, 101);` | Error: "Transaction blocked: Property not sustainable enough." | [ ] |
| O5 | `INSERT INTO Transaction VALUES (999, CURDATE(), 100, 201, 101);` | Error: "Transaction blocked: Property is already sold or let." | [ ] |
| O6 | `SELECT Username, Role, LEFT(Password_Hash, 7) FROM App_User;` | Hashes start with `$2a$10` (BCrypt), never plain text | [ ] |
| O7 | Run the automated SQL checks: `mysql -u root -p < database/tests/trigger-tests.sql` | 11 rows, all **PASS**, and no data changed | [ ] |
