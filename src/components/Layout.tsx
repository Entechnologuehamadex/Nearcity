"use client";

import Header from "./Header";
import Footer from "./Footer";

interface LayoutProps {
  children: React.ReactNode;
  platformLinks?: { label: string; route: string }[];
  resourceLinks?: { label: string; route: string }[];
  connectLinks?: { label: string; route: string }[];
}

export default function Layout({ children, platformLinks, resourceLinks, connectLinks }: LayoutProps) {
  return (
    <div className="min-h-screen font-sans bg-white">
      <Header />
      <main className="">{children}</main>
      <Footer platformLinks={platformLinks} resourceLinks={resourceLinks} connectLinks={connectLinks} />
    </div>
  );
}
