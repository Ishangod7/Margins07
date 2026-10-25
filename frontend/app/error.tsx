"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error internally without exposing details to user
    console.error("Margins application error:", error);
  }, [error]);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
        backgroundColor: "var(--paper, #f7f4e9)",
        backgroundImage:
          "radial-gradient(circle, rgba(37, 36, 31, 0.05) 1px, transparent 1px)",
        backgroundSize: "20px 20px",
        fontFamily: "var(--font-dm-sans, sans-serif)",
        color: "var(--ink, #25241f)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          background: "#fffdf8",
          border: "2px solid #282722",
          boxShadow: "5px 6px 0 #282722",
          borderRadius: "6px",
          padding: "36px 30px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "inline-block",
            fontFamily: "var(--font-patrick-hand, cursive)",
            fontSize: "13px",
            background: "#feeceb",
            border: "1.5px solid #282722",
            padding: "2px 10px",
            borderRadius: "4px",
            color: "#ab3f38",
            marginBottom: "16px",
            fontWeight: 700,
          }}
        >
          DESK INTERRUPTED · UNEXPECTED ERROR
        </div>

        <h1
          style={{
            fontFamily: "var(--font-caveat, cursive)",
            fontSize: "42px",
            lineHeight: 1,
            margin: "0 0 12px",
            color: "#282722",
          }}
        >
          something slipped on the desk.
        </h1>

        <p
          style={{
            fontSize: "14px",
            lineHeight: 1.6,
            color: "#59564f",
            margin: "0 0 24px",
          }}
        >
          An unexpected error occurred while loading this page. Your data is safe; please try reloading or return to your desk.
        </p>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            alignItems: "center",
          }}
        >
          <button
            type="button"
            onClick={() => reset()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              padding: "11px 18px",
              background: "#efd477",
              border: "2px solid #282722",
              boxShadow: "3px 3px 0 #282722",
              fontFamily: "var(--font-patrick-hand, cursive)",
              fontSize: "17px",
              fontWeight: 700,
              color: "#282722",
              cursor: "pointer",
            }}
          >
            try again
          </button>

          <Link
            href="/notices"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              padding: "9px 18px",
              background: "#fffdf5",
              border: "1.5px solid #282722",
              fontFamily: "var(--font-patrick-hand, cursive)",
              fontSize: "15px",
              color: "#59564f",
              textDecoration: "none",
            }}
          >
            return to notice board →
          </Link>
        </div>

        <div
          style={{
            marginTop: "24px",
            paddingTop: "16px",
            borderTop: "1.5px dashed rgba(40, 39, 34, 0.2)",
            fontSize: "12px",
            color: "#8e8b81",
          }}
        >
          Persistent issue? Contact your Class Representative (CR).
        </div>
      </div>
    </main>
  );
}
