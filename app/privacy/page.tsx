import Link from "next/link";
import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "What the Gulf Mesh app accesses, stores, and transmits — and what it never does.",
};

export default function PrivacyPage() {
  return (
    <div className="container pb-24">
      <article className="mx-auto max-w-3xl">
        <header className="mb-10">
          <span className="eyebrow">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            Privacy Policy
          </span>
          <h1 className="mt-5 font-display text-display-lg font-semibold tracking-tight text-balance text-ink-900 dark:text-white">
            Privacy Policy — Gulf Mesh
          </h1>
          <p className="mt-4 text-sm text-ink-500 dark:text-ink-400">
            Last updated: August 23, 2026
          </p>
        </header>

        <div className="prose-mesh">
          <p>
            Gulf Mesh (&ldquo;the app&rdquo;) is a client for MeshCore LoRa mesh radio
            networks. This policy explains what data the app accesses, stores, and
            transmits.
          </p>

          <h2>Data the app stores on your device</h2>
          <ul>
            <li>
              <strong>Contacts, messages, and channels</strong> you send or receive
              over the mesh radio are stored locally on your device so you can view
              your conversation history.
            </li>
            <li>
              <strong>Repeater login passwords</strong> and{" "}
              <strong>channel/community secret keys (PSKs)</strong> are stored using
              your device&rsquo;s secure hardware-backed storage (Android Keystore),
              not in plain text.
            </li>
            <li>
              None of the above ever leaves your device unless you take one of the
              actions below.
            </li>
          </ul>

          <h2>Data the app sends over the mesh radio (not the internet)</h2>
          <p>
            Messages, location shares, and node advertisements you choose to send
            are transmitted over LoRa radio to other mesh devices — this is the
            app&rsquo;s core function. This is peer-to-peer radio communication, not
            a connection to any company&rsquo;s servers.
          </p>
          <p>
            If you turn on <strong>ATAK location broadcasting</strong> (off by
            default), your GPS location is periodically sent to other users on your
            selected mesh channel, and optionally attached to your node&rsquo;s own
            beacon. This is entirely within the mesh network you&rsquo;re part of —
            it is not sent to us or any internet service.
          </p>

          <h2>Data sent to internet services (only when you opt in)</h2>
          <ul>
            <li>
              <strong>MeshMapper wardriving</strong> (off by default, requires you
              to accept a disclosure and manually start a session): if enabled, your
              device&rsquo;s public key/identity, display name, app version, radio
              settings, and GPS location are sent to meshmapper.net to build
              community coverage maps. You can use an offline mode instead, which
              keeps this data on your device.
            </li>
            <li>
              <strong>MeshBuddy node-name reservation</strong> (only if you use this
              optional feature): the email address, display name, and location you
              type into the reservation form are sent to our MeshBuddy service to
              reserve a unique mesh node identity for you.
            </li>
            <li>
              <strong>GIF search</strong> (only if enabled and only when you open
              the GIF picker): your search text is sent to GIPHY to return matching
              GIFs.
            </li>
            <li>
              <strong>Link previews</strong>: if a chat message contains a link, the
              app fetches that link directly to build a preview card. You can turn
              this off in Settings.
            </li>
            <li>
              <strong>Firmware updates</strong>: the app checks GitHub for the
              latest MeshCore firmware releases when you use the firmware/OTA
              update screens.
            </li>
            <li>
              <strong>Line-of-sight terrain tool</strong>: coordinates you select on
              the map are sent to a public elevation-data API (Open-Meteo) to
              compute terrain profiles.
            </li>
          </ul>

          <h2>What we don&rsquo;t do</h2>
          <p>
            The app contains no advertising SDKs, no analytics SDKs, and no
            crash-reporting SDKs. We do not sell your data, and we do not build
            advertising profiles.
          </p>

          <h2>Your choices</h2>
          <p>
            Wardriving, ATAK location broadcasting, and link previews are all
            optional and can be turned off in Settings. You can delete your local
            message history, contacts, and stored passwords/keys from within the
            app.
          </p>

          <h2>Contact</h2>
          <p>
            Questions about this policy can be sent to:{" "}
            <a href="mailto:support@gulfcoastmesh.org">support@gulfcoastmesh.org</a>
          </p>
        </div>

        <p className="mt-12 text-sm text-ink-500 dark:text-ink-400">
          <Link href="/" className="font-medium text-gulf-700 hover:underline dark:text-gulf-300">
            ← Back to home
          </Link>
        </p>
      </article>
    </div>
  );
}
