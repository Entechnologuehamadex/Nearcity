"use client";

import { setupWalletSelector } from "@near-wallet-selector/core";
import { setupModal } from "@near-wallet-selector/modal-ui";
import { setupMyNearWallet } from "@near-wallet-selector/my-near-wallet";
import { setupHotWallet } from "@near-wallet-selector/hot-wallet";
import { setupLedger } from "@near-wallet-selector/ledger"; 
import type { WalletSelector, AccountState } from "@near-wallet-selector/core";
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
    network: process.env.NEXT_PUBLIC_NEAR_NETWORK || "testnet",
    modules: [
      setupMyNearWallet(),
      setupHotWallet(),
      setupLedger(),
    ],
  });

  const modal = setupModal(selector, {
    contractId: process.env.NEXT_PUBLIC_NEAR_CONTRACT_ID || "app.nearcity.testnet",
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

