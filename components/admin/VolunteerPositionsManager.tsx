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
import { DEFAULT_VOLUNTEER_POSITIONS } from "@/lib/volunteer-positions";
import type { VolunteerPosition } from "@/components/volunteer/VolunteerOpportunities";

const CATEGORIES = ["research", "outreach", "education", "digital", "events", "tech"];

export default function VolunteerPositionsManager() {
  const { user } = useAdminAuth();
  const [positions, setPositions] = useState<(VolunteerPosition & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formState, setFormState] = useState<Partial<VolunteerPosition>>({
    title: "",
    description: "",
    commitment: "",
    location: "Remote",
    category: "research",
    order: 0,
  });
  const [saving, setSaving] = useState(false);

  const fetchPositions = async () => {
    setLoading(true);
    if (!db) {
      setLoading(false);
      return;
    }
    try {
      const q = query(
        collection(db, "volunteerPositions"),
        orderBy("order", "asc")
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as (VolunteerPosition & { id: string })[];
      setPositions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPositions();
  }, []);

  const handleSeed = async () => {
    if (!confirm("Seed default positions? This will add 8 positions.")) return;
    if (!db) return;
    setSaving(true);
    try {
      for (let i = 0; i < DEFAULT_VOLUNTEER_POSITIONS.length; i++) {
        const p = DEFAULT_VOLUNTEER_POSITIONS[i];
        const docRef = await addDoc(collection(db, "volunteerPositions"), {
          ...p,
          order: p.order ?? i,
        });
        if (user) {
          await logAdminAction({
            action: "create",
            resource: "volunteerPositions",
            resourceId: docRef.id,
            details: `seed: ${p.title}`,
            adminUid: user.uid,
            adminEmail: user.email ?? "",
          });
        }
      }
      await fetchPositions();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!formState.title || !formState.description) return;
    setSaving(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, "volunteerPositions", editingId), {
          title: formState.title,
          description: formState.description,
          commitment: formState.commitment ?? "",
          location: formState.location ?? "Remote",
          category: formState.category ?? "research",
          order: formState.order ?? 0,
        });
        setPositions((prev) =>
          prev.map((p) =>
            p.id === editingId ? { ...p, ...formState } : p
          )
        );
        if (user) {
          await logAdminAction({
            action: "update",
            resource: "volunteerPositions",
            resourceId: editingId,
            adminUid: user.uid,
            adminEmail: user.email ?? "",
          });
        }
      } else {
        const docRef = await addDoc(collection(db, "volunteerPositions"), {
          title: formState.title,
          description: formState.description,
          commitment: formState.commitment ?? "",
          location: formState.location ?? "Remote",
          category: formState.category ?? "research",
          order: positions.length,
        });
        setPositions((prev) => [
          ...prev,
          { id: docRef.id, ...formState } as VolunteerPosition & { id: string },
        ]);
        if (user) {
          await logAdminAction({
            action: "create",
            resource: "volunteerPositions",
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
        commitment: "",
        location: "Remote",
        category: "research",
        order: positions.length,
      });
      await fetchPositions();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this position?")) return;
    if (!db) return;
    try {
      await deleteDoc(doc(db, "volunteerPositions", id));
      setPositions((prev) => prev.filter((p) => p.id !== id));
      if (editingId === id) {
        setEditingId(null);
        setShowForm(false);
      }
      if (user) {
        await logAdminAction({
          action: "delete",
          resource: "volunteerPositions",
          resourceId: id,
          adminUid: user.uid,
          adminEmail: user.email ?? "",
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const startEdit = (p: VolunteerPosition & { id: string }) => {
    setEditingId(p.id);
    setFormState({
      title: p.title,
      description: p.description,
      commitment: p.commitment,
      location: p.location,
      category: p.category,
      order: p.order ?? 0,
    });
    setShowForm(true);
  };

  const startAdd = () => {
    setEditingId(null);
    setFormState({
      title: "",
      description: "",
      commitment: "",
      location: "Remote",
      category: "research",
      order: positions.length,
    });
    setShowForm(true);
  };

  return (
    <div>
      <h2 className="font-neue-kabel font-bold text-xl mb-4">
        Volunteer Positions
      </h2>

      <div className="flex flex-wrap gap-4 mb-6">
        <button
          onClick={startAdd}
          className="px-4 py-2 bg-[var(--primary)] text-white font-helvetica font-bold rounded-md hover:bg-[var(--primary-dark)] transition-colors"
        >
          Add Position
        </button>
        <button
          onClick={handleSeed}
          disabled={saving || positions.length > 0}
          className="px-4 py-2 bg-gray-200 text-gray-700 font-helvetica font-bold rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Seed Default Positions
        </button>
      </div>

      {showForm && (
        <div className="mb-6 p-6 border border-gray-200 rounded-lg bg-gray-50">
          <h3 className="font-neue-kabel font-bold mb-4">
            {editingId ? "Edit Position" : "New Position"}
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
              />
            </div>
            <div>
              <label className="block font-helvetica font-bold mb-2 text-sm">
                Category
              </label>
              <select
                value={formState.category}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, category: e.target.value }))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-md"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-helvetica font-bold mb-2 text-sm">
                Commitment
              </label>
              <input
                value={formState.commitment}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, commitment: e.target.value }))
                }
                placeholder="e.g. 5-10 hours/week"
                className="w-full px-4 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block font-helvetica font-bold mb-2 text-sm">
                Location
              </label>
              <select
                value={formState.location}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, location: e.target.value }))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-md"
              >
                <option value="Remote">Remote</option>
                <option value="Local">Local</option>
                <option value="Local/Remote">Local/Remote</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block font-helvetica font-bold mb-2 text-sm">
                Description
              </label>
              <textarea
                value={formState.description}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, description: e.target.value }))
                }
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-md"
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
      ) : positions.length === 0 ? (
        <div className="py-8 text-center text-gray-500">
          No positions yet. Click &quot;Seed Default Positions&quot; to add the
          default 8 positions, or &quot;Add Position&quot; to create one.
        </div>
      ) : (
        <div className="space-y-4">
          {positions.map((p) => (
            <div
              key={p.id}
              className="flex justify-between items-start p-4 border border-gray-200 rounded-lg"
            >
              <div>
                <h4 className="font-neue-kabel font-bold">{p.title}</h4>
                <p className="font-helvetica text-sm text-gray-600 mt-1">
                  {p.category} • {p.location} • {p.commitment}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => startEdit(p)}
                  className="font-helvetica text-sm text-[var(--primary)] hover:underline"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
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
        {positions.length} position{positions.length !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
