"use client";

import Image from "next/image";
import { useEffect, useMemo } from "react";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { ConnectWallet } from "@coinbase/onchainkit/wallet";
import { useAccount } from "wagmi";
import { LiveStream } from "./LiveStream";
import { OddsBar } from "./OddsBar";
import { BetButtons } from "./BetButtons";
import { useOddsFeed } from "./useOddsFeed";
import styles from "./mini.module.css";

export function MiniApp() {
  const { setFrameReady, isFrameReady, context } = useMiniKit();
  const { address, isConnecting, isConnected } = useAccount();
  const { teamAName, teamBName, formattedOdds, isStreaming, lastUpdated, error, placeBet } =
    useOddsFeed();
  const farcasterUser = context?.user ?? null;

  const profileAvatarUrl = farcasterUser?.pfpUrl || null;
  const profileName = useMemo(() => {
    if (farcasterUser?.displayName) {
      return farcasterUser.displayName;
    }

    if (farcasterUser?.username) {
      return `@${farcasterUser.username}`;
    }

    if (address) {
      return `${address.slice(0, 6)}…${address.slice(-4)}`;
    }

    return "Farcaster user";
  }, [address, farcasterUser]);

  const profileHandle = useMemo(() => {
    if (farcasterUser?.username) {
      return `@${farcasterUser.username}`;
    }

    if (address) {
      return "Wallet connected";
    }

    return "Подключите аккаунт Farcaster, чтобы показать профиль";
  }, [address, farcasterUser]);

  useEffect(() => {
    if (!isFrameReady) {
      void setFrameReady();
    }
  }, [isFrameReady, setFrameReady]);

  if (!isConnected) {
    return (
      <main className={`${styles.wrapper} ${styles.gated}`}> 
        <div className={styles.gatedContent}>
          <div className={styles.gatedCard}>
            <p className={styles.gatedBadge}>Live MLBB Bets</p>
            <h1 className={styles.gatedTitle}>Connect your wallet to enter</h1>
            <p className={styles.gatedDescription}>
              Link your Farcaster wallet to join the live stream, track odds in real time, and place
              instant bets without leaving the match.
            </p>
            <ConnectWallet
              className={styles.gatedButton}
              disconnectedLabel={isConnecting ? "Connecting…" : "Connect wallet"}
            />
          </div>
        </div>
      </main>
    );
  }

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
            unoptimized
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

export default MiniApp;
