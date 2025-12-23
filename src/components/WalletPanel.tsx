"use client";

import { X, Copy, ChevronDown, LogOut } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

interface WalletPanelProps {
  walletName: string;
  balanceUsd?: string;
  balanceNear?: string;
  onClose: () => void;
  onDisconnect: () => void;
}

export default function WalletPanel({ walletName, balanceUsd = "$120.05", balanceNear = "2.32 NEAR", onClose, onDisconnect }: WalletPanelProps) {
  const [showRecent, setShowRecent] = useState(true);

  const recent = [
    { id: 1, label: "Sent 0.5 NEAR", time: "2h ago" },
    { id: 2, label: "Received 1.2 NEAR", time: "1d ago" },
    { id: 3, label: "Swap USD → NEAR", time: "3d ago" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center md:justify-end md:items-start md:pr-8 pt-24">
      {/* Backdrop */}
      <div onClick={onClose} className="absolute inset-0 bg-black/30" />

      <div className="relative w-full max-w-md md:ml-0 bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm text-gray-500">{walletName}</div>
              <div className="text-xs text-gray-400">{walletName ? `${walletName.slice(0, 8)}...${walletName.slice(-6)}` : ""}</div>
            </div>
            <div className="flex items-center gap-2">
              <button title="Copy address" className="p-2 rounded-full bg-gray-100 hover:bg-gray-200" onClick={() => navigator.clipboard?.writeText(walletName)}>
                <Copy className="h-4 w-4 text-gray-700" />
              </button>
              <button title="Close" className="p-2 rounded-full bg-gray-100 hover:bg-gray-200" onClick={onClose}>
                <X className="h-4 w-4 text-gray-700" />
              </button>
            </div>
          </div>

          <div className="mt-6">
            <div className="text-sm text-gray-500">Total portfolio</div>
            <div className="text-3xl font-extrabold mt-2 text-gray-900">{balanceUsd}</div>

              <div className="mt-4 rounded-xl overflow-hidden bg-gradient-to-r from-teal-600 to-cyan-400 text-white p-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Near</div>
                <div className="text-2xl font-bold mt-1">
                  ${balanceNear ? (parseFloat(balanceNear.split(" ")[0]) * 6.15).toFixed(2) : "0.00"}
                </div>
                <div className="text-xs opacity-90">{balanceNear}</div>
              </div>
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <Image src="/near-protocol.png" alt="NEAR" width={28} height={28} />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"

                onClick={() => setShowRecent((s: boolean) => !s)}
                className="flex items-center gap-2 text-sm font-medium text-gray-700"
              >
                <span>Recent transactions</span>
                <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${showRecent ? "rotate-180" : ""}`} />
              </button>
            </div>

            {/** Collapsible recent transactions */}
            {showRecent && (
              <div className="mt-4 space-y-3">
                {recent.map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-sm text-gray-700 border rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">Tx</div>
                      <div>
                        <div className="font-medium">{r.label}</div>
                        <div className="text-xs text-gray-400">{r.time}</div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">-</div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6">
              <button onClick={onDisconnect} className="w-full flex items-center justify-center gap-2 rounded-full border border-red-200 text-red-600 px-4 py-3 hover:bg-red-50 transition">
                <LogOut className="h-4 w-4" />
                Disconnect Wallet
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
