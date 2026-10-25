"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "20px",
          backgroundColor: "#f7f4e9",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          color: "#282722",
        }}
      >
        <div
          style={{
            maxWidth: "440px",
            background: "#fffdf8",
            border: "2px solid #282722",
            boxShadow: "4px 5px 0 #282722",
            padding: "32px 24px",
            textAlign: "center",
            borderRadius: "6px",
          }}
        >
          <h2 style={{ fontSize: "24px", margin: "0 0 10px" }}>Desk Unavailable</h2>
          <p style={{ fontSize: "14px", lineHeight: "1.6", color: "#59564f", margin: "0 0 20px" }}>
            Margins encountered a critical system error. Please reload the page to restore your desk session.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              padding: "10px 20px",
              background: "#efd477",
              border: "2px solid #282722",
              boxShadow: "2px 2px 0 #282722",
              fontSize: "15px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Reload Desk
          </button>
        </div>
      </body>
    </html>
  );
}
