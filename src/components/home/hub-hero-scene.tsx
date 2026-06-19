"use client";

export function HubHeroScene() {
  return (
    <div className="hub-scene" aria-hidden="true">
      <div className="hub-scene__mesh" />
      <div className="hub-scene__grid" />
      <div className="hub-scene__ring hub-scene__ring--one" />
      <div className="hub-scene__ring hub-scene__ring--two" />
      <div className="hub-scene__orb hub-scene__orb--primary" />
      <div className="hub-scene__orb hub-scene__orb--secondary" />
      <div className="hub-scene__orb hub-scene__orb--accent" />
    </div>
  );
}
