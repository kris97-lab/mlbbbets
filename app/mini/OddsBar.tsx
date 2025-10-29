"use client";

import { useMemo, type CSSProperties } from "react";
import styles from "./mini.module.css";

export type OddsBarProps = {
  matchTitle: string;
  matchStartTime: Date | null;
  teamAName: string;
  teamBName: string;
  marketStatus: string;
  liquidity: string | null;
  percentages: {
    teamA: number;
    teamB: number;
  };
  multipliers: {
    teamA: number | null;
    teamB: number | null;
  };
  isStreaming: boolean;
  lastUpdated: Date | null;
};

const formatTimestamp = (timestamp: Date | null) => {
  if (!timestamp) return "Awaiting market data";

  const diffMs = Date.now() - timestamp.getTime();
  const seconds = Math.round(diffMs / 1000);

  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (seconds < 60) {
    return rtf.format(-seconds, "second");
  }

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return rtf.format(-minutes, "minute");
  }

  const hours = Math.round(minutes / 60);
  return rtf.format(-hours, "hour");
};

const formatStartTime = (startTime: Date | null) => {
  if (!startTime) {
    return "";
  }

  return startTime.toLocaleString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  });
};

export function OddsBar({
  matchTitle,
  matchStartTime,
  teamAName,
  teamBName,
  marketStatus,
  liquidity,
  percentages,
  multipliers,
  isStreaming,
  lastUpdated,
}: OddsBarProps) {
  const fillWidth = useMemo(() => `${percentages.teamA}%`, [percentages.teamA]);
  const fillStyle = useMemo(
    () => ({ "--fill-width": fillWidth } as CSSProperties),
    [fillWidth]
  );
  const statusLabel = isStreaming ? "Live odds" : "Snapshot";
  const startLabel = formatStartTime(matchStartTime);

  return (
    <section className={styles.oddsContainer} aria-live="polite">
      <header className={styles.teamsHeading}>
        <div className={styles.oddsHeadingText}>
          <strong>{matchTitle}</strong>
          {startLabel ? <span className={styles.matchStart}>Starts {startLabel}</span> : null}
        </div>
        <span className={styles.statusPill} data-status={marketStatus.toLowerCase()}>
          <span className={styles.statusDot} />
          {marketStatus}
        </span>
      </header>

      <div className={styles.oddsLabels}>
        <span>{teamAName}</span>
        <span>{teamBName}</span>
      </div>

      <div className={styles.progressBar}>
        <div className={styles.progressFill} style={fillStyle} />
        <div className={styles.progressMarker} style={fillStyle} />
      </div>

      <div className={styles.progressPercentages}>
        <span>{percentages.teamA.toFixed(1)}%</span>
        <span>{percentages.teamB.toFixed(1)}%</span>
      </div>

      <footer className={styles.oddsMeta}>
        <span>
          {teamAName} {multipliers.teamA !== null ? multipliers.teamA.toFixed(2) : "--"}x · {teamBName}{" "}
          {multipliers.teamB !== null ? multipliers.teamB.toFixed(2) : "--"}x
        </span>
        <span>{statusLabel}</span>
      </footer>

      <div className={styles.marketMeta}>
        <span>Liquidity {liquidity ? `${Number(liquidity).toFixed(2)} ETH` : "--"}</span>
        <span>Updated {formatTimestamp(lastUpdated)}</span>
      </div>
    </section>
  );
}
