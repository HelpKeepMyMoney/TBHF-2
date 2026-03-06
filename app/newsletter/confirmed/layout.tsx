import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Newsletter Confirmed | The Black History Foundation",
  description: "Your newsletter subscription has been confirmed.",
};

export default function NewsletterConfirmedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
