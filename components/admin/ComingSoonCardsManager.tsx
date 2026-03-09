"use client";

import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { logAdminAction } from "@/lib/adminLog";
import {
  DEFAULT_COMING_SOON_CARDS,
  type ComingSoonCard,
  type ComingSoonCardIcon,
} from "@/lib/coming-soon-cards";

const ICON_OPTIONS: { value: ComingSoonCardIcon; label: string }[] = [
  { value: "book", label: "Book" },
  { value: "video", label: "Video" },
  { value: "archive", label: "Archive" },
  { value: "blockchain", label: "Blockchain" },
  { value: "default", label: "Default" },
];

export default function ComingSoonCardsManager() {
  const { user } = useAdminAuth();
  const [cards, setCards] = useState<(ComingSoonCard & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formState, setFormState] = useState<Partial<ComingSoonCard>>({
    title: "",
    description: "",
    icon: "default",
    order: 0,
    expectedTimeframe: "Coming Soon",
  });
  const [saving, setSaving] = useState(false);

  const fetchCards = async () => {
    setLoading(true);
    if (!db) {
      setLoading(false);
      return;
    }
    try {
      const q = query(
        collection(db, "comingSoonCards"),
        orderBy("order", "asc")
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as (ComingSoonCard & { id: string })[];
      setCards(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCards();
  }, []);

  const handleSeed = async () => {
    if (
      !confirm(
        "Seed default coming soon cards? This will add 4 cards to the educational page."
      )
    )
      return;
    if (!db) return;
    setSaving(true);
    try {
      for (let i = 0; i < DEFAULT_COMING_SOON_CARDS.length; i++) {
        const c = DEFAULT_COMING_SOON_CARDS[i];
        const docRef = await addDoc(collection(db, "comingSoonCards"), {
          ...c,
          order: c.order ?? i,
          expectedTimeframe: c.expectedTimeframe ?? "Coming Soon",
        });
        if (user) {
          await logAdminAction({
            action: "create",
            resource: "comingSoonCards",
            resourceId: docRef.id,
            details: `seed: ${c.title}`,
            adminUid: user.uid,
            adminEmail: user.email ?? "",
          });
        }
      }
      await fetchCards();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!formState.title || !formState.description) return;
    if (!db) return;
    setSaving(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, "comingSoonCards", editingId), {
          title: formState.title,
          description: formState.description,
          icon: formState.icon ?? "default",
          order: formState.order ?? 0,
          expectedTimeframe: formState.expectedTimeframe ?? "Coming Soon",
        });
        if (user) {
          await logAdminAction({
            action: "update",
            resource: "comingSoonCards",
            resourceId: editingId,
            adminUid: user.uid,
            adminEmail: user.email ?? "",
          });
        }
      } else {
        const docRef = await addDoc(collection(db, "comingSoonCards"), {
          title: formState.title,
          description: formState.description,
          icon: formState.icon ?? "default",
          order: formState.order ?? cards.length,
          expectedTimeframe: formState.expectedTimeframe ?? "Coming Soon",
        });
        if (user) {
          await logAdminAction({
            action: "create",
            resource: "comingSoonCards",
            resourceId: docRef.id,
            adminUid: user.uid,
            adminEmail: user.email ?? "",
          });
        }
      }
      setEditingId(null);
      setShowForm(false);
      setFormState({
        title: "",
        description: "",
        icon: "default",
        order: cards.length,
        expectedTimeframe: "Coming Soon",
      });
      await fetchCards();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this coming soon card?")) return;
    if (!db) return;
    try {
      await deleteDoc(doc(db, "comingSoonCards", id));
      setCards((prev) => prev.filter((c) => c.id !== id));
      if (editingId === id) {
        setEditingId(null);
        setShowForm(false);
      }
      if (user) {
        await logAdminAction({
          action: "delete",
          resource: "comingSoonCards",
          resourceId: id,
          adminUid: user.uid,
          adminEmail: user.email ?? "",
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const startEdit = (c: ComingSoonCard & { id: string }) => {
    setEditingId(c.id);
    setFormState({
      title: c.title,
      description: c.description,
      icon: c.icon ?? "default",
      order: c.order ?? 0,
      expectedTimeframe: c.expectedTimeframe ?? "Coming Soon",
    });
    setShowForm(true);
  };

  const startAdd = () => {
    setEditingId(null);
    setFormState({
      title: "",
      description: "",
      icon: "default",
      order: cards.length,
      expectedTimeframe: "Coming Soon",
    });
    setShowForm(true);
  };

  return (
    <div>
      <h2 className="font-neue-kabel font-bold text-xl mb-4">
        Coming Soon Cards (Educational Page)
      </h2>

      <div className="flex flex-wrap gap-4 mb-6">
        <button
          onClick={startAdd}
          className="px-4 py-2 bg-[var(--primary)] text-white font-helvetica font-bold rounded-md hover:bg-[var(--primary-dark)] transition-colors"
        >
          Add Card
        </button>
        <button
          onClick={handleSeed}
          disabled={saving || cards.length > 0}
          className="px-4 py-2 bg-gray-200 text-gray-700 font-helvetica font-bold rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Seed Default Cards
        </button>
      </div>

      {showForm && (
        <div className="mb-6 p-6 border border-gray-200 rounded-lg bg-gray-50">
          <h3 className="font-neue-kabel font-bold mb-4">
            {editingId ? "Edit Card" : "New Card"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-helvetica font-bold mb-2 text-sm">
                Title
              </label>
              <input
                value={formState.title}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, title: e.target.value }))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-md"
                placeholder="e.g. Interactive Learning Modules"
              />
            </div>
            <div>
              <label className="block font-helvetica font-bold mb-2 text-sm">
                Icon
              </label>
              <select
                value={formState.icon}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    icon: e.target.value as ComingSoonCardIcon,
                  }))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-md"
              >
                {ICON_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block font-helvetica font-bold mb-2 text-sm">
                Description
              </label>
              <textarea
                value={formState.description}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-md"
                placeholder="Brief description of the upcoming resource"
              />
            </div>
            <div>
              <label className="block font-helvetica font-bold mb-2 text-sm">
                Order
              </label>
              <input
                type="number"
                min={0}
                value={formState.order ?? 0}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    order: parseInt(e.target.value, 10) || 0,
                  }))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block font-helvetica font-bold mb-2 text-sm">
                Expected Timeframe
              </label>
              <input
                value={formState.expectedTimeframe ?? "Coming Soon"}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    expectedTimeframe: e.target.value || "Coming Soon",
                  }))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-md"
                placeholder="e.g. Coming Soon, Q2 2025"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleSave}
              disabled={saving || !formState.title || !formState.description}
              className="px-4 py-2 bg-[var(--primary)] text-white font-helvetica font-bold rounded-md hover:bg-[var(--primary-dark)] disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 font-helvetica font-bold rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-gray-500">Loading...</div>
      ) : cards.length === 0 ? (
        <div className="py-8 text-center text-gray-500">
          No coming soon cards yet. Click &quot;Seed Default Cards&quot; to add
          the default 4 cards, or &quot;Add Card&quot; to create one.
        </div>
      ) : (
        <div className="space-y-4">
          {cards.map((c) => (
            <div
              key={c.id}
              className="flex justify-between items-start p-4 border border-gray-200 rounded-lg"
            >
              <div>
                <h4 className="font-neue-kabel font-bold">{c.title}</h4>
                <p className="font-helvetica text-sm text-gray-600 mt-1 line-clamp-2">
                  {c.description}
                </p>
                <span className="inline-block mt-2 text-xs text-gray-500">
                  Icon: {c.icon ?? "default"} • Order: {c.order ?? 0}
                  {c.expectedTimeframe && ` • ${c.expectedTimeframe}`}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => startEdit(c)}
                  className="font-helvetica text-sm text-[var(--primary)] hover:underline"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="font-helvetica text-sm text-red-600 hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-4 text-sm text-gray-500 font-helvetica">
        {cards.length} card{cards.length !== 1 ? "s" : ""} • Shown on{" "}
        <a
          href="/educational"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--primary)] hover:underline"
        >
          /educational
        </a>
      </p>
    </div>
  );
}
