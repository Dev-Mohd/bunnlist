"use client";

import { Readex_Pro } from "next/font/google";
import { useEffect, useRef } from "react";
import { animateStory } from "./animate";
import { STORY_HTML } from "./markup";
import "./story.css";

const readex = Readex_Pro({ subsets: ["arabic", "latin"], weight: ["300", "400", "600", "700"], variable: "--font-readex", display: "swap" });

/** The home page as one scroll: a room per part of the app, each with one line and one drawing. */
export function ScrollStory() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => (root.current ? animateStory(root.current) : undefined), []);
  return <div ref={root} className={`story ${readex.variable}`} dangerouslySetInnerHTML={{ __html: STORY_HTML }} />;
}
