"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useWallet } from "../context/WalletContext";

interface MobileMenuProps {
  onClose: () => void;
}

export default function MobileMenu({ onClose }: MobileMenuProps) {
  const router = useRouter();
  const { isConnected, walletName, connect, disconnect, isLoading } = useWallet();

  const navItems = [
    { label: "Home", route: "/" },
    { label: "Social", route: "/explore" },
    { label: "DApp", route: "/dapp" },
    { label: "Web4 Page", route: "/web4" },
    { label: "Data", route: "/data" },
  ];

  const disabledNavRoutes = new Set(["/dapp", "/web4", "/data"]);
  const [comingId, setComingId] = useState<string | null>(null);

  function showComing(id: string) {
    setComingId(id);
    setTimeout(() => setComingId(null), 3000);
  }

  return (
    <div className="fixed inset-0 z-40 lg:hidden">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <aside className="absolute left-0 top-0 h-full w-full max-w-xs sm:max-w-sm bg-white shadow-2xl p-4 sm:p-6 flex flex-col overflow-y-auto">
        <div className="flex items-center justify-between mb-6 flex-shrink-0">
          <div className="font-bold text-lg sm:text-xl text-teal-600">NEAR CITY</div>
          <button onClick={onClose} aria-label="Close menu" title="Close menu" className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 flex-shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex flex-col gap-1 mb-6">
          {navItems.map((item) => (
            <div key={item.route}>
              <button
                onClick={() => {
                  if (disabledNavRoutes.has(item.route)) {
                    showComing(item.route);
                    return;
                  }
                  router.push(item.route);
                  onClose();
                }}
                className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 transition text-sm sm:text-base font-medium text-gray-700 hover:text-gray-900"
              >
                {item.label}
              </button>

              {comingId === item.route && (
                <div className="mt-1 text-red-600 font-semibold px-4 text-xs sm:text-sm">Coming soon!!!</div>
              )}
            </div>
          ))}
        </nav>

        <div className="border-t pt-4 space-y-3 flex-1">
          {!isConnected ? (
            <button
              onClick={async () => {
                try {
                  await connect();
                  // Open the same wallet UI as the top-right menu
                  window.dispatchEvent(new CustomEvent('nearcity-open-wallet'));
                } finally {
                  onClose();
                }
              }}
              disabled={isLoading}
              className="w-full rounded-lg px-4 py-3 bg-emerald-500 text-white font-medium disabled:opacity-50 text-sm sm:text-base hover:bg-emerald-600 transition"
            >
              {isLoading ? "Connecting..." : "Connect Wallet"}
            </button>
          ) : (
            <div className="space-y-3">
              <div className="px-4 py-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-600 uppercase tracking-wide">Connected Wallet</div>
                <div className="text-sm font-semibold text-gray-900 mt-1 break-all">{walletName}</div>
              </div>
              <button 
                onClick={() => { disconnect(); onClose(); }} 
                className="w-full rounded-lg px-4 py-3 border border-red-200 text-sm text-red-600 font-medium hover:bg-red-50 transition"
              >
                Disconnect
              </button>
            </div>
          )}
        </div>

        <div className="border-t pt-4 mt-auto flex-shrink-0 space-y-2">
          <div className="text-xs text-gray-500 uppercase tracking-wide px-4 font-semibold">Settings</div>
          <button 
            onClick={() => { router.push('/settings'); onClose(); }} 
            className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-100 transition text-sm text-gray-700"
          >
            Preferences
          </button>
        </div>
      </aside>
    </div>
  );
}
