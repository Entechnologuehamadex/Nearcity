"use client";

import { useState } from "react";
import DataCard from "./components/DataCard";

export default function DataPage() {
  const [toggles, setToggles] = useState({ marketplace: true, social: true, finance: false, game: true });

  function toggle(key: string) {
    setToggles((s) => ({ ...s, [key]: !s[key as keyof typeof s] }));
  }

  return (
    <div className="min-h-screen py-16 bg-gradient-to-br from-white via-white to-orange-50">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 text-center">Data Ownership & Monetization</h2>
        <p className="text-center text-sm text-gray-500 mt-4">Take control of your data assets and earn from sharing your data with applications in the Near ecosystem</p>

        <div className="mt-10 rounded-xl bg-gray-100 p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Data Assets Card */}
            <DataCard title="Data Assets" buttonText="Update Permissions">
              <ul className="space-y-4 text-gray-700">
                <li className="flex items-center justify-between">
                  <span>Profile Information</span>
                  <span className="px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-sm">Active</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Browsing History</span>
                  <span className="px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-sm">Active</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Transaction Data</span>
                  <span className="px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-sm">Active</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Content Preferences</span>
                  <span className="px-3 py-1 rounded-full bg-yellow-50 text-yellow-700 text-sm">Pending</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Application Usage</span>
                  <span className="px-3 py-1 rounded-full bg-yellow-50 text-yellow-700 text-sm">Pending</span>
                </li>
              </ul>
            </DataCard>

            {/* Access Control Card */}
            <DataCard title="Access Control" buttonText="Update Permissions">
              <div className="space-y-4 text-gray-700">
                <div className="flex items-center justify-between">
                  <span>NFT Marketplace</span>
                  <label className="inline-flex relative items-center">
                    <input aria-label="NFT Marketplace toggle" title="NFT Marketplace" type="checkbox" checked={toggles.marketplace} onChange={() => toggle("marketplace")} className="sr-only peer" />
                    <div className="w-12 h-6 bg-gray-200 rounded-full peer-checked:bg-purple-600 peer-focus:ring-2 peer-focus:ring-purple-300 relative transition-colors" />
                    <div className={`absolute left-0 top-0 mt-0.5 ml-0.5 w-5 h-5 bg-white rounded-full shadow transform transition peer-checked:translate-x-6`} />
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <span>Social DApp</span>
                  <label className="inline-flex relative items-center">
                    <input aria-label="Social DApp toggle" title="Social DApp" type="checkbox" checked={toggles.social} onChange={() => toggle("social")} className="sr-only peer" />
                    <div className="w-12 h-6 bg-gray-200 rounded-full peer-checked:bg-purple-600 peer-focus:ring-2 peer-focus:ring-purple-300 relative transition-colors" />
                    <div className={`absolute left-0 top-0 mt-0.5 ml-0.5 w-5 h-5 bg-white rounded-full shadow transform transition peer-checked:translate-x-6`} />
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <span>Finance Tracker</span>
                  <label className="inline-flex relative items-center">
                    <input aria-label="Finance Tracker toggle" title="Finance Tracker" type="checkbox" checked={toggles.finance} onChange={() => toggle("finance")} className="sr-only peer" />
                    <div className="w-12 h-6 bg-gray-200 rounded-full peer-checked:bg-purple-600 peer-focus:ring-2 peer-focus:ring-purple-300 relative transition-colors" />
                    <div className={`absolute left-0 top-0 mt-0.5 ml-0.5 w-5 h-5 bg-white rounded-full shadow transform transition peer-checked:translate-x-6`} />
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <span>Game Platform</span>
                  <label className="inline-flex relative items-center">
                    <input aria-label="Game Platform toggle" title="Game Platform" type="checkbox" checked={toggles.game} onChange={() => toggle("game")} className="sr-only peer" />
                    <div className="w-12 h-6 bg-gray-200 rounded-full peer-checked:bg-purple-600 peer-focus:ring-2 peer-focus:ring-purple-300 relative transition-colors" />
                    <div className={`absolute left-0 top-0 mt-0.5 ml-0.5 w-5 h-5 bg-white rounded-full shadow transform transition peer-checked:translate-x-6`} />
                  </label>
                </div>
              </div>
            </DataCard>

            {/* Monetization Card */}
            <DataCard title="Monetization" buttonText="Withdrawal">
              <div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-gray-600">Earnings this month</div>
                      <div className="text-lg font-semibold text-gray-900">12.6 NEAR</div>
                    </div>
                    <div className="text-sm text-gray-500">Goal: 20 NEAR</div>
                  </div>
                  <div className="mt-4 h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-teal-600 to-emerald-400 w-2/3" />
                  </div>
                </div>

                <ul className="mt-6 space-y-4 text-gray-700">
                  <li className="flex items-center justify-between">
                    <span>NFT Marketplace</span>
                    <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700">5.2 NEAR</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>Social DApp</span>
                    <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700">5.2 NEAR</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>Game Platform</span>
                    <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700">2.2 NEAR</span>
                  </li>
                </ul>
              </div>
            </DataCard>
          </div>
        </div>
      </div>
    </div>
  );
}
