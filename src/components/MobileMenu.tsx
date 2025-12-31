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
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <aside className="absolute right-0 top-0 h-full w-full max-w-sm bg-white shadow-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="font-bold text-lg text-teal-600">NEAR CITY</div>
          <button onClick={onClose} aria-label="Close menu" title="Close menu" className="p-2 rounded-full bg-gray-100 hover:bg-gray-200">
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex flex-col gap-2">
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
                className="text-left px-3 py-3 rounded-md hover:bg-gray-100 w-full text-left"
              >
                {item.label}
              </button>

              {comingId === item.route && (
                <div className="mt-1 text-red-600 font-semibold px-3">Coming soon!!!</div>
              )}
            </div>
          ))}
        </nav>

        <div className="mt-6 border-t pt-4">
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
              className="w-full rounded-full px-4 py-3 bg-emerald-500 text-white font-medium disabled:opacity-50"
            >
              {isLoading ? "Connecting..." : "Connect Wallet"}
            </button>
          ) : (
            <div className="space-y-2">
              <div className="text-sm text-gray-700">{walletName}</div>
              <button onClick={() => { disconnect(); onClose(); }} className="w-full rounded-full px-4 py-3 border text-sm text-red-600">Disconnect</button>
            </div>
          )}
        </div>

        <div className="mt-6 text-sm text-gray-500">
          <div className="mb-2">Settings</div>
          <button onClick={() => { router.push('/settings'); onClose(); }} className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100">Preferences</button>
        </div>
      </aside>
    </div>
  );
}
