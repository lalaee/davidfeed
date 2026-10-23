"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

/*
 * The Agentation feedback toolbar: a development tool for marking up the page
 * while building it. It is not part of the product, so the root layout only
 * renders this in development (`next dev`), and the toolbar's code is loaded
 * on demand here rather than bundled into the page — the live site neither
 * shows it nor downloads it.
 */
const Agentation = dynamic(() => import("agentation").then((m) => m.Agentation), { ssr: false });

export default function AgentationWrapper() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  if (isMobile) return null;

  return <Agentation />;
}
