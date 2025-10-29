"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import MiniAppSDK from "@farcaster/miniapp-sdk";

type NormalizedOdds = {
  teamA: number;
  teamB: number;
};

export type BetSide = "teamA" | "teamB";

type OddsPayload = {
  teamA: number;
  teamB: number;
  updatedAt?: string | number;
};

type UseOddsFeedOptions = {
  initialOdds: NormalizedOdds;
  teamAName: string;
  teamBName: string;
};

const STREAM_URL = process.env.NEXT_PUBLIC_ODDS_STREAM_URL;
const REST_URL = process.env.NEXT_PUBLIC_ODDS_REST_URL;
const BET_ACTION_URL = process.env.NEXT_PUBLIC_BET_ACTION_URL;

const clampProbability = (value: number) => {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
};

const normaliseOdds = (payload: OddsPayload): NormalizedOdds => {
  const teamATotal = clampProbability(payload.teamA ?? 0);
  const teamBTotal = clampProbability(payload.teamB ?? 0);
  const total = teamATotal + teamBTotal;

  if (total <= 0) {
    return { teamA: 0.5, teamB: 0.5 };
  }

  return {
    teamA: teamATotal / total,
    teamB: teamBTotal / total,
  };
};

const probabilityToOdds = (probability: number) => {
  const normalised = clampProbability(probability);
  if (normalised === 0) {
    return Infinity;
  }

  return 1 / normalised;
};

const formatNumber = (value: number, fractionDigits = 1) =>
  Number.parseFloat(value.toFixed(fractionDigits));

const defaultOptions: UseOddsFeedOptions = {
  initialOdds: { teamA: 0.5, teamB: 0.5 },
  teamAName: process.env.NEXT_PUBLIC_TEAM_A_NAME || "Team A",
  teamBName: process.env.NEXT_PUBLIC_TEAM_B_NAME || "Team B",
};

export function useOddsFeed(options: Partial<UseOddsFeedOptions> = {}) {
  const { initialOdds, teamAName, teamBName } = useMemo(
    () => ({ ...defaultOptions, ...options }),
    [options]
  );
  const betActionUrl = BET_ACTION_URL;

  const [odds, setOdds] = useState<NormalizedOdds>(initialOdds);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let interval: NodeJS.Timeout | undefined;
    let cancelled = false;

    const hydrateFromRest = async () => {
      if (!REST_URL) {
        return;
      }

      try {
        const response = await fetch(REST_URL, { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Failed to fetch odds: ${response.status}`);
        }

        const payload = (await response.json()) as OddsPayload;
        const nextOdds = normaliseOdds(payload);
        if (!cancelled) {
          setOdds(nextOdds);
          setLastUpdated(payload.updatedAt ? new Date(payload.updatedAt) : new Date());
        }
      } catch (err) {
        console.error("Unable to hydrate odds", err);
        if (!cancelled) {
          setError("Unable to fetch the latest odds. Showing live estimates.");
        }
      }
    };

    const startStream = async () => {
      if (STREAM_URL) {
        try {
          eventSource = new EventSource(STREAM_URL);
          eventSource.onopen = () => {
            if (!cancelled) {
              setIsStreaming(true);
              setError(null);
            }
          };

          eventSource.onerror = (event) => {
            console.error("Odds stream error", event);
            if (!cancelled) {
              setError("Live feed temporarily unavailable. Using recent snapshot.");
              setIsStreaming(false);
            }
          };

          eventSource.onmessage = (message) => {
            try {
              const payload = JSON.parse(message.data) as OddsPayload;
              const nextOdds = normaliseOdds(payload);
              if (!cancelled) {
                setOdds(nextOdds);
                setLastUpdated(payload.updatedAt ? new Date(payload.updatedAt) : new Date());
              }
            } catch (err) {
              console.error("Malformed odds payload", err);
            }
          };

          return;
        } catch (err) {
          console.error("Failed to open odds stream", err);
          if (!cancelled) {
            setError("Live feed temporarily unavailable. Using simulated data.");
          }
        }
      }

      setIsStreaming(false);
      interval = setInterval(() => {
        setOdds((previous) => {
          const drift = (Math.random() - 0.5) * 0.08;
          const nextA = clampProbability(previous.teamA + drift);
          const nextOdds = normaliseOdds({ teamA: nextA, teamB: 1 - nextA });
          setLastUpdated(new Date());
          return nextOdds;
        });
      }, 2500);
    };

    void hydrateFromRest();
    void startStream();
    setIsLoading(false);

    return () => {
      cancelled = true;
      if (eventSource) {
        eventSource.close();
      }
      if (interval) {
        clearInterval(interval);
      }
    };
  }, []);

  const formattedOdds = useMemo(() => {
    const toMultiplier = (probability: number) => {
      const multiplier = probabilityToOdds(probability);
      return Number.isFinite(multiplier) ? formatNumber(multiplier, 2) : null;
    };

    return {
      teamA: {
        probability: formatNumber(odds.teamA * 100, 1),
        multiplier: toMultiplier(odds.teamA),
      },
      teamB: {
        probability: formatNumber(odds.teamB * 100, 1),
        multiplier: toMultiplier(odds.teamB),
      },
    };
  }, [odds]);

  const placeBet = useCallback(
    async (side: BetSide) => {
      if (!betActionUrl) {
        throw new Error("Missing NEXT_PUBLIC_BET_ACTION_URL environment variable");
      }

      const url = new URL(betActionUrl);
      url.searchParams.set("side", side === "teamA" ? teamAName : teamBName);
      url.searchParams.set(
        "impliedProbability",
        (side === "teamA" ? odds.teamA : odds.teamB).toString()
      );

      try {
        const isInMiniApp = await MiniAppSDK.isInMiniApp();
        if (isInMiniApp) {
          await MiniAppSDK.actions.openUrl(url.toString());
        } else if (typeof window !== "undefined") {
          window.open(url.toString(), "_blank", "noopener,noreferrer");
        } else {
          throw new Error("Unable to open action outside of the Mini App context");
        }
      } catch (err) {
        throw err instanceof Error ? err : new Error("Action request was cancelled");
      }
    },
    [betActionUrl, odds.teamA, odds.teamB, teamAName, teamBName]
  );

  return {
    teamAName,
    teamBName,
    odds,
    formattedOdds,
    isStreaming,
    isLoading,
    lastUpdated,
    error,
    placeBet,
  };
}
