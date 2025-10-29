"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Connector } from "wagmi";
import { useThirdwebConnectors } from "./hooks";
import styles from "@/app/mini/mini.module.css";

type ConnectWalletProps = {
  label?: string;
  className?: string;
};

export function ConnectWallet({ label = "Connect wallet", className }: ConnectWalletProps) {
  const { connect, disconnect, account } = useThirdwebConnectors();
  const { isConnected, isConnecting } = account;
  const { connectors, status } = connect;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const handleClick = (event: MouseEvent) => {
      if (!menuRef.current) {
        return;
      }

      if (event.target instanceof Node && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  const handleDisconnect = useCallback(() => {
    disconnect.disconnect();
  }, [disconnect]);

  const handleConnectorSelect = useCallback(
    async (connector: Connector) => {
      try {
        await connect.connectAsync({ connector });
        setMenuOpen(false);
      } catch (err) {
        console.error("Wallet connect failed", err);
      }
    },
    [connect]
  );

  const connectLabel = useMemo(() => {
    if (isConnecting || status === "pending") {
      return "Connecting…";
    }

    return label;
  }, [isConnecting, label, status]);

  if (isConnected) {
    const activeConnector = connectors.find((candidate) => candidate.id === account.connector?.id);
    const connectorName = activeConnector?.name ?? account.connector?.name ?? "Wallet";

    return (
      <div className={styles.connectWalletMenuWrapper} ref={menuRef}>
        <button
          type="button"
          className={`${styles.gatedButton} ${styles.gatedButtonSecondary} ${className ?? ""}`.trim()}
          onClick={() => setMenuOpen((previous) => !previous)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          {connectorName}
        </button>
        {menuOpen ? (
          <div className={styles.connectWalletMenu} role="menu">
            <button type="button" onClick={handleDisconnect} className={styles.connectWalletMenuItem}>
              Disconnect
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={styles.connectWalletMenuWrapper} ref={menuRef}>
      <button
        type="button"
        className={`${styles.gatedButton} ${className ?? ""}`.trim()}
        onClick={() => setMenuOpen((previous) => !previous)}
        disabled={isConnecting || status === "pending" || connectors.length === 0}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
      >
        {connectLabel}
      </button>
      {menuOpen ? (
        <div className={styles.connectWalletMenu} role="menu">
          {connectors.map((connector) => (
            <button
              type="button"
              key={connector.id}
              onClick={() => void handleConnectorSelect(connector)}
              className={styles.connectWalletMenuItem}
              disabled={isConnecting || status === "pending" || !connector.ready}
            >
              {connector.name}
            </button>
          ))}
          {connectors.length === 0 ? (
            <span className={styles.connectWalletMenuHint}>No wallets available</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
