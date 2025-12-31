"use client";

import { X, Copy, ChevronDown, LogOut, Users, BarChart3 } from "lucide-react";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useWallet } from "../context/WalletContext";
import { fetchRecentTransactions, fetchNearUsdPrice } from "../lib/near-api";
import { fetchUserProfile, getProfileImageUrl, getUserSocialStats } from "../lib/near-social";
import type { NearSocialProfile } from "../lib/near-social";

interface WalletPanelProps {
  walletName: string;
  onClose: () => void;
  onDisconnect: () => void;
  onViewProfile?: (accountId: string) => void;
}

export default function WalletPanel({ walletName, onClose, onDisconnect, onViewProfile }: WalletPanelProps) {
  const [showRecent, setShowRecent] = useState(true);
  const [recent, setRecent] = useState<Array<any>>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [nearPrice, setNearPrice] = useState<number | null>(null);
  const [profile, setProfile] = useState<NearSocialProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [socialStats, setSocialStats] = useState({ followers: 0, following: 0, posts: 0 });
  const [statsLoading, setStatsLoading] = useState(false);

  // use wallet context for up-to-date account and balance
  const { accountId, balance } = useWallet();

  // Fetch user profile
  useEffect(() => {
    let mounted = true;
    async function loadProfile() {
      if (!accountId) {
        console.log('[WalletPanel] No accountId, skipping profile load');
        return;
      }
      setProfileLoading(true);
      setStatsLoading(true);
      try {
        console.log('[WalletPanel] Loading profile for:', accountId);
        const [userProfile, stats] = await Promise.all([
          fetchUserProfile(accountId),
          getUserSocialStats(accountId),
        ]);
        if (!mounted) return;
        
        console.log('[WalletPanel] Profile loaded:', userProfile);
        console.log('[WalletPanel] Stats loaded:', stats);
        setProfile(userProfile);
        setSocialStats(stats);
        const imgUrl = getProfileImageUrl(userProfile, accountId);
        setAvatarUrl(imgUrl);
      } catch (err) {
        console.error("Failed to load profile:", err);
        setProfile(null);
      } finally {
        if (mounted) {
          setProfileLoading(false);
          setStatsLoading(false);
        }
      }
    }

    loadProfile();
    return () => { mounted = false; };
  }, [accountId]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!accountId) return;
      setTxLoading(true);
      try {
        const txs = await fetchRecentTransactions(accountId, 6);
        if (!mounted) return;
        setRecent(txs);
      } catch (err) {
        console.error(err);
        setRecent([]);
      } finally {
        if (mounted) setTxLoading(false);
      }
    }

    load();

    return () => { mounted = false; };
  }, [accountId]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const price = await fetchNearUsdPrice();
      if (mounted) setNearPrice(price);
    })();
    return () => { mounted = false; };
  }, []);

  function formatNear(b?: string | null) {
    if (!b) return "0.00";
    // already a formatted NEAR like '1.23' from WalletContext
    return parseFloat(b).toFixed(2);
  }

  const nearAmount = formatNear(balance);
  const usd = nearPrice ? (parseFloat(nearAmount) * nearPrice).toFixed(2) : null;

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
            <div className="text-3xl font-extrabold mt-2 text-gray-900">{usd ? `$${usd}` : `$${(parseFloat(nearAmount) * (nearPrice ?? 0)).toFixed(2)}`}</div>

            <div className="mt-4 rounded-xl overflow-hidden bg-gradient-to-r from-teal-600 to-cyan-400 text-white p-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Near</div>
                <div className="text-2xl font-bold mt-1">{nearAmount} NEAR</div>
                <div className="text-xs opacity-90">{parseFloat(nearAmount) > 0 ? (nearPrice ? `$${(parseFloat(nearAmount) * nearPrice).toFixed(2)}` : "NEAR balance") : "No NEAR tokens"}</div>
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
                {txLoading ? (
                  <div className="text-sm text-gray-500">Loading transactions...</div>
                ) : recent.length === 0 ? (
                  <div className="text-sm text-gray-500">No recent transactions</div>
                ) : (
                  recent.map((r) => {
                    const hash = r.hash ?? r.tx_hash ?? r.transaction_hash ?? r.id ?? Math.random().toString(36).slice(2);
                    const signer = r.signer || r.signer_id || '';
                    const receiver = r.receiver || r.receiver_id || '';

                    // format time
                    let timeStr = 'N/A';
                    if (r.blockTimestamp) {
                      const t = parseInt(String(r.blockTimestamp), 10);
                      let ms = t;
                      // handle ns -> ms
                      if (t > 1e15) ms = Math.floor(t / 1e6);
                      // if timestamp seems like microseconds, normalize to ms
                      if (t > 1e12 && t < 1e15) ms = Math.floor(t / 1000);

                      const ago = (Date.now() - ms) / 1000; // seconds
                      if (ago < 60) timeStr = `${Math.floor(ago)}s ago`;
                      else if (ago < 3600) timeStr = `${Math.floor(ago / 60)}m ago`;
                      else if (ago < 86400) timeStr = `${Math.floor(ago / 3600)}h ago`;
                      else timeStr = `${Math.floor(ago / 86400)}d ago`;
                    }

                    const label = signer && signer === accountId ? `Sent to ${receiver || hash.slice(0,6)}` : `Received from ${signer || hash.slice(0,6)}`;

                    return (
                      <div key={hash} className="flex items-center justify-between text-sm text-gray-700 border rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">Tx</div>
                          <div>
                            <div className="font-medium">{label}</div>
                            <div className="text-xs text-gray-400">{timeStr}</div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">{hash.slice(0,8)}</div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Social Profile Section */}
            <div className="mt-6 bg-gray-50 rounded-xl p-4">
              <div className="text-xs text-gray-500 font-medium mb-3">Social Profile</div>
              
              {profileLoading ? (
                <div className="text-sm text-gray-500">Loading profile...</div>
              ) : accountId ? (
                <>
                  <div className="flex items-start gap-3 mb-4">
                    <img 
                      src={avatarUrl} 
                      alt={profile?.name || accountId || 'User'} 
                      className="w-12 h-12 rounded-full object-cover flex-shrink-0 cursor-pointer hover:opacity-80 transition"
                      onClick={() => onViewProfile?.(accountId)}
                    />
                    <div className="flex-1 min-w-0">
                      <div 
                        className="font-semibold text-gray-900 text-sm cursor-pointer hover:text-teal-600 transition"
                        onClick={() => onViewProfile?.(accountId)}
                      >
                        {profile?.name || accountId?.split('.')[0] || 'User'}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">@{accountId}</div>
                      
                      {/* Profile tags/interests from description */}
                      {profile?.description && typeof profile.description === 'string' && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {profile.description.split(/[,;]/).slice(0, 2).map((tag, idx) => {
                            const trimmedTag = tag.trim();
                            return trimmedTag ? (
                              <span key={idx} className="inline-block text-xs bg-white border border-gray-200 text-gray-700 px-2 py-1 rounded">
                                {trimmedTag}
                              </span>
                            ) : null;
                          })}
                        </div>
                      )}
                      
                      {profile && Object.keys(profile).length > 0 && !profile.name && !profile.description && (
                        <div className="text-xs text-gray-500 mt-2">Profile loaded</div>
                      )}
                    </div>
                  </div>

                  {/* Social Stats */}
                  {statsLoading ? (
                    <div className="text-xs text-gray-500 text-center py-2">Loading stats...</div>
                  ) : (
                    <div className="grid grid-cols-3 gap-3 border-t border-gray-200 pt-3">
                      <button 
                        onClick={() => onViewProfile?.(accountId)}
                        className="text-center hover:bg-white/50 rounded-lg p-2 transition"
                      >
                        <div className="text-sm font-bold text-gray-900">{socialStats.posts}</div>
                        <div className="text-xs text-gray-500">Posts</div>
                      </button>
                      <button 
                        onClick={() => onViewProfile?.(accountId)}
                        className="text-center hover:bg-white/50 rounded-lg p-2 transition"
                      >
                        <div className="text-sm font-bold text-gray-900">{socialStats.followers}</div>
                        <div className="text-xs text-gray-500">Followers</div>
                      </button>
                      <button 
                        onClick={() => onViewProfile?.(accountId)}
                        className="text-center hover:bg-white/50 rounded-lg p-2 transition"
                      >
                        <div className="text-sm font-bold text-gray-900">{socialStats.following}</div>
                        <div className="text-xs text-gray-500">Following</div>
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-sm text-gray-400">No wallet connected</div>
              )}
            </div>

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
