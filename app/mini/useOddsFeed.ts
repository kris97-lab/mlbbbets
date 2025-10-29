"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatEther, formatUnits, parseEther } from "viem";
import { predictionMarketAbi } from "@/lib/abi/predictionMarket";
import {
  useAddress,
  useBuyShares,
  useClaimWinnings,
  useContract,
  useContractRead,
  useResolveMarket,
  useSellShares,
} from "@/lib/thirdweb/hooks";

export type BetSide = "teamA" | "teamB";

type NormalizedOdds = {
  teamA: number;
  teamB: number;
};

type FormattedOdds = {
  teamA: {
    probability: number;
    multiplier: number | null;
  };
  teamB: {
    probability: number;
    multiplier: number | null;
  };
};

type UserShares = {
  teamA: number;
  teamB: number;
};

type MarketStatus = "Active" | "Resolved" | "Unseeded";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const WAD = 18;

const defaultOdds: FormattedOdds = {
  teamA: { probability: 50, multiplier: null },
  teamB: { probability: 50, multiplier: null },
};

const fallbackTeamA = process.env.NEXT_PUBLIC_TEAM_A_NAME || "Team A";
const fallbackTeamB = process.env.NEXT_PUBLIC_TEAM_B_NAME || "Team B";

const resolveStatus = (statusValue: number | undefined): MarketStatus => {
  if (statusValue === 1) {
    return "Resolved";
  }

  if (statusValue === 0) {
    return "Active";
  }

  return "Unseeded";
};

