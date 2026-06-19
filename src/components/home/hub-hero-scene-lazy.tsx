"use client";

import dynamic from "next/dynamic";

const HubHeroScene = dynamic(
  () => import("@/components/home/hub-hero-scene").then((mod) => mod.HubHeroScene),
  {
    ssr: false,
    loading: () => <div className="hub-scene hub-scene--placeholder" aria-hidden="true" />,
  },
);

export function HubHeroSceneLazy() {
  return <HubHeroScene />;
}
