"use client";

import { useRouter } from "next/navigation";

interface FooterLink {
  label: string;
  route: string;
}

interface FooterProps {
  platformLinks?: FooterLink[];
  resourceLinks?: FooterLink[];
  connectLinks?: FooterLink[];
}

export default function Footer({
  platformLinks = [],
  resourceLinks = [],
  connectLinks = [],
}: FooterProps) {
  const router = useRouter();

  // Default links if none are provided
  const defaultPlatformLinks = [
    { label: "DAApp Arena", route: "/daapp" },
    { label: "Page Creation", route: "/page-creation" },
    { label: "News Updates", route: "/news" },
  ];

  const defaultResourceLinks = [
    { label: "Documentation", route: "/docs" },
    { label: "API Reference", route: "/api" },
    { label: "Web4 Tutorials", route: "/tutorials" },
  ];

  const defaultConnectLinks = [
    { label: "Discord", route: "/discord" },
    { label: "Twitter", route: "/twitter" },
    { label: "GitHub", route: "/github" },
  ];

  const platform = platformLinks.length > 0 ? platformLinks : defaultPlatformLinks;
  const resources = resourceLinks.length > 0 ? resourceLinks : defaultResourceLinks;
  const connect = connectLinks.length > 0 ? connectLinks : defaultConnectLinks;

  return (
    <footer className="bg-neutral-900 text-neutral-300 py-12">
      <div className="mx-auto max-w-6xl px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <h5 className="text-teal-400 font-bold">NEAR CITY</h5>
          <p className="mt-3 text-sm text-neutral-400">The Web4 Ecosystem on NEAR with integrated AI capabilities. Build, explore, and monetize in the decentralized future.</p>
        </div>

        <div>
          <h6 className="font-semibold">Platform</h6>
          <ul className="mt-3 space-y-2 text-sm">
            {platform.map((l) => (
              <li key={l.route}>
                <button type="button" onClick={() => router.push(l.route)} className="text-sm text-neutral-300 hover:text-neutral-100">
                  {l.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h6 className="font-semibold">Resources</h6>
          <ul className="mt-3 space-y-2 text-sm">
            {resources.map((l) => (
              <li key={l.route}>
                <button type="button" onClick={() => router.push(l.route)} className="text-sm text-neutral-300 hover:text-neutral-100">
                  {l.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h6 className="font-semibold">Connect</h6>
          <ul className="mt-3 space-y-2 text-sm">
            {connect.map((l) => (
              <li key={l.route}>
                <button type="button" onClick={() => router.push(l.route)} className="text-sm text-neutral-300 hover:text-neutral-100">
                  {l.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 mt-8 border-t border-neutral-800 pt-6 text-sm text-neutral-500">
        2023 NEAR Verse. All right reserved.
      </div>
    </footer>
  );
}
