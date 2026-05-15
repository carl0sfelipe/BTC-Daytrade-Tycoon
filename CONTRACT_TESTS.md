# Contract Tests — BTC Daytrade Tycoon

> **Status:** Active law for every PR touching `src/lib/engine/`, `src/store/slices/`, or `src/lib/trading/transitions.ts`.

Contract tests verify that the **output of layer A is consumable by layer B**.
They do not test business logic — they test structural compatibility and data flow.

---

## Why Contract Tests

The refactored architecture uses:
- `tick-processor.ts` (engine) → produces `TickResult`
- `positionSlice.ts` (store) → consumes `price`, `candleLow`, `candleHigh`
- `ordersSlice.ts` (store) → consumes `price`, `candleLow`, `candleHigh`
- `transitions.ts` (pure) → consumes `Position`, `Trade`, `OrderHistoryItem`

A change in `TickResult` that removes `candleHigh` breaks `ordersSlice.ts` silently
if no contract test exists. Unit tests of each layer pass independently.
Only a contract test catches the mismatch.

---

## Contracts

### Contract 1: Engine → Store (TickResult)

**Producer:** `processTick` in `src/lib/engine/tick-processor.ts`
**Consumers:** `checkPosition` and `checkPendingOrders` in store slices

**Guarantees:**
- `TickResult` always contains `price: number`
- `TickResult` always contains `candleLow: number` and `candleHigh: number`
- `candleLow <= price <= candleHigh`
- `candleLow` and `candleHigh` come from the same candle that contains `simulatedTimeSec`

**Test file:** `src/contracts/engine-store-contract.test.ts`

```ts
it("TickResult contains all fields required by checkPosition", () => {
  const result = processTick({ startDate, currentCandles, simulationStartRealTime });
  expect(result).toHaveProperty("price");
  expect(result).toHaveProperty("candleLow");
  expect(result).toHaveProperty("candleHigh");
  expect(result.candleLow).toBeLessThanOrEqual(result.price);
  expect(result.candleHigh).toBeGreaterThanOrEqual(result.price);
});
```

---

### Contract 2: Store → Transitions (Position)

**Producer:** `positionSlice.ts` (assembles `Position`)
**Consumer:** `computeClosePosition`, `computeHedgeFlip`, etc. in `transitions.ts`

**Guarantees:**
- `Position` always has `side`, `entry`, `size`, `leverage`, `liquidationPrice`
- `Position.size > 0`
- `Position.leverage >= 1`

**Test file:** `src/contracts/store-transitions-contract.test.ts`

```ts
it("positionSlice produces valid Position for all transitions", () => {
  useTradingStore.getState().openPosition("long", 10, 1000, "", "", null);
  const pos = useTradingStore.getState().position;
  expect(pos).not.toBeNull();
  expect(pos!.size).toBeGreaterThan(0);
  expect(pos!.leverage).toBeGreaterThanOrEqual(1);
});
```

---

### Contract 3: Orders → Position (Cross-slice calls)

**Producer:** `ordersSlice.checkPendingOrders`
**Consumer:** `positionSlice.openPosition`, `addToPosition`, `reducePosition`

**Guarantees:**
- `checkPendingOrders` never calls `openPosition` with `size <= 0`
- `checkPendingOrders` never calls `reducePosition` with `reducedSize <= 0`
- After `checkPendingOrders`, `pendingOrders` only contains orders that did NOT execute

**Test file:** `src/contracts/orders-position-contract.test.ts`

---

### Contract 4: Transitions → Store (Patch shape)

**Producer:** Any `compute*` function in `src/lib/trading/`
**Consumer:** `set({ ...patch })` in store slices

**Guarantees:**
- Patch never contains `undefined` values (causes Zustand merge issues)
- Patch keys are a subset of `TradingStore` keys
- `wallet` in patch is never `NaN` or `Infinity`

**Test file:** `src/contracts/transitions-store-contract.test.ts`

---

## Running Contract Tests

```bash
# All contracts
npx vitest run src/contracts/

# Single contract
npx vitest run src/contracts/engine-store-contract.test.ts
```

---

## Adding a New Contract

1. Identify the boundary between two layers.
2. List the guarantees the producer makes and the consumer assumes.
3. Create `src/contracts/{producer}-{consumer}-contract.test.ts`.
4. Add the file path to `.github/workflows/ci.yml` under `integration-tests`.
5. Document the contract in this file.

---

## Contract Test Baseline

| Contract | Status | Scenarios |
|----------|--------|-----------|
| Engine → Store | ✅ Active | 5 |
| Store → Transitions | ✅ Active | 4 |
| Orders → Position | ✅ Active | 3 |
| Transitions → Store | ✅ Active | 4 |
