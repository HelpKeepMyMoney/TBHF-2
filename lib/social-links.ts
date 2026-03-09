/**
 * Default social media links used when Firestore has no data.
 */
export const DEFAULT_SOCIAL_LINKS = {
  facebook: "https://facebook.com/groups/721668592155966",
  twitter: "https://x.com/theresavkennedy",
  instagram: "https://instagram.com/blackhistorydao",
  linkedin: "https://www.linkedin.com/company/black-history-dao/",
  youtube: "",
} as const;

export type SocialLinks = {
  facebook: string;
  twitter: string;
  instagram: string;
  linkedin: string;
  youtube: string;
};

export const SOCIAL_LINK_LABELS: Record<keyof SocialLinks, string> = {
  facebook: "Facebook",
  twitter: "X (Twitter)",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  youtube: "YouTube",
};
