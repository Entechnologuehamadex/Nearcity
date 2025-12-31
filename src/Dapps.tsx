"use client";

import SearchBar from "./components/SearchBar";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Dapps() {
  // const router = useRouter();
  // const [dapps] = useState(() => [
  //   { id: 1, name: "Hot Protocol", tagline: "Create your HOT wallet and start earning $HOT", tags: ["Infrastructure", "Wallet"], badge: "NEW" },
  //   { id: 2, name: "Public AI", tagline: "Every human contributes data to train AI", tags: ["Infrastructure", "AI"], badge: null },
  //   { id: 3, name: "NEAR Intents", tagline: "A single way to move users, agents and services", tags: ["Infrastructure", "DEX"], badge: "NEW" },
  // ]);

  // const trending = [
  //   { id: 1, name: "Nostra", desc: "BNB Smart chain", pct: "2600.32%", users: "31.3k" },
  //   { id: 2, name: "Nebula", desc: "Solana", pct: "1200.12%", users: "22.1k" },
  //   { id: 3, name: "Orion", desc: "Ethereum", pct: "800.45%", users: "18.5k" },
  // ];

  return (
    <div className="min-h-screen">
      <div className="">
        <div className="">
          <div>
            {/* <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900">Your Web3 Journey starts here</h1> */}
            <p className="text-gray-600 text-8xl text-center mt-10">COMING SOON !!!</p>
          </div>
          {/* <div className="flex items-center gap-4">
            <button className="hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-50 text-purple-700 border border-purple-100">
              + Add dApp
            </button>
          </div> */}
        </div>

        {/* <SearchBar placeholder="Ask me anything" centerText="Powered by NEAR AI" /> */}

        {/* Featured dApps */}
        {/* <section className="mt-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Featured dApps</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {dapps.map((app) => (
              <div key={app.id} role="button" tabIndex={0} onClick={() => window.dispatchEvent(new CustomEvent('nearcity-toast', { detail: { message: 'Coming soon', type: 'info' } }))} onKeyDown={(e) => { if (e.key === 'Enter') window.dispatchEvent(new CustomEvent('nearcity-toast', { detail: { message: 'Coming soon', type: 'info' } })) }} className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">🔥</div>
                  <div>
                    <h3 className="text-lg font-semibold">{app.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{app.tagline}</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 flex-wrap">
                  {app.tags.map((t) => (
                    <span key={t} className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section> */}

        {/* Trending projects */}
        {/* <section className="mt-10">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Trending projects</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {trending.map((t) => (
              <div key={t.id} className="bg-white rounded-2xl p-6 shadow-sm flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">{t.name}</h4>
                  <p className="text-xs text-gray-500">{t.desc}</p>
                </div>
                <div className="text-right">
                  <div className="text-green-500 font-semibold">{t.pct}</div>
                  <div className="text-xs text-gray-500">{t.users}</div>
                </div>
              </div>
            ))}
          </div>
        </section> */}
      </div>
    </div>
  );
}
