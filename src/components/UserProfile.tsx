"use client";

import { useEffect, useState } from "react";
import { Heart, MessageSquare, Repeat, Share, Users, Link as LinkIcon, Loader2, Zap } from "lucide-react";
import {
  fetchUserProfile,
  getProfileImageUrl,
  getUserPosts,
  getUserSocialStats,
  formatRelativeTime,
  likeItem,
  followAccount,
  unfollowAccount,
  pokeUser,
  getLikesForItem,
  getFollowing,
  getPokeCount,
  type NearSocialProfile,
  type NearSocialPost,
} from "../lib/near-social";
import { useWallet } from "../context/WalletContext";
import { getWalletSelector } from "../lib/near-wallet";

interface UserProfileProps {
  accountId: string;
  onClose?: () => void;
}

export default function UserProfile({ accountId, onClose }: UserProfileProps) {
  const { isConnected, accountId: currentAccountId } = useWallet();
  const [profile, setProfile] = useState<NearSocialProfile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [posts, setPosts] = useState<NearSocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ followers: 0, following: 0, posts: 0 });
  const [isFollowing, setIsFollowing] = useState(false);
  const [likesMap, setLikesMap] = useState<Record<string, number>>({});
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [pokeCount, setPokeCount] = useState<number>(0);
  const [isPoked, setIsPoked] = useState(false);

  // Transaction confirmation modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingTransaction, setPendingTransaction] = useState<{
    action: string;
    targetUser: string;
    displayName: string;
    onConfirm: () => Promise<void>;
  } | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [selectedDeposit, setSelectedDeposit] = useState<string>("0");

  // Load profile and posts
  useEffect(() => {
    async function loadProfileData() {
      setLoading(true);
      try {
        const [profileData, postsData, statsData] = await Promise.all([
          fetchUserProfile(accountId),
          getUserPosts(accountId),
          getUserSocialStats(accountId),
        ]);

        setProfile(profileData);
        setPosts(postsData);
        setStats(statsData);

        const imgUrl = getProfileImageUrl(profileData, accountId);
        setAvatarUrl(imgUrl);

        // Load poke count for this user
        const count = await getPokeCount(accountId);
        setPokeCount(count);

        // Check if current user is following this account
        if (isConnected && currentAccountId && currentAccountId !== accountId) {
          const following = await getFollowing(currentAccountId);
          setIsFollowing(following.includes(accountId));
        }

        // Load likes for posts
        const likesPromises = postsData.map((p) =>
          getLikesForItem({
            type: "social",
            path: `${p.accountId}/post/main`,
            blockHeight: p.blockHeight,
          })
        );
        const likesResults = await Promise.all(likesPromises);

        const newLikesMap: Record<string, number> = {};
        const newLikedMap: Record<string, boolean> = {};

        likesResults.forEach((likes, idx) => {
          const postId = postsData[idx].value.path;
          const count = Array.isArray(likes) ? likes.length : Object.keys(likes || {}).length;
          const likedByMe = Array.isArray(likes)
            ? likes.some(
                (l: any) =>
                  l?.accountId === currentAccountId || (typeof l === "object" && Object.keys(l)[0] === currentAccountId)
              )
            : !!(likes && typeof likes === 'object' && (likes as Record<string, any>)[currentAccountId as string]);

          newLikesMap[postId] = count;
          newLikedMap[postId] = likedByMe;
        });

        setLikesMap(newLikesMap);
        setLikedMap(newLikedMap);
      } catch (error) {
        console.error("Error loading profile:", error);
      } finally {
        setLoading(false);
      }
    }

    loadProfileData();
  }, [accountId, isConnected, currentAccountId]);

  const handleFollow = async () => {
    if (!isConnected || !currentAccountId) {
      window.dispatchEvent(
        new CustomEvent("nearcity-toast", {
          detail: { message: "Please connect your wallet first", type: "error" },
        })
      );
      return;
    }

    // Show confirmation modal
    setPendingTransaction({
      action: isFollowing ? "unfollow" : "follow",
      targetUser: accountId,
      displayName: profile?.name || accountId,
      onConfirm: async () => {
        try {
          const { selector } = await getWalletSelector();

          if (isFollowing) {
            await unfollowAccount(currentAccountId, accountId, selector);
            setIsFollowing(false);
            window.dispatchEvent(
              new CustomEvent("nearcity-toast", {
                detail: { message: `Unfollowed ${profile?.name || accountId}`, type: "success" },
              })
            );
          } else {
            await followAccount(currentAccountId, accountId, selector);
            setIsFollowing(true);
            window.dispatchEvent(
              new CustomEvent("nearcity-toast", {
                detail: { message: `Following ${profile?.name || accountId}`, type: "success" },
              })
            );
          }
        } catch (error: any) {
          window.dispatchEvent(
            new CustomEvent("nearcity-toast", {
              detail: { message: `Failed to update follow: ${error?.message || "Unknown error"}`, type: "error" },
            })
          );
        }
      }
    });
    setShowConfirmModal(true);
  };

  const handleLike = async (postId: string) => {
    if (!isConnected || !currentAccountId) {
      window.dispatchEvent(
        new CustomEvent("nearcity-toast", {
          detail: { message: "Please connect your wallet first", type: "error" },
        })
      );
      return;
    }

    // Show confirmation modal
    setPendingTransaction({
      action: "like",
      targetUser: accountId,
      displayName: "this post",
      onConfirm: async () => {
        setLikedMap((s) => ({ ...s, [postId]: true }));
        setLikesMap((s) => ({ ...s, [postId]: (s[postId] || 0) + 1 }));

        try {
          const walletSetup = await getWalletSelector();
          const postPath = postId.includes("/post/") ? postId : `${accountId}/post/main`;
          
          await likeItem(
            currentAccountId,
            {
              type: "social",
              path: postPath,
              blockHeight: 0,
            },
            walletSetup,
            selectedDeposit
          );

          window.dispatchEvent(
            new CustomEvent("nearcity-toast", {
              detail: { message: "Post liked!", type: "success" },
            })
          );
        } catch (error: any) {
          setLikedMap((s) => ({ ...s, [postId]: false }));
          setLikesMap((s) => ({ ...s, [postId]: Math.max(0, (s[postId] || 1) - 1) }));
          window.dispatchEvent(
            new CustomEvent("nearcity-toast", {
              detail: { message: `Failed to like: ${error?.message || "Unknown error"}`, type: "error" },
            })
          );
        }
      }
    });
    setShowConfirmModal(true);
  };

  const handlePoke = async () => {
    if (!isConnected || !currentAccountId) {
      window.dispatchEvent(
        new CustomEvent("nearcity-toast", {
          detail: { message: "Please connect your wallet first", type: "error" },
        })
      );
      return;
    }

    // Show confirmation modal
    setPendingTransaction({
      action: "poke",
      targetUser: accountId,
      displayName: profile?.name || accountId,
      onConfirm: async () => {
        setIsPoked(true);
        setPokeCount((c) => c + 1);

        try {
          const walletSetup = await getWalletSelector();
          await pokeUser(currentAccountId, accountId, walletSetup, selectedDeposit);

          window.dispatchEvent(
            new CustomEvent("nearcity-toast", {
              detail: { message: `Poked ${profile?.name || accountId}!`, type: "success" },
            })
          );
        } catch (error: any) {
          setIsPoked(false);
          setPokeCount((c) => Math.max(0, c - 1));
          window.dispatchEvent(
            new CustomEvent("nearcity-toast", {
              detail: { message: `Failed to poke: ${error?.message || "Unknown error"}`, type: "error" },
            })
          );
        }
      }
    });
    setShowConfirmModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-white to-purple-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
          <span className="text-gray-600">Loading profile...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-white to-purple-50">
      {/* Header with close button */}
      {onClose && (
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-100">
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">{profile?.name || accountId}</h1>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Profile Header */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-8">
          {/* Cover Image (gradient) */}
          <div className="h-32 bg-gradient-to-r from-teal-400 to-cyan-400" />

          <div className="px-6 pb-6">
            {/* Avatar */}
            <div className="flex items-start justify-between gap-4 -mt-16 mb-4">
              <img
                src={avatarUrl}
                alt={profile?.name || accountId}
                className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
              />
              {isConnected && currentAccountId !== accountId && (
                <div className="mt-16 flex gap-2">
                  <button
                    onClick={handleFollow}
                    disabled={isConfirming}
                    className={`px-6 py-2 rounded-full font-semibold transition ${
                      isFollowing
                        ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        : "bg-gradient-to-r from-teal-400 to-cyan-400 text-white hover:shadow-lg"
                    } ${isConfirming ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {isConfirming ? "..." : isFollowing ? "Following" : "Follow"}
                  </button>
                  <button
                    onClick={handlePoke}
                    disabled={isPoked}
                    className={`px-6 py-2 rounded-full font-semibold transition flex items-center gap-2 ${
                      isPoked
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-yellow-400 text-white hover:bg-yellow-500 hover:shadow-lg"
                    }`}
                  >
                    <Zap className="w-4 h-4" />
                    Poke
                  </button>
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="mb-4">
              <h1 className="text-3xl font-bold text-gray-900 mb-1">{profile?.name || accountId?.split(".")[0]}</h1>
              <p className="text-gray-500 mb-3">@{accountId}</p>

              {profile?.description && (
                <p className="text-gray-700 mb-4 max-w-2xl">{profile.description}</p>
              )}

              {/* Links */}
              <div className="flex flex-wrap gap-3 items-center">
                {profile?.linktree?.website && (
                  <a
                    href={profile.linktree.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-teal-600 hover:text-teal-700"
                  >
                    <LinkIcon className="w-4 h-4" />
                    Website
                  </a>
                )}
                {profile?.linktree?.twitter && (
                  <a
                    href={`https://twitter.com/${profile.linktree.twitter}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-teal-600 hover:text-teal-700"
                  >
                    <LinkIcon className="w-4 h-4" />
                    Twitter
                  </a>
                )}
                {profile?.linktree?.github && (
                  <a
                    href={`https://github.com/${profile.linktree.github}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-teal-600 hover:text-teal-700"
                  >
                    <LinkIcon className="w-4 h-4" />
                    GitHub
                  </a>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 border-t border-gray-100 pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{stats.posts}</div>
                <div className="text-sm text-gray-500">Posts</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{stats.followers}</div>
                <div className="text-sm text-gray-500">Followers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{stats.following}</div>
                <div className="text-sm text-gray-500">Following</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{pokeCount}</div>
                <div className="text-sm text-gray-500">Pokes</div>
              </div>
            </div>
          </div>
        </div>

        {/* Posts */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Posts</h2>
          {posts.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center text-gray-500">
              <p>No posts yet</p>
            </div>
          ) : (
            posts.map((post) => {
              const postId = post.value.path;
              const likeCount = likesMap[postId] || 0;
              const isLiked = likedMap[postId] || false;

              return (
                <article
                  key={postId}
                  className="bg-white rounded-xl p-6 border border-gray-100 hover:shadow-md transition"
                >
                  <div className="flex items-start gap-4">
                    <img
                      src={avatarUrl}
                      alt={profile?.name || accountId}
                      className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">
                          {profile?.name || accountId?.split(".")[0]}
                        </span>
                        <span className="text-gray-500">@{accountId}</span>
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-500 text-sm">
                          {formatRelativeTime(post.value.timestamp)}
                        </span>
                      </div>

                      {/* Post Content */}
                      <p className="text-gray-800 mt-3 whitespace-pre-wrap break-words">
                        {post.value.content?.text || post.value.main || "Post content"}
                      </p>

                      {/* Post Image */}
                      {post.value.content?.image && (
                        <img
                          src={post.value.content.image}
                          alt="Post"
                          className="mt-3 rounded-lg max-w-sm max-h-96 object-cover"
                        />
                      )}

                      {/* Post Audio */}
                      {post.value.content?.audio && (
                        <audio
                          controls
                          src={post.value.content.audio}
                          className="mt-3 w-full max-w-sm"
                        />
                      )}

                      {/* Interactions */}
                      <div className="mt-4 flex items-center justify-between text-gray-500 max-w-xs">
                        <button title="Reply" className="flex items-center gap-2 hover:text-blue-500 transition group">
                          <div className="p-2 rounded-full group-hover:bg-blue-50 transition">
                            <MessageSquare className="w-4 h-4" />
                          </div>
                          <span className="text-sm">0</span>
                        </button>

                        <button title="Repost" className="flex items-center gap-2 hover:text-green-500 transition group">
                          <div className="p-2 rounded-full group-hover:bg-green-50 transition">
                            <Repeat className="w-4 h-4" />
                          </div>
                          <span className="text-sm">0</span>
                        </button>

                        <button
                          onClick={() => handleLike(postId)}
                          className={`flex items-center gap-2 transition group ${
                            isLiked ? "text-red-500" : "hover:text-red-500"
                          }`}
                        >
                          <div className={`p-2 rounded-full transition ${isLiked ? "bg-red-50" : "group-hover:bg-red-50"}`}>
                            <Heart className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
                          </div>
                          <span className="text-sm">{likeCount}</span>
                        </button>

                        <button title="Share" className="flex items-center gap-2 hover:text-blue-500 transition group">
                          <div className="p-2 rounded-full group-hover:bg-blue-50 transition">
                            <Share className="w-4 h-4" />
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>

      {/* Transaction Confirmation Modal */}
      {showConfirmModal && pendingTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black opacity-50" onClick={() => !isConfirming && setShowConfirmModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 capitalize">
              Confirm {pendingTransaction.action}
            </h2>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="text-sm text-gray-600 mb-2">Action</div>
              <div className="text-lg font-semibold text-gray-900 capitalize">{pendingTransaction.action}</div>
              
              <div className="mt-4 text-sm text-gray-600 mb-2">Target</div>
              <div className="text-lg font-semibold text-teal-600">{pendingTransaction.displayName}</div>
              <div className="text-sm text-gray-500">@{pendingTransaction.targetUser}</div>
            </div>

            {/* Deposit Amount Selector */}
            <div className="mb-6">
              <div className="text-sm font-semibold text-gray-700 mb-3">Optional Deposit</div>
              <div className="grid grid-cols-4 gap-2">
                {["0", "0.05", "0.2", "1"].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setSelectedDeposit(amount)}
                    className={`py-2 px-3 rounded-lg font-medium text-sm transition ${
                      selectedDeposit === amount
                        ? "bg-teal-500 text-white shadow-lg"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {amount} Ⓝ
                  </button>
                ))}
              </div>
            </div>

            {/* Transaction Details Section */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
              <div className="text-sm font-semibold text-gray-700 mb-3">Transaction Details</div>
              
              <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div>
                  <span className="text-gray-600">Action</span>
                  <div className="text-gray-900 font-semibold capitalize">{pendingTransaction.action}</div>
                </div>
                <div>
                  <span className="text-gray-600">Target</span>
                  <div className="text-gray-900 font-semibold">@{pendingTransaction.targetUser}</div>
                </div>
              </div>

              {/* Gas & Fees Info */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Gas Fee (estimated)</span>
                  <span className="text-gray-900 font-semibold">~100 TGas</span>
                </div>
                <div className="flex justify-between items-center text-sm mt-2">
                  <span className="text-gray-600">Deposit</span>
                  <span className="text-gray-900 font-semibold">{selectedDeposit} Ⓝ</span>
                </div>
              </div>
            </div>

            {/* Transaction Data Preview */}
            <div className="mb-6">
              <div className="text-sm font-semibold text-gray-700 mb-2">Data to be saved</div>
              <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap break-words">
{JSON.stringify({
  action: pendingTransaction.action,
  target: pendingTransaction.targetUser,
  deposit: selectedDeposit,
  gas: "100000000000000"
}, null, 2)}
                </pre>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
              <p className="text-sm text-blue-800">
                ⛓️ This action will create a blockchain transaction. You'll need to sign it in your wallet.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={isConfirming}
                className="flex-1 px-4 py-3 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setIsConfirming(true);
                  try {
                    await pendingTransaction.onConfirm();
                    setShowConfirmModal(false);
                  } finally {
                    setIsConfirming(false);
                  }
                }}
                disabled={isConfirming}
                className="flex-1 px-4 py-3 rounded-lg bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-medium hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isConfirming ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing...
                  </span>
                ) : (
                  "Sign & Confirm"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
