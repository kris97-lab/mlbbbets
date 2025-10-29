"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import MiniAppSDK from "@farcaster/miniapp-sdk";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { LiveStream } from "./LiveStream";
import { OddsBar } from "./OddsBar";
import { BetButtons } from "./BetButtons";
import { PositionCard } from "./PositionCard";
import { useOddsFeed, BetSide } from "./useOddsFeed";
import styles from "./mini.module.css";
import { ConnectWallet } from "@/lib/thirdweb/ConnectWallet";

export function MiniApp() {
  const { setFrameReady, isFrameReady, context } = useMiniKit();
  const { address, isConnecting, isConnected } = useAccount();
  const { connect, connectors, status: connectStatus, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const {
    matchTitle,
    matchStartTime,
    teamAName,
    teamBName,
    formattedOdds,
    isStreaming,
    marketStatus,
    liquidity,
    lastUpdated,
    userShares,
    claimablePayout,
    isOwner,
    winningOutcome,
    placeBet,
    sellPosition,
    resolveMarket,
    claimWinnings,
    isBetting,
    isSelling,
    isResolving,
    isClaiming,
    error,
  } = useOddsFeed();
  const farcasterUser = context?.user ?? null;
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const [isInMiniApp, setIsInMiniApp] = useState<boolean | null>(null);
  const [connectErrorMessage, setConnectErrorMessage] = useState<string | null>(null);
  const [hasRequestedMiniAppProvider, setHasRequestedMiniAppProvider] = useState(false);
  const [hasAttemptedMiniAppAutoconnect, setHasAttemptedMiniAppAutoconnect] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminSuccess, setAdminSuccess] = useState<string | null>(null);

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
    if (!isProfileMenuOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (!profileMenuRef.current) {
        return;
      }

      const target = event.target;
      if (target instanceof Node && !profileMenuRef.current.contains(target)) {
        setIsProfileMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isProfileMenuOpen]);

  useEffect(() => {
    if (!isConnected && isProfileMenuOpen) {
      setIsProfileMenuOpen(false);
    }
  }, [isConnected, isProfileMenuOpen]);

  const handleProfileToggle = useCallback(() => {
    setIsProfileMenuOpen((prev) => !prev);
  }, []);

  const handleLogout = useCallback(() => {
    setIsProfileMenuOpen(false);
    disconnect();
  }, [disconnect]);

  useEffect(() => {
    let cancelled = false;

    const detectMiniApp = async () => {
      try {
        const result = await MiniAppSDK.isInMiniApp();
        if (!cancelled) {
          setIsInMiniApp(result);
        }
      } catch (err) {
        console.error("Mini App detection failed", err);
        if (!cancelled) {
          setIsInMiniApp(false);
        }
      }
    };

    void detectMiniApp();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!connectError) {
      setConnectErrorMessage(null);
      return;
    }

    if (connectError instanceof Error) {
      if (/request timed out/i.test(connectError.message)) {
        setConnectErrorMessage(
          "Farcaster wallet took too long to respond. Please try again or reopen the mini app."
        );
        return;
      }

      setConnectErrorMessage(connectError.message);
      return;
    }

    setConnectErrorMessage("Wallet connection failed");
  }, [connectError]);

  const farcasterConnector = useMemo(
    () => connectors.find((candidate) => candidate.id === "farcaster") ?? null,
    [connectors]
  );

  const hasConnectors = connectors.length > 0;

  const preferredConnector = useMemo(() => {
    if (farcasterConnector) {
      return farcasterConnector;
    }

    return connectors[0] ?? null;
  }, [connectors, farcasterConnector]);

  const isPreparingMiniAppWallet =
    isInMiniApp === true && !farcasterConnector && !hasConnectors;
  const isConnectPending = isConnecting || connectStatus === "pending";

  const connectButtonLabel = useMemo(() => {
    if (isConnectPending) {
      return "Connecting…";
    }

    if (isPreparingMiniAppWallet) {
      return "Preparing wallet…";
    }

    if (isInMiniApp && farcasterConnector) {
      return "Continue with Farcaster wallet";
    }

    if (!preferredConnector) {
      return "Loading wallets…";
    }

    return "Connect wallet";
  }, [
    farcasterConnector,
    isConnectPending,
    isInMiniApp,
    isPreparingMiniAppWallet,
    preferredConnector,
  ]);

  useEffect(() => {
    if (hasRequestedMiniAppProvider || isInMiniApp !== true) {
      return;
    }

    setHasRequestedMiniAppProvider(true);

    void MiniAppSDK.wallet
      .getEthereumProvider()
      .catch((err) => console.error("Failed to warm up Farcaster provider", err));
  }, [hasRequestedMiniAppProvider, isInMiniApp]);

  useEffect(() => {
    if (
      !farcasterConnector ||
      isInMiniApp !== true ||
      hasAttemptedMiniAppAutoconnect ||
      isConnected ||
      isConnecting ||
      connectStatus === "pending"
    ) {
      return;
    }

    try {
      connect({ connector: farcasterConnector });
    } catch (err) {
      console.error("Auto Farcaster connect failed", err);
    } finally {
      setHasAttemptedMiniAppAutoconnect(true);
    }
  }, [
    connect,
    connectStatus,
    farcasterConnector,
    hasAttemptedMiniAppAutoconnect,
    isConnected,
    isConnecting,
    isInMiniApp,
  ]);

  useEffect(() => {
    if (!isFrameReady) {
      void setFrameReady();
    }
  }, [isFrameReady, setFrameReady]);

  const handleResolve = useCallback(
    async (side: BetSide) => {
      try {
        setAdminError(null);
        setAdminSuccess(null);
        await resolveMarket(side);
        setAdminSuccess(`Resolved in favour of ${side === "teamA" ? teamAName : teamBName}`);
      } catch (err) {
        setAdminSuccess(null);
        setAdminError(err instanceof Error ? err.message : "Unable to resolve market");
      }
    },
    [resolveMarket, teamAName, teamBName]
  );

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
            <div className={styles.gatedButtonWrapper}>
              <ConnectWallet label={connectButtonLabel} />
            </div>
            {isPreparingMiniAppWallet ? (
              <p className={styles.gatedStatus}>Waiting for Farcaster to hand off your wallet…</p>
            ) : null}
            {connectErrorMessage ? (
              <p className={styles.gatedError} role="alert">
                {connectErrorMessage}
              </p>
            ) : null}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.wrapper}>
      <header className={styles.profileHeader} aria-label="Farcaster profile">
        <div className={styles.profileInfo} ref={profileMenuRef}>
          <button
            type="button"
            className={styles.profileButton}
            onClick={handleProfileToggle}
            aria-haspopup="menu"
            aria-expanded={isProfileMenuOpen}
          >
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
          </button>
          {isProfileMenuOpen ? (
            <div className={styles.profileMenu} role="menu">
              <button type="button" className={styles.profileMenuItem} onClick={handleLogout}>
                Log out
              </button>
            </div>
          ) : null}
        </div>
      </header>
      <LiveStream />

      <div className={styles.content}>
        <OddsBar
          matchTitle={matchTitle}
          matchStartTime={matchStartTime}
          teamAName={teamAName}
          teamBName={teamBName}
          marketStatus={marketStatus}
          liquidity={liquidity}
          percentages={{
            teamA: formattedOdds.teamA.probability,
            teamB: formattedOdds.teamB.probability,
          }}
          multipliers={{
            teamA: formattedOdds.teamA.multiplier,
            teamB: formattedOdds.teamB.multiplier,
          }}
          isStreaming={isStreaming}
          lastUpdated={lastUpdated}
        />

        <BetButtons
          teamAName={teamAName}
          teamBName={teamBName}
          multipliers={{
            teamA: formattedOdds.teamA.multiplier,
            teamB: formattedOdds.teamB.multiplier,
          }}
          marketStatus={marketStatus}
          isBetting={isBetting}
          onBet={placeBet}
        />

        <PositionCard
          teamAName={teamAName}
          teamBName={teamBName}
          marketStatus={marketStatus}
          winningOutcome={winningOutcome}
          userShares={userShares}
          claimablePayout={claimablePayout}
          isSelling={isSelling}
          isClaiming={isClaiming}
          onSell={sellPosition}
          onClaim={claimWinnings}
        />

        {isOwner ? (
          <section className={styles.adminCard}>
            <header className={styles.adminHeader}>
              <h3>Admin controls</h3>
              <span>{isResolving ? "Resolving…" : "Set winner"}</span>
            </header>
            <div className={styles.adminActions}>
              <button
                type="button"
                className={styles.adminButton}
                onClick={() => void handleResolve("teamA")}
                disabled={marketStatus !== "Active" || isResolving}
              >
                {isResolving ? "Processing…" : `Resolve ${teamAName}`}
              </button>
              <button
                type="button"
                className={styles.adminButton}
                onClick={() => void handleResolve("teamB")}
                disabled={marketStatus !== "Active" || isResolving}
              >
                {isResolving ? "Processing…" : `Resolve ${teamBName}`}
              </button>
            </div>
            {adminError ? (
              <p className={styles.errorMessage} role="alert">
                {adminError}
              </p>
            ) : null}
            {adminSuccess ? <p className={styles.successMessage}>{adminSuccess}</p> : null}
          </section>
        ) : null}

        {error ? <p className={styles.errorMessage}>{error}</p> : null}
      </div>
    </main>
  );
}

export default MiniApp;
