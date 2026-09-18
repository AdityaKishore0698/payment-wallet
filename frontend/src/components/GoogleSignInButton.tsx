"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "@/lib/theme";

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

/** Whether the pages should even offer a Google option (divider included). */
export const GOOGLE_SIGN_IN_ENABLED = Boolean(CLIENT_ID);

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
 */
export function GoogleSignInButton({
  onCredential,
}: {
  onCredential: (idToken: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const { resolved } = useTheme();

  const render = useCallback(() => {
    if (!CLIENT_ID || !window.google || !containerRef.current) return;
    window.google.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: (response) => onCredential(response.credential),
    });
    containerRef.current.innerHTML = "";
    window.google.accounts.id.renderButton(containerRef.current, {
      type: "standard",
      theme: resolved === "dark" ? "filled_black" : "outline",
      size: "large",
      shape: "rectangular",
      text: "continue_with",
      logo_alignment: "center",
      width: 320,
    });
  }, [onCredential, resolved]);

  useEffect(() => {
    if (scriptReady) render();
  }, [scriptReady, render]);

  if (!CLIENT_ID) return null;

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
      />
      <div ref={containerRef} className="flex justify-center" />
    </>
  );
}
