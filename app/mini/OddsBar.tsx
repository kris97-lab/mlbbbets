"use client";

import { useMemo, type CSSProperties } from "react";
import styles from "./mini.module.css";

export type OddsBarProps = {
  teamAName: string;
  teamBName: string;
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
  if (!timestamp) return "Awaiting market open";

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

export function OddsBar({
  teamAName,
  teamBName,
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
  const statusLabel = isStreaming ? "Live odds" : "Simulated";

  return (
    <section className={styles.oddsContainer} aria-live="polite">
      <header className={styles.teamsHeading}>
        <strong>
          {teamAName} vs {teamBName}
        </strong>
        <span className={styles.statusPill}>
          <span className={styles.statusDot} />
          {statusLabel}
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
        <span>{formatTimestamp(lastUpdated)}</span>
      </footer>
    </section>
  );
}
