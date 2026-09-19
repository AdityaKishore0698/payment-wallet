"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

/** Whether the pages should even offer a Google option (divider included). */
export const GOOGLE_SIGN_IN_ENABLED = Boolean(CLIENT_ID);

// Google's renderButton caps `width` at 400px.
const MAX_GOOGLE_BUTTON_WIDTH = 400;

type GoogleCredentialResponse = { credential: string };

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
          }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

/**
 * Google "Sign in with Google" button (Google Identity Services). Renders
 * nothing if NEXT_PUBLIC_GOOGLE_CLIENT_ID isn't set, rather than showing a
 * button that would just fail — see DEPLOYMENT.md for the Google Cloud
 * Console setup this depends on.
 *
 * The button itself is Google's cross-origin iframe, so only the options
 * passed to renderButton (and the size/clip of our wrapper) can change how it
 * looks. Google offers no purple/custom colours; `outline` is the theme that
 * mirrors our secondary button (white, thin border) in both light and dark.
 */
export function GoogleSignInButton({
  onCredential,
}: {
  onCredential: (idToken: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onCredentialRef = useRef(onCredential);
  const renderedWidth = useRef(0);
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    onCredentialRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    if (!scriptReady || !CLIENT_ID || !window.google) return;
    window.google.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: (response) => onCredentialRef.current(response.credential),
    });
  }, [scriptReady]);

  const measure = () =>
    Math.min(Math.round(containerRef.current?.offsetWidth ?? 0), MAX_GOOGLE_BUTTON_WIDTH);

  const render = useCallback(() => {
    const el = containerRef.current;
    const width = measure();
    if (!window.google || !el || !width) return;
    renderedWidth.current = width;
    el.innerHTML = "";
    window.google.accounts.id.renderButton(el, {
      type: "standard",
      theme: "outline",
      size: "large", // 40px tall — same as our primary Button
      shape: "rectangular",
      text: "continue_with",
      logo_alignment: "center",
      // Google takes a pixel width, not "100%": match the (full-width) container.
      width,
    });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!scriptReady || !el) return;
    render();
    const observer = new ResizeObserver(() => {
      if (measure() !== renderedWidth.current) render();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [scriptReady, render]);

  if (!CLIENT_ID) return null;

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
      />
      {/* Dark only: clip to our rounded-xl (also hides the iframe's opaque white backdrop corners); in light it would crop the outline border. */}
      <div ref={containerRef} className="h-10 w-full dark:overflow-hidden dark:rounded-xl" />
    </>
  );
}
