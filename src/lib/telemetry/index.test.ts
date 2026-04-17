import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  isTelemetryEnabled,
  setTelemetryEnabled,
  track,
} from "./index";

describe("telemetry opt-in gate", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("is disabled by default", () => {
    expect(isTelemetryEnabled()).toBe(false);
  });

  it("can be enabled and disabled and persists in localStorage", () => {
    setTelemetryEnabled(true);
    expect(isTelemetryEnabled()).toBe(true);
    setTelemetryEnabled(false);
    expect(isTelemetryEnabled()).toBe(false);
  });

  it("track() is a no-op when telemetry is disabled", () => {
    const spy = vi.spyOn(navigator, "sendBeacon").mockReturnValue(true);
    setTelemetryEnabled(false);
    track({ name: "foo" });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("track() is a no-op when NEXT_PUBLIC_TELEMETRY_URL is not set", () => {
    const spy = vi.spyOn(navigator, "sendBeacon").mockReturnValue(true);
    setTelemetryEnabled(true);
    track({ name: "foo" });
    // В тестовой среде env-переменная по умолчанию пустая.
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
