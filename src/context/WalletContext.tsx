"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getWalletSelector, getAccountState } from "../lib/near-wallet";
import type { AccountState } from "@near-wallet-selector/core";

type WalletState = {
  isConnected: boolean;
  walletName?: string | null;
  accountId?: string | null;
  balance?: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  isLoading: boolean;
};

const WalletContext = createContext<WalletState | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [walletName, setWalletName] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch account balance
  const fetchBalance = useCallback(async (accountId: string) => {
    try {
      const response = await fetch(
        process.env.NEXT_PUBLIC_NEAR_RPC_URL || "https://rpc.testnet.near.org",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: "dontcare",
            method: "query",
            params: {
              request_type: "view_account",
              finality: "final",
              account_id: accountId,
            },
          }),
        }
      );

      const data = await response.json();
      if (data.result && data.result.amount) {
        // Convert from yoctoNEAR to NEAR (1 NEAR = 10^24 yoctoNEAR)
        const yocto = BigInt(data.result.amount);
        const NEAR = BigInt(10) ** BigInt(24);
        const whole = yocto / NEAR;
        const remainder = yocto % NEAR;
        // two decimal places
        const cents = (remainder * BigInt(100)) / NEAR;
        const formatted = `${whole.toString()}.${cents.toString().padStart(2, "0")}`;
        setBalance(formatted);
      } else {
        setBalance("0.00");
      }
    } catch (error) {
      console.error("Failed to fetch balance:", error);
      setBalance("0.00");
    }
  }, []);

  // Initialize wallet selector and check for existing connection
  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;

    async function init() {
      try {
        const { selector } = await getWalletSelector();
        
        // Check if already connected
        const account = getAccountState(selector);
        if (account) {
          setAccountId(account.accountId);
          setWalletName(account.accountId);
          setIsConnected(true);
          await fetchBalance(account.accountId);
        }

        // Listen for account changes
        subscription = selector.store.observable.subscribe((state) => {
          const accounts = state.accounts;
          if (accounts.length > 0) {
            const account = accounts[0];
            setAccountId(account.accountId);
            setWalletName(account.accountId);
            setIsConnected(true);
            fetchBalance(account.accountId);
          } else {
            setAccountId(null);
            setWalletName(null);
            setIsConnected(false);
            setBalance(null);
          }
        });

        setIsLoading(false);
      } catch (error) {
        console.error("Failed to initialize wallet selector:", error);
        setIsLoading(false);
      }
    }

    init();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [fetchBalance]);

  const connect = useCallback(async () => {
    try {
      setIsLoading(true);
      const { selector, modal } = await getWalletSelector();
      
      // Show wallet selector modal
      await modal.show();

      // Try to read current account after the modal closes in case user just connected
      const account = getAccountState(selector);
      if (account) {
        setAccountId(account.accountId);
        setWalletName(account.accountId);
        setIsConnected(true);
        await fetchBalance(account.accountId);
      }

      // The subscription in useEffect will also handle subsequent account changes
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      setIsLoading(true);
      const { selector } = await getWalletSelector();
      const wallet = await selector.wallet();
      
      if (wallet) {
        await wallet.signOut();
      }
      
      setAccountId(null);
      setWalletName(null);
      setIsConnected(false);
      setBalance(null);
    } catch (error) {
      console.error("Failed to disconnect wallet:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <WalletContext.Provider
      value={{
        isConnected,
        walletName,
        accountId,
        balance,
        connect,
        disconnect,
        isLoading,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
