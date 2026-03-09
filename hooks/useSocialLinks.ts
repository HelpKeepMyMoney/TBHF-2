"use client";

import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  DEFAULT_SOCIAL_LINKS,
  type SocialLinks,
} from "@/lib/social-links";

const DOC_ID = "socialLinks";

export function useSocialLinks(): SocialLinks {
  const [links, setLinks] = useState<SocialLinks>(DEFAULT_SOCIAL_LINKS);

  useEffect(() => {
    if (!db) return;
    const fetchLinks = async () => {
      try {
        const snapshot = await getDoc(doc(db, "siteConfig", DOC_ID));
        if (snapshot.exists()) {
          const data = snapshot.data();
          setLinks({
            facebook: data.facebook ?? DEFAULT_SOCIAL_LINKS.facebook,
            twitter: data.twitter ?? DEFAULT_SOCIAL_LINKS.twitter,
            instagram: data.instagram ?? DEFAULT_SOCIAL_LINKS.instagram,
            linkedin: data.linkedin ?? DEFAULT_SOCIAL_LINKS.linkedin,
            youtube: data.youtube ?? DEFAULT_SOCIAL_LINKS.youtube,
          });
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchLinks();
  }, []);

  return links;
}
