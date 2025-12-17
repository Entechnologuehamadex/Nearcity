"use client";

import Layout from "../../src/components/Layout";
import Connected from "../../src/Connected";

export default function ConnectRoute() {
  const platformLinks = [
    { label: "DAApp Arena", route: "/daapp" },
    { label: "Page Creation", route: "/page-creation" },
    { label: "News Updates", route: "/news" },
  ];

  const resourceLinks = [
    { label: "Documentation", route: "/docs" },
    { label: "API Reference", route: "/api" },
    { label: "Web4 Tutorials", route: "/tutorials" },
  ];

  const connectLinks = [
    { label: "Discord", route: "/discord" },
    { label: "Twitter", route: "/twitter" },
    { label: "GitHub", route: "/github" },
  ];

  return (
    <Layout platformLinks={platformLinks} resourceLinks={resourceLinks} connectLinks={connectLinks}>
      <Connected />
    </Layout>
  );
}
