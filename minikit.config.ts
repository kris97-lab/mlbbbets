const DEFAULT_ROOT_URL =
  process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : "https://mlbbbets-git-codex-implement-mini-a-28a7b9-kris97-labs-projects.vercel.app";

const ROOT_URL =
  process.env.NEXT_PUBLIC_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : DEFAULT_ROOT_URL);

/**
 * MiniApp configuration object. Must follow the Farcaster MiniApp specification.
 *
 * @see {@link https://miniapps.farcaster.xyz/docs/guides/publishing}
 */
export const minikitConfig = {
  accountAssociation: {
    header: "",
    payload: "",
    signature: ""
  },
  miniapp: {
    version: "1",
    name: "MLBB Bets",
    subtitle: "Live Mobile Legends wagers",
    description:
      "Stream Mobile Legends matches and bet on shifting odds without leaving Farcaster.",
    screenshotUrls: [`${ROOT_URL}/screenshot-portrait.png`],
    iconUrl: `${ROOT_URL}/blue-icon.png`,
    splashImageUrl: `${ROOT_URL}/blue-hero.png`,
    splashBackgroundColor: "#000000",
    homeUrl: ROOT_URL,
    webhookUrl: `${ROOT_URL}/api/webhook`,
    primaryCategory: "social",
    tags: ["live", "betting", "streaming", "sports", "mobile-legends"],
    heroImageUrl: `${ROOT_URL}/blue-hero.png`,
    tagline: "Real-time odds for every fight.",
    ogTitle: "MLBB Bets • Live odds while you watch",
    ogDescription:
      "Tap into the Mobile Legends stream, follow the market, and stake on every momentum swing.",
    ogImageUrl: `${ROOT_URL}/blue-hero.png`,
    canonicalDomain:
      "mlbbbets-git-codex-implement-mini-a-28a7b9-kris97-labs-projects.vercel.app",
  },
} as const;

