"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

// The first party half of the analytics. Vercel's script already counts page
// views, so this deliberately does not try to replace it: it collects only
// what Vercel cannot answer, which on a Hobby plan is everything to do with
// engagement and intent.
//
// Nothing here imports from lib/analytics. Those modules reach for the
// database driver, and this file ships to every visitor's browser.

const ENDPOINT = "/api/collect";

// Below this, a page view is not a read. Used only to decide when to bother
// reporting engagement at all; the bounce threshold itself lives in SQL.
const MIN_REPORTABLE_MS = 1_000;

type Payload = {
  type: "pageview" | "engagement" | "outbound" | "search";
  path?: string;
  referrer?: string;
  scroll?: number;
  dwell?: number;
  target?: string;
  results?: number;
};

function send(payload: Payload) {
  try {
    const body = JSON.stringify(payload);
    // sendBeacon survives the page being torn down, which is exactly when the
    // engagement numbers are finally known. A fetch here would be cancelled
    // on unload and the dwell figure would be lost on every visit.
    if (navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "application/json" }));
      return;
    }
    // Older Safari. keepalive gives fetch the same survive-unload behaviour.
    void fetch(ENDPOINT, {
      method: "POST",
      body,
      keepalive: true,
      headers: { "Content-Type": "application/json" },
    }).catch(() => {});
  } catch {
    // Analytics must never throw into a page somebody came to read.
  }
}

function referrerHost(): string | undefined {
  // Only the hostname, never the full referring URL, which can carry search
  // terms and other things that are none of our business.
  try {
    if (!document.referrer) return undefined;
    const url = new URL(document.referrer);
    if (url.hostname === location.hostname) return undefined;
    return url.hostname;
  } catch {
    return undefined;
  }
}

function scrollPercent(): number {
  const doc = document.documentElement;
  const scrollable = doc.scrollHeight - window.innerHeight;
  // A page shorter than the viewport has nothing to scroll, and the reader
  // saw all of it by definition.
  if (scrollable <= 0) return 100;
  return Math.min(100, Math.max(0, Math.round((window.scrollY / scrollable) * 100)));
}

export default function Beacon() {
  const pathname = usePathname();

  const startedAt = useRef(0);
  const maxScroll = useRef(0);
  const currentPath = useRef<string | null>(null);

  useEffect(() => {
    // Flush whatever the previous page earned before the counters reset. On
    // the first render there is no previous page and this is a no-op.
    flush();

    currentPath.current = pathname;
    startedAt.current = Date.now();
    maxScroll.current = scrollPercent();

    send({ type: "pageview", path: pathname, referrer: referrerHost() });

    function flush() {
      const path = currentPath.current;
      if (!path) return;
      const dwell = Date.now() - startedAt.current;
      if (dwell < MIN_REPORTABLE_MS) return;

      send({ type: "engagement", path, dwell, scroll: maxScroll.current });

      // Restart the clock rather than blocking further reports. A reader who
      // switches tabs and comes back produces two engagement rows, and the
      // rollup sums dwell per session, so the total stays right.
      startedAt.current = Date.now();
    }

    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        maxScroll.current = Math.max(maxScroll.current, scrollPercent());
        ticking = false;
      });
    }

    function onHidden() {
      if (document.visibilityState === "hidden") flush();
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onHidden);
    // iOS Safari does not reliably fire visibilitychange when a tab is
    // closed or the browser is backgrounded, and pagehide is what it does
    // fire. Without this, mobile dwell would be systematically missing.
    window.addEventListener("pagehide", flush);

    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [pathname]);

  // Outbound clicks, caught by one delegated listener rather than wired into
  // each component that renders a link. That matters more than it sounds: the
  // links that most need counting are the ones inside post bodies, which are
  // rendered from MDX and have no component to instrument. This catches those
  // for free, and SocialLinks and the footer along with them.
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const anchor = (event.target as Element | null)?.closest?.("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      if (href.startsWith("mailto:")) {
        send({ type: "outbound", path: location.pathname, target: href });
        return;
      }

      // The feed is same origin, so it is not an outbound link, but clicking
      // it is the clearest subscribe intent the site can observe. Counted
      // here rather than lost among ordinary page views.
      if (href.endsWith("/feed.xml")) {
        send({ type: "outbound", path: location.pathname, target: "/feed.xml" });
        return;
      }

      try {
        const url = new URL(href, location.href);
        if (url.hostname === location.hostname) return;
        if (url.protocol !== "http:" && url.protocol !== "https:") return;
        send({
          type: "outbound",
          path: location.pathname,
          target: url.hostname + (url.pathname === "/" ? "" : url.pathname),
        });
      } catch {
        // Not a URL we can parse, so not a link we can count.
      }
    }

    // Capture phase, so a handler that stops propagation cannot hide the
    // click from us.
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  return null;
}

/**
 * Report a site search. Exported for SearchBar, which is the only caller.
 *
 * `results` is the reason this exists as its own event rather than a page
 * view of /search: a query that returned nothing is somebody telling you
 * exactly what the site is missing, and that is invisible unless the count
 * travels with the query.
 */
export function trackSearch(query: string, results: number) {
  send({ type: "search", path: "/search", target: query, results });
}
