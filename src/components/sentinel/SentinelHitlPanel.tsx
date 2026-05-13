import { useState } from "react";
import { useSentinelContext } from "@/lib/sentinel/provider";

interface AnalysisResult {
  summary: string;
  severity: "low" | "medium" | "high" | "critical";
  suggestedFix?: string;
  affectedEvents: number[];
}

export function SentinelHitlPanel(): JSX.Element {
  const { eventLog } = useSentinelContext();
  const [narrative, setNarrative] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReport(): Promise<void> {
    if (!narrative.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const events = eventLog.getEvents();
      const response = await fetch("/api/sentinel/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ narrative, events }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Analysis failed: ${body}`);
      }

      const data = await response.json() as AnalysisResult;
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      aria-label="Sentinel HITL Panel"
      style={{
        border: "1px solid #ccc",
        borderRadius: 8,
        padding: 16,
        background: "#f9f9f9",
        maxWidth: 480,
      }}
    >
      <h3 style={{ marginTop: 0 }}>Sentinel HITL</h3>
      <label htmlFor="sentinel-narrative" style={{ display: "block", marginBottom: 4 }}>
        Narrate the bug:
      </label>
      <textarea
        id="sentinel-narrative"
        value={narrative}
        onChange={(e) => setNarrative(e.target.value)}
        rows={4}
        style={{ width: "100%", marginBottom: 12, fontFamily: "inherit" }}
        placeholder="Describe what went wrong..."
      />
      <button
        onClick={handleReport}
        disabled={loading || !narrative.trim()}
        aria-busy={loading}
        style={{ padding: "8px 16px", cursor: loading ? "not-allowed" : "pointer" }}
      >
        {loading ? "Analyzing..." : "Report Bug"}
      </button>

      {error && (
        <div role="alert" style={{ color: "#c00", marginTop: 12 }}>
          Error: {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: 16 }}>
          <h4 style={{ marginBottom: 4 }}>Analysis Result</h4>
          <p>
            <strong>Severity:</strong>{" "}
            <span style={{ color: severityColor(result.severity), fontWeight: 600 }}>
              {result.severity.toUpperCase()}
            </span>
          </p>
          <p>
            <strong>Summary:</strong> {result.summary}
          </p>
          {result.suggestedFix && (
            <p>
              <strong>Suggested Fix:</strong> {result.suggestedFix}
            </p>
          )}
          <p>
            <strong>Affected Events:</strong> {result.affectedEvents.join(", ")}
          </p>
        </div>
      )}
    </div>
  );
}

function severityColor(severity: AnalysisResult["severity"]): string {
  const colors: Record<AnalysisResult["severity"], string> = {
    low: "#666",
    medium: "#c80",
    high: "#c40",
    critical: "#c00",
  };
  return colors[severity];
}
