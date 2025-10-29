"use client";

import { useEffect } from "react";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { LiveStream } from "./LiveStream";
import { OddsBar } from "./OddsBar";
import { BetButtons } from "./BetButtons";
import { useOddsFeed } from "./useOddsFeed";
import styles from "./mini.module.css";

export default function MiniAppPage() {
  const { setFrameReady, isFrameReady } = useMiniKit();
  const { teamAName, teamBName, formattedOdds, isStreaming, lastUpdated, error, placeBet } =
    useOddsFeed();

  useEffect(() => {
    if (!isFrameReady) {
      void setFrameReady();
    }
  }, [isFrameReady, setFrameReady]);

  return (
    <main className={styles.wrapper}>
      <LiveStream />

      <div className={styles.content}>
        <OddsBar
          teamAName={teamAName}
          teamBName={teamBName}
          percentages={{ teamA: formattedOdds.teamA.probability, teamB: formattedOdds.teamB.probability }}
          multipliers={{ teamA: formattedOdds.teamA.multiplier, teamB: formattedOdds.teamB.multiplier }}
          isStreaming={isStreaming}
          lastUpdated={lastUpdated}
        />

        <BetButtons
          teamAName={teamAName}
          teamBName={teamBName}
          onBet={placeBet}
        />

        {error ? <p className={styles.errorMessage}>{error}</p> : null}
      </div>
    </main>
  );
}
