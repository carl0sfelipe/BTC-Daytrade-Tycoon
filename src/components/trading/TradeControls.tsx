"use client";

import { useCallback, useEffect } from "react";
import { Settings2, Calculator } from "lucide-react";
import { useTradingStore } from "@/store/tradingStore";
import ConfirmHighLeverageModal from "./ConfirmHighLeverageModal";
import PositionSizeCalculator from "./PositionSizeCalculator";
import {
  useTradeControlsState,
  usePositionSync,
  useOrderCapabilities,
  useActionErrorToast,
} from "@/hooks/trade-controls";
import {
  SideTabs,
  OrderTypeToggle,
  ReduceOnlyToggle,
  LeverageSelector,
  SizeSelector,
  TpSlPanel,
  LimitPriceInput,
  OrderSummary,
  ActionButtons,
} from "./trade-controls";
import { calcSliderMax } from "@/lib/trading/margin";
import { calcLiquidationPrice } from "@/lib/trading";
import { useTradeSentinel, useTradeSentinelBlocked } from "@/hooks/trade-controls";

export default function TradeControls() {
  const store = useTradingStore();
  const state = useTradeControlsState();

  // Store selectors
  const wallet = store.wallet;
  const position = store.position;
  const currentPrice = store.currentPrice;
  const maxLeverage = store.maxLeverage;
  const reduceOnly = store.reduceOnly;
  const lastActionError = store.lastActionError;

  // ── Size setters: separate "intent by percentage" from "intent in dollars" ──
  // Percent intent locks the slider's visual proportion and re-derives the
  // dollar value whenever capacity (sliderMax) changes — so a user who picks
  // MAX or 50% stays at that visual position when unrealized PnL moves the
  // capacity. Absolute intent fixes the dollar value and lets the slider
  // visual drift, which is what the user expects when they type a number.
  const setSizeAbsolute = useCallback(
    (v: number | ((prev: number) => number)) => {
      state.setSizeIntentPercent(null);
      state.setPositionSize(v);
    },
    [state]
  );

  // Hooks
  usePositionSync(position, state.setLeverage, state.setSide, setSizeAbsolute);
  useActionErrorToast(lastActionError, store.clearLastActionError);

  const caps = useOrderCapabilities(
    wallet,
    position,
    state.side,
    state.leverage,
    state.positionSize,
    currentPrice,
    reduceOnly
  );

  // When the user has locked a percentage (via slider drag or pill click),
  // re-derive positionSize from the current sliderMax. Snap to the slider's
  // step ($100) so the DOM range input renders at the chosen position.
  useEffect(() => {
    if (state.sizeIntentPercent === null) return;
    const max = Math.max(100, caps.sliderMax);
    const raw = max * state.sizeIntentPercent;
    const snapped = Math.max(100, Math.min(max, Math.floor(raw / 100) * 100));
    if (snapped !== state.positionSize) {
      state.setPositionSize(snapped);
    }
  }, [caps.sliderMax, state.sizeIntentPercent, state.positionSize, state]);

  const setSizePercent = useCallback(
    (pct: number) => {
      const clamped = Math.min(1, Math.max(0, pct));
      const max = Math.max(100, caps.sliderMax);
      const snapped = Math.max(100, Math.min(max, Math.floor((max * clamped) / 100) * 100));
      state.setSizeIntentPercent(clamped);
      state.setPositionSize(snapped);
    },
    [caps.sliderMax, state]
  );

  // Handlers
  const buildPayload = (
    action: Record<string, unknown>,
    overrides?: { side?: "long" | "short"; leverage?: number; positionSize?: number }
  ) => {
    const effectiveSide = overrides?.side ?? state.side;
    const effectiveLeverage = overrides?.leverage ?? state.leverage;
    const effectivePositionSize = overrides?.positionSize ?? state.positionSize;
    const isReduceMode = !!(position && effectiveSide !== position.side);
    let estLiqPrice: number | null = null;

    if (!position) {
      estLiqPrice = calcLiquidationPrice(currentPrice, effectiveLeverage || 1, effectiveSide, effectivePositionSize, wallet);
    } else if (isReduceMode) {
      estLiqPrice = calcLiquidationPrice(position.entry, effectiveLeverage || 1, position.side, position.size, wallet);
    } else {
      const newTotalSize = position.size + effectivePositionSize;
      const newEntry = (position.size * position.entry + effectivePositionSize * currentPrice) / newTotalSize;
      estLiqPrice = calcLiquidationPrice(newEntry, effectiveLeverage || 1, position.side, newTotalSize, wallet);
    }

    return {
      ...action,
      controlState: {
        side: effectiveSide,
        leverage: effectiveLeverage,
        positionSize: effectivePositionSize,
        orderType: state.orderType,
        limitPrice: state.limitPrice,
        tpPrice: state.tpPrice,
        slPrice: state.slPrice,
        mode: state.mode,
        estLiqPrice,
      },
    };
  };

  const recordLeverage = useTradeSentinel("trade-controls:leverage-selector", "spinbutton");
  const handleLeverageChange = (newLeverage: number) => {
    recordLeverage(() => {
      state.setLeverage(newLeverage);
      // Do NOT update store leverage here — that would prematurely move the
      // liquidation line on the chart. Leverage is applied when the order is
      // actually executed (handleUpdate / handleOpen).
    }, buildPayload({ type: "change", value: newLeverage }, { leverage: newLeverage }));
  };

  const recordOpen = useTradeSentinel("trade-controls:button:Open Position", "button");
  const recordBlockedOpen = useTradeSentinelBlocked("trade-controls:button:Open Position", "button");
  const handleOpen = () => {
    // Guard must match ActionButtons enabled logic to avoid stale-state
    // mismatch where the button is enabled but the handler silently returns.
    if (position && state.orderType === "limit") {
      const isFlip = !reduceOnly && state.positionSize >= position.size;
      if (caps.isReduceMode) {
        if (isFlip) {
          if (!caps.canFlip) return;
        } else {
          if (!caps.canDecrease) return;
        }
      } else {
        if (!caps.canOpen) return;
      }
    } else if (!caps.canOpen) {
      return;
    }

    if (
      state.leverage >= 50 &&
      !store.skipHighLeverageWarning &&
      state.mode === "simple"
    ) {
      state.setPendingTrade({
        side: state.side,
        leverage: state.leverage,
        size: state.positionSize,
        tp: state.tpPrice,
        sl: state.slPrice,
        limitPrice: state.orderType === "limit" ? state.limitPrice : null,
      });
      return;
    }

    recordOpen(() => {
      if (state.orderType === "limit") {
        const li = parseFloat(state.limitPrice);
        if (!li || li <= 0) {
          useTradingStore.setState({ lastActionError: "Enter a valid limit price before placing the order" });
          return;
        }
        store.addPendingOrder({
          side: state.side,
          orderType: "open",
          leverage: state.leverage,
          size: state.positionSize,
          tpPrice: state.tpPrice ? parseFloat(state.tpPrice) : null,
          slPrice: state.slPrice ? parseFloat(state.slPrice) : null,
          limitPrice: li,
          orderPrice: null,
        });
        resetInputs();
      } else {
        store.openPosition(
          state.side,
          state.leverage,
          state.positionSize,
          state.tpPrice,
          state.slPrice,
          null
        );
        resetInputs();
      }
    }, buildPayload({ type: "click", side: state.side, orderType: state.orderType, leverage: state.leverage, size: state.positionSize }));
  };

  const handleConfirmHighLeverage = () => {
    if (!state.pendingTrade) return;

    const li = state.pendingTrade.limitPrice
      ? parseFloat(state.pendingTrade.limitPrice)
      : null;

    recordOpen(() => {
      if (li && li > 0) {
        store.addPendingOrder({
          side: state.pendingTrade!.side,
          orderType: "open",
          leverage: state.pendingTrade!.leverage,
          size: state.pendingTrade!.size,
          tpPrice: state.pendingTrade!.tp ? parseFloat(state.pendingTrade!.tp) : null,
          slPrice: state.pendingTrade!.sl ? parseFloat(state.pendingTrade!.sl) : null,
          limitPrice: li,
          orderPrice: null,
        });
        resetInputs();
      } else if (!state.pendingTrade!.limitPrice) {
        store.openPosition(
          state.pendingTrade!.side,
          state.pendingTrade!.leverage,
          state.pendingTrade!.size,
          state.pendingTrade!.tp,
          state.pendingTrade!.sl,
          state.pendingTrade!.limitPrice
        );
        state.setTpPrice("");
        state.setSlPrice("");
      }

      state.setPendingTrade(null);
    }, buildPayload({ type: "click", side: state.pendingTrade.side, orderType: li ? "limit" : "market", leverage: state.pendingTrade.leverage, size: state.pendingTrade.size }));
  };

  const recordUpdate = useTradeSentinel("trade-controls:button:Update Position", "button");
  const recordBlockedUpdate = useTradeSentinelBlocked("trade-controls:button:Update Position", "button");
  const recordClose = useTradeSentinel("trade-controls:button:Close Position", "button");
  const handleClose = () => {
    recordClose(() => {
      store.closePosition("manual");
    }, buildPayload({ type: "click", reason: "manual" }));
  };
  const handleUpdate = () => {
    if (!position) return;

    recordUpdate(() => {
      if (caps.isReduceMode && !reduceOnly) {
        store.openPosition(state.side, state.leverage, state.positionSize, state.tpPrice, state.slPrice, null);
        return;
      }

      // Apply leverage change first if it differs from the current position.
      // This keeps the chart liq-price stable while the user is still adjusting
      // the slider, and only updates it when the order is actually sent.
      if (position.leverage !== state.leverage) {
        store.updateLeverage(state.leverage);
      }

      const targetSize = caps.isReduceMode
        ? position.size - state.positionSize
        : position.size + state.positionSize;

      if (targetSize <= 0) {
        store.closePosition("manual");
      } else {
        store.updatePositionSize(targetSize, state.side);
      }
    }, buildPayload({ type: "click", side: state.side, size: state.positionSize, isReduceMode: caps.isReduceMode }));
  };

  const resetInputs = () => {
    state.setLimitPrice("");
    state.setTpPrice("");
    state.setTpOrderPrice("");
    state.setSlPrice("");
    state.setSlOrderPrice("");
    state.setShowTp(false);
    state.setShowSl(false);
    setSizeAbsolute(position ? 1000 : state.positionSize);
  };

  const recordSideChange = useTradeSentinel("trade-controls:tablist:Side", "tab");
  const handleSideChange = (newSide: "long" | "short") => {
    recordSideChange(() => {
      state.setSide(newSide);
      if (!position || state.orderType !== "market") return;

      const newMax = calcSliderMax(position, wallet, state.leverage, newSide, reduceOnly, currentPrice);
      setSizeAbsolute(Math.min(1000, newMax));
    }, buildPayload({ type: "select", side: newSide }, { side: newSide }));
  };

  return (
    <>
      <div className="card-surface overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-crypto-border flex items-center justify-between">
          <h3 className="text-xs font-bold text-crypto-text-secondary uppercase tracking-wider">
            Order Controls
          </h3>
          <div className="flex items-center gap-2">
            <CalculatorButton onClick={() => state.setShowCalculator(true)} />
            <ModeToggle
              mode={state.mode}
              onToggle={() =>
                state.setMode(state.mode === "simple" ? "advanced" : "simple")
              }
            />
          </div>
        </div>

        <div className="p-4 space-y-4">
          <SideTabs
            side={state.side}
            position={position}
            orderType={state.orderType}
            onSideChange={handleSideChange}
          />

          <OrderTypeToggle
            orderType={state.orderType}
            onChange={state.setOrderType}
          />

          {position && <ReduceOnlyToggle reduceOnly={reduceOnly} />}

          <LeverageSelector
            mode={state.mode}
            leverage={state.leverage}
            maxLeverage={maxLeverage}
            onChange={handleLeverageChange}
          />

          {(!position || state.orderType === "limit") && (
            <TpSlPanel
              tpPrice={state.tpPrice}
              slPrice={state.slPrice}
              tpOrderPrice={state.tpOrderPrice}
              slOrderPrice={state.slOrderPrice}
              currentPrice={currentPrice}
              onTpChange={state.setTpPrice}
              onSlChange={state.setSlPrice}
              onTpOrderPriceChange={state.setTpOrderPrice}
              onSlOrderPriceChange={state.setSlOrderPrice}
            />
          )}

          <SizeSelector
            mode={state.mode}
            position={position}
            isReduceMode={caps.isReduceMode}
            wallet={wallet}
            leverage={state.leverage}
            positionSize={state.positionSize}
            sliderMax={caps.sliderMax}
            onChangePercent={setSizePercent}
            onChangeAbsolute={setSizeAbsolute}
          />

          {state.orderType === "limit" && (
            <LimitPriceInput
              limitPrice={state.limitPrice}
              limitStep={state.limitStep}
              currentPrice={currentPrice}
              onLimitPriceChange={state.setLimitPrice}
              onLimitStepChange={state.setLimitStep}
            />
          )}

          <OrderSummary
            wallet={wallet}
            position={position}
            positionSize={state.positionSize}
            leverage={state.leverage}
            isReduceMode={caps.isReduceMode}
            reduceOnly={reduceOnly}
            currentPrice={currentPrice}
            side={state.side}
          />

          <ActionButtons
            position={position}
            orderType={state.orderType}
            side={state.side}
            isReduceMode={caps.isReduceMode}
            reduceOnly={reduceOnly}
            canOpen={caps.canOpen}
            canIncrease={caps.canIncrease}
            canDecrease={caps.canDecrease}
            canFlip={caps.canFlip}
            positionSize={state.positionSize}
            onOpen={handleOpen}
            onUpdate={handleUpdate}
            onClose={handleClose}
            onBlockedOpen={recordBlockedOpen}
            onBlockedUpdate={recordBlockedUpdate}
          />
        </div>
      </div>

      {state.pendingTrade && (
        <ConfirmHighLeverageModal
          leverage={state.pendingTrade.leverage}
          onConfirm={handleConfirmHighLeverage}
          onCancel={() => state.setPendingTrade(null)}
          onSkipChange={(skip) => store.setSkipHighLeverageWarning(skip)}
        />
      )}

      {state.showCalculator && (
        <PositionSizeCalculator
          leverage={state.leverage}
          onApply={(size) => setSizeAbsolute(size)}
          onClose={() => state.setShowCalculator(false)}
        />
      )}
    </>
  );
}

function CalculatorButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Position Size Calculator"
      className="p-1.5 rounded hover:bg-crypto-surface-elevated text-crypto-text-muted hover:text-crypto-text transition-colors"
    >
      <Calculator className="w-3.5 h-3.5" />
    </button>
  );
}

function ModeToggle({
  mode,
  onToggle,
}: {
  mode: "simple" | "advanced";
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-crypto-surface-elevated border border-crypto-border text-[10px] font-semibold text-crypto-text-secondary hover:text-crypto-text transition-colors"
    >
      <Settings2 className="w-3 h-3" />
      {mode === "simple" ? "Advanced Mode" : "Simple Mode"}
    </button>
  );
}


