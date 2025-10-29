"use client";

import Image from "next/image";
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
  const profileName = process.env.NEXT_PUBLIC_PROFILE_NAME || "Farcaster user";
  const profileHandle =
    process.env.NEXT_PUBLIC_PROFILE_HANDLE || "Подключите аккаунт Farcaster, чтобы показать профиль";
  const profileAvatarUrl = process.env.NEXT_PUBLIC_PROFILE_AVATAR_URL;

  useEffect(() => {
    if (!isFrameReady) {
      void setFrameReady();
    }
  }, [isFrameReady, setFrameReady]);

  return (
    <main className={styles.wrapper}>
      <header className={styles.profileHeader} aria-label="Farcaster profile placeholder">
        {profileAvatarUrl ? (
          <Image
            className={styles.profileAvatarPlaceholder}
            src={profileAvatarUrl}
            alt="Farcaster avatar"
            width={52}
            height={52}
          />
        ) : (
          <div className={styles.profileAvatarPlaceholder} aria-hidden="true" />
        )}
        <div className={styles.profileText}>
          <span className={styles.profileName}>{profileName}</span>
          <span className={styles.profileHint}>{profileHandle}</span>
        </div>
      </header>
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
