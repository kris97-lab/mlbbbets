"use client";

import { FormEvent, useMemo, useState } from "react";
import { BetSide } from "./useOddsFeed";
import styles from "./mini.module.css";

type BetButtonsProps = {
  teamAName: string;
  teamBName: string;
  multipliers: {
    teamA: number | null;
    teamB: number | null;
  };
  marketStatus: string;
  isBetting: boolean;
  onBet: (side: BetSide, amount: string) => Promise<void>;
};

const MIN_INPUT_STEP = 0.0001;

export function BetButtons({
  teamAName,
  teamBName,
  multipliers,
  marketStatus,
  isBetting,
  onBet,
}: BetButtonsProps) {
  const [selectedSide, setSelectedSide] = useState<BetSide | null>(null);
  const [amount, setAmount] = useState("0.1");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isMarketActive = marketStatus === "Active";

  const activeLabel = useMemo(() => {
    if (!selectedSide) {
      return "Choose a side to bet";
    }

    return selectedSide === "teamA" ? teamAName : teamBName;
  }, [selectedSide, teamAName, teamBName]);

  const handleSelect = (side: BetSide) => {
    if (!isMarketActive) {
      return;
    }

    setSelectedSide(side);
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedSide) {
      setError("Select a side before placing a bet");
      return;
    }

    if (!amount || Number.parseFloat(amount) <= 0) {
      setError("Enter an amount greater than zero");
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      await onBet(selectedSide, amount);
      setSuccess(`Bet placed on ${activeLabel}`);
    } catch (err) {
      setSuccess(null);
      setError(err instanceof Error ? err.message : "Unable to place bet");
    }
  };

  const disabled = !isMarketActive || isBetting;

  return (
    <section className={styles.betSection} aria-live="polite">
      <header className={styles.betHeader}>
        <h2 className={styles.betTitle}>Back your team</h2>
        <span className={styles.betStatus} data-active={isMarketActive}>
          {isMarketActive ? "Market live" : "Market closed"}
        </span>
      </header>

      <div className={styles.buttonsRow}>
        <button
          type="button"
          className={styles.betButton}
          data-variant="teamA"
          data-active={selectedSide === "teamA"}
          onClick={() => handleSelect("teamA")}
          disabled={disabled && selectedSide !== "teamA"}
        >
          <span>
            Bet on {teamAName}
            <small>
              {multipliers.teamA !== null ? `${multipliers.teamA.toFixed(2)}x payout` : "CPMM"}
            </small>
          </span>
        </button>

        <button
          type="button"
          className={styles.betButton}
          data-variant="teamB"
          data-active={selectedSide === "teamB"}
          onClick={() => handleSelect("teamB")}
          disabled={disabled && selectedSide !== "teamB"}
        >
          <span>
            Bet on {teamBName}
            <small>
              {multipliers.teamB !== null ? `${multipliers.teamB.toFixed(2)}x payout` : "CPMM"}
            </small>
          </span>
        </button>
      </div>

      <form className={styles.betForm} onSubmit={handleSubmit}>
        <label className={styles.betLabel} htmlFor="bet-amount">
          Amount (ETH)
        </label>
        <input
          id="bet-amount"
          name="bet-amount"
          className={styles.betInput}
          type="number"
          min={MIN_INPUT_STEP}
          step={MIN_INPUT_STEP}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          disabled={!isMarketActive || isBetting}
          inputMode="decimal"
        />
        <p className={styles.betSelection}>Selected: {activeLabel}</p>
        <div className={styles.betActions}>
          <button type="submit" className={styles.betSubmit} disabled={disabled || !selectedSide}>
            {isBetting ? "Placing bet…" : "Place bet"}
          </button>
          <button
            type="button"
            className={styles.betCancel}
            onClick={() => {
              setSelectedSide(null);
              setSuccess(null);
              setError(null);
            }}
            disabled={isBetting}
          >
            Clear
          </button>
        </div>
      </form>

      {error ? (
        <p className={styles.errorMessage} role="alert">
          {error}
        </p>
      ) : null}
      {success ? <p className={styles.successMessage}>{success}</p> : null}
    </section>
  );
}
