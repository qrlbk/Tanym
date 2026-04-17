import { beforeEach, describe, expect, it, vi } from "vitest";

const generateObjectMock = vi.fn();

vi.mock("ai", () => ({
  generateObject: (...args: unknown[]) => generateObjectMock(...args),
}));

vi.mock("@ai-sdk/openai", () => ({
  openai: () => "mock-model",
}));

import { POST } from "./route";

describe("POST /api/ai/plot-extract", () => {
  beforeEach(() => {
    generateObjectMock.mockReset();
    process.env.OPENAI_API_KEY = "test-key";
  });

  it("returns selfContradictions from model output", async () => {
    generateObjectMock.mockResolvedValue({
      object: {
        facts: [],
        relations: [],
        salientObjects: [],
        selfContradictions: [
          {
            kind: "fact_conflict",
            message: "Противоречие в описании",
            quoteA: "абсолютная тишина",
            quoteB: "громкие крики слуг",
            chunkIds: ["c-1"],
            confidence: 0.9,
          },
        ],
      },
    });

    const req = new Request("http://localhost/api/ai/plot-extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chunks: [{ id: "c-1", text: "Стояла абсолютная тишина, но слышались крики." }],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const payload = (await res.json()) as {
      selfContradictions: Array<{ confidence: number; kind: string }>;
    };
    expect(payload.selfContradictions.length).toBe(1);
    expect(payload.selfContradictions[0].kind).toBe("fact_conflict");
    expect(payload.selfContradictions[0].confidence).toBeGreaterThan(0.5);
  });
});
