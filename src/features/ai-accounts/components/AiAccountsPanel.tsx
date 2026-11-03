"use client";

import { useCallback, useEffect, useState } from "react";
import { LogIn, LogOut, Sparkles } from "lucide-react";

import {
  emptyGoogleAuthStatus,
  type GoogleAuthStatus,
} from "@/lib/google-auth/config";

type AiAccountsPanelProps = {
  compact?: boolean;
  className?: string;
};

const PROVIDER_META = [
  {
    id: "gemini" as const,
    label: "Gemini",
    vendor: "Google",
    description: "Sign in with Google to power demo office chat with Gemini.",
  },
  {
    id: "chatgpt" as const,
    label: "ChatGPT",
    vendor: "OpenAI",
    description: "Account connect coming soon. API-key flow planned next.",
  },
  {
    id: "claude" as const,
    label: "Claude",
    vendor: "Anthropic",
    description: "Account connect coming soon. API-key flow planned next.",
  },
  {
    id: "grok" as const,
    label: "Grok",
    vendor: "xAI",
    description: "Account connect coming soon. API-key flow planned next.",
  },
];

export const AiAccountsPanel = ({ compact = false, className = "" }: AiAccountsPanelProps) => {
  const [status, setStatus] = useState<GoogleAuthStatus>(() => emptyGoogleAuthStatus());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/google/status", { cache: "no-store" });
      const json = (await response.json()) as GoogleAuthStatus & { ok?: boolean; error?: string };
      if (!response.ok) {
        throw new Error(json.error || "Failed to load Google auth status.");
      }
      setStatus({
        ...emptyGoogleAuthStatus(Boolean(json.configured)),
        ...json,
        comingSoonProviders: json.comingSoonProviders ?? ["chatgpt", "claude", "grok"],
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load AI account status.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const flag = params.get("google_auth");
    if (!flag) return;
    if (flag === "error") {
      setError(params.get("google_auth_error") || "Google sign-in failed.");
    }
    void refresh();
    params.delete("google_auth");
    params.delete("google_auth_error");
    const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}${window.location.hash}`;
    window.history.replaceState({}, "", next);
  }, [refresh]);

  const startGoogleSignIn = () => {
    if (!status.configured) {
      setError(
        "Add GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET to your environment, then restart Studio.",
      );
      return;
    }
    const returnTo = `${window.location.pathname}${window.location.search}` || "/office";
    window.location.href = `/api/auth/google/start?returnTo=${encodeURIComponent(returnTo)}`;
  };

  const disconnectGoogle = async () => {
    setBusy(true);
    try {
      const response = await fetch("/api/auth/google/logout", { method: "POST" });
      const json = (await response.json()) as GoogleAuthStatus & { ok?: boolean; error?: string };
      if (!response.ok) {
        throw new Error(json.error || "Failed to disconnect Google.");
      }
      setStatus({
        ...emptyGoogleAuthStatus(Boolean(json.configured)),
        ...json,
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disconnect Google.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`space-y-3 ${className}`} data-testid="ai-accounts-panel">
      <div className="space-y-1">
        <p className="font-mono text-[10px] font-semibold tracking-[0.06em] text-muted-foreground">
          AI accounts
        </p>
        {!compact ? (
          <p className="text-sm text-foreground/90">
            Connect a model account to upgrade demo office chat. Gemini uses real Sign in with Google.
          </p>
        ) : null}
      </div>

      <div className="grid gap-2">
        {PROVIDER_META.map((provider) => {
          const isGemini = provider.id === "gemini";
          const connected = isGemini && status.connected;
          return (
            <div
              key={provider.id}
              className="rounded-md border border-border bg-muted/30 px-3 py-3"
              data-testid={`ai-account-${provider.id}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-semibold text-foreground">
                      {provider.label}
                      <span className="ml-1.5 font-normal text-muted-foreground">
                        · {provider.vendor}
                      </span>
                    </p>
                    {connected ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                        <Sparkles className="h-3 w-3" />
                        Connected
                      </span>
                    ) : isGemini ? (
                      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
                        Available
                      </span>
                    ) : (
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/55">
                        Coming soon
                      </span>
                    )}
                  </div>
                  <p className="text-xs leading-snug text-muted-foreground">
                    {connected
                      ? `Signed in as ${status.email || status.name || "Google account"}. Demo agents reply with ${status.model}.`
                      : provider.description}
                  </p>
                </div>

                {isGemini ? (
                  connected ? (
                    <button
                      type="button"
                      className="ui-btn-secondary inline-flex h-9 items-center gap-1.5 px-3 text-[11px] font-semibold"
                      onClick={() => void disconnectGoogle()}
                      disabled={busy || loading}
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Disconnect
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="ui-btn-primary inline-flex h-9 items-center gap-1.5 px-3 text-[11px] font-semibold"
                      onClick={startGoogleSignIn}
                      disabled={busy || loading}
                      data-testid="google-signin-button"
                    >
                      <LogIn className="h-3.5 w-3.5" />
                      Sign in with Google
                    </button>
                  )
                ) : (
                  <button
                    type="button"
                    className="ui-btn-secondary h-9 cursor-not-allowed px-3 text-[11px] font-semibold opacity-50"
                    disabled
                  >
                    Coming soon
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!status.configured && !loading ? (
        <p className="text-xs leading-snug text-muted-foreground">
          To enable Gemini, set <span className="font-mono text-foreground">GOOGLE_OAUTH_CLIENT_ID</span> and{" "}
          <span className="font-mono text-foreground">GOOGLE_OAUTH_CLIENT_SECRET</span> from a Google Cloud OAuth
          client, then restart Studio. Redirect URI:{" "}
          <span className="font-mono text-foreground">/api/auth/google/callback</span>
        </p>
      ) : null}
      {error ? <p className="ui-text-danger text-xs leading-snug">{error}</p> : null}
    </div>
  );
};
