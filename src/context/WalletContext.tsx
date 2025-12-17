"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type WalletState = {
  isConnected: boolean;
  walletName?: string | null;
  connect: (walletName?: string) => void;
  disconnect: () => void;
};

const STORAGE_KEY = "nearcity_wallet";

const WalletContext = createContext<WalletState | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [walletName, setWalletName] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data?.isConnected) {
          setIsConnected(true);
          setWalletName(data.walletName ?? null);
        }
      }
    } catch (e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ isConnected, walletName }));
    } catch (e) {
      // ignore
    }
  }, [isConnected, walletName]);

  function connect(name?: string) {
    setIsConnected(true);
    setWalletName(name ?? "entechnologuehamadex.near");
  }

  function disconnect() {
    setIsConnected(false);
    setWalletName(null);
  }

  return (
    <WalletContext.Provider value={{ isConnected, walletName, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
