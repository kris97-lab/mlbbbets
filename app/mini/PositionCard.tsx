"use client";

import { useState } from "react";
import { BetSide } from "./useOddsFeed";
import styles from "./mini.module.css";

type PositionCardProps = {
  teamAName: string;
  teamBName: string;
  marketStatus: string;
  winningOutcome?: number;
  userShares: {
    teamA: number;
    teamB: number;
  };
  claimablePayout: number;
  isSelling: boolean;
  isClaiming: boolean;
  onSell: (side: BetSide) => Promise<void>;
  onClaim: () => Promise<void>;
};

const hasPosition = (shares: number) => Number.isFinite(shares) && shares > 0;

export function PositionCard({
  teamAName,
  teamBName,
  marketStatus,
  winningOutcome,
  userShares,
  claimablePayout,
  isSelling,
  isClaiming,
  onSell,
  onClaim,
}: PositionCardProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const showTeamA = hasPosition(userShares.teamA);
  const showTeamB = hasPosition(userShares.teamB);
  const showClaim = claimablePayout > 0;

  if (!showTeamA && !showTeamB && !showClaim) {
    return null;
  }

  const handleSell = async (side: BetSide) => {
    try {
      setError(null);
      setSuccess(null);
      await onSell(side);
      setSuccess(`Sold ${side === "teamA" ? teamAName : teamBName} shares`);
    } catch (err) {
      setSuccess(null);
      setError(err instanceof Error ? err.message : "Unable to sell shares");
    }
  };

  const handleClaim = async () => {
    try {
      setError(null);
      setSuccess(null);
      await onClaim();
      setSuccess("Winnings claimed");
    } catch (err) {
      setSuccess(null);
      setError(err instanceof Error ? err.message : "Unable to claim winnings");
    }
  };

  return (
    <section className={styles.positionCard} aria-live="polite">
      <header className={styles.positionHeader}>
        <h3 className={styles.positionTitle}>Your position</h3>
        <span className={styles.positionStatus} data-status={marketStatus.toLowerCase()}>
          {marketStatus}
        </span>
      </header>

      <dl className={styles.positionDetails}>
        {showTeamA ? (
          <div>
            <dt>{teamAName}</dt>
            <dd>{userShares.teamA.toFixed(4)} shares</dd>
            {marketStatus === "Active" ? (
              <button
                type="button"
                className={styles.positionAction}
                onClick={() => void handleSell("teamA")}
                disabled={isSelling}
              >
                {isSelling ? "Selling…" : "Sell all"}
              </button>
            ) : null}
            {marketStatus === "Resolved" && winningOutcome === 0 ? (
              <span className={styles.positionWinner}>Winner</span>
            ) : null}
          </div>
        ) : null}

        {showTeamB ? (
          <div>
            <dt>{teamBName}</dt>
            <dd>{userShares.teamB.toFixed(4)} shares</dd>
            {marketStatus === "Active" ? (
              <button
                type="button"
                className={styles.positionAction}
                onClick={() => void handleSell("teamB")}
                disabled={isSelling}
              >
                {isSelling ? "Selling…" : "Sell all"}
              </button>
            ) : null}
            {marketStatus === "Resolved" && winningOutcome === 1 ? (
              <span className={styles.positionWinner}>Winner</span>
            ) : null}
          </div>
        ) : null}
      </dl>

      {showClaim ? (
        <div className={styles.positionClaimRow}>
          <p>Claimable: {claimablePayout.toFixed(4)} ETH</p>
          <button
            type="button"
            className={styles.positionClaimButton}
            onClick={() => void handleClaim()}
            disabled={isClaiming}
          >
            {isClaiming ? "Claiming…" : "Claim"}
          </button>
        </div>
      ) : null}

      {error ? (
        <p className={styles.errorMessage} role="alert">
          {error}
        </p>
      ) : null}
      {success ? <p className={styles.successMessage}>{success}</p> : null}
    </section>
  );
}
