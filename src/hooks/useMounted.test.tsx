import { describe, it, expect } from "vitest";
import { render, renderHook } from "@testing-library/react";
import { useMounted } from "./useMounted";

/** Records the hook value seen by each render pass, including the first. */
function MountedRenderProbe({ seenValues }: { seenValues: boolean[] }) {
  seenValues.push(useMounted());
  return null;
}

describe("useMounted", () => {
  it("is false on the first render pass (what SSR/hydration would see)", () => {
    const seenValues: boolean[] = [];
    render(<MountedRenderProbe seenValues={seenValues} />);
    expect(seenValues[0]).toBe(false);
  });

  it("flips to true after the mount effect runs", () => {
    const { result } = renderHook(() => useMounted());
    expect(result.current).toBe(true);
  });
});
