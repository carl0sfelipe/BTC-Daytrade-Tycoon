# Data Retention Policy — BTC Daytrade Tycoon

> **Status:** Draft  
> **Version:** 1.0  
> **Owner:** Paige (Technical Writer) + Winston (System Architect)

---

## 1. Purpose

This document defines how long each category of data is retained, where it is stored, and how it is destroyed. The policy ensures compliance with:

- **GDPR** (EU) — Article 5(1)(e): storage limitation
- **LGPD** (Brazil) — Article 16: duration of data processing
- **CCPA** (California) — Right to deletion

---

## 2. Data Categories and Retention Periods

### 2.1 Raw Telemetry Events

| Attribute | Value |
|-----------|-------|
| **What** | Individual anonymized events: `trade_opened`, `trade_closed`, `order_executed`, etc. |
| **Where** | PostgreSQL (production), local logs (dev) |
| **Retention** | **90 days** |
| **Reason** | Debugging, anomaly detection, data quality validation |
| **Destruction** | Automated cron job deletes rows older than 90 days |

```sql
-- Daily cleanup job
DELETE FROM telemetry_events WHERE created_at < NOW() - INTERVAL '90 days';
```

### 2.2 Aggregated Datasets

| Attribute | Value |
|-----------|-------|
| **What** | Rollups: daily win rates by leverage, average PnL by difficulty, etc. |
| **Where** | PostgreSQL + Parquet files in cold storage |
| **Retention** | **2 years** |
| **Reason** | Product analytics, A/B testing, feature impact measurement |
| **Destruction** | Manual review after 2 years; may extend if legally required |

### 2.3 Anonymized Trade Patterns

| Attribute | Value |
|-----------|-------|
| **What** | Fully anonymized, non-reversible patterns: "traders with X behavior have Y outcome" |
| **Where** | Research database + academic data repositories |
| **Retention** | **Indefinite** |
| **Reason** | Academic research, industry benchmarking |
| **Destruction** | Impossible to reverse-anonymize; data cannot be linked to individuals |

### 2.4 Product Analytics (PostHog)

| Attribute | Value |
|-----------|-------|
| **What** | Funnel data, onboarding completion, feature usage, session replays |
| **Where** | PostHog cloud |
| **Retention** | **1 year** |
| **Reason** | UX research, product improvement |
| **Destruction** | PostHog auto-deletion after retention period |

### 2.5 Server Logs

| Attribute | Value |
|-----------|-------|
| **What** | HTTP request logs, error traces |
| **Where** | Vercel logs |
| **Retention** | **30 days** |
| **Reason** | Debugging, security incident response |
| **Destruction** | Vercel auto-deletion |

### 2.6 User-Generated Content

| Attribute | Value |
|-----------|-------|
| **What** | Display names, achievement progress, leaderboard entries |
| **Where** | localStorage (client-side) + PostgreSQL (if synced) |
| **Retention** | **Until account deletion** |
| **Reason** | Core product functionality |
| **Destruction** | Deleted on user request or account inactivity (1 year) |

---

## 3. Destruction Procedures

### 3.1 Automated Deletion

```
Daily at 03:00 UTC:
  1. Delete telemetry_events older than 90 days
  2. Delete server logs older than 30 days
  3. Archive aggregated data older than 90 days to cold storage
```

### 3.2 Manual Deletion (User Request)

```
On receipt of deletion request:
  1. Hash the user's provided ID
  2. Query all tables for matching hashed_id
  3. Delete rows (hard delete, not soft delete)
  4. Confirm deletion within 30 days
  5. Log deletion event for audit
```

### 3.3 PostHog Data

- Configured to auto-delete after 1 year
- No manual intervention required
- User can request deletion via PostHog's API if needed

---

## 4. Storage Locations

| Environment | Location | Encryption |
|-------------|----------|------------|
| Production DB | PostgreSQL on Vercel / AWS RDS | AES-256 at rest |
| Cold Storage | S3 Glacier (Parquet files) | AES-256 |
| Dev/Local | SQLite / localStorage | None (dev only) |
| Analytics | PostHog Cloud | TLS in transit |

---

## 5. Access Control

| Role | Access | Justification |
|------|--------|---------------|
| Developers | Read-only prod (anonymized) | Debugging |
| Data Engineers | Read/write prod | Pipeline maintenance |
| Analysts (Mary) | Aggregated only | Research |
| External Buyers | Aggregated datasets only | Commercial contracts |
| No one | Raw individual events >90d | Privacy by design |

---

## 6. Audit Log

All deletions (automated and manual) are logged:

```json
{
  "action": "delete",
  "table": "telemetry_events",
  "filter": "created_at < 2026-02-11",
  "rows_deleted": 45231,
  "triggered_by": "cron",
  "timestamp": "2026-05-11T03:00:00Z"
}
```

---

## 7. Exceptions

Data may be retained beyond the standard period if:

1. **Legal obligation** — court order, regulatory investigation
2. **Security incident** — data held until investigation complete
3. **Research commitment** — academic study with IRB approval

In all cases, the legal team must approve the extension.

---

## 8. Review Schedule

| Review | Frequency | Owner |
|--------|-----------|-------|
| Retention periods | Annual | Paige + John |
| Deletion procedures | Quarterly | Winston |
| Access logs | Monthly | Security lead |
| Policy compliance | Annual | External auditor |

---

## 9. Contact

For questions about data retention:

- **Email:** privacy@btcdaytradetycoon.com
- **Subject line:** "Data Retention Inquiry"

---

*This is a draft document. Final version requires legal review before publication.*
