"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { logAdminAction } from "@/lib/adminLog";
import {
  DEFAULT_SOCIAL_LINKS,
  SOCIAL_LINK_LABELS,
  type SocialLinks,
} from "@/lib/social-links";
const DOC_ID = "socialLinks";

export default function SocialMediaManager() {
  const { user } = useAdminAuth();
  const [links, setLinks] = useState<SocialLinks>(DEFAULT_SOCIAL_LINKS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchLinks = async () => {
    setLoading(true);
    if (!db) {
      setLoading(false);
      return;
    }
    try {
      const docRef = doc(db, "siteConfig", DOC_ID);
      const snapshot = await getDoc(docRef);
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  const handleSave = async () => {
    if (!db) return;
    setSaving(true);
    try {
      await setDoc(doc(db, "siteConfig", DOC_ID), links);
      if (user) {
        await logAdminAction({
          action: "update",
          resource: "siteConfig",
          resourceId: DOC_ID,
          details: "updated social media links",
          adminUid: user.uid,
          adminEmail: user.email ?? "",
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const updateLink = (key: keyof SocialLinks, value: string) => {
    setLinks((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="py-8 text-center text-gray-500 font-helvetica">
        Loading...
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-neue-kabel font-bold text-xl mb-4">
        Social Media Links
      </h2>
      <p className="font-helvetica text-sm text-gray-600 mb-6">
        Update the social media links shown on the{" "}
        <a
          href="/contact#social"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--primary)] hover:underline"
        >
          Contact page
        </a>
        . Leave a field empty to hide that platform.
      </p>

      <div className="space-y-4 max-w-xl">
        {(Object.keys(SOCIAL_LINK_LABELS) as (keyof SocialLinks)[]).map(
          (key) => (
            <div key={key}>
              <label className="block font-helvetica font-bold mb-2 text-sm">
                {SOCIAL_LINK_LABELS[key]}
              </label>
              <input
                type="url"
                value={links[key]}
                onChange={(e) => updateLink(key, e.target.value)}
                placeholder={`https://${key}.com/...`}
                className="w-full px-4 py-2 border border-gray-300 rounded-md font-helvetica"
              />
            </div>
          )
        )}
      </div>

      <div className="mt-6 flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-[var(--primary)] text-white font-helvetica font-bold rounded-md hover:bg-[var(--primary-dark)] disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
