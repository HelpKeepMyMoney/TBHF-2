"use client";

import { useState, useEffect, useRef } from "react";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { logAdminAction } from "@/lib/adminLog";
import { DEFAULT_VOLUNTEER_POSITIONS } from "@/lib/volunteer-positions";
import type { VolunteerPosition } from "@/lib/types/volunteer";

const CATEGORIES = ["research", "outreach", "education", "digital", "events", "tech"];

const VOLUNTEER_FORM_BASE = typeof window !== "undefined"
  ? `${window.location.origin}/volunteer`
  : "https://theblackhistoryfoundation.org/volunteer";

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
    published: false,
  });
  const [saving, setSaving] = useState(false);
  const [createLinkedInJd, setCreateLinkedInJd] = useState(false);
  const [showJdModal, setShowJdModal] = useState(false);
  const [jdDraft, setJdDraft] = useState("");
  const [jdPositionId, setJdPositionId] = useState<string | null>(null);
  const [jdGenerating, setJdGenerating] = useState(false);
  const [jdSaving, setJdSaving] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (showForm && formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [showForm]);

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
          published: true,
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
    if (!formState.title || !formState.description || !db) return;
    setSaving(true);
    try {
      let savedId: string;
      if (editingId) {
        await updateDoc(doc(db, "volunteerPositions", editingId), {
          title: formState.title,
          description: formState.description,
          commitment: formState.commitment ?? "",
          location: formState.location ?? "Remote",
          category: formState.category ?? "research",
          order: formState.order ?? 0,
          published: formState.published ?? false,
          createLinkedInJobDescription: createLinkedInJd,
        });
        savedId = editingId;
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
          published: formState.published ?? false,
          createLinkedInJobDescription: createLinkedInJd,
        });
        savedId = docRef.id;
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

      if (createLinkedInJd && user) {
        setJdPositionId(savedId);
        setJdGenerating(true);
        setShowJdModal(true);
        setEditingId(null);
        setShowForm(false);
        setFormState({
          title: "",
          description: "",
          commitment: "",
          location: "Remote",
          category: "research",
          order: positions.length,
          published: false,
        });
        setCreateLinkedInJd(false);
        try {
          const token = await user.getIdToken();
          const res = await fetch("/api/generate-job-description", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: token ? `Bearer ${token}` : "",
            },
            body: JSON.stringify({
              title: formState.title,
              description: formState.description,
              commitment: formState.commitment ?? "",
              location: formState.location ?? "Remote",
              category: formState.category ?? "research",
            }),
          });
          const data = await res.json();
          if (res.ok && data.draft) {
            setJdDraft(data.draft);
          } else {
            const errMsg = data.details || data.error || "Failed to generate. Please try again or write manually.";
            setJdDraft(`Error: ${errMsg}`);
          }
        } catch (err) {
          setJdDraft(`Error: ${err instanceof Error ? err.message : "Failed to generate. Please try again or write manually."}`);
        } finally {
          setJdGenerating(false);
        }
      } else {
        setEditingId(null);
        setShowForm(false);
        setFormState({
          title: "",
          description: "",
          commitment: "",
          location: "Remote",
          category: "research",
          order: positions.length,
          published: false,
        });
        setCreateLinkedInJd(false);
      }
      await fetchPositions();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveJobDescription = async () => {
    if (!jdPositionId || !db) return;
    setJdSaving(true);
    try {
      await updateDoc(doc(db, "volunteerPositions", jdPositionId), {
        linkedInJobDescription: jdDraft,
        linkedInJobDescriptionSavedAt: serverTimestamp(),
      });
      setPositions((prev) =>
        prev.map((p) =>
          p.id === jdPositionId
            ? { ...p, linkedInJobDescription: jdDraft }
            : p
        )
      );
      setShowJdModal(false);
      setJdPositionId(null);
      setJdDraft("");
      if (user) {
        await logAdminAction({
          action: "update",
          resource: "volunteerPositions",
          resourceId: jdPositionId,
          details: "saved LinkedIn job description",
          adminUid: user.uid,
          adminEmail: user.email ?? "",
        });
      }
      await fetchPositions();
    } catch (err) {
      console.error(err);
    } finally {
      setJdSaving(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert("Copied to clipboard!");
    } catch {
      alert("Failed to copy.");
    }
  };

  const getFormLink = (positionId: string) =>
    `${VOLUNTEER_FORM_BASE}?position=${positionId}#apply`;

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
      published: p.published ?? false,
    });
    setCreateLinkedInJd(!!p.createLinkedInJobDescription);
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
      published: false,
    });
    setCreateLinkedInJd(false);
    setShowForm(true);
  };

  const handleTogglePublish = async (p: VolunteerPosition & { id: string }) => {
    if (!db) return;
    const nextPublished = !(p.published ?? false);
    try {
      await updateDoc(doc(db, "volunteerPositions", p.id), {
        published: nextPublished,
      });
      setPositions((prev) =>
        prev.map((x) =>
          x.id === p.id ? { ...x, published: nextPublished } : x
        )
      );
      if (user) {
        await logAdminAction({
          action: "update",
          resource: "volunteerPositions",
          resourceId: p.id,
          details: nextPublished ? "published" : "unpublished",
          adminUid: user.uid,
          adminEmail: user.email ?? "",
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openJdForPosition = (p: VolunteerPosition & { id: string }) => {
    setJdPositionId(p.id);
    setJdDraft(p.linkedInJobDescription ?? "");
    setShowJdModal(true);
  };

  const handleGenerateJd = async () => {
    if (!jdPositionId || !user) return;
    const p = positions.find((x) => x.id === jdPositionId);
    if (!p) return;
    setJdGenerating(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/generate-job-description", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          title: p.title,
          description: p.description,
          commitment: p.commitment ?? "",
          location: p.location ?? "Remote",
          category: p.category ?? "research",
        }),
      });
      const data = await res.json();
      if (res.ok && data.draft) {
        setJdDraft(data.draft);
      } else {
        const errMsg = data.details || data.error || "Failed to generate. Please try again or write manually.";
        setJdDraft(`Error: ${errMsg}`);
      }
    } catch (err) {
      setJdDraft(`Error: ${err instanceof Error ? err.message : "Failed to generate. Please try again or write manually."}`);
    } finally {
      setJdGenerating(false);
    }
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
        <div ref={formRef} className="mb-6 p-6 border border-gray-200 rounded-lg bg-gray-50">
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
            <div className="md:col-span-2 flex items-center">
              <input
                type="checkbox"
                id="published"
                checked={formState.published ?? false}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, published: e.target.checked }))
                }
                className="h-4 w-4 text-[var(--primary)] border-gray-300 rounded"
              />
              <label htmlFor="published" className="ml-2 font-helvetica text-sm">
                Publish to website (uncheck to save as draft)
              </label>
            </div>
            <div className="md:col-span-2 flex items-center">
              <input
                type="checkbox"
                id="createLinkedInJd"
                checked={createLinkedInJd}
                onChange={(e) => setCreateLinkedInJd(e.target.checked)}
                className="h-4 w-4 text-[var(--primary)] border-gray-300 rounded"
              />
              <label htmlFor="createLinkedInJd" className="ml-2 font-helvetica text-sm">
                Create LinkedIn job description (AI-generated draft after save)
              </label>
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

      {showJdModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-neue-kabel font-bold text-lg">
                LinkedIn Job Description
              </h3>
              <p className="font-helvetica text-sm text-gray-600 mt-1">
                Edit the draft below, then save. Use &quot;Copy to clipboard&quot; to paste into LinkedIn.
              </p>
            </div>
            <div className="p-4 flex-1 overflow-auto">
              {jdGenerating ? (
                <div className="py-8 text-center text-gray-500">
                  Generating draft with AI...
                </div>
              ) : (
                <textarea
                  value={jdDraft}
                  onChange={(e) => setJdDraft(e.target.value)}
                  rows={16}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md font-helvetica text-sm"
                  placeholder="Job description will appear here..."
                />
              )}
            </div>
            <div className="p-4 border-t border-gray-200 flex flex-wrap gap-2">
              {!jdDraft.trim() && jdPositionId && (
                <button
                  onClick={handleGenerateJd}
                  disabled={jdGenerating}
                  className="px-4 py-2 bg-blue-600 text-white font-helvetica font-bold rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {jdGenerating ? "Generating..." : "Generate with AI"}
                </button>
              )}
              <button
                onClick={handleSaveJobDescription}
                disabled={jdSaving || jdGenerating || !jdDraft.trim()}
                className="px-4 py-2 bg-[var(--primary)] text-white font-helvetica font-bold rounded-md hover:bg-[var(--primary-dark)] disabled:opacity-50"
              >
                {jdSaving ? "Saving..." : "Save Job Description"}
              </button>
              {jdPositionId && !jdGenerating && jdDraft.trim() && (
                <>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `${jdDraft}\n\n---\nApply here: ${getFormLink(jdPositionId)}`
                      )
                    }
                    className="px-4 py-2 bg-gray-200 text-gray-700 font-helvetica font-bold rounded-md hover:bg-gray-300"
                  >
                    Copy JD with link
                  </button>
                  <button
                    onClick={() => copyToClipboard(getFormLink(jdPositionId))}
                    className="px-4 py-2 bg-gray-200 text-gray-700 font-helvetica font-bold rounded-md hover:bg-gray-300"
                  >
                    Copy form link only
                  </button>
                </>
              )}
              <button
                onClick={() => {
                  setShowJdModal(false);
                  setJdPositionId(null);
                  setJdDraft("");
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 font-helvetica font-bold rounded-md hover:bg-gray-300 ml-auto"
              >
                Close
              </button>
            </div>
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
                <div className="flex flex-wrap gap-2 mt-2">
                  <span
                    className={`inline-block text-xs px-2 py-0.5 rounded font-helvetica ${
                      p.published ?? true
                        ? "bg-green-100 text-green-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {p.published ?? true ? "Published" : "Draft"}
                  </span>
                  {p.linkedInJobDescription && (
                    <span className="inline-block text-xs text-green-600 font-helvetica">
                      LinkedIn JD saved
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTogglePublish(p);
                  }}
                  className="font-helvetica text-sm text-[var(--primary)] hover:underline"
                >
                  {p.published ?? true ? "Unpublish" : "Publish"}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openJdForPosition(p);
                  }}
                  className="font-helvetica text-sm text-[var(--primary)] hover:underline"
                >
                  LinkedIn
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    startEdit(p);
                  }}
                  className="font-helvetica text-sm text-[var(--primary)] hover:underline"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDelete(p.id);
                  }}
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
