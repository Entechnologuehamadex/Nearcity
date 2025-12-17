"use client";

import SearchBar from "./components/SearchBar";
import { MoreVertical, Heart, Share2, Bell, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";

export default function Social() {
  const [posts, setPosts] = useState(() =>
    Array.from({ length: 6 }).map((_, i) => ({
      id: i + 1,
      author: "Hamadex Entechnologue",
      handle: "@entechnologue.near",
      time: "4hrs ago",
      content:
        "Consumer crypto focuses on making blockchain technology accessible to everyday users, not just tech experts. This means simplifying how people interact with crypto, like buying digital items or sending payments.",
      likes: Math.floor(Math.random() * 100),
      replies: Math.floor(Math.random() * 50),
      reposts: Math.floor(Math.random() * 20),
      imageUrl: undefined,
      audioUrl: undefined,
      avatarUrl: `https://i.pravatar.cc/150?img=${(i % 70) + 1}`,
    }))
  );

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
  const [userAvatar] = useState<string>(`https://i.pravatar.cc/150?u=you`);

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
                {posts.map((p) => (
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
                ))}
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
                        <button aria-label="Post" title="Post" onClick={() => {
                          // submit
                          const id = Date.now();
                          const newPost = {
                            id,
                            author: 'You',
                            handle: '@you.near',
                            time: 'Just now',
                            content: composerText,
                            likes: 0,
                            replies: 0,
                            reposts: 0,
                            imageUrl: composerImageUrl ?? undefined,
                            audioUrl: composerAudioUrl ?? undefined,                            avatarUrl: userAvatar,                          } as any;
                          setPosts((s) => [newPost, ...s]);
                          // reset
                          setComposerText('');
                          if (composerImageUrl) { URL.revokeObjectURL(composerImageUrl); setComposerImageUrl(null); setComposerImageFile(null); }
                          if (composerAudioUrl) { URL.revokeObjectURL(composerAudioUrl); setComposerAudioUrl(null); }
                          setShowComposer(false);
                        }} className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-teal-400 to-cyan-400 text-white shadow">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M22 2l-7 20 3-7 7-13z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
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
