"use client";

import { useEffect, useState } from "react";
import { Heart, MessageSquare, Repeat, Share, Users, Link as LinkIcon, Loader2 } from "lucide-react";
import {
  fetchUserProfile,
  getProfileImageUrl,
  getUserPosts,
  getUserSocialStats,
  formatRelativeTime,
  likeItem,
  followAccount,
  unfollowAccount,
  getLikesForItem,
  getFollowing,
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
  const [followLoading, setFollowLoading] = useState(false);
  const [likesMap, setLikesMap] = useState<Record<string, number>>({});
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});

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

        // Check if current user is following this account
        if (isConnected && currentAccountId && currentAccountId !== accountId) {
          const following = await getFollowing(currentAccountId);
          setIsFollowing(following.includes(accountId));
        }

        // Load likes for posts
        const likesPromises = postsData.map((p) =>
          getLikesForItem({
            type: "post",
            path: `${p.accountId}/post/${p.value.path.split("/").pop()}`,
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

    setFollowLoading(true);
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
    } finally {
      setFollowLoading(false);
    }
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

    setLikedMap((s) => ({ ...s, [postId]: true }));
    setLikesMap((s) => ({ ...s, [postId]: (s[postId] || 0) + 1 }));

    try {
      const { selector } = await getWalletSelector();
      const postPath = postId.includes("/post/") ? postId : `${accountId}/post/main`;
      
      await likeItem(
        currentAccountId,
        {
          type: "post",
          path: postPath,
          blockHeight: 0,
        },
        selector
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
                <button
                  onClick={handleFollow}
                  disabled={followLoading}
                  className={`mt-16 px-6 py-2 rounded-full font-semibold transition ${
                    isFollowing
                      ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      : "bg-gradient-to-r from-teal-400 to-cyan-400 text-white hover:shadow-lg"
                  } ${followLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {followLoading ? "..." : isFollowing ? "Following" : "Follow"}
                </button>
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
            <div className="grid grid-cols-3 gap-4 border-t border-gray-100 pt-4">
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
    </div>
  );
}
