import { useState } from "react";
import { ChevronUp, ChevronDown, X } from "lucide-react";

interface TpSlEditorProps {
  isLong: boolean;
  currentPrice: number;
  onApply: (tp: string, sl: string) => void;
}

export function TpSlEditor({ isLong, currentPrice, onApply }: TpSlEditorProps) {
  const [tpInput, setTpInput] = useState("");
  const [tpOrderInput, setTpOrderInput] = useState("");
  const [slInput, setSlInput] = useState("");
  const [slOrderInput, setSlOrderInput] = useState("");
  const [showTp, setShowTp] = useState(false);
  const [showSl, setShowSl] = useState(false);
  const [tpSlStep, setTpSlStep] = useState(100);
  const [showTpSlStep, setShowTpSlStep] = useState(false);

  const handleApply = () => {
    onApply(tpInput, slInput);
    setTpInput(""); setTpOrderInput(""); setShowTp(false);
    setSlInput(""); setSlOrderInput(""); setShowSl(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <TpSlToggle
          active={showTp}
          hasValue={!!tpInput}
          label={tpInput ? `TP $${parseFloat(tpInput).toFixed(0)}` : "Set Take Profit"}
          emoji="🎯"
          activeClass="bg-crypto-long-dim border-crypto-long text-crypto-long"
          inactiveClass="bg-crypto-surface-elevated border-crypto-border text-crypto-text-secondary hover:border-crypto-long/50 hover:text-crypto-long"
          onClick={() => { setShowTp(!showTp); if (!showTp) setShowSl(false); }}
        />
        <TpSlToggle
          active={showSl}
          hasValue={!!slInput}
          label={slInput ? `SL $${parseFloat(slInput).toFixed(0)}` : "Set Stop Loss"}
          emoji="🛡️"
          activeClass="bg-crypto-short-dim border-crypto-short text-crypto-short"
          inactiveClass="bg-crypto-surface-elevated border-crypto-border text-crypto-text-secondary hover:border-crypto-short/50 hover:text-crypto-short"
          onClick={() => { setShowSl(!showSl); if (!showSl) setShowTp(false); }}
        />
      </div>

      {(showTp || showSl) && (
        <StepSelector step={tpSlStep} onChange={setTpSlStep} />
      )}

      {showTp && (
        <PriceEditor
          label={`Trigger Price ${isLong ? "▲ above" : "▼ below"}`}
          placeholder={isLong ? `> ${currentPrice.toFixed(0)}` : `< ${currentPrice.toFixed(0)}`}
          value={tpInput}
          onChange={setTpInput}
          step={tpSlStep}
          basePrice={currentPrice}
          accentColor="crypto-long"
          orderLabel="Order Price"
          orderValue={tpOrderInput}
          onOrderChange={setTpOrderInput}
          onApply={handleApply}
          applyLabel="Apply Take Profit"
          disabled={!tpInput}
        />
      )}

      {showSl && (
        <PriceEditor
          label={`Trigger Price ${isLong ? "▼ below" : "▲ above"}`}
          placeholder={isLong ? `< ${currentPrice.toFixed(0)}` : `> ${currentPrice.toFixed(0)}`}
          value={slInput}
          onChange={setSlInput}
          step={tpSlStep}
          basePrice={currentPrice}
          accentColor="crypto-short"
          orderLabel="Order Price"
          orderValue={slOrderInput}
          onOrderChange={setSlOrderInput}
          onApply={handleApply}
          applyLabel="Apply Stop Loss"
          disabled={!slInput}
        />
      )}
    </div>
  );
}

function TpSlToggle({ active, hasValue, label, emoji, activeClass, inactiveClass, onClick }: {
  active: boolean;
  hasValue: boolean;
  label: string;
  emoji: string;
  activeClass: string;
  inactiveClass: string;
  onClick: () => void;
}) {
  const cls = active
    ? activeClass
    : hasValue
    ? activeClass.replace("bg-", "bg-").replace("border-", "border-").replace("/30", "-dim/30").replace("/20", "/20")
    : inactiveClass;
  return (
    <button type="button" onClick={onClick} className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold border transition-all ${cls}`}>
      {emoji} {label}
    </button>
  );
}

function StepSelector({ step, onChange }: { step: number; onChange: (s: number) => void }) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex items-center justify-end gap-1">
      <button type="button" onClick={() => setShow(!show)} className="text-[10px] font-mono text-crypto-text-secondary hover:text-crypto-text transition-colors">
        step ${step}
      </button>
      {show && [10, 50, 100, 250].map((s) => (
        <button type="button" key={s} onClick={() => { onChange(s); setShow(false); }}
          className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono transition-all ${step === s ? "bg-crypto-accent text-white" : "bg-crypto-surface-elevated text-crypto-text-secondary border border-crypto-border hover:border-crypto-text-muted"}`}>
          ${s}
        </button>
      ))}
    </div>
  );
}

