"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/context/AdminAuthContext";
import NewsletterManager from "@/components/admin/NewsletterManager";
import VolunteerApplicationsManager from "@/components/admin/VolunteerApplicationsManager";
import VolunteerPositionsManager from "@/components/admin/VolunteerPositionsManager";
import VolunteerTestimonialsManager from "@/components/admin/VolunteerTestimonialsManager";
import BoardOfDirectorsManager from "@/components/admin/BoardOfDirectorsManager";
import ComingSoonCardsManager from "@/components/admin/ComingSoonCardsManager";
import ContactMessagesManager from "@/components/admin/ContactMessagesManager";
import AdminUsersManager from "@/components/admin/AdminUsersManager";
import AdminLogViewer from "@/components/admin/AdminLogViewer";
import SocialMediaManager from "@/components/admin/SocialMediaManager";
import { Mail, Users, Briefcase, LogOut, UsersRound, BookOpen, MessageSquareQuote, MessageCircle, Shield, ScrollText, Share2 } from "lucide-react";

type Tab = "newsletter" | "applications" | "positions" | "testimonials" | "board" | "comingSoon" | "contactMessages" | "socialMedia" | "adminUsers" | "adminLog";

export default function AdminDashboardPage() {
  const { user, isAdmin, loading, logout } = useAdminAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("newsletter");

  useEffect(() => {
    if (!loading && user === null) {
      router.replace("/admin");
      return;
    }
    if (!loading && user && isAdmin === false) {
      router.replace("/admin");
    }
  }, [user, isAdmin, loading, router]);

  const handleLogout = async () => {
    await logout();
    router.replace("/admin");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin h-8 w-8 border-2 border-[var(--primary)] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "newsletter", label: "Newsletter", icon: <Mail size={18} /> },
    { id: "contactMessages", label: "Contact Messages", icon: <MessageCircle size={18} /> },
    { id: "applications", label: "Volunteer Applications", icon: <Users size={18} /> },
    { id: "positions", label: "Volunteer Positions", icon: <Briefcase size={18} /> },
    { id: "testimonials", label: "Volunteer Testimonials", icon: <MessageSquareQuote size={18} /> },
    { id: "board", label: "Board of Directors", icon: <UsersRound size={18} /> },
    { id: "comingSoon", label: "Coming Soon Cards", icon: <BookOpen size={18} /> },
    { id: "socialMedia", label: "Social Media", icon: <Share2 size={18} /> },
    { id: "adminUsers", label: "Admin Users", icon: <Shield size={18} /> },
    { id: "adminLog", label: "Activity Log", icon: <ScrollText size={18} /> },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h1 className="font-neue-kabel font-bold text-2xl">Admin Dashboard</h1>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-[var(--primary)] font-helvetica text-sm transition-colors"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-helvetica transition-colors ${
              activeTab === tab.id
                ? "bg-[var(--primary)] text-white"
                : "bg-white hover:bg-gray-100 text-gray-700"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        {activeTab === "newsletter" && <NewsletterManager />}
        {activeTab === "contactMessages" && <ContactMessagesManager />}
        {activeTab === "applications" && <VolunteerApplicationsManager />}
        {activeTab === "positions" && <VolunteerPositionsManager />}
        {activeTab === "testimonials" && <VolunteerTestimonialsManager />}
        {activeTab === "board" && <BoardOfDirectorsManager />}
        {activeTab === "comingSoon" && <ComingSoonCardsManager />}
        {activeTab === "socialMedia" && <SocialMediaManager />}
        {activeTab === "adminUsers" && <AdminUsersManager />}
        {activeTab === "adminLog" && <AdminLogViewer />}
      </div>
    </div>
  );
}
