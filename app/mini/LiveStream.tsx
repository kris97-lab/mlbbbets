"use client";

import styles from "./mini.module.css";

type LiveStreamProps = {
  platform?: "youtube" | "twitch" | "iframe";
  youtubeId?: string;
  twitchChannel?: string;
  iframeSrc?: string;
  title?: string;
  subtitle?: string;
};

const DEFAULT_PLATFORM = (process.env.NEXT_PUBLIC_STREAM_PLATFORM || "youtube") as
  | "youtube"
  | "twitch"
  | "iframe";
const DEFAULT_YOUTUBE_ID = process.env.NEXT_PUBLIC_STREAM_YOUTUBE_ID || "dQw4w9WgXcQ";
const DEFAULT_TWITCH_CHANNEL = process.env.NEXT_PUBLIC_STREAM_TWITCH_CHANNEL || "riotgames";
const DEFAULT_IFRAME_SRC = process.env.NEXT_PUBLIC_STREAM_IFRAME_URL;

const buildStreamSrc = (props: LiveStreamProps) => {
  const platform = props.platform || DEFAULT_PLATFORM;

  if (platform === "youtube") {
    const videoId = props.youtubeId || DEFAULT_YOUTUBE_ID;
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&playsinline=1`;
  }

  if (platform === "twitch") {
    const channel = props.twitchChannel || DEFAULT_TWITCH_CHANNEL;
    return `https://player.twitch.tv/?channel=${channel}&parent=${process.env.NEXT_PUBLIC_STREAM_TWITCH_PARENT || "localhost"}&muted=true&autoplay=true`;
  }

  return props.iframeSrc || DEFAULT_IFRAME_SRC || `https://www.youtube.com/embed/${DEFAULT_YOUTUBE_ID}`;
};

export function LiveStream({
  platform,
  youtubeId,
  twitchChannel,
  iframeSrc,
  title = "Worlds Championship - Day 5",
  subtitle = "Live now · Presented by MiniKit",
}: LiveStreamProps) {
  const streamSrc = buildStreamSrc({ platform, youtubeId, twitchChannel, iframeSrc });

  return (
    <section className={styles.streamContainer} aria-label="Live stream">
      <iframe
        className={styles.streamFrame}
        src={streamSrc}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />

      <div className={styles.streamOverlay} />
      <span className={styles.streamBadge}>Live</span>
      <div className={styles.streamMeta}>
        <p className={styles.streamTitle}>{title}</p>
        <p className={styles.streamSubtitle}>{subtitle}</p>
      </div>
    </section>
  );
}
