"use client";

import { Heart, Share2 } from "lucide-react";
import { useState } from "react";
import SearchBar from "./components/SearchBar";

export default function Connected() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);

  const categories = ["All", "Images", "Videos", "News", "Books", "Web", "Finance"];
  const filters = ["Open now", "Top rated", "Fast food", "Delivery", "Menu", "24hrs", "Restaurant"];

  const foodItems = [
    { id: 1, image: "🍰", title: "Order food delivery in Lagos - 200 packs", shop: "Chowdeck", available: "Available", time: "4 hours ago", liked: false },
    { id: 2, image: "🥗", title: "Order food delivery in Lagos - 200 packs", shop: "Chowdeck", available: "Available", time: "5 hours ago", liked: false },
    { id: 3, image: "🥘", title: "Order food delivery in Lagos - 200 packs", shop: "Chowdeck", available: "Available", time: "3 hours ago", liked: true },
    { id: 4, image: "🍱", title: "Order food delivery in Lagos - 200 packs", shop: "Chowdeck", available: "Available", time: "1 hour ago", liked: false },
  ];

  const newsCategories = ["All", "Development", "Trading", "Events", "Lifestyle", "Health", "DeFi", "Sports"];

  const newsItems = [
    // DeFi section
    { id: 1, section: "DeFi", category: "Cryptosphere", image: "🟦", title: "What is next for blockchain ?.", time: "14 hours ago", type: "news", liked: false, badge: null },
    { id: 2, section: "DeFi", category: "Cryptosphere", image: "🌍", title: "What is next for blockchain ?.", time: "14 hours ago", type: "available", liked: false, badge: "0.27" },
    { id: 3, section: "DeFi", category: "Cryptosphere", image: "🎮", title: "What is next for blockchain ?.", time: "14 hours ago", type: "news", liked: false, badge: null },
    { id: 4, section: "DeFi", category: "Cryptosphere", image: "💰", title: "What is next for blockchain ?.", time: "14 hours ago", type: "news", liked: false, badge: null },
    { id: 5, section: "DeFi", category: "Cryptosphere", image: "🔐", title: "What is next for blockchain ?.", time: "14 hours ago", type: "news", liked: false, badge: null },
    // Food section
    { id: 6, section: "Food", category: "Chowdeck", image: "🍝", title: "Order food delivery in Lagos - 200 packs", time: "14 hours ago", type: "available", liked: false, badge: "0.27" },
    { id: 7, section: "Food", category: "Chowdeck", image: "🍜", title: "Order food delivery in Lagos - 200 packs", time: "14 hours ago", type: "available", liked: false, badge: "0.27" },
    { id: 8, section: "Food", category: "Chowdeck", image: "🍕", title: "Order food delivery in Lagos - 200 packs", time: "14 hours ago", type: "available", liked: false, badge: "0.27" },
    { id: 9, section: "Food", category: "Chowdeck", image: "🍣", title: "Order food delivery in Lagos - 200 packs", time: "14 hours ago", type: "available", liked: false, badge: "0.27" },
    { id: 10, section: "Food", category: "Chowdeck", image: "🍗", title: "Order food delivery in Lagos - 200 packs", time: "14 hours ago", type: "available", liked: false, badge: "0.27" },
    // Trading section
    { id: 11, section: "Trading", category: "Cryptosphere", image: "📊", title: "What is next for trading ?.", time: "14 hours ago", type: "news", liked: false, badge: null },
    { id: 12, section: "Trading", category: "Cryptosphere", image: "📈", title: "What is next for trading ?.", time: "14 hours ago", type: "available", liked: false, badge: "0.27" },
    { id: 13, section: "Trading", category: "Cryptosphere", image: "💻", title: "What is next for trading ?.", time: "14 hours ago", type: "news", liked: false, badge: null },
    { id: 14, section: "Trading", category: "Cryptosphere", image: "📉", title: "What is next for trading ?.", time: "14 hours ago", type: "news", liked: false, badge: null },
    { id: 15, section: "Trading", category: "Cryptosphere", image: "💹", title: "What is next for trading ?.", time: "14 hours ago", type: "available", liked: false, badge: "0.27" },
  ];

  return (
    <div className="min-h-screen py-12 bg-gradient-to-br from-white via-white to-purple-50">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900">Control Your Digital</h1>
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900">Experience With Near City</h1>
          <p className="mt-3 text-gray-600 text-sm">The complete Web4 ecosystem on NEAR Protocol with integrated AI. Connect your wallet to start exploring, building, and earning.</p>
        </div>

        {/* Search Bar */}
        <SearchBar placeholder="Food near me" centerText="Powered by NEAR AI" />

        {/* Categories */}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${selectedCategory === cat ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => setSelectedFilters((s) => s.includes(filter) ? s.filter((f) => f !== filter) : [...s, filter])}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${selectedFilters.includes(filter) ? "bg-gray-800 text-white" : "border border-gray-300 text-gray-700 hover:border-gray-400"}`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Precision Location Notice */}
        <div className="mt-4 text-center text-sm text-yellow-700 bg-yellow-50 rounded-lg py-2 px-4 inline-block mx-auto block">
          For precise location turn on 📍
        </div>

        {/* Food Grid */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {foodItems.map((item) => (
            <div key={item.id} className="bg-gray-800 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition transform hover:scale-105">
              <div className="relative h-40 bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-6xl">
                {item.image}
                {item.liked && <div className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1"><Heart className="h-4 w-4 fill-current" /></div>}
              </div>

              <div className="p-4 text-white">
                <span className="text-xs text-purple-300">{item.shop}</span>
                <h3 className="text-sm font-semibold mt-1 line-clamp-2">{item.title}</h3>

                <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                  <span>{item.available}</span>
                  <span>{item.time}</span>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <button title="Like this item" className="flex items-center gap-1 text-gray-300 hover:text-white transition">
                    <Heart className="h-4 w-4" />
                  </button>
                  <button title="Share this item" className="flex items-center gap-1 text-gray-300 hover:text-white transition">
                    <Share2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* News & Recommendation Section */}
        <div className="mt-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-gray-900">News & Recommendation</h2>
            <div className="flex gap-2 flex-wrap justify-end">
              {newsCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${selectedCategory === cat ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* DeFi Section */}
          <div className="mb-12">
            <h3 className="text-xl font-bold text-gray-900 mb-4">DeFi</h3>
            <div className="overflow-x-auto scrollbar-hide">
              <div className="flex gap-6 pb-4">
                {newsItems
                  .filter((item) => item.section === "DeFi")
                  .map((item) => (
                    <div key={item.id} className="flex-shrink-0 w-72 sm:w-80 bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition">
                      {/* Image Section */}
                      <div className="relative h-48 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-8xl">
                        {item.image}
                        {item.badge && (
                          <div className="absolute bottom-3 left-3 bg-red-500 text-white rounded-full w-10 h-10 flex items-center justify-center text-xs font-bold">
                            {item.badge}
                          </div>
                        )}
                      </div>

                      {/* Content Section */}
                      <div className="p-4">
                        <span className="text-xs text-purple-600 font-medium">{item.category}</span>
                        <h3 className="text-sm font-semibold text-gray-900 mt-2 line-clamp-2">{item.title}</h3>

                        {item.type === "available" && (
                          <p className="text-xs text-gray-600 mt-2">Available</p>
                        )}
                        <p className="text-xs text-gray-500 mt-2">{item.time}</p>

                        {/* Action Buttons */}
                        <div className="mt-3 flex items-center gap-3">
                          <button title="Like this item" className="flex items-center gap-1 text-gray-500 hover:text-purple-600 transition">
                            <Heart className="h-4 w-4" />
                          </button>
                          <button title="Share this item" className="flex items-center gap-1 text-gray-500 hover:text-purple-600 transition">
                            <Share2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Food Section */}
          <div className="mb-12">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Food</h3>
            <div className="overflow-x-auto scrollbar-hide">
              <div className="flex gap-6 pb-4">
                {newsItems
                  .filter((item) => item.section === "Food")
                  .map((item) => (
                    <div key={item.id} className="flex-shrink-0 w-72 sm:w-80 bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition">
                      {/* Image Section */}
                      <div className="relative h-48 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-8xl">
                        {item.image}
                        {item.badge && (
                          <div className="absolute bottom-3 left-3 bg-red-500 text-white rounded-full w-10 h-10 flex items-center justify-center text-xs font-bold">
                            {item.badge}
                          </div>
                        )}
                      </div>

                      {/* Content Section */}
                      <div className="p-4">
                        <span className="text-xs text-purple-600 font-medium">{item.category}</span>
                        <h3 className="text-sm font-semibold text-gray-900 mt-2 line-clamp-2">{item.title}</h3>

                        {item.type === "available" && (
                          <p className="text-xs text-gray-600 mt-2">Available</p>
                        )}
                        <p className="text-xs text-gray-500 mt-2">{item.time}</p>

                        {/* Action Buttons */}
                        <div className="mt-3 flex items-center gap-3">
                          <button title="Like this item" className="flex items-center gap-1 text-gray-500 hover:text-purple-600 transition">
                            <Heart className="h-4 w-4" />
                          </button>
                          <button title="Share this item" className="flex items-center gap-1 text-gray-500 hover:text-purple-600 transition">
                            <Share2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Trading Section */}
          <div className="mb-12">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Trading</h3>
            <div className="overflow-x-auto scrollbar-hide">
              <div className="flex gap-6 pb-4">
                {newsItems
                  .filter((item) => item.section === "Trading")
                  .map((item) => (
                    <div key={item.id} className="flex-shrink-0 w-72 sm:w-80 bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition">
                      {/* Image Section */}
                      <div className="relative h-48 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-8xl">
                        {item.image}
                        {item.badge && (
                          <div className="absolute bottom-3 left-3 bg-red-500 text-white rounded-full w-10 h-10 flex items-center justify-center text-xs font-bold">
                            {item.badge}
                          </div>
                        )}
                      </div>

                      {/* Content Section */}
                      <div className="p-4">
                        <span className="text-xs text-purple-600 font-medium">{item.category}</span>
                        <h3 className="text-sm font-semibold text-gray-900 mt-2 line-clamp-2">{item.title}</h3>

                        {item.type === "available" && (
                          <p className="text-xs text-gray-600 mt-2">Available</p>
                        )}
                        <p className="text-xs text-gray-500 mt-2">{item.time}</p>

                        {/* Action Buttons */}
                        <div className="mt-3 flex items-center gap-3">
                          <button title="Like this item" className="flex items-center gap-1 text-gray-500 hover:text-purple-600 transition">
                            <Heart className="h-4 w-4" />
                          </button>
                          <button title="Share this item" className="flex items-center gap-1 text-gray-500 hover:text-purple-600 transition">
                            <Share2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Scrollbar Hiding */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
