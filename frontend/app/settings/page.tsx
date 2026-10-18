import AppShell from "@/components/layout/AppShell";
import { requireSession } from "@/lib/session";
import { SettingsManager } from "@/components/settings/SettingsManager";
import styles from "./settings.module.css";

export default async function SettingsPage() {
  const { token, me } = await requireSession();

  return (
    <AppShell displayName={me.profile?.display_name}>
      {/* Cover Header */}
      <section className={`card ${styles.settingsCover}`}>
        <div className={styles.coverText}>
          <h1>settings & privacy</h1>
          <p>manage your student profile, customize visibility, and export your personal data</p>
        </div>
      </section>

      {/* Main Settings Tabs and Form */}
      <SettingsManager initialMe={me} token={token} />
    </AppShell>
  );
}
