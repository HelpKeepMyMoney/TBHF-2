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
import { DEFAULT_VOLUNTEER_TESTIMONIALS } from "@/lib/volunteer-testimonials";
import type { VolunteerTestimonial } from "@/lib/volunteer-testimonials";

type TestimonialWithId = VolunteerTestimonial & { id: string };

export default function VolunteerTestimonialsManager() {
  const { user } = useAdminAuth();
  const [testimonials, setTestimonials] = useState<TestimonialWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formState, setFormState] = useState<Partial<VolunteerTestimonial>>({
    quote: "",
    name: "",
    role: "",
    image: "",
    order: 0,
  });
  const [saving, setSaving] = useState(false);

  const fetchTestimonials = async () => {
    setLoading(true);
    if (!db) {
      setLoading(false);
      return;
    }
    try {
      const q = query(
        collection(db, "volunteerTestimonials"),
        orderBy("order", "asc")
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as TestimonialWithId[];
      setTestimonials(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTestimonials();
  }, []);

  const handleSeed = async () => {
    if (!confirm("Seed default testimonials? This will add 3 testimonials."))
      return;
    if (!db) return;
    setSaving(true);
    try {
      for (let i = 0; i < DEFAULT_VOLUNTEER_TESTIMONIALS.length; i++) {
        const t = DEFAULT_VOLUNTEER_TESTIMONIALS[i];
        const docRef = await addDoc(collection(db, "volunteerTestimonials"), {
          ...t,
          order: t.order ?? i,
        });
        if (user) {
          await logAdminAction({
            action: "create",
            resource: "volunteerTestimonials",
            resourceId: docRef.id,
            details: `seed: ${t.name}`,
            adminUid: user.uid,
            adminEmail: user.email ?? "",
          });
        }
      }
      await fetchTestimonials();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!formState.quote || !formState.name || !formState.role) return;
    setSaving(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, "volunteerTestimonials", editingId), {
          quote: formState.quote,
          name: formState.name,
          role: formState.role,
          image: formState.image ?? "",
          order: formState.order ?? 0,
        });
        if (user) {
          await logAdminAction({
            action: "update",
            resource: "volunteerTestimonials",
            resourceId: editingId,
            adminUid: user.uid,
            adminEmail: user.email ?? "",
          });
        }
      } else {
        const docRef = await addDoc(collection(db, "volunteerTestimonials"), {
          quote: formState.quote,
          name: formState.name,
          role: formState.role,
          image: formState.image ?? "",
          order: testimonials.length,
        });
        if (user) {
          await logAdminAction({
            action: "create",
            resource: "volunteerTestimonials",
            resourceId: docRef.id,
            adminUid: user.uid,
            adminEmail: user.email ?? "",
          });
        }
      }
      setEditingId(null);
      setShowForm(false);
      setFormState({
        quote: "",
        name: "",
        role: "",
        image: "",
        order: testimonials.length,
      });
      await fetchTestimonials();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this testimonial?")) return;
    if (!db) return;
    try {
      await deleteDoc(doc(db, "volunteerTestimonials", id));
      setTestimonials((prev) => prev.filter((t) => t.id !== id));
      if (editingId === id) {
        setEditingId(null);
        setShowForm(false);
      }
      if (user) {
        await logAdminAction({
          action: "delete",
          resource: "volunteerTestimonials",
          resourceId: id,
          adminUid: user.uid,
          adminEmail: user.email ?? "",
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const startEdit = (t: TestimonialWithId) => {
    setEditingId(t.id);
    setFormState({
      quote: t.quote,
      name: t.name,
      role: t.role,
      image: t.image,
      order: t.order ?? 0,
    });
    setShowForm(true);
  };

  const startAdd = () => {
    setEditingId(null);
    setFormState({
      quote: "",
      name: "",
      role: "",
      image: "",
      order: testimonials.length,
    });
    setShowForm(true);
  };

  return (
    <div>
      <h2 className="font-neue-kabel font-bold text-xl mb-4">
        Volunteer Testimonials
      </h2>
      <p className="font-helvetica text-sm text-gray-600 mb-4">
        Manage the testimonials displayed on the home page in the &quot;Get
        Involved&quot; section. These appear in a rotating carousel.
      </p>

      <div className="flex flex-wrap gap-4 mb-6">
        <button
          onClick={startAdd}
          className="px-4 py-2 bg-[var(--primary)] text-white font-helvetica font-bold rounded-md hover:bg-[var(--primary-dark)] transition-colors"
        >
          Add Testimonial
        </button>
        <button
          onClick={handleSeed}
          disabled={saving || testimonials.length > 0}
          className="px-4 py-2 bg-gray-200 text-gray-700 font-helvetica font-bold rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Seed Default Testimonials
        </button>
      </div>

      {showForm && (
        <div className="mb-6 p-6 border border-gray-200 rounded-lg bg-gray-50">
          <h3 className="font-neue-kabel font-bold mb-4">
            {editingId ? "Edit Testimonial" : "New Testimonial"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block font-helvetica font-bold mb-2 text-sm">
                Quote
              </label>
              <textarea
                value={formState.quote}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, quote: e.target.value }))
                }
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-md"
                placeholder="Testimonial quote..."
              />
            </div>
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
                placeholder="e.g. Michelle Johnson"
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
                placeholder="e.g. Research Volunteer"
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
                placeholder="e.g. https://ui-avatars.com/api/?name=Name&size=96&background=B22222&color=fff"
              />
              <p className="mt-1 text-xs text-gray-500">
                Leave empty for auto-generated avatar. Use ui-avatars.com format
                or any image URL.
              </p>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleSave}
              disabled={
                saving ||
                !formState.quote ||
                !formState.name ||
                !formState.role
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
      ) : testimonials.length === 0 ? (
        <div className="py-8 text-center text-gray-500">
          No testimonials yet. Click &quot;Seed Default Testimonials&quot; to add
          the default 3, or &quot;Add Testimonial&quot; to create one.
        </div>
      ) : (
        <div className="space-y-4">
          {testimonials.map((t) => (
            <div
              key={t.id}
              className="flex justify-between items-start gap-4 p-4 border border-gray-200 rounded-lg"
            >
              <div className="flex gap-4 flex-1 min-w-0">
                {t.image && (
                  <div className="flex-shrink-0 w-16 h-16 rounded-full overflow-hidden bg-gray-100">
                    <img
                      src={t.image}
                      alt={t.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h4 className="font-neue-kabel font-bold">{t.name}</h4>
                  <p className="font-helvetica text-sm text-[var(--primary)] font-medium">
                    {t.role}
                  </p>
                  <p className="font-helvetica text-sm text-gray-600 mt-1 line-clamp-2">
                    &quot;{t.quote}&quot;
                  </p>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => startEdit(t)}
                  className="font-helvetica text-sm text-[var(--primary)] hover:underline"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(t.id)}
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
        {testimonials.length} testimonial{testimonials.length !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
