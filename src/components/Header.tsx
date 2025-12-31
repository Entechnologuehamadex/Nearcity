"use client";

import { Wallet, Menu } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import Image from "next/image";
import WalletPanel from "./WalletPanel";
import ComingSoonPopover from "./ComingSoonPopover";
import { useToast } from "../hooks/use-toast";
import { useWallet } from "../context/WalletContext";
import UserProfile from "./UserProfile";

import MobileMenu from "./MobileMenu";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { isConnected, walletName, balance, connect, disconnect, isLoading } = useWallet();
  const { toasts, addToast, removeToast } = useToast();
  const [showWalletPanel, setShowWalletPanel] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedProfileAccount, setSelectedProfileAccount] = useState<string | null>(null);

  useEffect(() => {
    function handleGlobalToast(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (detail?.message) {
        addToast(detail.message, detail.type ?? "info");
      }
    }
    window.addEventListener("nearcity-toast", handleGlobalToast as EventListener);

    // Open wallet panel when any part of the app requests it
    function handleOpenWallet(_: Event) {
      setShowWalletPanel(true);
    }
    window.addEventListener("nearcity-open-wallet", handleOpenWallet as EventListener);

    return () => {
      window.removeEventListener("nearcity-toast", handleGlobalToast as EventListener);
      window.removeEventListener("nearcity-open-wallet", handleOpenWallet as EventListener);
    };
  }, [addToast]);

  const navItems = [
    { label: "Home", route: "/", primary: true },
    { label: "Social", route: "/explore" },
    { label: "DApp", route: "/dapp" },
    { label: "Web4 Page", route: "/web4" },
    { label: "Data", route: "/data" },
  ];

  const disabledNavRoutes = new Set(["/dapp", "/web4", "/data"]);
  const [comingAnchor, setComingAnchor] = useState<{ left: number; top: number; bottom: number; width: number } | null>(null);

  useEffect(() => {
    function handleShow(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (detail?.rect) {
        setComingAnchor(detail.rect as any);
      }
    }

    window.addEventListener("nearcity-show-coming-soon", handleShow as EventListener);

    function handleClickOutside() {
      setComingAnchor(null);
    }
    window.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("nearcity-show-coming-soon", handleShow as EventListener);
      window.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const [activeRoute, setActiveRoute] = useState<string>("");

  // Keep activeRoute in sync when navigating to one of the main nav routes.
  useEffect(() => {
    // Keep activeRoute in sync for non-root routes. We intentionally
    // avoid marking Home (`/`) active on initial load so it stays
    // un-underlined on the landing page.
    const match = navItems.find((item) => {
      if (item.route === "/") return pathname === "/";
      return pathname.startsWith(item.route);
    });
    if (match && match.route !== "/") {
      setActiveRoute(match.route);
    }
    // if pathname is not a main nav route (e.g. /connect), keep previous activeRoute
  }, [pathname]);

  return (
    <>
      <header className="w-full py-6">
        <div className="mx-auto max-w-7xl px-6 flex items-center justify-between">
          <button onClick={() => { setActiveRoute('/'); router.push('/'); }} className="text-teal-600 font-bold focus:outline-none">NEAR CITY</button>
          <div className="flex items-center gap-6">
            <nav className="hidden md:flex items-center gap-4 bg-emerald-400 rounded-full px-4 py-1 shadow-sm">
              {navItems.map((item) => (
                <button
                  key={item.route}
                  type="button"
                  onClick={(e) => {
                    // For certain routes we show "Coming soon" instead of navigating
                    if (disabledNavRoutes.has(item.route)) {
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      setComingAnchor({ left: rect.left, top: rect.top, bottom: rect.bottom, width: rect.width });
                      return;
                    }

                    setActiveRoute(item.route);
                    router.push(item.route);
                  }}
                  className={`px-4 py-2 text-sm font-medium transition ${
                    activeRoute === item.route
                      ? "text-white underline"
                      : "text-neutral-700 dark:text-neutral-200 hover:text-neutral-900"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {!isConnected ? (
              <>
                <button
                  type="button"
                  onClick={async () => {
                    // When user connects, underline Home (without adding a background).
                    setActiveRoute("/");
                    try {
                      await connect();
                      addToast("Wallet connected successfully", "success");
                      // Open the wallet panel after successful connect so behavior matches other connect buttons
                      window.dispatchEvent(new CustomEvent('nearcity-open-wallet'));
                    } catch (error) {
                      addToast("Failed to connect wallet", "error");
                    }
                  }}
                  disabled={isLoading}
                  className="hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500 text-white hover:bg-emerald-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Wallet className="h-4 w-4" />
                  {isLoading ? "Connecting..." : "Connect Wallet"}
                </button>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(true)}
                  className="md:hidden inline-flex items-center gap-2 px-3 py-2 rounded-full border"
                >
                  <Menu className="h-4 w-4" />
                  Menu
                </button>
              </>
            ) : (
              <>
                {/* Wallet Display with Dropdown */}
                <div className="hidden md:block relative">
                  <button
                    type="button"
                    onClick={() => setShowWalletPanel(!showWalletPanel)}
                    className="flex items-center rounded-full overflow-hidden hover:shadow-lg transition"
                  >
                    {/* Left section with wallet name */}
                    <div className="flex items-center gap-3 px-4 py-2 bg-white border-r border-gray-200">
                      <div className="w-1 h-6 bg-teal-600 rounded"></div>
                      <span className="text-sm text-gray-600">{walletName}</span>
                    </div>
                    {/* Right section with balance and NEAR logo */}
                    <div className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-500">
                      <span className="text-sm font-semibold text-gray-700">
                        {balance ? parseFloat(balance).toFixed(2) : "0.00"}
                      </span>
                      <Image
                        src="/near-protocol.png"
                        alt="NEAR Protocol"
                        width={24}
                        height={24}
                        className="rounded-full"
                      />
                    </div>
                  </button>

                  {/* Wallet Panel */}
                  {showWalletPanel && (
                    <WalletPanel
                      walletName={walletName ?? ""}
                      onClose={() => setShowWalletPanel(false)}
                      onViewProfile={(accountId) => {
                        setSelectedProfileAccount(accountId);
                        setShowWalletPanel(false);
                      }}
                      onDisconnect={async () => {
                        try {
                          await disconnect();
                          setShowWalletPanel(false);
                          setActiveRoute("");
                          addToast("Wallet disconnected", "success");
                          router.push("/");
                        } catch (error) {
                          addToast("Failed to disconnect wallet", "error");
                        }
                      }}
                    />
                  )}


                </div>

                {/* Mobile wallet display */}
                <button
                  type="button"
                  onClick={() => setShowWalletPanel(true)}
                  className="md:hidden inline-flex items-center gap-2 px-3 py-2 rounded-full border text-sm"
                >
                  {walletName ? walletName.split(".")[0] : ''}
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {mobileMenuOpen && <MobileMenu onClose={() => setMobileMenuOpen(false)} />}

      {selectedProfileAccount && (
        <UserProfile
          accountId={selectedProfileAccount}
          onClose={() => setSelectedProfileAccount(null)}
        />
      )}

      {comingAnchor && (
        <ComingSoonPopover
          anchorRect={comingAnchor}
          message={"Coming soon!!!"}
          onClose={() => setComingAnchor(null)}
        />
      )}

      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast: any) => (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded-lg text-white font-medium animate-in fade-in transition ${
              toast.type === "success"
                ? "bg-green-500"
                : toast.type === "error"
                ? "bg-red-500"
                : "bg-blue-500"
            }`}
            onClick={() => removeToast(toast.id)}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </>
  );
}
