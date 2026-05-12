# Privacy Policy — BTC Daytrade Tycoon

> **Status:** Draft  
> **Effective Date:** TBD  
> **Jurisdiction:** Global (GDPR, LGPD, CCPA compliant)

---

## 1. What Data We Collect

### 1.1 Account Data (minimal)

We use a **fake auth system** — no real emails, passwords, or personal information is required. Your "account" is a random localStorage key with a display name you choose.

### 1.2 Trading Behavior Data (anonymized)

When you **opt in** to data sharing, we collect:

| Data Point | Example | Purpose |
|-----------|---------|---------|
| Position side | "long" or "short" | Behavioral analysis |
| Leverage used | 10× | Risk profiling |
| Entry/exit prices | $50,000 → $51,000 | Strategy pattern analysis |
| Trade duration | 120 seconds | Hold-time research |
| PnL (rounded) | +$120 | Performance benchmarking |
| Max drawdown | -3.5% | Risk management research |
| Order type | "market", "limit", "tp", "sl" | Execution preference analysis |

**We NEVER collect:**
- ❌ Your real name, email, or IP address
- ❌ Your exact wallet balance (rounded to nearest $10)
- ❌ Your device fingerprint or location
- ❌ Any data that could identify you personally

### 1.3 Product Analytics (anonymized)

We use PostHog to understand:
- Onboarding completion rates
- Feature usage (which buttons are clicked)
- Session duration and frequency
- Crash reports and errors

---

## 2. How We Anonymize Data

Before any data leaves your browser:

1. **User ID hashing** — Your browser-generated ID is hashed with a one-way function
2. **Wallet rounding** — Wallet values are rounded to the nearest $10
3. **Timestamp truncation** — Timestamps are truncated to the nearest minute
4. **No cross-session linkage** — Each session uses a new anonymous ID

```ts
// Example of anonymization pipeline
const anonymized = {
  userId: hashId(rawUserId),        // "u7a3f9k2"
  wallet: obfuscateWallet(10423.50), // 10420
  ts: truncateTimestamp(Date.now()), // 2026-05-11T22:30:00Z
};
```

---

## 3. How We Use Data

### 3.1 Internal Product Improvement

- Improve simulation accuracy
- Balance difficulty presets
- Fix bugs and optimize performance

### 3.2 Aggregated Research Datasets

With your **explicit opt-in consent**, we may sell **anonymized, aggregated** datasets to:

| Buyer Type | What They Get | What They DON'T Get |
|-----------|---------------|---------------------|
| Proprietary trading firms | "Traders with win rate >60% use leverage X" | Your individual trades |
| Academic researchers | "Average drawdown during volatility spikes" | Your identity or wallet |
| Quantitative analysts | "TP hit rates by market trend" | Your session history |

**We never sell:**
- Individual trader profiles
- Raw trade logs
- Any data that could be reverse-engineered to identify you

---

## 4. Your Rights

### 4.1 Opt-In (Not Opt-Out)

Data sharing is **disabled by default**. You must explicitly enable it during onboarding or in settings.

### 4.2 Right to Delete

You can request deletion of all data associated with your hashed ID at any time:
- Email: privacy@btcdaytradetycoon.com
- Response time: 30 days (GDPR compliant)

### 4.3 Right to Access

You can request a copy of all data we hold about your hashed ID.

### 4.4 Right to Withdraw Consent

You can disable data sharing at any time in Settings → Privacy. This stops collection immediately.

---

## 5. Data Retention

| Data Type | Retention Period | Reason |
|-----------|-----------------|--------|
| Raw telemetry events | 90 days | Debugging and quality assurance |
| Aggregated datasets | 2 years | Research and product analytics |
| Anonymized trade patterns | Indefinite | Academic and industry research |
| Product analytics (PostHog) | 1 year | Product improvement |

---

## 6. Third Parties

| Service | Purpose | Data Shared |
|---------|---------|-------------|
| PostHog | Product analytics | Anonymized events only |
| Vercel | Hosting | None (server logs anonymized) |
| Binance API | Price data | None (public API) |

We do not use Google Analytics, Facebook Pixel, or any ad tracking.

---

## 7. Children's Privacy

This service is not intended for users under 18. We do not knowingly collect data from children.

---

## 8. Changes to This Policy

We will notify users of material changes via:
- In-app notification
- Email (if provided)
- Changelog update

---

## 9. Contact

For privacy-related questions or requests:

- **Email:** privacy@btcdaytradetycoon.com
- **Response time:** 30 days
- **DPO:** TBD

---

*This is a draft document. Final version requires legal review before publication.*
