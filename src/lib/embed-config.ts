export const TRUSTED_EMBED_DOMAINS = [
  "www.youtube-nocookie.com",
  "player.vimeo.com",
  "www.tiktok.com",
  "player.twitch.tv",
  "www.instagram.com",
] as const;

const trustedDomainSet = new Set<string>(TRUSTED_EMBED_DOMAINS);

export function isEmbeddable(embedUrl: string): boolean {
  try {
    const { hostname } = new URL(embedUrl);
    return trustedDomainSet.has(hostname);
  } catch {
    return false;
  }
}