export function useOddsFeed() {
  const address = useAddress();
  const contractAddress = process.env.NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS;
  const contract = useContract(contractAddress as `0x${string}` | undefined, predictionMarketAbi);

  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const marketQuery = useContractRead(contract, "getMarket", [], {
    watch: true,
    refetchInterval: 12000,
  });

  const sharePriceTeamAQuery = useContractRead(contract, "getSharePrice", [0], {
    watch: true,
    refetchInterval: 8000,
  });

  const sharePriceTeamBQuery = useContractRead(contract, "getSharePrice", [1], {
    watch: true,
    refetchInterval: 8000,
  });

  const payoutMultiplierAQuery = useContractRead(contract, "getPayoutMultiplier", [0], {
    watch: true,
    refetchInterval: 12000,
  });

  const payoutMultiplierBQuery = useContractRead(contract, "getPayoutMultiplier", [1], {
    watch: true,
    refetchInterval: 12000,
  });

  const liquidityQuery = useContractRead(contract, "getLiquidity", [], {
    watch: true,
    refetchInterval: 15000,
  });

  const ownerQuery = useContractRead(contract, "owner", []);

  const winningOutcomeQuery = useContractRead(contract, "winningOutcome", [], {
    watch: true,
    refetchInterval: 15000,
  });

  const claimableQuery = useContractRead(contract, "getClaimablePayout", [address ?? ZERO_ADDRESS], {
    watch: Boolean(address),
    enabled: Boolean(address),
    refetchInterval: 15000,
  });

  const userSharesATeamQuery = useContractRead(contract, "getUserShares", [address ?? ZERO_ADDRESS, 0], {
    watch: Boolean(address),
    enabled: Boolean(address),
    refetchInterval: 10000,
  });

  const userSharesBTeamQuery = useContractRead(contract, "getUserShares", [address ?? ZERO_ADDRESS, 1], {
    watch: Boolean(address),
    enabled: Boolean(address),
    refetchInterval: 10000,
  });

  const buyShares = useBuyShares(contract);
  const sellShares = useSellShares(contract);
  const resolveMarketMutation = useResolveMarket(contract);
  const claimWinningsMutation = useClaimWinnings(contract);

  const marketData = marketQuery.data as
    | {
        matchTitle: string;
        teamA: string;
        teamB: string;
        matchStartTime: bigint;
        status: number;
        winningOutcome: number;
        reserveTeamA: bigint;
        reserveTeamB: bigint;
      }
    | undefined;

  const sharePriceTeamA = sharePriceTeamAQuery.data as bigint | undefined;
  const sharePriceTeamB = sharePriceTeamBQuery.data as bigint | undefined;
  const payoutMultiplierA = payoutMultiplierAQuery.data as bigint | undefined;
  const payoutMultiplierB = payoutMultiplierBQuery.data as bigint | undefined;
  const liquidityValue = liquidityQuery.data as bigint | undefined;
  const userSharesATeam = (userSharesATeamQuery.data as bigint | undefined) ?? 0n;
  const userSharesBTeam = (userSharesBTeamQuery.data as bigint | undefined) ?? 0n;
  const claimableValue = (claimableQuery.data as bigint | undefined) ?? 0n;
  const ownerAddress = ownerQuery.data as string | undefined;
  const winningOutcome = winningOutcomeQuery.data as number | undefined;

  useEffect(() => {
    if (marketData || sharePriceTeamA || sharePriceTeamB) {
      setLastUpdated(new Date());
    }
  }, [marketData, sharePriceTeamA, sharePriceTeamB]);

  const teamAName = marketData?.teamA || fallbackTeamA;
  const teamBName = marketData?.teamB || fallbackTeamB;
  const matchTitle = marketData?.matchTitle || `${teamAName} vs ${teamBName}`;
  const matchStartTime = marketData?.matchStartTime ? new Date(Number(marketData.matchStartTime) * 1000) : null;
  const marketStatus = resolveStatus(marketData?.status);

  const liquidity = useMemo(() => {
    if (liquidityValue !== undefined) {
      return liquidityValue;
    }

    if (marketData) {
      return marketData.reserveTeamA + marketData.reserveTeamB;
    }

    return null;
  }, [liquidityValue, marketData]);

  const liquidityFormatted = liquidity !== null && liquidity !== undefined ? formatEther(liquidity) : null;

  const formattedOdds: FormattedOdds = useMemo(() => {
    if (!sharePriceTeamA || !sharePriceTeamB) {
      return defaultOdds;
    }

    const probabilityA = Number(formatUnits(sharePriceTeamA, WAD)) * 100;
    const probabilityB = Number(formatUnits(sharePriceTeamB, WAD)) * 100;
    const multiplierA = payoutMultiplierA ? Number(formatUnits(payoutMultiplierA, WAD)) : null;
    const multiplierB = payoutMultiplierB ? Number(formatUnits(payoutMultiplierB, WAD)) : null;

    return {
      teamA: {
        probability: Number.isFinite(probabilityA) ? probabilityA : defaultOdds.teamA.probability,
        multiplier: multiplierA,
      },
      teamB: {
        probability: Number.isFinite(probabilityB) ? probabilityB : defaultOdds.teamB.probability,
        multiplier: multiplierB,
      },
    };
  }, [payoutMultiplierA, payoutMultiplierB, sharePriceTeamA, sharePriceTeamB]);

  const odds: NormalizedOdds = useMemo(() => {
    const totalProbability = formattedOdds.teamA.probability + formattedOdds.teamB.probability;
    if (!Number.isFinite(totalProbability) || totalProbability <= 0) {
      return { teamA: 0.5, teamB: 0.5 };
    }

    return {
      teamA: formattedOdds.teamA.probability / totalProbability,
      teamB: formattedOdds.teamB.probability / totalProbability,
    };
  }, [formattedOdds]);

  const userShares: UserShares = useMemo(
    () => ({
      teamA: Number(formatUnits(userSharesATeam, WAD)),
      teamB: Number(formatUnits(userSharesBTeam, WAD)),
    }),
    [userSharesATeam, userSharesBTeam]
  );

  const claimablePayout = Number(formatEther(claimableValue));

  const refetchAll = useCallback(async () => {
    await Promise.all([
      marketQuery.refetch?.(),
      sharePriceTeamAQuery.refetch?.(),
      sharePriceTeamBQuery.refetch?.(),
      payoutMultiplierAQuery.refetch?.(),
      payoutMultiplierBQuery.refetch?.(),
      liquidityQuery.refetch?.(),
      userSharesATeamQuery.refetch?.(),
      userSharesBTeamQuery.refetch?.(),
      claimableQuery.refetch?.(),
      winningOutcomeQuery.refetch?.(),
    ]);
    setLastUpdated(new Date());
  }, [
    claimableQuery,
    liquidityQuery,
    marketQuery,
    payoutMultiplierAQuery,
    payoutMultiplierBQuery,
    sharePriceTeamAQuery,
    sharePriceTeamBQuery,
    userSharesATeamQuery,
    userSharesBTeamQuery,
    winningOutcomeQuery,
  ]);

  const placeBet = useCallback(
    async (side: BetSide, amount: string) => {
      if (!contract) {
        throw new Error("Prediction market is not configured");
      }

      if (!address) {
        throw new Error("Connect your wallet to place a bet");
      }

      if (!amount || Number.parseFloat(amount) <= 0) {
        throw new Error("Enter an amount greater than zero");
      }

      const value = parseEther(amount);

      setActionError(null);
      try {
        await buyShares.mutateAsync({
          outcome: side === "teamA" ? 0 : 1,
          minSharesOut: 0n,
          value,
        });
        await refetchAll();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to place bet";
        setActionError(message);
        throw new Error(message);
      }
    },
    [address, buyShares, contract, refetchAll]
  );

  const sellPosition = useCallback(
    async (side: BetSide) => {
      if (!contract) {
        throw new Error("Prediction market is not configured");
      }

      if (!address) {
        throw new Error("Connect your wallet to manage your position");
      }

      const balance = side === "teamA" ? userSharesATeam : userSharesBTeam;
      if (!balance || balance === 0n) {
        throw new Error("No shares available to sell");
      }

      setActionError(null);
      try {
        await sellShares.mutateAsync({
          outcome: side === "teamA" ? 0 : 1,
          sharesAmount: balance,
          minAmountOut: 0n,
        });
        await refetchAll();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to sell shares";
        setActionError(message);
        throw new Error(message);
      }
    },
    [address, contract, refetchAll, sellShares, userSharesATeam, userSharesBTeam]
  );

  const resolveMarket = useCallback(
    async (side: BetSide) => {
      if (!contract) {
        throw new Error("Prediction market is not configured");
      }

      if (marketStatus !== "Active") {
        throw new Error("Market has already been resolved");
      }

      setActionError(null);
      try {
        await resolveMarketMutation.mutateAsync({ winningOutcome: side === "teamA" ? 0 : 1 });
        await refetchAll();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to resolve market";
        setActionError(message);
        throw new Error(message);
      }
    },
    [contract, marketStatus, refetchAll, resolveMarketMutation]
  );

  const claimWinnings = useCallback(async () => {
    if (!contract) {
      throw new Error("Prediction market is not configured");
    }

    if (!address) {
      throw new Error("Connect your wallet to claim winnings");
    }

    if (claimableValue <= 0n) {
      throw new Error("No winnings available yet");
    }

    setActionError(null);
    try {
      await claimWinningsMutation.mutateAsync({});
      await refetchAll();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to claim winnings";
      setActionError(message);
      throw new Error(message);
    }
  }, [address, claimWinningsMutation, claimableValue, contract, refetchAll]);

  const combinedError = useMemo(() => {
    if (!contractAddress) {
      return "Prediction market address is missing";
    }

    return (
      actionError ||
      (marketQuery.error ? "Unable to load market data" : null) ||
      (sharePriceTeamAQuery.error ? "Unable to load live odds" : null)
    );
  }, [actionError, contractAddress, marketQuery.error, sharePriceTeamAQuery.error]);

  const isOwner = ownerAddress && address ? ownerAddress.toLowerCase() === address.toLowerCase() : false;

  return {
    matchTitle,
    matchStartTime,
    teamAName,
    teamBName,
    odds,
    formattedOdds,
    liquidity: liquidityFormatted,
    isStreaming: marketStatus === "Active",
    marketStatus,
    winningOutcome,
    lastUpdated,
    userShares,
    claimablePayout,
    isOwner,
    placeBet,
    sellPosition,
    resolveMarket,
    claimWinnings,
    isBetting: buyShares.isPending,
    isSelling: sellShares.isPending,
    isResolving: resolveMarketMutation.isPending,
    isClaiming: claimWinningsMutation.isPending,
    error: combinedError,
  };
}