interface PriceEditorProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  step: number;
  basePrice: number;
  accentColor: string;
  orderLabel: string;
  orderValue: string;
  onOrderChange: (v: string) => void;
  onApply: () => void;
  applyLabel: string;
  disabled: boolean;
}

function PriceEditor({
  label, placeholder, value, onChange, step, basePrice, accentColor,
  orderLabel, orderValue, onOrderChange, onApply, applyLabel, disabled,
}: PriceEditorProps) {
  const borderClass = `border-${accentColor}/30`;
  const focusClass = `focus:border-${accentColor}`;
  const dimClass = `bg-${accentColor}-dim`;
  const textClass = `text-${accentColor}`;

  return (
    <div className={`space-y-1.5 p-2.5 rounded-lg bg-${accentColor}-dim/10 border border-${accentColor}/20`}>
      <PriceInputRow label={label} placeholder={placeholder} value={value} onChange={onChange} step={step} basePrice={basePrice} borderClass={borderClass} focusClass={focusClass} />
      <PriceInputRow label={`${orderLabel} (empty = market)`} placeholder="market" value={orderValue} onChange={onOrderChange} step={step} basePrice={parseFloat(value) || basePrice} borderClass="border-crypto-border" focusClass="focus:border-crypto-accent" />
      <button type="button" onClick={onApply} disabled={disabled}
        className={`w-full py-1.5 rounded-lg ${dimClass} border border-${accentColor}/30 ${textClass} text-xs font-semibold hover:bg-${accentColor}/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}>
        {applyLabel}
      </button>
    </div>
  );
}

function PriceInputRow({
  label, placeholder, value, onChange, step, basePrice, borderClass, focusClass,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  step: number;
  basePrice: number;
  borderClass: string;
  focusClass: string;
}) {
  return (
    <div className="space-y-1">
      <span className={`text-[9px] uppercase tracking-wider ${label.includes("Trigger") ? "text-crypto-long" : "text-crypto-text-muted"}`}>{label}</span>
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => onChange(((parseFloat(value) || basePrice) - step).toFixed(2))} className="flex-shrink-0 p-1.5 rounded bg-crypto-surface-elevated border border-crypto-border text-crypto-text-secondary hover:text-crypto-text transition-all">
          <ChevronDown className="w-3 h-3" />
        </button>
        <div className="relative flex-1">
          <input type="text" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)}
            className={`w-full px-2 py-1.5 pr-7 rounded-lg bg-crypto-surface-elevated border ${borderClass} text-xs font-mono text-crypto-text placeholder:text-crypto-text-muted focus:outline-none ${focusClass}`} />
          {value && (
            <button type="button" onClick={() => onChange("")} className="absolute right-1 top-1/2 -translate-y-1/2 text-crypto-text-muted hover:text-crypto-short">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        <button type="button" onClick={() => onChange(((parseFloat(value) || basePrice) + step).toFixed(2))} className="flex-shrink-0 p-1.5 rounded bg-crypto-surface-elevated border border-crypto-border text-crypto-text-secondary hover:text-crypto-text transition-all">
          <ChevronUp className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
