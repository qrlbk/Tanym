import { describe, expect, it } from "vitest";
import { computeUnresolvedThreads } from "./unresolved-threads";

describe("computeUnresolvedThreads", () => {
  it("flags dropped thread when early object disappears", () => {
    const threads = computeUnresolvedThreads({
      chunks: [
        { id: "c-1", text: "He found the amulet.", from: 0, to: 20, label: "1", kind: "heading", chapterId: null, chapterTitle: null, sceneId: null, sceneTitle: null, chunkVersion: 2, contentHash: "1" },
        { id: "c-2", text: "They travel.", from: 21, to: 33, label: "2", kind: "heading", chapterId: null, chapterTitle: null, sceneId: null, sceneTitle: null, chunkVersion: 2, contentHash: "2" },
        { id: "c-3", text: "Storm starts.", from: 34, to: 46, label: "3", kind: "heading", chapterId: null, chapterTitle: null, sceneId: null, sceneTitle: null, chunkVersion: 2, contentHash: "3" },
        { id: "c-4", text: "Battle.", from: 47, to: 54, label: "4", kind: "heading", chapterId: null, chapterTitle: null, sceneId: null, sceneTitle: null, chunkVersion: 2, contentHash: "4" },
        { id: "c-5", text: "Aftermath.", from: 55, to: 65, label: "5", kind: "heading", chapterId: null, chapterTitle: null, sceneId: null, sceneTitle: null, chunkVersion: 2, contentHash: "5" },
        { id: "c-6", text: "Epilogue.", from: 66, to: 75, label: "6", kind: "heading", chapterId: null, chapterTitle: null, sceneId: null, sceneTitle: null, chunkVersion: 2, contentHash: "6" },
        { id: "c-7", text: "New arc.", from: 76, to: 84, label: "7", kind: "heading", chapterId: null, chapterTitle: null, sceneId: null, sceneTitle: null, chunkVersion: 2, contentHash: "7" },
      ],
      salientObjects: [{ name: "amulet", description: "artifact", chunkId: "c-1" }],
      facts: [],
    });
    expect(threads.length).toBeGreaterThan(0);
    expect(threads[0].stage).toBe("dropped");
  });
});
