"use client";

import MiniApp from "./mini/MiniApp";

export const revalidate = 0;
export const dynamic = "force-dynamic";

export default function Home() {
  return <MiniApp />;
}
