"use client";

import { Zap, DollarSign, ShieldCheck, Wallet, Menu } from "lucide-react";
import { useRouter } from "next/navigation";
import SearchBar from "./components/SearchBar";
import { useWallet } from "./context/WalletContext";

export default function LandingPage() {
  const router = useRouter();
  const { connect, isLoading } = useWallet();

  return (
    <>
      {/* Hero */}
      <div className="mx-auto max-w-6xl px-6 py-12">
        <section className="text-center pt-8">
          <h1 className="mx-auto max-w-3xl text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight text-black">
            Control Your Digital
            <br />
            Experience With Near City
          </h1>
          <p className="mt-4 mx-auto max-w-2xl text-gray-500">
            The complete Web4 ecosystem on NEAR Protocol with integrated AI. Connect your wallet to start exploring, building, and earning.
          </p>

          <div className="mt-8 items-center justify-center gap-4">
            <div className="flex items-center justify-center gap-4">
              <button 
                type="button" 
                onClick={async () => { 
                  try {
                    await connect();
                    window.dispatchEvent(new CustomEvent('nearcity-toast', { detail: { message: 'Wallet connected', type: 'success' } }));
                  } catch (error) {
                    window.dispatchEvent(new CustomEvent('nearcity-toast', { detail: { message: 'Failed to connect wallet', type: 'error' } }));
                  }
                }} 
                disabled={isLoading}
                className="hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Wallet className="h-4 w-4" />
                {isLoading ? "Connecting..." : "Connect Wallet"}
              </button>
              <button type="button" onClick={() => router.push('/menu')} className="md:hidden inline-flex items-center gap-2 px-3 py-2 rounded-full border">
                <Menu className="h-4 w-4" />
                Menu
              </button>
            </div>
            <div className="w-full max-w-2xl items-center justify-center mt-6 mx-auto">
              <SearchBar placeholder="Ask me anything" centerText="Powered by NEAR AI" />
            </div>
          </div>

          {/* Feature cards */}
          <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-6 items-stretch">
            <article className="bg-blue-100/40 rounded-3xl p-8 shadow-md transform -rotate-3">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-yellow-200/60 rounded-full"><Zap className="h-6 w-6 text-yellow-700" /></div>
              <h3 className="mt-6 text-lg font-bold text-gray-900">AI - Powered Experience</h3>
              <p className="mt-3 text-sm text-gray-700 leading-relaxed">Get personalised recommendations, smart search results, and AI assistance throughout your journey</p>
            </article>

            <article className="bg-cyan-100/40 rounded-3xl p-8 shadow-md">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-cyan-200/60 rounded-full"><DollarSign className="h-6 w-6 text-cyan-700" /></div>
              <h3 className="mt-6 text-lg font-bold text-gray-900">Create & Monetize</h3>
              <p className="mt-3 text-sm text-gray-700 leading-relaxed">Build your Web4 pages with a drag-and-drop interface and monetize your online presence.</p>
            </article>

            <article className="bg-red-100/40 rounded-3xl p-8 shadow-md transform rotate-3">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-red-200/60 rounded-full"><ShieldCheck className="h-6 w-6 text-red-700" /></div>
              <h3 className="mt-6 text-lg font-bold text-gray-900">Data ownership</h3>
              <p className="mt-3 text-sm text-gray-700 leading-relaxed">Take control of your data with granular permission settings and earn from your digital assets.</p>
            </article>
          </div>
        </section>
      </div>

      {/* Newsletter / Subscribe */}
      <section className="bg-neutral-900 text-neutral-50 py-12">
        <div className="mx-auto max-w-6xl px-6">
          <div className="bg-white text-gray-900 p-8 rounded-lg">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
              <div className="md:flex-1">
                <h4 className="text-3xl font-bold">Subscribe to our Newsletter</h4>
                <p className="text-sm text-gray-600 mt-2">Get the Week in Review newsletter and all the latest trends directly to your inbox.</p>
              </div>

              <div className="md:flex-1">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <input placeholder="Enter Email" className="flex-1 rounded-full px-4 py-3 border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-teal-500" />
                    <button type="button" onClick={() => router.push('/subscribe')} className="rounded-full bg-teal-600 hover:bg-teal-700 text-white px-8 py-3 font-semibold whitespace-nowrap">Subscribe</button>
                  </div>

                  <div className="flex items-start gap-2">
                    <input type="checkbox" id="privacy" className="mt-1 w-4 h-4 cursor-pointer flex-shrink-0" defaultChecked />
                    <label htmlFor="privacy" className="text-xs text-gray-600 leading-relaxed">
                      I have read the <a href="/privacy" className="text-teal-600 hover:underline">privacy policy</a> and I understand I can unsubscribe anytime
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
