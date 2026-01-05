"use client";

import SearchBar from "./components/SearchBar";
import { MoreVertical, Heart, Share2, Bell, ChevronDown, Loader2, MessageSquare, Repeat, PencilLine, Zap } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import {
  fetchNearSocialPosts,
  fetchUserProfile,
  formatRelativeTime,
  getProfileImageUrl,
  postToNearSocial,
  followAccount,
  unfollowAccount,
  likeItem,
  repostItem,
  pokeUser,
  getLikesForItem,
  getRepostsForItem,
  getFollowing,
  getSuggestedAccounts,
  getPokeCount,
  // diagnostics
  testIndexer,
  testRpc,
  getIndexerUrl,
  getRpcUrl,
} from "./lib/near-social";
import { useWallet } from "./context/WalletContext";
import { getWalletSelector } from "./lib/near-wallet";
import UserProfile from "./components/UserProfile";
import type { NearSocialPost, NearSocialProfile } from "./lib/near-social";

interface Post {
  id: string;
  blockHeight?: number;
  author: string;
  handle: string;
  time: string;
  content: string;
  likes: number;
  replies: number;
  reposts: number;
  imageUrl?: string;
  audioUrl?: string;
  avatarUrl: string;
  accountId: string;
  profile?: NearSocialProfile | null;
}

