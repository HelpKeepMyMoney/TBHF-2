"use client";

import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { logAdminAction } from "@/lib/adminLog";

interface NewsletterSubscriber {
  id: string;
  email: string;
  subscribedAt: { seconds: number } | null;
  status?: "pending" | "confirmed";
}

export default function NewsletterManager() {
  const { user } = useAdminAuth();
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchSubscribers = async () => {
    setLoading(true);
    if (!db) {
      setLoading(false);
      return;
    }
    try {
      const q = query(
        collection(db, "newsletter"),
        orderBy("subscribedAt", "desc")
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        email: doc.data().email,
        subscribedAt: doc.data().subscribedAt,
        status: doc.data().status,
      })) as NewsletterSubscriber[];
      setSubscribers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscribers();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this subscriber?")) return;
    if (!db) return;
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, "newsletter", id));
      setSubscribers((prev) => prev.filter((s) => s.id !== id));
      if (user) {
        await logAdminAction({
          action: "delete",
          resource: "newsletter",
          resourceId: id,
          adminUid: user.uid,
          adminEmail: user.email ?? "",
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleExport = () => {
    const filtered = filteredSubscribers;
    const headers = ["Email", "Status", "Subscribed At"];
    const rows = filtered.map((s) => [
      s.email,
      s.status === "pending" ? "Pending" : s.status === "confirmed" ? "Confirmed" : "Confirmed",
      s.subscribedAt
        ? new Date(s.subscribedAt.seconds * 1000).toISOString()
        : "",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredSubscribers = subscribers.filter((s) =>
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <h2 className="font-neue-kabel font-bold text-xl mb-4">
        Newsletter Subscribers
      </h2>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <input
          type="text"
          placeholder="Search by email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        />
        <button
          onClick={handleExport}
          className="px-4 py-2 bg-[var(--primary)] text-white font-helvetica font-bold rounded-md hover:bg-[var(--primary-dark)] transition-colors"
        >
          Export CSV
        </button>
      </div>

      {loading ? (
        <div className="py-8 text-center text-gray-500">Loading...</div>
      ) : filteredSubscribers.length === 0 ? (
        <div className="py-8 text-center text-gray-500">
          No subscribers found.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="py-3 font-helvetica font-bold">Email</th>
                <th className="py-3 font-helvetica font-bold">Status</th>
                <th className="py-3 font-helvetica font-bold">Subscribed</th>
                <th className="py-3 font-helvetica font-bold w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubscribers.map((s) => (
                <tr key={s.id} className="border-b border-gray-100">
                  <td className="py-3 font-helvetica">{s.email}</td>
                  <td className="py-3 font-helvetica text-sm">
                    <span
                      className={
                        s.status === "pending"
                          ? "text-amber-600 font-medium"
                          : "text-gray-600"
                      }
                    >
                      {s.status === "pending"
                        ? "Pending"
                        : s.status === "confirmed"
                          ? "Confirmed"
                          : "Confirmed"}
                    </span>
                  </td>
                  <td className="py-3 font-helvetica text-sm text-gray-600">
                    {s.subscribedAt
                      ? new Date(s.subscribedAt.seconds * 1000).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="py-3">
                    <button
                      onClick={() => handleDelete(s.id)}
                      disabled={deletingId === s.id}
                      className="text-red-600 hover:text-red-800 font-helvetica text-sm disabled:opacity-50"
                    >
                      {deletingId === s.id ? "Deleting..." : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-sm text-gray-500 font-helvetica">
        {filteredSubscribers.length} subscriber{filteredSubscribers.length !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
