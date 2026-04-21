import { NextResponse } from "next/server";
import type { ApiKeyProvider } from "@/lib/ai/secret-store";
import { DESKTOP_KEYCHAIN_SERVICE } from "@/lib/ai/secret-store";

type KeytarLike = {
  getPassword: (service: string, account: string) => Promise<string | null>;
  setPassword: (service: string, account: string, password: string) => Promise<void>;
  deletePassword: (service: string, account: string) => Promise<boolean>;
};

const PROVIDERS = new Set<ApiKeyProvider>(["openai", "anthropic", "google"]);

async function loadKeytar(): Promise<KeytarLike | null> {
  try {
    const mod = await import("keytar");
    return (mod.default ?? mod) as KeytarLike;
  } catch {
    return null;
  }
}

function parseProvider(value: unknown): ApiKeyProvider | null {
  if (value === "openai" || value === "anthropic" || value === "google") {
    return value;
  }
  return null;
}

export async function POST(req: Request) {
  const keytar = await loadKeytar();
  if (!keytar) {
    return NextResponse.json({ error: "keytar_unavailable" }, { status: 503 });
  }
  const body = await req.json().catch(() => null);
  const provider = parseProvider((body as { provider?: unknown } | null)?.provider);
  const action = (body as { action?: unknown } | null)?.action;
  const value =
    typeof (body as { value?: unknown } | null)?.value === "string"
      ? (body as { value: string }).value.trim()
      : "";
  if (!provider || !PROVIDERS.has(provider)) {
    return NextResponse.json({ error: "invalid_provider" }, { status: 400 });
  }
  if (action === "status") {
    const secret = await keytar.getPassword(DESKTOP_KEYCHAIN_SERVICE, provider);
    return NextResponse.json({ hasKey: Boolean(secret && secret.trim()) });
  }
  if (action !== "set") {
    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  }
  if (!value) {
    return NextResponse.json({ error: "empty_key" }, { status: 400 });
  }

  await keytar.setPassword(DESKTOP_KEYCHAIN_SERVICE, provider, value);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const keytar = await loadKeytar();
  if (!keytar) {
    return NextResponse.json({ error: "keytar_unavailable" }, { status: 503 });
  }
  const body = await req.json().catch(() => null);
  const provider = parseProvider((body as { provider?: unknown } | null)?.provider);
  if (!provider || !PROVIDERS.has(provider)) {
    return NextResponse.json({ error: "invalid_provider" }, { status: 400 });
  }
  await keytar.deletePassword(DESKTOP_KEYCHAIN_SERVICE, provider);
  return NextResponse.json({ ok: true });
}
