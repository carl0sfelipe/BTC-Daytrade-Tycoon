import { NextRequest, NextResponse } from "next/server";
import type { SentinelEvent } from "@/lib/sentinel/types";

interface AnalyzeRequest {
  narrative: string;
  events: SentinelEvent[];
}

interface AnalyzeResponse {
  summary: string;
  severity: "low" | "medium" | "high" | "critical";
  suggestedFix?: string;
  affectedEvents: number[];
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: AnalyzeRequest;
  try {
    body = await req.json() as AnalyzeRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { narrative, events } = body;
  if (!narrative || !Array.isArray(events)) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Heuristic local analysis (stub LLM pipeline)
  const result = runHeuristicAnalysis(narrative, events);
  return NextResponse.json(result);
}

function runHeuristicAnalysis(
  narrative: string,
  events: SentinelEvent[]
): AnalyzeResponse {
  const text = narrative.toLowerCase();
  const lastEvents = events.slice(-10);
  const affectedEvents = lastEvents.map((e) => e.sequenceId);

  if (text.includes("crash") || text.includes("freeze")) {
    return {
      summary: "Detected potential crash or freeze in recent events.",
      severity: "critical",
      suggestedFix: "Check event loop and long-running tasks in tick processor.",
      affectedEvents,
    };
  }

  if (text.includes("wrong") || text.includes("incorrect") || text.includes("not match")) {
    return {
      summary: "State divergence detected between expected and actual values.",
      severity: "high",
      suggestedFix: "Review diffState logic and engine snapshot computation.",
      affectedEvents,
    };
  }

  if (text.includes("slow") || text.includes("lag") || text.includes("delay")) {
    return {
      summary: "Performance degradation observed during session.",
      severity: "medium",
      suggestedFix: "Profile clock.advance() calls and reduce unnecessary re-renders.",
      affectedEvents,
    };
  }

  if (text.includes("ui") || text.includes("button") || text.includes("click")) {
    return {
      summary: "UI interaction anomaly reported.",
      severity: "low",
      suggestedFix: "Verify ARIA labels and semantic locator resolution.",
      affectedEvents,
    };
  }

  return {
    summary: "General anomaly reported. Manual review recommended.",
    severity: "medium",
    affectedEvents,
  };
}
