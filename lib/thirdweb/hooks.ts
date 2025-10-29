import { useCallback, useMemo } from "react";
import { Abi } from "abitype";
import {
  useAccount,
  useChainId,
  useConnect,
  useDisconnect,
  useReadContract,
  useWriteContract,
} from "wagmi";
import type { Address } from "viem";

type ContractConfig<TAbi extends Abi = Abi> = {
  address: Address;
  abi: TAbi;
};

type ReadOptions = {
  watch?: boolean;
  refetchInterval?: number;
  enabled?: boolean;
};

type BuySharesArgs = {
  outcome: number;
  minSharesOut?: bigint;
  value: bigint;
};

type SellSharesArgs = {
  outcome: number;
  sharesAmount: bigint;
  minAmountOut?: bigint;
};

type ResolveMarketArgs = {
  winningOutcome: number;
};

type ClaimArgs = Record<string, never>;

export function useContract<TAbi extends Abi>(address?: Address | null, abi?: TAbi | null) {
  return useMemo(() => {
    if (!address || !abi) {
      return null;
    }

    return { address, abi } as ContractConfig<TAbi>;
  }, [address, abi]);
}

export function useContractRead<TData = unknown>(
  contract: ContractConfig | null,
  functionName: string,
  args: readonly unknown[] = [],
  options: ReadOptions = {}
) {
  return useReadContract({
    address: contract?.address,
    abi: contract?.abi,
    functionName,
    args,
    query: {
      enabled: Boolean(contract?.address) && (options.enabled ?? true),
      refetchInterval: options.watch ? options.refetchInterval ?? 10000 : undefined,
    },
  }) as ReturnType<typeof useReadContract<TData>>;
}

export function useContractWrite(contract: ContractConfig | null) {
  const write = useWriteContract();

  const writeAsync = useCallback(
    async (
      functionName: string,
      params: {
        args?: readonly unknown[];
        value?: bigint;
      }
    ) => {
      if (!contract) {
        throw new Error("Contract is not ready");
      }

      return await write.writeContractAsync({
        address: contract.address,
        abi: contract.abi,
        functionName,
        args: params.args,
        value: params.value,
      });
    },
    [contract, write]
  );

  return {
    writeContractAsync: writeAsync,
    data: write.data,
    error: write.error,
    isPending: write.isPending,
    status: write.status,
  };
}

export function useBuyShares(contract: ContractConfig | null) {
  const { writeContractAsync, ...rest } = useContractWrite(contract);

  const mutateAsync = useCallback(
    async ({ outcome, minSharesOut = 0n, value }: BuySharesArgs) =>
      writeContractAsync("buyShares", {
        args: [outcome, minSharesOut],
        value,
      }),
    [writeContractAsync]
  );

  return {
    mutateAsync,
    ...rest,
  };
}

export function useSellShares(contract: ContractConfig | null) {
  const { writeContractAsync, ...rest } = useContractWrite(contract);

  const mutateAsync = useCallback(
    async ({ outcome, sharesAmount, minAmountOut = 0n }: SellSharesArgs) =>
      writeContractAsync("sellShares", {
        args: [outcome, sharesAmount, minAmountOut],
      }),
    [writeContractAsync]
  );

  return {
    mutateAsync,
    ...rest,
  };
}

export function useResolveMarket(contract: ContractConfig | null) {
  const { writeContractAsync, ...rest } = useContractWrite(contract);

  const mutateAsync = useCallback(
    async ({ winningOutcome }: ResolveMarketArgs) =>
      writeContractAsync("resolveMarket", {
        args: [winningOutcome],
      }),
    [writeContractAsync]
  );

  return {
    mutateAsync,
    ...rest,
  };
}

export function useClaimWinnings(contract: ContractConfig | null) {
  const { writeContractAsync, ...rest } = useContractWrite(contract);

  const mutateAsync = useCallback(
    async (_: ClaimArgs = {}) => writeContractAsync("claimWinnings", {}),
    [writeContractAsync]
  );

  return {
    mutateAsync,
    ...rest,
  };
}

export function useAddress() {
  const { address } = useAccount();
  return address ?? undefined;
}

export function useNetwork() {
  const chainId = useChainId();
  return { chainId };
}

export function useThirdwebConnectors() {
  const connect = useConnect();
  const disconnect = useDisconnect();
  const account = useAccount();

  return {
    connect,
    disconnect,
    account,
  };
}
