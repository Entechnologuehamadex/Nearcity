"use client";

import { setupWalletSelector } from "@near-wallet-selector/core";
import { setupModal } from "@near-wallet-selector/modal-ui";
import { setupMyNearWallet } from "@near-wallet-selector/my-near-wallet";
import { setupHotWallet } from "@near-wallet-selector/hot-wallet";
import { setupLedger } from "@near-wallet-selector/ledger";
import { setupMeteorWallet } from "@near-wallet-selector/meteor-wallet";
import type { WalletSelector, AccountState, NetworkId } from "@near-wallet-selector/core";
import type { WalletSelectorModal } from "@near-wallet-selector/modal-ui";

export interface WalletSelectorSetup {
  selector: WalletSelector;
  modal: WalletSelectorModal;
}

let walletSelector: WalletSelectorSetup | null = null;

export async function initWalletSelector(): Promise<WalletSelectorSetup> {
  if (walletSelector) {
    return walletSelector;
  }

  const selector = await setupWalletSelector({
    network: (process.env.NEXT_PUBLIC_NEAR_NETWORK as NetworkId) || "mainnet",
    modules: [
      setupMyNearWallet(),
      setupHotWallet(),
      setupLedger(),
      setupMeteorWallet(),
    ],
  });

  const modal = setupModal(selector, {
    contractId: process.env.NEXT_PUBLIC_NEAR_CONTRACT_ID || "social.near",
  });

  walletSelector = { selector, modal };
  return walletSelector;
}

export async function getWalletSelector(): Promise<WalletSelectorSetup> {
  if (!walletSelector) {
    return await initWalletSelector();
  }
  return walletSelector;
}

export function getAccountState(selector: WalletSelector): AccountState | null {
  const accounts = selector.store.getState().accounts;
  return accounts.length > 0 ? accounts[0] : null;
}

/**
 * Fetch account balance from NEAR RPC
 * @param accountId - The account ID to fetch balance for
 * @param network - The network to use (testnet or mainnet), defaults to mainnet
 * @returns Balance in NEAR (as a string with 2 decimal places)
 */
export async function getAccountBalance(accountId: string, network: NetworkId = "mainnet"): Promise<string> {
  try {
    const rpcUrl = network === "mainnet" 
      ? "https://rpc.mainnet.near.org"
      : "https://rpc.testnet.near.org";

    const response = await fetch(rpcUrl, {
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
    });

    const data = await response.json();
    if (data.result && data.result.amount) {
      // Convert from yoctoNEAR to NEAR (1 NEAR = 10^24 yoctoNEAR)
      const yocto = BigInt(data.result.amount);
      const NEAR = BigInt(10) ** BigInt(24);
      const whole = yocto / NEAR;
      const remainder = yocto % NEAR;
      // Format to 2 decimal places
      const cents = (remainder * BigInt(100)) / NEAR;
      const formatted = `${whole.toString()}.${cents.toString().padStart(2, "0")}`;
      return formatted;
    }
    return "0.00";
  } catch (error) {
    console.error("Failed to fetch account balance:", error);
    return "0.00";
  }
}

