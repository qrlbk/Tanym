import { beforeEach, describe, expect, it } from "vitest";
import { useUIStore } from "./uiStore";

describe("uiStore workspace view", () => {
  beforeEach(() => {
    useUIStore.setState({
      workspaceView: "scene",
      rightPanelTab: "story",
      showPlotPanel: false,
    });
  });

  it("switches workspace to graph and back to scene", () => {
    useUIStore.getState().setWorkspaceView("graph");
    expect(useUIStore.getState().workspaceView).toBe("graph");

    useUIStore.getState().setWorkspaceView("scene");
    expect(useUIStore.getState().workspaceView).toBe("scene");
  });
});
