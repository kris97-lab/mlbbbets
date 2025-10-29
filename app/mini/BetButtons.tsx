"use client";

import { useState } from "react";
import { BetSide } from "./useOddsFeed";
import styles from "./mini.module.css";

type BetButtonsProps = {
  teamAName: string;
  teamBName: string;
  onBet: (side: BetSide) => Promise<void>;
};

export function BetButtons({ teamAName, teamBName, onBet }: BetButtonsProps) {
  const [pendingSide, setPendingSide] = useState<BetSide | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async (side: BetSide) => {
    try {
      setError(null);
      setPendingSide(side);
      await onBet(side);
    } catch (err) {
      console.error("Unable to place bet", err);
      setError(
        err instanceof Error ? err.message : "Unable to open bet action. Please try again."
      );
    } finally {
      setPendingSide(null);
    }
  };

  return (
    <div>
      <div className={styles.buttonsRow}>
        <button
          type="button"
          className={styles.betButton}
          data-variant="teamA"
          onClick={() => void handleClick("teamA")}
          disabled={pendingSide !== null}
        >
          <span>
            Bet on {teamAName}
            <small>{pendingSide === "teamA" ? "Opening action..." : "CPMM"}</small>
          </span>
        </button>

        <button
          type="button"
          className={styles.betButton}
          data-variant="teamB"
          onClick={() => void handleClick("teamB")}
          disabled={pendingSide !== null}
        >
          <span>
            Bet on {teamBName}
            <small>{pendingSide === "teamB" ? "Opening action..." : "CPMM"}</small>
          </span>
        </button>
      </div>

      {error ? <p className={styles.errorMessage}>{error}</p> : null}
    </div>
  );
}
