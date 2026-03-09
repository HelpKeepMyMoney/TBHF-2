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
import { DEFAULT_BOARD_MEMBERS } from "@/lib/board-of-directors";
import type { BoardMember } from "@/lib/board-of-directors";

type BoardMemberWithId = BoardMember & { id: string };

export default function BoardOfDirectorsManager() {
  const { user } = useAdminAuth();
  const [members, setMembers] = useState<BoardMemberWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formState, setFormState] = useState<Partial<BoardMember>>({
    name: "",
    role: "",
    bio: "",
    image: "",
    order: 0,
  });
  const [saving, setSaving] = useState(false);

  const fetchMembers = async () => {
    setLoading(true);
    if (!db) {
      setLoading(false);
      return;
    }
    try {
      const q = query(
        collection(db, "boardOfDirectors"),
        orderBy("order", "asc")
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as BoardMemberWithId[];
      setMembers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleSeed = async () => {
    if (!confirm("Seed default board members? This will add 5 members.")) return;
    if (!db) return;
    setSaving(true);
    try {
      for (let i = 0; i < DEFAULT_BOARD_MEMBERS.length; i++) {
        const m = DEFAULT_BOARD_MEMBERS[i];
        const docRef = await addDoc(collection(db, "boardOfDirectors"), {
          ...m,
          order: m.order ?? i,
        });
        if (user) {
          await logAdminAction({
            action: "create",
            resource: "boardOfDirectors",
            resourceId: docRef.id,
            details: `seed: ${m.name}`,
            adminUid: user.uid,
            adminEmail: user.email ?? "",
          });
        }
      }
      await fetchMembers();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!formState.name || !formState.role || !formState.bio) return;
    setSaving(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, "boardOfDirectors", editingId), {
          name: formState.name,
          role: formState.role,
          bio: formState.bio,
          image: formState.image ?? "",
          order: formState.order ?? 0,
        });
        if (user) {
          await logAdminAction({
            action: "update",
            resource: "boardOfDirectors",
            resourceId: editingId,
            adminUid: user.uid,
            adminEmail: user.email ?? "",
          });
        }
      } else {
        const docRef = await addDoc(collection(db, "boardOfDirectors"), {
          name: formState.name,
          role: formState.role,
          bio: formState.bio,
          image: formState.image ?? "",
          order: members.length,
        });
        if (user) {
          await logAdminAction({
            action: "create",
            resource: "boardOfDirectors",
            resourceId: docRef.id,
            adminUid: user.uid,
            adminEmail: user.email ?? "",
          });
        }
      }
      setEditingId(null);
      setShowForm(false);
      setFormState({
        name: "",
        role: "",
        bio: "",
        image: "",
        order: members.length,
      });
      await fetchMembers();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this board member?")) return;
    if (!db) return;
    try {
      await deleteDoc(doc(db, "boardOfDirectors", id));
      setMembers((prev) => prev.filter((m) => m.id !== id));
      if (editingId === id) {
        setEditingId(null);
        setShowForm(false);
      }
      if (user) {
        await logAdminAction({
          action: "delete",
          resource: "boardOfDirectors",
          resourceId: id,
          adminUid: user.uid,
          adminEmail: user.email ?? "",
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const startEdit = (m: BoardMemberWithId) => {
    setEditingId(m.id);
    setFormState({
      name: m.name,
      role: m.role,
      bio: m.bio,
      image: m.image,
      order: m.order ?? 0,
    });
    setShowForm(true);
  };

  const startAdd = () => {
    setEditingId(null);
    setFormState({
      name: "",
      role: "",
      bio: "",
      image: "",
      order: members.length,
    });
    setShowForm(true);
  };

  return (
    <div>
      <h2 className="font-neue-kabel font-bold text-xl mb-4">
        Board of Directors
      </h2>
      <p className="font-helvetica text-sm text-gray-600 mb-4">
        Manage the cards displayed on the About page under &quot;Board of
        Directors&quot;.
      </p>

      <div className="flex flex-wrap gap-4 mb-6">
        <button
          onClick={startAdd}
          className="px-4 py-2 bg-[var(--primary)] text-white font-helvetica font-bold rounded-md hover:bg-[var(--primary-dark)] transition-colors"
        >
          Add Member
        </button>
        <button
          onClick={handleSeed}
          disabled={saving || members.length > 0}
          className="px-4 py-2 bg-gray-200 text-gray-700 font-helvetica font-bold rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Seed Default Members
        </button>
      </div>

      {showForm && (
        <div className="mb-6 p-6 border border-gray-200 rounded-lg bg-gray-50">
          <h3 className="font-neue-kabel font-bold mb-4">
            {editingId ? "Edit Member" : "New Member"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-helvetica font-bold mb-2 text-sm">
                Name
              </label>
              <input
                value={formState.name}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, name: e.target.value }))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-md"
                placeholder="e.g. Theresa Kennedy"
              />
            </div>
            <div>
              <label className="block font-helvetica font-bold mb-2 text-sm">
                Role
              </label>
              <input
                value={formState.role}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, role: e.target.value }))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-md"
                placeholder="e.g. Director and President"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block font-helvetica font-bold mb-2 text-sm">
                Bio
              </label>
              <textarea
                value={formState.bio}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, bio: e.target.value }))
                }
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-md"
                placeholder="e.g. Theresa brings over 15 years of experience..."
              />
            </div>
            <div className="md:col-span-2">
              <label className="block font-helvetica font-bold mb-2 text-sm">
                Image URL
              </label>
              <input
                value={formState.image}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, image: e.target.value }))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-md"
                placeholder="e.g. /theresakennedy2.jpg or full URL"
              />
              <p className="mt-1 text-xs text-gray-500">
                Use a path like /filename.jpg for images in the public folder, or
                a full URL for external images.
              </p>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleSave}
              disabled={
                saving ||
                !formState.name ||
                !formState.role ||
                !formState.bio
              }
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
      ) : members.length === 0 ? (
        <div className="py-8 text-center text-gray-500">
          No board members yet. Click &quot;Seed Default Members&quot; to add
          the current team, or &quot;Add Member&quot; to create one.
        </div>
      ) : (
        <div className="space-y-4">
          {members.map((m) => (
            <div
              key={m.id}
              className="flex justify-between items-start gap-4 p-4 border border-gray-200 rounded-lg"
            >
              <div className="flex gap-4 flex-1 min-w-0">
                {m.image && (
                  <div className="flex-shrink-0 w-16 h-16 rounded-md overflow-hidden bg-gray-100">
                    <img
                      src={m.image}
                      alt={m.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h4 className="font-neue-kabel font-bold">{m.name}</h4>
                  <p className="font-helvetica text-sm text-[var(--primary)] font-medium">
                    {m.role}
                  </p>
                  <p className="font-helvetica text-sm text-gray-600 mt-1 line-clamp-2">
                    {m.bio}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => startEdit(m)}
                  className="font-helvetica text-sm text-[var(--primary)] hover:underline"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(m.id)}
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
        {members.length} member{members.length !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
