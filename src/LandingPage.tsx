"use client";

import { Zap, DollarSign, ShieldCheck, Wallet, Menu } from "lucide-react";
import { useRouter } from "next/navigation";
import SearchBar from "./components/SearchBar";
import MobileMenu from "./components/MobileMenu";
import { useState } from "react";
import { useWallet } from "./context/WalletContext";

export default function LandingPage() {
  const router = useRouter();
  const { connect, isLoading, isConnected, walletName } = useWallet();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Hero */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12">
        <section className="text-center pt-6 sm:pt-8">
          <h1 className="mx-auto max-w-3xl text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight text-black px-2">
            Control Your Digital
            <br />
            Experience With Near City
          </h1>
          <p className="mt-3 sm:mt-4 mx-auto max-w-2xl text-sm sm:text-base text-gray-500 px-2">
            The complete Web4 ecosystem on NEAR Protocol with integrated AI.</p>
          <p className="text-sm sm:text-base text-gray-500 mt-2 px-2">Start exploring, creating, building, earning and connect with others.</p>

          <div className="mt-8 flex flex-col items-center justify-center gap-4 w-full">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full px-2">
              {!isConnected ? (
                <button 
                  type="button" 
                  onClick={async () => { 
                    try {
                      await connect();
                      window.dispatchEvent(new CustomEvent('nearcity-toast', { detail: { message: 'Wallet connected', type: 'success' } }));
                      window.dispatchEvent(new CustomEvent('nearcity-open-wallet'));
                    } catch (error) {
                      window.dispatchEvent(new CustomEvent('nearcity-toast', { detail: { message: 'Failed to connect wallet', type: 'error' } }));
                    }
                  }} 
                  disabled={isLoading}
                  className="hidden sm:inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-emerald-500 text-white disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  <Wallet className="h-4 w-4" />
                  <span className="hidden md:inline">{isLoading ? "Connecting..." : "Connect Wallet"}</span>
                  <span className="md:hidden">{isLoading ? "Connecting..." : "Connect"}</span>
                </button>
              ) : (
                <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('nearcity-open-wallet'))} className="hidden sm:inline-flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 rounded-full bg-white border text-sm">
                  <div className="w-1 h-6 bg-teal-600 rounded" />
                  <span className="text-xs sm:text-sm text-gray-700">{walletName ? walletName.split('.')[0] : 'Wallet'}</span>
                </button>
              )}

              <button type="button" onClick={() => setMobileMenuOpen(true)} className="sm:hidden inline-flex items-center gap-2 px-3 py-2 rounded-full border text-sm">
                <Menu className="h-4 w-4" />
                Menu
              </button>
            </div>
            <div className="w-full max-w-2xl items-center justify-center mx-auto px-2">
              <SearchBar 
                placeholder="coming soon!!!" centerText="Powered by NEAR AI" />
            </div>
          </div>

          {/* Feature cards */}
          <div className="mt-10 sm:mt-14 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 items-stretch">
            <article className="bg-blue-100/40 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-md md:transform md:-rotate-3">
              <div className="inline-flex items-center justify-center w-10 sm:w-12 h-10 sm:h-12 bg-yellow-200/60 rounded-full"><Zap className="h-5 sm:h-6 w-5 sm:w-6 text-yellow-700" /></div>
              <h3 className="mt-4 sm:mt-6 text-base sm:text-lg font-bold text-gray-900">AI - Powered Experience</h3>
              <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-gray-700 leading-relaxed">Get personalised recommendations, smart search results, and AI assistance throughout your journey</p>
            </article>

            <article className="bg-cyan-100/40 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-md">
              <div className="inline-flex items-center justify-center w-10 sm:w-12 h-10 sm:h-12 bg-cyan-200/60 rounded-full"><DollarSign className="h-5 sm:h-6 w-5 sm:w-6 text-cyan-700" /></div>
              <h3 className="mt-4 sm:mt-6 text-base sm:text-lg font-bold text-gray-900">Create & Monetize</h3>
              <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-gray-700 leading-relaxed">Build your Web4 pages with a drag-and-drop interface and monetize your online presence.</p>
            </article>

            <article className="bg-red-100/40 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-md md:transform md:rotate-3">
              <div className="inline-flex items-center justify-center w-10 sm:w-12 h-10 sm:h-12 bg-red-200/60 rounded-full"><ShieldCheck className="h-5 sm:h-6 w-5 sm:w-6 text-red-700" /></div>
              <h3 className="mt-4 sm:mt-6 text-base sm:text-lg font-bold text-gray-900">Data ownership</h3>
              <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-gray-700 leading-relaxed">Take control of your data with granular permission settings and earn from your digital assets.</p>
            </article>
          </div>
        </section>
      </div>

      {mobileMenuOpen && <MobileMenu onClose={() => setMobileMenuOpen(false)} />}

      {/* Newsletter / Subscribe */}
      <section className="bg-neutral-900 text-neutral-50 py-8 sm:py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="bg-white text-gray-900 p-6 sm:p-8 rounded-lg sm:rounded-2xl">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 sm:gap-8">
              <div className="lg:flex-1">
                <h4 className="text-2xl sm:text-3xl font-bold">Subscribe to our Newsletter</h4>
                <p className="text-xs sm:text-sm text-gray-600 mt-2">Get the Week in Review newsletter and all the latest trends directly to your inbox.</p>
              </div>

              <div className="lg:flex-1">
                <div className="flex flex-col gap-3 sm:gap-4">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <input placeholder="Enter Email" className="flex-1 rounded-lg sm:rounded-full px-4 py-2 sm:py-3 border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-teal-500 text-sm" />
                    <button type="button" onClick={() => router.push('/subscribe')} className="rounded-lg sm:rounded-full bg-teal-600 hover:bg-teal-700 text-white px-6 sm:px-8 py-2 sm:py-3 font-semibold whitespace-nowrap text-sm sm:text-base">Subscribe</button>
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
