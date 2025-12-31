"use client";

import SearchBar from "./components/SearchBar";
import { MoreVertical, Heart, Share2, Bell, ChevronDown, Loader2, MessageSquare, Repeat, PencilLine } from "lucide-react";
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
  const [suggested, setSuggested] = useState<Post[]>([]);

  // User avatar (rounded)
  const [userAvatar, setUserAvatar] = useState<string>(`https://i.pravatar.cc/150?u=you`);
  const [userProfile, setUserProfile] = useState<NearSocialProfile | null>(null);

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

    // Optimistic update
    setLikedMap((s) => ({ ...s, [p.id]: true }));
    setLikesMap((s) => ({ ...s, [p.id]: (s[p.id] || 0) + 1 }));

    try {
      const { selector } = await getWalletSelector();
      await likeItem(accountId, { type: "social", path: `${p.accountId}/post/main`, blockHeight: p.blockHeight }, selector);
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

  async function handleRepost(p: Post) {
    if (!isConnected || !accountId) {
      window.dispatchEvent(new CustomEvent("nearcity-toast", { detail: { message: "Please connect your wallet first", type: "error" } }));
      return;
    }

    // Optimistic update
    setRepostedMap((s) => ({ ...s, [p.id]: true }));
    setRepostsMap((s) => ({ ...s, [p.id]: (s[p.id] || 0) + 1 }));

    try {
      const { selector } = await getWalletSelector();
      await repostItem(accountId, { type: "social", path: `${p.accountId}/post/main`, blockHeight: p.blockHeight }, selector);
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

  async function handleFollow(authorAccount: string, displayName?: string) {
    if (!isConnected || !accountId) {
      window.dispatchEvent(new CustomEvent("nearcity-toast", { detail: { message: "Please connect your wallet first", type: "error" } }));
      return;
    }

    // set pending
    setPendingFollowMap((s) => ({ ...s, [authorAccount]: true }));

    try {
      const { selector } = await getWalletSelector();
      let action = "";
      if (followingSet.has(authorAccount)) {
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

  return (
    <div className="min-h-screen py-8 bg-gradient-to-br from-white via-white to-purple-50">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col md:flex-row gap-8">

          {/* Main feed */}
          <main className="flex-1">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
              <div className="flex items-center gap-3 w-full md:w-auto">
                <button onClick={() => setShowComposer(true)} aria-label="Write a post" className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-teal-400 to-cyan-400 text-white shadow-sm hover:shadow-md transition">
                  <PencilLine className="w-4 h-4" />
                  <span className="ml-2 text-sm font-medium hidden sm:inline">Write a post</span>
                </button>
              </div>

              <div className="w-full max-w-2xl">
                <SearchBar placeholder="Ask me anything" centerText="Powered by NEAR AI" />
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-3 mb-6 flex-wrap">
              <button className="flex items-center gap-2 px-3 py-2 rounded-full bg-purple-100 text-purple-700 text-sm font-medium hover:bg-purple-200 transition">
                <span className="text-lg">✕</span>
                Explore posts
              </button>
              <button className="px-3 py-2 rounded-full border border-gray-200 text-gray-700 text-sm hover:bg-gray-50 transition">
                Connect with others
              </button>
              <button className="px-3 py-2 rounded-full border border-gray-200 text-gray-700 text-sm hover:bg-gray-50 transition">
                Notifications
              </button>
            </div>

            {/* Posts Section */}
            <div className="bg-white rounded-xl shadow-sm mb-6">
              <div className="flex items-center gap-3 p-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <button className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50">
                    <span className="text-xl">⊟</span>
                  </button>
                  <span className="text-sm text-gray-700 font-medium">All</span>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <button onClick={() => loadPosts()} className="text-sm text-gray-600 cursor-pointer px-3 py-1 rounded-full border border-gray-200 hover:bg-gray-50 transition">
                    Refresh
                  </button>
                </div>
              </div>

              <div className="space-y-3 p-4">
                {isLoading && (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
                    <span className="ml-3 text-gray-600">Loading posts from NEAR Social...</span>
                  </div>
                )}

                {error && (
                  <div className="text-center py-12 text-red-600">
                    <p>{error}</p>
                    <button
                      onClick={() => window.location.reload()}
                      className="mt-4 px-4 py-2 rounded-full bg-teal-600 text-white hover:bg-teal-700"
                    >
                      Retry
                    </button>
                  </div>
                )}

                {!isLoading && !error && posts.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <p>No posts found. Be the first to post!</p>
                  </div>
                )}

                {!isLoading && !error && posts.length > 0 && (
                  <>
                    {posts.map((p) => (
                      <article key={p.id} className="rounded-lg p-4 border border-gray-100 hover:shadow-md transition">
                        <div className="flex items-start gap-3">
                          {/* Avatar */}
                          <img 
                            src={p.avatarUrl} 
                            alt={p.author}
                            className="w-12 h-12 rounded-full object-cover flex-shrink-0 cursor-pointer hover:opacity-80 transition"
                            onClick={() => setSelectedProfileAccount(p.accountId)}
                          />
                          
                          {/* Post Content */}
                          <div className="flex-1 min-w-0">
                            {/* Header with author and menu */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-1">
                                  <button 
                                    onClick={() => setSelectedProfileAccount(p.accountId)}
                                    className="font-semibold text-gray-900 text-sm hover:text-teal-600 hover:underline transition"
                                  >
                                    {p.author}
                                  </button>
                                  <span className="text-gray-500 text-sm">{p.handle}</span>
                                  <span className="text-gray-400 text-sm">•</span>
                                  <span className="text-gray-500 text-sm">{p.time}</span>
                                </div>
                              </div>
                              <button title="More options" className="text-gray-400 hover:text-gray-600 p-1">
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Post text */}
                            <p className="mt-2 text-gray-800 text-sm leading-normal break-words">{p.content}</p>

                            {/* Post image if exists */}
                            {p.imageUrl && (
                              <img 
                                src={p.imageUrl}
                                alt="Post attachment"
                                className="mt-3 rounded-lg max-h-96 w-full object-cover"
                              />
                            )}

                            {/* Interaction buttons */}
                            <div className="mt-4 flex items-center justify-start gap-4 text-gray-500">
                              <button
                                title="Comment"
                                onClick={() => {
                                  window.dispatchEvent(new CustomEvent("nearcity-toast", { detail: { message: "Comments coming soon", type: "info" } }));
                                }}
                                className="flex items-center gap-2 text-sm hover:text-blue-600 hover:bg-blue-50 rounded-full px-3 py-2 transition group"
                              >
                                <MessageSquare className="w-5 h-5 group-hover:scale-125 transition" />
                                <span className="text-xs font-medium">{p.replies || 24}</span>
                              </button>
                              
                              <button
                                title="Repost"
                                onClick={() => handleRepost(p)}
                                disabled={!isConnected}
                                className={`flex items-center gap-2 text-sm rounded-full px-3 py-2 transition group disabled:opacity-50 disabled:cursor-not-allowed ${
                                  repostedMap[p.id]
                                    ? 'text-green-600 hover:text-green-700 hover:bg-green-50'
                                    : 'text-gray-500 hover:text-green-600 hover:bg-green-50'
                                }`}
                              >
                                <Repeat className={`w-5 h-5 group-hover:scale-125 transition ${repostedMap[p.id] ? 'fill-green-600' : ''}`} />
                                <span className="text-xs font-medium">{repostsMap[p.id] ?? 0}</span>
                              </button>
                              
                              <button
                                title="Like"
                                onClick={() => handleLike(p)}
                                disabled={!isConnected}
                                className={`flex items-center gap-2 text-sm rounded-full px-3 py-2 transition group disabled:opacity-50 disabled:cursor-not-allowed ${
                                  likedMap[p.id]
                                    ? 'text-red-600 hover:text-red-700 hover:bg-red-50'
                                    : 'text-gray-500 hover:text-red-600 hover:bg-red-50'
                                }`}
                              >
                                <Heart className={`w-5 h-5 group-hover:scale-125 transition ${likedMap[p.id] ? 'fill-red-600' : ''}`} />
                                <span className="text-xs font-medium">{likesMap[p.id] ?? 0}</span>
                              </button>
                              
                              <button
                                title="Share"
                                onClick={() => {
                                  const url = `${window.location.origin}?post=${p.id}`;
                                  navigator.clipboard.writeText(url);
                                  window.dispatchEvent(new CustomEvent("nearcity-toast", { detail: { message: "Link copied!", type: "success" } }));
                                }}
                                className="flex items-center gap-2 text-sm hover:text-purple-600 hover:bg-purple-50 rounded-full px-3 py-2 transition group"
                              >
                                <Share2 className="w-5 h-5 group-hover:scale-125 transition" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </article>
                    ))}

                    <div className="mt-6 flex justify-center">
                      {nextCursor ? (
                        <div className="flex items-center gap-3">
                          <button disabled={isLoadingMore} onClick={() => loadPosts(20, true, nextCursor)} className="px-4 py-2 rounded-full border text-sm">
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
          </main>

          {/* Composer Modal */}
          {showComposer && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
              <div className="absolute inset-0 bg-black opacity-40" onClick={() => setShowComposer(false)} />
              <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl p-6">
                <div className="flex items-start gap-4">
                  <img src={userAvatar} alt="Your avatar" className="w-12 h-12 rounded-full object-cover" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button className="px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-sm font-medium">Public</button>
                        <div className="text-black font-medium">What's on your mind?</div>
                      </div>
                      <button onClick={() => setShowComposer(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                    </div>

                    <textarea value={composerText} onChange={(e) => setComposerText(e.target.value)} placeholder="What's..." className="mt-4 w-full min-h-[120px] resize-none rounded border p-3 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400" />

                    {composerImageUrl && (
                      <div className="mt-3">
                        <img src={composerImageUrl} alt="preview" className="w-full max-w-xs sm:max-w-md rounded" />
                        <div>
                          <button onClick={() => { URL.revokeObjectURL(composerImageUrl); setComposerImageUrl(null); setComposerImageFile(null); }} className="text-xs text-red-500 mt-2">Remove image</button>
                        </div>
                      </div>
                    )}

                    {composerAudioUrl && (
                      <div className="mt-3 flex items-center gap-3">
                        <audio controls src={composerAudioUrl} />
                        <button onClick={() => { URL.revokeObjectURL(composerAudioUrl); setComposerAudioUrl(null); }} className="text-xs text-red-500">Remove audio</button>
                      </div>
                    )}

                    <div className="mt-4 border-t border-dashed pt-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
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
                          <span className="text-sm text-gray-600">Image</span>
                        </label>

                        <div className="flex items-center gap-2">
                          <button onClick={async () => {
                            if (!isRecording) {
                              // start
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
                              // stop
                              mediaRecorderRef.current?.stop();
                              setIsRecording(false);
                            }
                          }} className="px-3 py-1 rounded-full border text-sm">{isRecording ? 'Stop' : 'Record (voice)'}</button>
                          <input aria-label="Upload voice note" title="Upload voice note" type="file" accept="audio/*" onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) {
                              if (composerAudioUrl) URL.revokeObjectURL(composerAudioUrl);
                              const url = URL.createObjectURL(f);
                              setComposerAudioUrl(url);
                            }
                          }} />
                        </div>
                      </div>

                      <div>
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

                              // Publish the post using the NEAR Social helper
                              await postToNearSocial(accountId!, composerText, composerImageUrl || undefined, selector);

                              // Refresh posts after publishing
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

                              // Reset form
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
                          className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-teal-400 to-cyan-400 text-white shadow disabled:opacity-50 disabled:cursor-not-allowed"
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
            </div>
          )}

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
      </div>

      {/* User Profile Modal */}
      {selectedProfileAccount && (
        <UserProfile
          accountId={selectedProfileAccount}
          onClose={() => setSelectedProfileAccount(null)}
        />
      )}
    </div>
  );
}