export default function Social() {
  const { isConnected, accountId } = useWallet();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProfileAccount, setSelectedProfileAccount] = useState<string | null>(null);

  // Pagination
  const [nextCursor, setNextCursor] = useState<number | string | undefined>(undefined);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [showOverview, setShowOverview] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const overviewRef = useRef<HTMLDivElement | null>(null);

  // Composer (Write a post)
  const [showComposer, setShowComposer] = useState(false);
  const [composerText, setComposerText] = useState("");
  const [composerImageUrl, setComposerImageUrl] = useState<string | null>(null);
  const [composerImageFile, setComposerImageFile] = useState<File | null>(null);
  const [composerAudioUrl, setComposerAudioUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Interaction states
  const [likesMap, setLikesMap] = useState<Record<string, number>>({});
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [repostsMap, setRepostsMap] = useState<Record<string, number>>({});
  const [repostedMap, setRepostedMap] = useState<Record<string, boolean>>({});
  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());
  const [pendingFollowMap, setPendingFollowMap] = useState<Record<string, boolean>>({});
  const [pokeMap, setPokeMap] = useState<Record<string, number>>({});
  const [pokedByMeMap, setPokedByMeMap] = useState<Record<string, boolean>>({});
  const [suggested, setSuggested] = useState<Post[]>([]);

  // User avatar (rounded)
  const [userAvatar, setUserAvatar] = useState<string>(`https://i.pravatar.cc/150?u=you`);
  const [userProfile, setUserProfile] = useState<NearSocialProfile | null>(null);

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

  // Diagnostics: endpoint testing
  const [isTestingEndpoints, setIsTestingEndpoints] = useState(false);
  const [indexerTestResult, setIndexerTestResult] = useState<any>(null);
  const [rpcTestResult, setRpcTestResult] = useState<any>(null);

  // Fetch posts from NEAR Social (refactor loadPosts so we can call it on demand)
  const loadPosts = async (limit: number = 50, append: boolean = false, cursor?: number | string) => {
    if (append) setIsLoadingMore(true);
    else setIsLoading(true);

    setError(null);
    try {
      const result = await fetchNearSocialPosts(limit, cursor as any);
      const nearPosts = result.posts;

      // Fetch profiles for all unique account IDs
      const uniqueAccountIds = [...new Set(nearPosts.map((p) => p.accountId))];
      const profilePromises = uniqueAccountIds.map((id) => fetchUserProfile(id));
      const profiles = await Promise.all(profilePromises);
      const profileMap = new Map(
        uniqueAccountIds.map((id, index) => [id, profiles[index]])
      );

      // Transform NEAR Social posts to our Post format
      const transformedPosts: Post[] = await Promise.all(
        nearPosts.map(async (nearPost) => {
          const profile = profileMap.get(nearPost.accountId);
          const avatarUrl = getProfileImageUrl(profile ?? null, nearPost.accountId);

          // Parse post content
          let content = "";
          let imageUrl: string | undefined;

          if (typeof nearPost.value.main === "string") {
            try {
              const parsed = JSON.parse(nearPost.value.main);
              if (parsed.type === "md" && parsed.text) {
                content = parsed.text;
              } else if (typeof parsed === "string") {
                content = parsed;
              }
              if (parsed.image?.url) {
                imageUrl = parsed.image.url;
              }
            } catch {
              content = nearPost.value.main;
            }
          } else if (nearPost.value.content?.text) {
            content = nearPost.value.content.text;
            imageUrl = nearPost.value.content.image;
          }

          // Get author name from profile or use account ID
          const authorName = profile?.name || nearPost.accountId.split(".")[0] || "Unknown";

          return {
            id: `${nearPost.accountId}-${nearPost.blockHeight}`,
            blockHeight: nearPost.blockHeight,
            author: authorName,
            handle: `@${nearPost.accountId}`,
            time: formatRelativeTime(nearPost.value.timestamp),
            content,
            likes: 0, // NEAR Social doesn't provide likes in the indexer
            replies: 0,
            reposts: 0,
            imageUrl,
            avatarUrl,
            accountId: nearPost.accountId,
            profile,
          };
        })
      );

      if (append) {
        setPosts((s) => [...s, ...transformedPosts]);
      } else {
        setPosts(transformedPosts);
      }

      // update next cursor
      setNextCursor(result.next);

      // Load interactions (likes/following) after we have posts
      loadInteractions(append ? [...posts, ...transformedPosts] : transformedPosts);
    } catch (err: any) {
      console.error("Error loading posts:", err);
      setError(`Failed to load posts: ${err?.message || "Unknown error"}. Check your NEAR indexer / RPC configuration or set NEXT_PUBLIC_NEAR_SOCIAL_API in .env.local (see docs/NEAR_API_DOCUMENTATION.md).`);
      // Fallback to empty array or show error message
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  // Auto refresh posts when the wallet connects (so the user sees their profile immediately)
  useEffect(() => {
    if (isConnected) {
      (async () => {
        if (accountId) {
          const profile = await fetchUserProfile(accountId);
          if (profile) {
            setUserProfile(profile);
            setUserAvatar(getProfileImageUrl(profile, accountId));
          }
        }

        // refresh posts to show any user-specific state
        await loadPosts();

        // If there's a next cursor, enable intersection observer for infinite scroll
        if (observerRef.current) observerRef.current.disconnect();
        observeSentinel();
      })();
    }
  }, [isConnected, accountId]);

  // Infinite scroll via IntersectionObserver
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  function observeSentinel() {
    if (!sentinelRef.current) return;
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && nextCursor && !isLoadingMore) {
          loadPosts(20, true, nextCursor);
        }
      }
    }, { root: null, rootMargin: '200px', threshold: 0 });

    observerRef.current.observe(sentinelRef.current);
  }

  async function runDiagnostics() {
    setIsTestingEndpoints(true);
    setIndexerTestResult(null);
    setRpcTestResult(null);
    try {
      const idx = await testIndexer();
      setIndexerTestResult(idx);
    } catch (e: any) {
      setIndexerTestResult({ ok: false, message: e?.message ?? String(e) });
    }

    try {
      const rpc = await testRpc();
      setRpcTestResult(rpc);
    } catch (e: any) {
      setRpcTestResult({ ok: false, message: e?.message ?? String(e) });
    }

    setIsTestingEndpoints(false);
  }


  // Load likes, reposts, and following info
  async function loadInteractions(currentPosts: Post[]) {
    try {
      // Likes per post
      const likesResults = await Promise.all(
        currentPosts.map(async (p) => {
          const likes = await getLikesForItem({ type: "social", path: `${p.accountId}/post/main`, blockHeight: p.blockHeight });
          const count = Array.isArray(likes) ? likes.length : Object.keys(likes || {}).length;
          const likedByMe = (() => {
            if (!accountId) return false;
            if (Array.isArray(likes)) {
              return likes.some((l: any) => l?.accountId === accountId || (typeof l === "object" && Object.keys(l)[0] === accountId));
            }
            return !!(likes && (likes as any)[accountId]);
          })();

          return { id: p.id, count, liked: likedByMe };
        })
      );

      const newLikesMap: Record<string, number> = {};
      const newLikedMap: Record<string, boolean> = {};
      likesResults.forEach((r) => {
        newLikesMap[r.id] = r.count;
        newLikedMap[r.id] = r.liked;
      });
      setLikesMap((s) => ({ ...s, ...newLikesMap }));
      setLikedMap((s) => ({ ...s, ...newLikedMap }));

      // Reposts per post
      const repostsResults = await Promise.all(
        currentPosts.map(async (p) => {
          const reposts = await getRepostsForItem({ type: "social", path: `${p.accountId}/post/main`, blockHeight: p.blockHeight });
          const count = Array.isArray(reposts) ? reposts.length : 0;
          const repostedByMe = (() => {
            if (!accountId) return false;
            if (Array.isArray(reposts)) {
              return reposts.some((r: any) => r?.accountId === accountId || (typeof r === "object" && Object.keys(r)[0] === accountId));
            }
            return false;
          })();

          return { id: p.id, count, reposted: repostedByMe };
        })
      );

      const newRepostsMap: Record<string, number> = {};
      const newRepostedMap: Record<string, boolean> = {};
      repostsResults.forEach((r) => {
        newRepostsMap[r.id] = r.count;
        newRepostedMap[r.id] = r.reposted;
      });
      setRepostsMap((s) => ({ ...s, ...newRepostsMap }));
      setRepostedMap((s) => ({ ...s, ...newRepostedMap }));

      // Following (who the current user follows)
      if (isConnected && accountId) {
        const f = await getFollowing(accountId);
        const set = new Set(Object.keys(f || {}));
        setFollowingSet(set);
      }
    } catch (err) {
      console.warn("Error loading interactions:", err);
    }
  }

  // Compute suggested accounts to follow from API
  useEffect(() => {
    async function loadSuggested() {
      try {
        const accountIds = await getSuggestedAccounts(5, accountId || undefined);
        
        // Fetch profiles for suggested accounts
        const profiles = await Promise.all(
          accountIds.map(id => fetchUserProfile(id))
        );
        
        // Transform to Post format for display
        const suggestedPosts: Post[] = accountIds.map((id, idx) => {
          const profile = profiles[idx];
          const avatarUrl = getProfileImageUrl(profile ?? null, id);
          
          return {
            id: `suggested-${id}`,
            author: profile?.name || id.split(".")[0] || "Unknown",
            handle: `@${id}`,
            time: "",
            content: profile?.description || "",
            likes: 0,
            replies: 0,
            reposts: 0,
            avatarUrl,
            accountId: id,
            profile,
          };
        });
        
        setSuggested(suggestedPosts);
      } catch (err) {
        console.warn("Error loading suggested accounts:", err);
        setSuggested([]);
      }
    }
    
    loadSuggested();
  }, [accountId]);

  // Fetch user profile when connected
  useEffect(() => {
    async function loadUserProfile() {
      if (isConnected && accountId) {
        const profile = await fetchUserProfile(accountId);
        if (profile) {
          const avatarUrl = getProfileImageUrl(profile ?? null, accountId);
          setUserAvatar(avatarUrl);
        }
      }
    }
    loadUserProfile();
  }, [isConnected, accountId]);

  useEffect(() => {
    return () => {
      // cleanup object urls
      if (composerImageUrl) URL.revokeObjectURL(composerImageUrl);
      if (composerAudioUrl) URL.revokeObjectURL(composerAudioUrl);
    };
  }, [composerImageUrl, composerAudioUrl]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (overviewRef.current && !overviewRef.current.contains(e.target as Node)) {
        setShowOverview(false);
      }
    }
    if (showOverview) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [showOverview]);

  // Interaction handlers
  async function handleLike(p: Post) {
    if (!isConnected || !accountId) {
      window.dispatchEvent(new CustomEvent("nearcity-toast", { detail: { message: "Please connect your wallet first", type: "error" } }));
      return;
    }

    // Show confirmation modal
    setPendingTransaction({
      action: "like",
      targetUser: p.accountId,
      displayName: p.author,
      onConfirm: async () => {
        // Optimistic update
        setLikedMap((s) => ({ ...s, [p.id]: true }));
        setLikesMap((s) => ({ ...s, [p.id]: (s[p.id] || 0) + 1 }));

        try {
          const walletSetup = await getWalletSelector();
          await likeItem(accountId, { type: "social", path: `${p.accountId}/post/main`, blockHeight: p.blockHeight }, walletSetup, selectedDeposit);
          // refresh like counts
          const likes = await getLikesForItem({ type: "social", path: `${p.accountId}/post/main`, blockHeight: p.blockHeight });
          const count = Array.isArray(likes) ? likes.length : Object.keys(likes || {}).length;
          const likedByMe = Array.isArray(likes) ? likes.some((l: any) => l?.accountId === accountId || (typeof l === "object" && Object.keys(l)[0] === accountId)) : !!(likes && (likes as any)[accountId]);
          setLikesMap((s) => ({ ...s, [p.id]: count }));
          setLikedMap((s) => ({ ...s, [p.id]: likedByMe }));
          window.dispatchEvent(new CustomEvent("nearcity-toast", { detail: { message: "Post liked!", type: "success" } }));
        } catch (err: any) {
          console.error("Failed to like:", err);
          // rollback
          setLikedMap((s) => ({ ...s, [p.id]: false }));
          setLikesMap((s) => ({ ...s, [p.id]: Math.max(0, (s[p.id] || 1) - 1) }));
          window.dispatchEvent(new CustomEvent("nearcity-toast", { detail: { message: `Failed to like: ${err?.message || "Unknown error"}`, type: "error" } }));
        }
      }
    });
    setShowConfirmModal(true);
  }

  async function handleRepost(p: Post) {
    if (!isConnected || !accountId) {
      window.dispatchEvent(new CustomEvent("nearcity-toast", { detail: { message: "Please connect your wallet first", type: "error" } }));
      return;
    }

    // Show confirmation modal
    setPendingTransaction({
      action: "repost",
      targetUser: p.accountId,
      displayName: p.author,
      onConfirm: async () => {
        // Optimistic update
        setRepostedMap((s) => ({ ...s, [p.id]: true }));
        setRepostsMap((s) => ({ ...s, [p.id]: (s[p.id] || 0) + 1 }));

        try {
          const walletSetup = await getWalletSelector();
          await repostItem(accountId, { type: "social", path: `${p.accountId}/post/main`, blockHeight: p.blockHeight }, walletSetup, selectedDeposit);
          // refresh repost counts
          const reposts = await getRepostsForItem({ type: "social", path: `${p.accountId}/post/main`, blockHeight: p.blockHeight });
          const count = Array.isArray(reposts) ? reposts.length : 0;
          const repostedByMe = Array.isArray(reposts) ? reposts.some((r: any) => r?.accountId === accountId || (typeof r === "object" && Object.keys(r)[0] === accountId)) : false;
          setRepostsMap((s) => ({ ...s, [p.id]: count }));
          setRepostedMap((s) => ({ ...s, [p.id]: repostedByMe }));
          window.dispatchEvent(new CustomEvent("nearcity-toast", { detail: { message: "Post reposted!", type: "success" } }));
        } catch (err: any) {
          console.error("Failed to repost:", err);
          // rollback
          setRepostedMap((s) => ({ ...s, [p.id]: false }));
          setRepostsMap((s) => ({ ...s, [p.id]: Math.max(0, (s[p.id] || 1) - 1) }));
          window.dispatchEvent(new CustomEvent("nearcity-toast", { detail: { message: `Failed to repost: ${err?.message || "Unknown error"}`, type: "error" } }));
        }
      }
    });
    setShowConfirmModal(true);
  }

  async function handleFollow(authorAccount: string, displayName?: string) {
    if (!isConnected || !accountId) {
      window.dispatchEvent(new CustomEvent("nearcity-toast", { detail: { message: "Please connect your wallet first", type: "error" } }));
      return;
    }

    const isCurrentlyFollowing = followingSet.has(authorAccount);

    // Show confirmation modal
    setPendingTransaction({
      action: isCurrentlyFollowing ? "unfollow" : "follow",
      targetUser: authorAccount,
      displayName: displayName || authorAccount,
      onConfirm: async () => {
        // set pending
        setPendingFollowMap((s) => ({ ...s, [authorAccount]: true }));

        try {
          const { selector } = await getWalletSelector();
          let action = "";
          if (isCurrentlyFollowing) {
            await unfollowAccount(accountId, authorAccount, selector);
            setFollowingSet((s) => {
              const copy = new Set(s);
              copy.delete(authorAccount);
              return copy;
            });
            action = "unfollowed";
          } else {
            await followAccount(accountId, authorAccount, selector);
            setFollowingSet((s) => new Set(s).add(authorAccount));
            action = "followed";
          }

          // show toast with display name if available
          window.dispatchEvent(new CustomEvent("nearcity-toast", { detail: { message: `${displayName || authorAccount} ${action}`, type: "success" } }));
        } catch (err) {
          console.error("Follow/unfollow failed:", err);
          window.dispatchEvent(new CustomEvent("nearcity-toast", { detail: { message: "Failed to update follow", type: "error" } }));
        } finally {
          setPendingFollowMap((s) => {
            const copy = { ...s };
            delete copy[authorAccount];
            return copy;
          });
        }
      }
    });
    setShowConfirmModal(true);
  }

  async function handlePoke(authorAccount: string, displayName?: string) {
    if (!isConnected || !accountId) {
      window.dispatchEvent(new CustomEvent("nearcity-toast", { detail: { message: "Please connect your wallet first", type: "error" } }));
      return;
    }

    // Show confirmation modal
    setPendingTransaction({
      action: "poke",
      targetUser: authorAccount,
      displayName: displayName || authorAccount,
      onConfirm: async () => {
        // Optimistic update
        setPokedByMeMap((s) => ({ ...s, [authorAccount]: true }));
        setPokeMap((s) => ({ ...s, [authorAccount]: (s[authorAccount] || 0) + 1 }));

        try {
          const walletSetup = await getWalletSelector();
          await pokeUser(accountId, authorAccount, walletSetup, selectedDeposit);

          // Refresh poke count
          const pokeCount = await getPokeCount(authorAccount);
          setPokeMap((s) => ({ ...s, [authorAccount]: pokeCount }));

          window.dispatchEvent(new CustomEvent("nearcity-toast", { detail: { message: `Poked ${displayName || authorAccount}!`, type: "success" } }));
        } catch (err: any) {
          console.error("Failed to poke:", err);
          // rollback
          setPokedByMeMap((s) => ({ ...s, [authorAccount]: false }));
          setPokeMap((s) => ({ ...s, [authorAccount]: Math.max(0, (s[authorAccount] || 1) - 1) }));
          window.dispatchEvent(new CustomEvent("nearcity-toast", { detail: { message: `Failed to poke: ${err?.message || "Unknown error"}`, type: "error" } }));
        }
      }
    });
    setShowConfirmModal(true);
  }

  return (
    <div className="min-h-screen py-6 sm:py-8 bg-gradient-to-br from-white via-white to-purple-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">

          {/* Main feed */}
          <main className="flex-1 w-full min-w-0">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button onClick={() => setShowComposer(true)} aria-label="Write a post" className="inline-flex items-center px-3 sm:px-4 py-2 rounded-full bg-gradient-to-r from-teal-400 to-cyan-400 text-white shadow-sm hover:shadow-md transition text-sm sm:text-base">
                  <PencilLine className="w-4 h-4" />
                  <span className="ml-2 text-sm font-medium hidden sm:inline">Write</span>
                </button>
              </div>

              <div className="w-full sm:max-w-2xl">
                <SearchBar placeholder="Ask me anything" centerText="Powered by NEAR AI" />
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 sm:gap-3 mb-6 flex-wrap">
              <button className="flex items-center gap-2 px-3 py-2 rounded-full bg-purple-100 text-purple-700 text-xs sm:text-sm font-medium hover:bg-purple-200 transition whitespace-nowrap">
                <span className="text-lg">✕</span>
                Explore posts
              </button>
              <button className="px-3 py-2 rounded-full border border-gray-200 text-gray-700 text-xs sm:text-sm hover:bg-gray-50 transition whitespace-nowrap">
                Connect
              </button>
              <button className="px-3 py-2 rounded-full border border-gray-200 text-gray-700 text-xs sm:text-sm hover:bg-gray-50 transition whitespace-nowrap">
                Notifications
              </button>
            </div>

            {/* Posts Section */}
            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm mb-6">
              <div className="flex items-center gap-3 p-3 sm:p-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <button className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50">
                    <span className="text-xl">⊟</span>
                  </button>
                  <span className="text-xs sm:text-sm text-gray-700 font-medium">All</span>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <button onClick={() => loadPosts()} className="text-xs sm:text-sm text-gray-600 cursor-pointer px-3 py-1 rounded-full border border-gray-200 hover:bg-gray-50 transition">
                    Refresh
                  </button>
                </div>
              </div>

              <div className="space-y-3 p-3 sm:p-4">
                {isLoading && (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
                    <span className="text-sm sm:text-base text-gray-600 text-center">Loading posts from NEAR Social...</span>
                  </div>
                )}

                {error && (
                  <div className="text-center py-12 text-red-600">
                    <p className="text-sm sm:text-base">{error}</p>
                    <button
                      onClick={() => window.location.reload()}
                      className="mt-4 px-4 py-2 rounded-full bg-teal-600 text-white hover:bg-teal-700 text-sm"
                    >
                      Retry
                    </button>
                  </div>
                )}

                {!isLoading && !error && posts.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <p className="text-sm sm:text-base">No posts found. Be the first to post!</p>
                  </div>
                )}

                {!isLoading && !error && posts.length > 0 && (
                  <>
                    {posts.map((p) => (
                      <article key={p.id} className="rounded-lg p-3 sm:p-4 border border-gray-100 hover:shadow-md transition">
                        <div className="flex items-start gap-3 min-w-0">
                          {/* Avatar */}
                          <img 
                            src={p.avatarUrl} 
                            alt={p.author}
                            className="w-10 sm:w-12 h-10 sm:h-12 rounded-full object-cover flex-shrink-0 cursor-pointer hover:opacity-80 transition"
                            onClick={() => setSelectedProfileAccount(p.accountId)}
                          />
                          
                          {/* Post Content */}
                          <div className="flex-1 min-w-0">
                            {/* Header with author and menu */}
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-1">
                                  <button 
                                    onClick={() => setSelectedProfileAccount(p.accountId)}
                                    className="font-semibold text-gray-900 text-xs sm:text-sm hover:text-teal-600 hover:underline transition truncate"
                                  >
                                    {p.author}
                                  </button>
                                  <span className="text-gray-500 text-xs hidden sm:inline">{p.handle}</span>
                                  <span className="text-gray-400 text-xs hidden sm:inline">•</span>
                                  <span className="text-gray-500 text-xs">{p.time}</span>
                                </div>
                              </div>
                              <button title="More options" className="text-gray-400 hover:text-gray-600 p-1 flex-shrink-0">
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Post text */}
                            <p className="text-gray-800 text-xs sm:text-sm leading-normal break-words">{p.content}</p>

                            {/* Post image if exists */}
                            {p.imageUrl && (
                              <img 
                                src={p.imageUrl}
                                alt="Post attachment"
                                className="mt-3 rounded-lg max-h-96 w-full object-cover"
                              />
                            )}

                            {/* Interaction buttons */}
                            <div className="mt-3 flex items-center justify-start gap-1 sm:gap-3 text-gray-500 flex-wrap">
                              <button
                                title="Comment"
                                onClick={() => {
                                  window.dispatchEvent(new CustomEvent("nearcity-toast", { detail: { message: "Comments coming soon", type: "info" } }));
                                }}
                                className="flex items-center gap-1 text-xs sm:text-sm hover:text-blue-600 hover:bg-blue-50 rounded-full px-2 sm:px-3 py-1 sm:py-2 transition group"
                              >
                                <MessageSquare className="w-4 sm:w-5 h-4 sm:h-5 group-hover:scale-125 transition flex-shrink-0" />
                                <span className="text-xs font-medium hidden sm:inline">{p.replies || 24}</span>
                              </button>
                              
                              <button
                                title="Repost"
                                onClick={() => handleRepost(p)}
                                disabled={!isConnected}
                                className={`flex items-center gap-1 text-xs sm:text-sm rounded-full px-2 sm:px-3 py-1 sm:py-2 transition group disabled:opacity-50 disabled:cursor-not-allowed ${
                                  repostedMap[p.id]
                                    ? 'text-green-600 hover:text-green-700 hover:bg-green-50'
                                    : 'text-gray-500 hover:text-green-600 hover:bg-green-50'
                                }`}
                              >
                                <Repeat className={`w-4 sm:w-5 h-4 sm:h-5 group-hover:scale-125 transition flex-shrink-0 ${repostedMap[p.id] ? 'fill-green-600' : ''}`} />
                                <span className="text-xs font-medium hidden sm:inline">{repostsMap[p.id] ?? 0}</span>
                              </button>
                              
                              <button
                                title="Like"
                                onClick={() => handleLike(p)}
                                disabled={!isConnected}
                                className={`flex items-center gap-1 text-xs sm:text-sm rounded-full px-2 sm:px-3 py-1 sm:py-2 transition group disabled:opacity-50 disabled:cursor-not-allowed ${
                                  likedMap[p.id]
                                    ? 'text-red-600 hover:text-red-700 hover:bg-red-50'
                                    : 'text-gray-500 hover:text-red-600 hover:bg-red-50'
                                }`}
                              >
                                <Heart className={`w-4 sm:w-5 h-4 sm:h-5 group-hover:scale-125 transition flex-shrink-0 ${likedMap[p.id] ? 'fill-red-600' : ''}`} />
                                <span className="text-xs font-medium hidden sm:inline">{likesMap[p.id] ?? 0}</span>
                              </button>

                              <button
                                title="Poke"
                                onClick={() => handlePoke(p.accountId, p.author)}
                                disabled={!isConnected}
                                className={`flex items-center gap-1 text-xs sm:text-sm rounded-full px-2 sm:px-3 py-1 sm:py-2 transition group disabled:opacity-50 disabled:cursor-not-allowed ${
                                  pokedByMeMap[p.accountId]
                                    ? 'text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50'
                                    : 'text-gray-500 hover:text-yellow-600 hover:bg-yellow-50'
                                }`}
                              >
                                <Zap className={`w-4 sm:w-5 h-4 sm:h-5 group-hover:scale-125 transition flex-shrink-0 ${pokedByMeMap[p.accountId] ? 'fill-yellow-600' : ''}`} />
                                <span className="text-xs font-medium hidden sm:inline">{pokeMap[p.accountId] ?? 0}</span>
                              </button>
                              
                              <button
                                title="Share"
                                onClick={() => {
                                  const url = `${window.location.origin}?post=${p.id}`;
                                  navigator.clipboard.writeText(url);
                                  window.dispatchEvent(new CustomEvent("nearcity-toast", { detail: { message: "Link copied!", type: "success" } }));
                                }}
                                className="flex items-center gap-1 text-xs sm:text-sm hover:text-purple-600 hover:bg-purple-50 rounded-full px-2 sm:px-3 py-1 sm:py-2 transition group"
                              >
                                <Share2 className="w-4 sm:w-5 h-4 sm:h-5 group-hover:scale-125 transition flex-shrink-0" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </article>
                    ))}

                    <div className="mt-6 flex justify-center">
                      {nextCursor ? (
                        <div className="flex items-center gap-3">
                          <button disabled={isLoadingMore} onClick={() => loadPosts(20, true, nextCursor)} className="px-4 py-2 rounded-full border text-sm hover:bg-gray-50 disabled:opacity-50">
                            {isLoadingMore ? 'Loading...' : 'Load more'}
                          </button>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400">No more posts</div>
                      )}
                    </div>

                    <div ref={sentinelRef} className="h-2" />
                  </>
                )}
              </div>
            </div>

          {/* Composer Modal */}
          {showComposer && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6">
              <div className="absolute inset-0 bg-black/40 sm:bg-black/40" onClick={() => setShowComposer(false)}></div>
              <div className="relative w-full sm:max-w-2xl bg-white rounded-t-2xl sm:rounded-2xl shadow-xl p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex items-start gap-3 sm:gap-4">
                  <img src={userAvatar} alt="Your avatar" className="w-10 sm:w-12 h-10 sm:h-12 rounded-full object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <button className="px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs sm:text-sm font-medium">Public</button>
                        <div className="text-sm sm:text-base text-black font-medium">What's on your mind?</div>
                      </div>
                      <button onClick={() => setShowComposer(false)} className="text-gray-400 hover:text-gray-600 text-xl flex-shrink-0">✕</button>
                    </div>

                    <textarea value={composerText} onChange={(e) => setComposerText(e.target.value)} placeholder="What's..." className="mt-4 w-full min-h-[100px] sm:min-h-[120px] resize-none rounded border p-3 text-sm sm:text-base text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400" />

                    {composerImageUrl && (
                      <div className="mt-3">
                        <img src={composerImageUrl} alt="preview" className="w-full max-w-xs rounded" />
                        <button onClick={() => { URL.revokeObjectURL(composerImageUrl); setComposerImageUrl(null); setComposerImageFile(null); }} className="text-xs text-red-500 mt-2">Remove image</button>
                      </div>
                    )}

                    {composerAudioUrl && (
                      <div className="mt-3 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <audio controls src={composerAudioUrl} className="w-full sm:max-w-md" />
                        <button onClick={() => { URL.revokeObjectURL(composerAudioUrl); setComposerAudioUrl(null); }} className="text-xs text-red-500 whitespace-nowrap">Remove audio</button>
                      </div>
                    )}

                    <div className="mt-4 border-t border-dashed pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) {
                              if (composerImageUrl) URL.revokeObjectURL(composerImageUrl);
                              const url = URL.createObjectURL(f);
                              setComposerImageFile(f);
                              setComposerImageUrl(url);
                            }
                          }} />
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h4" stroke="#4B5563" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          <span className="text-xs sm:text-sm text-gray-600">Image</span>
                        </label>

                        <div className="flex flex-wrap items-center gap-2">
                          <button onClick={async () => {
                            if (!isRecording) {
                              if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                                window.dispatchEvent(new CustomEvent('nearcity-toast', { detail: { message: 'Recording not supported', type: 'error' } }));
                                return;
                              }
                              const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                              const mr = new MediaRecorder(stream);
                              mediaRecorderRef.current = mr;
                              chunksRef.current = [];
                              mr.ondataavailable = (ev) => { chunksRef.current.push(ev.data); };
                              mr.onstop = () => {
                                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                                const url = URL.createObjectURL(blob);
                                setComposerAudioUrl(url);
                              };
                              mr.start();
                              setIsRecording(true);
                            } else {
                              mediaRecorderRef.current?.stop();
                              setIsRecording(false);
                            }
                          }} className="px-3 py-1 rounded-full border text-xs sm:text-sm">{isRecording ? 'Stop' : 'Record'}</button>
                          <input aria-label="Upload voice note" title="Upload voice note" type="file" accept="audio/*" className="hidden" onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) {
                              if (composerAudioUrl) URL.revokeObjectURL(composerAudioUrl);
                              const url = URL.createObjectURL(f);
                              setComposerAudioUrl(url);
                            }
                          }} />
                        </div>
                      </div>

                      <button
                        aria-label="Post"
                        title="Post"
                        disabled={!isConnected || isPosting || !composerText.trim()}
                        onClick={async () => {
                          if (!isConnected || !accountId) {
                            window.dispatchEvent(
                              new CustomEvent("nearcity-toast", {
                                detail: { message: "Please connect your wallet first", type: "error" },
                              })
                            );
                            return;
                          }

                          setIsPosting(true);
                          try {
                            const { selector } = await getWalletSelector();
                            await postToNearSocial(accountId!, composerText, composerImageUrl || undefined, selector);
                            setIsLoading(true);
                            const res = await fetchNearSocialPosts(20);
                            const nearPosts = res.posts;
                            const uniqueAccountIds = [...new Set(nearPosts.map((p) => p.accountId))];
                            const profilePromises = uniqueAccountIds.map((id) => fetchUserProfile(id));
                            const profiles = await Promise.all(profilePromises);
                            const profileMap = new Map(uniqueAccountIds.map((id, index) => [id, profiles[index]]));

                            const transformedPosts: Post[] = await Promise.all(
                              nearPosts.map(async (nearPost) => {
                                const profile = profileMap.get(nearPost.accountId);
                                const avatarUrl = getProfileImageUrl(profile ?? null, nearPost.accountId);
                                let content = "";
                                let imageUrl: string | undefined;
                                if (typeof nearPost.value.main === "string") {
                                  try {
                                    const parsed = JSON.parse(nearPost.value.main);
                                    if (parsed.type === "md" && parsed.text) content = parsed.text;
                                    else if (typeof parsed === "string") content = parsed;
                                    if (parsed.image?.url) imageUrl = parsed.image.url;
                                  } catch {
                                    content = nearPost.value.main;
                                  }
                                } else if (nearPost.value.content?.text) {
                                  content = nearPost.value.content.text;
                                  imageUrl = nearPost.value.content.image;
                                }

                                return {
                                  id: `${nearPost.accountId}-${nearPost.blockHeight}`,
                                  blockHeight: nearPost.blockHeight,
                                  author: profile?.name || nearPost.accountId.split(".")[0] || "Unknown",
                                  handle: `@${nearPost.accountId}`,
                                  time: formatRelativeTime(nearPost.value.timestamp),
                                  content,
                                  likes: 0,
                                  replies: 0,
                                  reposts: 0,
                                  imageUrl,
                                  avatarUrl,
                                  accountId: nearPost.accountId,
                                  profile,
                                };
                              })
                            );

                            setPosts(transformedPosts);
                            window.dispatchEvent(
                              new CustomEvent("nearcity-toast", {
                                detail: { message: "Post published!", type: "success" },
                              })
                            );

                            setComposerText("");
                            if (composerImageUrl) {
                              URL.revokeObjectURL(composerImageUrl);
                              setComposerImageUrl(null);
                              setComposerImageFile(null);
                            }
                            if (composerAudioUrl) {
                              URL.revokeObjectURL(composerAudioUrl);
                              setComposerAudioUrl(null);
                            }
                            setShowComposer(false);
                          } catch (error: any) {
                            console.error("Error posting:", error);
                            const errorMessage = error?.message || error?.toString?.() || "Failed to post. Please try again.";
                            window.dispatchEvent(
                              new CustomEvent("nearcity-toast", {
                                detail: { message: `Error: ${errorMessage}`, type: "error" },
                              })
                            );
                          } finally {
                            setIsPosting(false);
                            setIsLoading(false);
                          }
                        }}
                        className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-r from-teal-400 to-cyan-400 text-white shadow disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                      >
                        {isPosting ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path d="M22 2L11 13" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M22 2l-7 20 3-7 7-13z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Right column */}
        <aside className="w-80 hidden lg:block space-y-6">
            {/* Today's News */}
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
              <div className="text-xs text-gray-500 font-medium mb-3">Today's News</div>
              <div className="rounded-lg border border-gray-200 p-3 hover:shadow-sm transition cursor-pointer">
                <div className="font-semibold text-gray-900 text-sm">Crypto the backbone, waiting for the major breakouts</div>
                <div className="text-xs text-gray-500 mt-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                  4 hours ago • Trending • 7,239 posts
                </div>
              </div>
            </div>

            {/* Trending */}
            <div className="bg-gradient-to-br from-purple-700 to-purple-900 rounded-lg p-5 text-white shadow-md">
              <div className="text-xs uppercase font-semibold opacity-80 tracking-wider">Trending</div>
              <div className="mt-4 font-bold text-lg leading-tight">Crypto the backbone, waiting for the major breakouts</div>
              <div className="text-xs opacity-80 mt-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-300"></span>
                4 hours ago • 7,239 posts
              </div>
            </div>

            {/* Who to follow */}
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
              <div className="text-sm text-gray-900 font-semibold mb-4">Who to follow</div>
              <div className="space-y-4">
                {suggested.length === 0 ? (
                  <div className="text-xs text-gray-400">No suggestions yet</div>
                ) : (
                  suggested.map((sug) => (
                    <div key={sug.accountId} className="flex items-center justify-between">
                      <button 
                        onClick={() => setSelectedProfileAccount(sug.accountId)}
                        className="flex items-center gap-3 flex-1 hover:opacity-80 transition"
                      >
                        <img src={sug.avatarUrl} alt={sug.author} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900 text-sm hover:text-teal-600">{sug.author}</div>
                          <div className="text-xs text-gray-500">@{sug.accountId}</div>
                        </div>
                      </button>
                      <button
                        disabled={!isConnected || !!pendingFollowMap[sug.accountId]}
                        onClick={() => handleFollow(sug.accountId, sug.author)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition whitespace-nowrap ${
                          followingSet.has(sug.accountId) 
                            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' 
                            : 'bg-teal-500 text-white hover:bg-teal-600'
                        }`}
                      >
                        {!!pendingFollowMap[sug.accountId] ? '...' : (followingSet.has(sug.accountId) ? 'Following' : 'Follow')}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>
        </div>

        {/* User Profile Modal */}
        {selectedProfileAccount && (
          <UserProfile
            accountId={selectedProfileAccount}
            onClose={() => setSelectedProfileAccount(null)}
          />
        )}

        {/* Transaction Confirmation Modal */}
        {showConfirmModal && pendingTransaction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-black opacity-50" onClick={() => !isConfirming && setShowConfirmModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-teal-500 to-cyan-500 px-8 py-6">
              <h2 className="text-2xl font-bold text-white capitalize">
                {pendingTransaction.action}
              </h2>
              <p className="text-teal-100 text-sm mt-1">Blockchain Transaction</p>
            </div>

            {/* Content */}
            <div className="p-8">
              {/* Transaction Details */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="space-y-3">
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</div>
                    <div className="text-lg font-bold text-gray-900 capitalize mt-1">{pendingTransaction.action}</div>
                  </div>
                  
                  <div className="pt-3 border-t border-gray-200">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Target</div>
                    <div className="text-lg font-bold text-teal-600 mt-1">{pendingTransaction.displayName}</div>
                    <div className="text-sm text-gray-500">@{pendingTransaction.targetUser}</div>
                  </div>
                </div>
              </div>

              {/* Deposit Options */}
              <div className="mb-6">
                <label className="text-sm font-semibold text-gray-700 block mb-3">
                  Deposit Amount (Optional)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {["0", "0.05", "0.2", "1"].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setSelectedDeposit(amount)}
                      className={`py-2 px-3 rounded-lg font-medium text-sm transition ${
                        selectedDeposit === amount
                          ? "bg-teal-500 text-white shadow-md"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {amount} Ⓝ
                    </button>
                  ))}
                </div>
              </div>

              {/* Gas & Fees Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
                <div className="flex gap-2">
                  <span className="text-lg">⛓️</span>
                  <div>
                    <p className="text-sm font-semibold text-blue-900">Blockchain Transaction</p>
                    <p className="text-xs text-blue-800 mt-1">
                      Gas: ~100 TGas | Deposit: {selectedDeposit} Ⓝ
                    </p>
                  </div>
                </div>
              </div>

              {/* Transaction Data Preview */}
              <div className="bg-gray-900 rounded-lg p-3 mb-6 max-h-32 overflow-y-auto">
                <div className="text-xs text-gray-400 mb-2">Transaction Data</div>
                <div className="font-mono text-xs text-green-400 whitespace-pre-wrap break-words">
{`{
  "action": "${pendingTransaction.action}",
  "target": "${pendingTransaction.targetUser}",
  "deposit": "${selectedDeposit}",
  "gas": "100000000000000"
}`}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowConfirmModal(false);
                    setSelectedDeposit("0");
                  }}
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
                      setSelectedDeposit("0");
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
        </div>
        )}
      </div>
    </div>
  );
}
