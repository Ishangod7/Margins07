import AppShell from "@/components/layout/AppShell";

export default function Placeholder() {
  return (
    <AppShell>
      <section className="card" style={{ padding: "28px", marginTop: "16px" }}>
        <h1 style={{ fontFamily: "Caveat, cursive", fontSize: 44, color: "var(--blue-dark)" }}>coming soon</h1>
        <p style={{ marginTop: 8, fontSize: 12, color: "var(--ink-soft)" }}>this screen is next up on the build plan.</p>
      </section>
    </AppShell>
  );
}
