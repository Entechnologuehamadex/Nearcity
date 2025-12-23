"use client";

import SearchBar from "./components/SearchBar";
import { MoreVertical, Heart, Share2, Bell, ChevronDown, Loader2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import {
  fetchNearSocialPosts,
  fetchUserProfile,
  formatRelativeTime,
  getProfileImageUrl,
  postToNearSocial,
} from "./lib/near-social";
import { useWallet } from "./context/WalletContext";
import { getWalletSelector } from "./lib/near-wallet";
import type { NearSocialPost, NearSocialProfile } from "./lib/near-social";

interface Post {
  id: string;
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

  // User avatar (rounded)
  const [userAvatar, setUserAvatar] = useState<string>(`https://i.pravatar.cc/150?u=you`);

  // Fetch posts from NEAR Social
  useEffect(() => {
    async function loadPosts() {
      setIsLoading(true);
      setError(null);
      try {
        const nearPosts = await fetchNearSocialPosts(20);
        
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
            const avatarUrl = getProfileImageUrl(profile, nearPost.accountId);
            
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

        setPosts(transformedPosts);
      } catch (err) {
        console.error("Error loading posts:", err);
        setError("Failed to load posts. Please try again later.");
        // Fallback to empty array or show error message
      } finally {
        setIsLoading(false);
      }
    }

    loadPosts();
  }, []);

  // Fetch user profile when connected
  useEffect(() => {
    async function loadUserProfile() {
      if (isConnected && accountId) {
        const profile = await fetchUserProfile(accountId);
        if (profile) {
          const avatarUrl = getProfileImageUrl(profile, accountId);
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

  return (
    <div className="min-h-screen py-8 bg-gradient-to-br from-white via-white to-purple-50">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex gap-8">

          {/* Main feed */}
          <main className="flex-1">
            <div className="flex items-center justify-between mb-6 gap-4">
              <div className="flex items-center gap-4">
                <button onClick={() => setShowComposer(true)} className="px-3 py-2 rounded-full bg-green-50 text-teal-600 text-sm font-medium">Write a post</button>
                <div className="w-full max-w-2xl">
                  <SearchBar placeholder="Ask me anything" centerText="Powered by NEAR AI" />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button className="px-3 py-2 rounded-full border text-sm">Connect with others</button>
                <button className="px-3 py-2 rounded-full border text-sm">Notifications</button>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-sm font-medium">Social posts</span>

                <div className="relative" ref={overviewRef}>
                  <button onClick={() => setShowOverview((v) => !v)} aria-haspopup="listbox" aria-controls="overview-dropdown" className="text-sm px-3 py-1 rounded border flex items-center gap-2">
                    {selectedCategory} <ChevronDown className="h-4 w-4" />
                  </button>

                  {showOverview && (
                    <div id="overview-dropdown" className="absolute left-0 mt-2 w-56 bg-white border rounded-lg shadow-lg z-50 p-3">
                      <ul className="space-y-2 text-sm text-gray-700">
                        <li className="flex items-center justify-between"><button onClick={() => { setSelectedCategory('All'); setShowOverview(false); }} className={`w-full text-left px-2 py-1 rounded hover:bg-gray-50 ${selectedCategory === 'All' ? 'font-semibold text-teal-600' : ''}`}>All</button></li>
                        <li className="flex items-center justify-between"><button onClick={() => { setSelectedCategory('DeFi'); setShowOverview(false); }} className={`w-full text-left px-2 py-1 rounded hover:bg-gray-50 ${selectedCategory === 'DeFi' ? 'font-semibold text-teal-600' : ''}`}>DeFi</button></li>
                        <li className="flex items-center justify-between"><button onClick={() => { setSelectedCategory('Entertainment'); setShowOverview(false); }} className={`w-full text-left px-2 py-1 rounded hover:bg-gray-50 ${selectedCategory === 'Entertainment' ? 'font-semibold text-teal-600' : ''}`}>Entertainment</button></li>
                        <li className="flex items-center justify-between"><button onClick={() => { setSelectedCategory('Games'); setShowOverview(false); }} className={`w-full text-left px-2 py-1 rounded hover:bg-gray-50 ${selectedCategory === 'Games' ? 'font-semibold text-teal-600' : ''}`}>Games</button></li>
                        <li className="flex items-center justify-between"><button onClick={() => { setSelectedCategory('Tools & Infra'); setShowOverview(false); }} className={`w-full text-left px-2 py-1 rounded hover:bg-gray-50 ${selectedCategory === 'Tools & Infra' ? 'font-semibold text-teal-600' : ''}`}>Tools &amp; Infra</button></li>
                      </ul>
                    </div>
                  )}
                </div>

                <button onClick={() => setShowOverview((v) => !v)} className="text-xs px-2 py-1 rounded bg-purple-50 text-purple-700">{selectedCategory === 'All' ? 'Filter' : selectedCategory}</button>
              </div>

              <div className="space-y-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
                    <span className="ml-3 text-gray-600">Loading posts from NEAR Social...</span>
                  </div>
                ) : error ? (
                  <div className="text-center py-12 text-red-600">
                    <p>{error}</p>
                    <button
                      onClick={() => window.location.reload()}
                      className="mt-4 px-4 py-2 rounded-full bg-teal-600 text-white hover:bg-teal-700"
                    >
                      Retry
                    </button>
                  </div>
                ) : posts.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p>No posts found. Be the first to post!</p>
                  </div>
                ) : (
                  posts.map((p) => (
                  <article key={p.id} className="border rounded-lg p-4">
                    <div className="flex items-start gap-4">
                      <img src={p.avatarUrl} alt={`${p.author} avatar`} className="w-12 h-12 rounded-full object-cover" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold">{p.author}</div>
                            <div className="text-xs text-gray-400">{p.handle} • {p.time}</div>
                          </div>
                          <button title="More" aria-label="More" className="p-2 text-gray-500 hover:bg-gray-100 rounded-full"><MoreVertical className="h-4 w-4" /></button>
                        </div>

                        <p className="mt-3 text-sm text-gray-700">{p.content}</p>

                        {p.imageUrl && (
                          <div className="mt-3">
                            <img src={p.imageUrl} alt="attached" className="w-full rounded-lg" />
                          </div>
                        )}

                        {p.audioUrl && (
                          <div className="mt-3">
                            <audio controls src={p.audioUrl} className="w-full" />
                          </div>
                        )}

                        <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
                          <button title="Like" aria-label="Like" className="flex items-center gap-2 hover:text-red-500"><Heart className="h-4 w-4" /> {p.likes}</button>
                          <button title="Share" aria-label="Share" className="flex items-center gap-2"><Share2 className="h-4 w-4" /> {p.reposts}</button>
                          <button className="flex items-center gap-2">↩ {p.replies}</button>
                        </div>
                      </div>
                    </div>
                  </article>
                  ))
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
                        <button className="px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-sm">Public</button>
                        <div className="text-gray-500">What's...</div>
                      </div>
                      <button onClick={() => setShowComposer(false)} className="text-gray-400">✕</button>
                    </div>

                    <textarea value={composerText} onChange={(e) => setComposerText(e.target.value)} placeholder="What's..." className="mt-4 w-full min-h-[120px] resize-none rounded border p-3" />

                    {composerImageUrl && (
                      <div className="mt-3">
                        <img src={composerImageUrl} alt="preview" className="w-64 rounded" />
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
                              
                              // For now, we'll just add to local state
                              // In production, you'd call postToNearSocial here
                              // await postToNearSocial(accountId, composerText, composerImageUrl || undefined, selector);
                              
                              const newPost: Post = {
                                id: `${accountId}-${Date.now()}`,
                                author: accountId.split(".")[0] || "You",
                                handle: `@${accountId}`,
                                time: "Just now",
                                content: composerText,
                                likes: 0,
                                replies: 0,
                                reposts: 0,
                                imageUrl: composerImageUrl || undefined,
                                avatarUrl: userAvatar,
                                accountId,
                              };
                              
                              setPosts((s) => [newPost, ...s]);
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
                            } catch (error) {
                              console.error("Error posting:", error);
                              window.dispatchEvent(
                                new CustomEvent("nearcity-toast", {
                                  detail: { message: "Failed to post. Please try again.", type: "error" },
                                })
                              );
                            } finally {
                              setIsPosting(false);
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
          <aside className="w-80 hidden lg:block">
            <div className="space-y-6">
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="text-sm text-gray-500">Today's News</div>
                <div className="mt-3">
                  <div className="rounded-lg overflow-hidden bg-white border p-4">
                    <div className="font-semibold text-gray-900">Crypto the backbone, waiting for the major breakouts</div>
                    <div className="text-xs text-gray-400 mt-2">4 hours ago • Trending • 7,239 posts</div>
                  </div>
                </div>
              </div>

              <div className="bg-purple-800 rounded-xl p-4 text-white">
                <div className="text-sm uppercase opacity-80">Trending</div>
                <div className="mt-3 font-semibold text-lg">Crypto the backbone, waiting for the major breakouts</div>
                <div className="text-xs opacity-80 mt-2">4 hours ago • 7,239 posts</div>
              </div>

              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="text-sm text-gray-900 font-medium">Who to follow</div>
                <div className="mt-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200" />
                      <div>
                        <div className="font-medium">Hamadex Entechnologue</div>
                        <div className="text-xs text-gray-400">@entechnologue.near</div>
                      </div>
                    </div>
                    <button className="px-3 py-1 rounded-full bg-teal-50 text-teal-600 text-sm">Follow</button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200" />
                      <div>
                        <div className="font-medium">Hamadex Entechnologue</div>
                        <div className="text-xs text-gray-400">@entechnologue.near</div>
                      </div>
                    </div>
                    <button className="px-3 py-1 rounded-full bg-teal-50 text-teal-600 text-sm">Follow</button>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
