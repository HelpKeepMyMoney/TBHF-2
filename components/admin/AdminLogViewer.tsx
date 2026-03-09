"use client";

import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { RefreshCw } from "lucide-react";
import { db } from "@/lib/firebase";

interface AdminLogEntry {
  id: string;
  action: string;
  resource: string;
  resourceId: string;
  details?: string;
  adminUid: string;
  adminEmail: string;
  timestamp: { seconds: number } | null;
}

const RESOURCE_LABELS: Record<string, string> = {
  newsletter: "Newsletter",
  contactMessages: "Contact Messages",
  volunteerApplications: "Volunteer Applications",
  volunteerPositions: "Volunteer Positions",
  volunteerTestimonials: "Volunteer Testimonials",
  boardOfDirectors: "Board of Directors",
  comingSoonCards: "Coming Soon Cards",
  adminUsers: "Admin Users",
  adminInvites: "Admin Invites",
};

const ACTION_LABELS: Record<string, string> = {
  create: "Created",
  update: "Updated",
  delete: "Deleted",
};

export default function AdminLogViewer() {
  const [entries, setEntries] = useState<AdminLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  const fetchLogs = async () => {
    if (!db) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const q = query(
        collection(db, "adminLogs"),
        orderBy("timestamp", "desc"),
        limit(200)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as AdminLogEntry[];
      setEntries(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredEntries =
    filter === "all"
      ? entries
      : entries.filter((e) => e.resource === filter);

  const formatDate = (ts: { seconds: number } | null) => {
    if (!ts) return "—";
    return new Date(ts.seconds * 1000).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const resources = Array.from(
    new Set(entries.map((e) => e.resource).filter(Boolean))
  ).sort();

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h2 className="font-neue-kabel font-bold text-xl">Admin Activity Log</h2>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 font-helvetica text-sm rounded-md hover:bg-gray-300 disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-md font-helvetica text-sm transition-colors ${
            filter === "all"
              ? "bg-[var(--primary)] text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          All
        </button>
        {resources.map((r) => (
          <button
            key={r}
            onClick={() => setFilter(r)}
            className={`px-4 py-2 rounded-md font-helvetica text-sm transition-colors ${
              filter === r
                ? "bg-[var(--primary)] text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            {RESOURCE_LABELS[r] ?? r}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-8 text-center text-gray-500">Loading...</div>
      ) : filteredEntries.length === 0 ? (
        <div className="py-8 text-center text-gray-500">
          No admin activity logged yet.
        </div>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="py-3 px-4 font-helvetica font-bold">Time</th>
                <th className="py-3 px-4 font-helvetica font-bold">Action</th>
                <th className="py-3 px-4 font-helvetica font-bold">Resource</th>
                <th className="py-3 px-4 font-helvetica font-bold">Details</th>
                <th className="py-3 px-4 font-helvetica font-bold">Admin</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map((e) => (
                <tr key={e.id} className="border-b border-gray-100">
                  <td className="py-3 px-4 font-helvetica text-sm text-gray-600">
                    {formatDate(e.timestamp)}
                  </td>
                  <td className="py-3 px-4 font-helvetica">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        e.action === "create"
                          ? "bg-green-100 text-green-800"
                          : e.action === "update"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-red-100 text-red-800"
                      }`}
                    >
                      {ACTION_LABELS[e.action] ?? e.action}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-helvetica text-sm">
                    {RESOURCE_LABELS[e.resource] ?? e.resource}
                  </td>
                  <td className="py-3 px-4 font-helvetica text-sm text-gray-600 max-w-xs truncate">
                    {e.details ?? e.resourceId}
                  </td>
                  <td className="py-3 px-4 font-helvetica text-sm">
                    {e.adminEmail || "(unknown)"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-sm text-gray-500 font-helvetica">
        Showing last {filteredEntries.length} entries
      </p>
    </div>
  );
}
