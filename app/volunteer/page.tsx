import { Suspense } from "react";
import Layout from "@/components/common/Layout";
import VolunteerHero from "@/components/volunteer/VolunteerHero";
import VolunteerImpact from "@/components/volunteer/VolunteerImpact";
import VolunteerOpportunities from "@/components/volunteer/VolunteerOpportunities";
import ApplicationForm from "@/components/volunteer/ApplicationForm";
import NewsletterSection from "@/components/home/NewsletterSection";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Volunteer | The Black History Foundation",
  description: "Join our volunteer team and help preserve Black history and culture through various opportunities at The Black History Foundation.",
  keywords: "volunteer Black History Foundation, Black culture preservation, volunteer opportunities, community service, cultural education volunteering",
  openGraph: {
    title: "Volunteer | The Black History Foundation",
    description: "Join our volunteer team and help preserve Black history and culture through various opportunities at The Black History Foundation.",
    url: "/volunteer",
    siteName: "The Black History Foundation",
    images: [
      {
        url: "/Logos/TBHF_Logo_Full Color.png",
        width: 1200,
        height: 630,
        alt: "The Black History Foundation Logo"
      }
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Volunteer | The Black History Foundation",
    description: "Join our volunteer team and help preserve Black history and culture through various opportunities at The Black History Foundation.",
    images: ["/Logos/TBHF_Logo_Full Color.png"],
  },
};

export default function Volunteer() {
  return (
    <Layout>
      <VolunteerHero />
      <VolunteerImpact />
      <VolunteerOpportunities />
      <Suspense fallback={<div className="py-16 md:py-24 bg-white" />}>
        <ApplicationForm />
      </Suspense>
      <NewsletterSection />
    </Layout>
  );
}