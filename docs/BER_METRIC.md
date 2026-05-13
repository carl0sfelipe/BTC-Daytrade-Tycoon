# Bug Escape Rate (BER) — Definition & Dashboard

> **Owner:** Mary (Business Analyst)  
> **Due:** 2026-05-14  
> **Status:** Draft → Ready for implementation

---

## 1. Definition

**Bug Escape Rate (BER)** measures the proportion of bugs that reach production versus those caught during development.

```
BER = Bugs_found_in_production / (Bugs_found_in_dev + Bugs_found_in_production)
```

| BER Range | Interpretation |
|-----------|----------------|
| `0.00 – 0.05` | Excellent — nearly all bugs caught pre-production |
| `0.05 – 0.10` | Good — target zone for this project |
| `0.10 – 0.20` | Warning — review test coverage and review process |
| `> 0.20` | Critical — halt features, focus on quality |

**Target:** `BER < 0.10` (10% escape rate)

---

## 2. Classification Rules

| Category | When to count |
|----------|---------------|
| **Dev bug** | Found by developer before merge (unit test, manual test, code review) |
| **Pre-prod bug** | Found by CI, integration tests, or QA before deploy |
| **Production bug** | Found by user, reported in analytics, or discovered after deploy |

**Exclusions:**
- Feature requests masquerading as bugs
- Environment/config issues not related to code
- Third-party API changes (documented separately)

---

## 3. Data Collection

### 3.1 Source of Truth

| Source | Data | Automation |
|--------|------|------------|
| GitHub Issues | Bug tickets labeled `bug` | Manual labeling required |
| `CHANGELOG_*.md` | Bug fix entries | Derive from PR descriptions |
| Playwright / E2E failures | Flaky test tracking | CI job logs |
| Sentry / Error tracking | Runtime errors | Not yet integrated |

### 3.2 Required Labels

```
bug-stage::dev
bug-stage::pre-prod
bug-stage::production
bug-type::trading-logic
bug-type::ui
bug-type::performance
bug-type::crash
```

---

## 4. Dashboard Spec

### 4.1 Location

Route: `/admin/quality` (protected, dev-only build flag)

### 4.2 Widgets

```
┌─────────────────────────────────────────────────────────────┐
│  BER Score          │  Trend (30d)      │  Target vs Actual│
│  0.08  🟡           │  ↓ 0.03          │  ████████░░ 80%  │
├─────────────────────────────────────────────────────────────┤
│  Bugs by Stage (bar chart)                                  │
│  Dev [████████████] 42   Pre-prod [████] 8   Prod [██] 4   │
├─────────────────────────────────────────────────────────────┤
│  Recent Escapes                                             │
│  • #142 — Liquidation missed by wick (2026-05-12)          │
│  • #138 — Slider max wrong on flip (2026-05-12)            │
│  • #127 — Limit order not reducing (2026-05-11)            │
├─────────────────────────────────────────────────────────────┤
│  TTR (Time to Reproduce)                                    │
│  Avg: 4.2m   Median: 2.1m   Worst: 18m (#142)              │
├─────────────────────────────────────────────────────────────┤
│  Test Coverage Heatmap                                      │
│  engine        ████████████ 94%                             │
│  store/slices  ██████████░░ 82%                             │
│  components    ████████░░░░ 68%  ← focus area               │
│  transitions   ███████████░ 91%                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 TTR (Time to Reproduce) Metric

**Definition:** Time elapsed from bug report to successful reproduction in a controlled environment.

**Why it matters:** TTR is a leading indicator of debuggability. High TTR means:
- Insufficient observability (no event log, no session replay)
- Missing golden tick coverage
- Complex reproduction steps

**Formula:**
```
TTR = timestamp(reproduced) - timestamp(reported)
```

**Classification:**

| TTR Range | Grade | Action |
|-----------|-------|--------|
| < 2 min | 🟢 Excellent | Golden tick exists or event log is sufficient |
| 2–10 min | 🟡 Good | Acceptable for complex state bugs |
| 10–30 min | 🟠 Warning | Add golden tick or improve observability |
| > 30 min | 🔴 Critical | Halt and add session replay + event log coverage |

**Tracking:**
- Record TTR in `CHANGELOG_*.md` bug entries (field: `ttr_minutes`)
- Target average TTR < 5 minutes per trading-logic bug

**Historical TTR:**

| Bug # | Description | TTR | Grade |
|-------|-------------|-----|-------|
| #142 | Liquidation missed by wick | 3m | 🟢 |
| #138 | Slider max wrong on flip | 8m | 🟡 |
| #127 | Limit order not reducing | 12m | 🟠 |

### 4.4 Implementation Path

**Phase A — Manual (now)**
- Update `CHANGELOG_*.md` with bug-stage labels
- Weekly manual count in team standup
- Record TTR for every bug fix

**Phase B — Semi-automated (next sprint)**
- GitHub Action parses PRs for `#fixes` references
- Script generates `ber-report.json` weekly
- Extract TTR from changelog entries automatically

**Phase C — Dashboard UI (future)**
- Next.js page at `/admin/quality`
- Reads from `ber-report.json` or lightweight DB
- Protected by `process.env.NODE_ENV !== 'production'` or auth

---

## 5. Historical Baseline

| Sprint | Dev | Pre-prod | Production | BER | Avg TTR |
|--------|-----|----------|------------|-----|---------|
| 2026-05-05 | 8 | 2 | 3 | 0.23 ⚠️ | — |
| 2026-05-12 | 12 | 4 | 4 | 0.20 ⚠️ | 7.7m |
| **Target** | — | — | — | **< 0.10 🎯** | **< 5m 🎯** |

**Note:** May 12 "production" bugs were found during active playtesting, not by end-users. This still counts as escapes because they passed the 348-unit test suite.

---

## 6. Action Triggers

| BER | Action |
|-----|--------|
| > 0.15 | Mandatory integration test for every PR |
| > 0.20 | Pause feature work, full regression test |
| > 0.30 | Code freeze, audit all slices + transitions |

| Avg TTR | Action |
|---------|--------|
| > 15m | Add golden tick for every new engine feature |
| > 30m | Implement session replay + structured event log |

---

*Document owner: Mary. Last updated: 2026-05-13.*
