"use client";

import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { logAdminAction } from "@/lib/adminLog";

interface VolunteerApplication {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  interests: string[];
  experience: string;
  availability: string;
  motivation: string;
  referral: string;
  submittedAt: { seconds: number } | null;
  status: string;
}

const STATUS_OPTIONS = ["pending", "reviewed", "contacted", "closed"];

export default function VolunteerApplicationsManager() {
  const { user } = useAdminAuth();
  const [applications, setApplications] = useState<VolunteerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formState, setFormState] = useState<Partial<VolunteerApplication>>({});

  const fetchApplications = async () => {
    setLoading(true);
    if (!db) {
      setLoading(false);
      return;
    }
    try {
      const q = query(
        collection(db, "volunteerApplications"),
        orderBy("submittedAt", "desc")
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as VolunteerApplication[];
      setApplications(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleStatusChange = async (id: string, status: string) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, "volunteerApplications", id), { status });
      setApplications((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status } : a))
      );
      if (user) {
        await logAdminAction({
          action: "update",
          resource: "volunteerApplications",
          resourceId: id,
          details: `status → ${status}`,
          adminUid: user.uid,
          adminEmail: user.email ?? "",
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const startEdit = (a: VolunteerApplication) => {
    setSelectedId(a.id);
    setEditingId(a.id);
    setFormState({
      name: a.name,
      email: a.email,
      phone: a.phone,
      city: a.city,
      state: a.state,
      interests: a.interests ?? [],
      experience: a.experience,
      availability: a.availability,
      motivation: a.motivation,
      referral: a.referral,
      status: a.status,
    });
  };

  const handleSave = async () => {
    if (!editingId || !db) return;
    setSaving(true);
    try {
      const payload = {
        name: formState.name,
        email: formState.email,
        phone: formState.phone ?? "",
        city: formState.city ?? "",
        state: formState.state ?? "",
        interests: formState.interests ?? [],
        experience: formState.experience ?? "",
        availability: formState.availability ?? "",
        motivation: formState.motivation ?? "",
        referral: formState.referral ?? "",
        status: formState.status ?? "pending",
      };
      await updateDoc(doc(db, "volunteerApplications", editingId), payload);
      setApplications((prev) =>
        prev.map((a) => (a.id === editingId ? { ...a, ...payload } : a))
      );
      setEditingId(null);
      if (user) {
        await logAdminAction({
          action: "update",
          resource: "volunteerApplications",
          resourceId: editingId,
          adminUid: user.uid,
          adminEmail: user.email ?? "",
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this application? This cannot be undone.")) return;
    if (!db) return;
    try {
      await deleteDoc(doc(db, "volunteerApplications", id));
      setApplications((prev) => prev.filter((a) => a.id !== id));
      if (selectedId === id) setSelectedId(null);
      if (editingId === id) setEditingId(null);
      if (user) {
        await logAdminAction({
          action: "delete",
          resource: "volunteerApplications",
          resourceId: id,
          adminUid: user.uid,
          adminEmail: user.email ?? "",
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredApplications =
    statusFilter === "all"
      ? applications
      : applications.filter((a) => a.status === statusFilter);

  const selected = applications.find((a) => a.id === selectedId);

  return (
    <div>
      <h2 className="font-neue-kabel font-bold text-xl mb-4">
        Volunteer Applications
      </h2>

      <div className="flex flex-wrap gap-4 mb-6">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        >
          <option value="all">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="py-8 text-center text-gray-500">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-3 font-helvetica font-bold">Name</th>
                  <th className="py-3 font-helvetica font-bold">Status</th>
                  <th className="py-3 font-helvetica font-bold">Date</th>
                  <th className="py-3 font-helvetica font-bold w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredApplications.map((a) => (
                  <tr
                    key={a.id}
                    className={`border-b border-gray-100 cursor-pointer ${
                      selectedId === a.id ? "bg-gray-50" : "hover:bg-gray-50"
                    }`}
                    onClick={() => setSelectedId(a.id)}
                  >
                    <td className="py-3 font-helvetica">{a.name}</td>
                    <td className="py-3">
                      <select
                        value={a.status}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleStatusChange(a.id, e.target.value);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="text-sm border border-gray-300 rounded px-2 py-1"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 font-helvetica text-sm text-gray-600">
                      {a.submittedAt
                        ? new Date(a.submittedAt.seconds * 1000).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(a)}
                          className="font-helvetica text-sm text-[var(--primary)] hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(a.id)}
                          className="font-helvetica text-sm text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
            {selected ? (
              editingId === selected.id ? (
                <div className="space-y-4">
                  <h3 className="font-neue-kabel font-bold text-lg">
                    Edit Application
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="block font-helvetica font-bold mb-1 text-sm">
                        Name
                      </label>
                      <input
                        value={formState.name ?? ""}
                        onChange={(e) =>
                          setFormState((p) => ({ ...p, name: e.target.value }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                    <div>
                      <label className="block font-helvetica font-bold mb-1 text-sm">
                        Email
                      </label>
                      <input
                        type="email"
                        value={formState.email ?? ""}
                        onChange={(e) =>
                          setFormState((p) => ({ ...p, email: e.target.value }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                    <div>
                      <label className="block font-helvetica font-bold mb-1 text-sm">
                        Phone
                      </label>
                      <input
                        value={formState.phone ?? ""}
                        onChange={(e) =>
                          setFormState((p) => ({ ...p, phone: e.target.value }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block font-helvetica font-bold mb-1 text-sm">
                          City
                        </label>
                        <input
                          value={formState.city ?? ""}
                          onChange={(e) =>
                            setFormState((p) => ({ ...p, city: e.target.value }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                      <div>
                        <label className="block font-helvetica font-bold mb-1 text-sm">
                          State
                        </label>
                        <input
                          value={formState.state ?? ""}
                          onChange={(e) =>
                            setFormState((p) => ({ ...p, state: e.target.value }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block font-helvetica font-bold mb-1 text-sm">
                        Interests (comma-separated)
                      </label>
                      <input
                        value={
                          Array.isArray(formState.interests)
                            ? formState.interests.join(", ")
                            : ""
                        }
                        onChange={(e) =>
                          setFormState((p) => ({
                            ...p,
                            interests: e.target.value
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean),
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder="e.g. research, outreach"
                      />
                    </div>
                    <div>
                      <label className="block font-helvetica font-bold mb-1 text-sm">
                        Availability
                      </label>
                      <input
                        value={formState.availability ?? ""}
                        onChange={(e) =>
                          setFormState((p) => ({
                            ...p,
                            availability: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                    <div>
                      <label className="block font-helvetica font-bold mb-1 text-sm">
                        Experience
                      </label>
                      <textarea
                        value={formState.experience ?? ""}
                        onChange={(e) =>
                          setFormState((p) => ({
                            ...p,
                            experience: e.target.value,
                          }))
                        }
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                    <div>
                      <label className="block font-helvetica font-bold mb-1 text-sm">
                        Motivation
                      </label>
                      <textarea
                        value={formState.motivation ?? ""}
                        onChange={(e) =>
                          setFormState((p) => ({
                            ...p,
                            motivation: e.target.value,
                          }))
                        }
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                    <div>
                      <label className="block font-helvetica font-bold mb-1 text-sm">
                        Referral
                      </label>
                      <input
                        value={formState.referral ?? ""}
                        onChange={(e) =>
                          setFormState((p) => ({ ...p, referral: e.target.value }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                    <div>
                      <label className="block font-helvetica font-bold mb-1 text-sm">
                        Status
                      </label>
                      <select
                        value={formState.status ?? "pending"}
                        onChange={(e) =>
                          setFormState((p) => ({ ...p, status: e.target.value }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleSave}
                      disabled={saving || !formState.name || !formState.email}
                      className="px-4 py-2 bg-[var(--primary)] text-white font-helvetica font-bold rounded-md hover:bg-[var(--primary-dark)] disabled:opacity-50 text-sm"
                    >
                      {saving ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 font-helvetica font-bold rounded-md hover:bg-gray-300 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-start gap-4">
                    <h3 className="font-neue-kabel font-bold text-lg">
                      {selected.name}
                    </h3>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => startEdit(selected)}
                        className="font-helvetica text-sm text-[var(--primary)] hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(selected.id)}
                        className="font-helvetica text-sm text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <p className="font-helvetica text-sm">
                    <span className="font-bold">Email:</span> {selected.email}
                  </p>
                  <p className="font-helvetica text-sm">
                    <span className="font-bold">Phone:</span> {selected.phone || "-"}
                  </p>
                  <p className="font-helvetica text-sm">
                    <span className="font-bold">Location:</span> {selected.city},{" "}
                    {selected.state}
                  </p>
                  <p className="font-helvetica text-sm">
                    <span className="font-bold">Interests:</span>{" "}
                    {selected.interests?.join(", ") || "-"}
                  </p>
                  <p className="font-helvetica text-sm">
                    <span className="font-bold">Availability:</span>{" "}
                    {selected.availability || "-"}
                  </p>
                  <p className="font-helvetica text-sm">
                    <span className="font-bold">Experience:</span>{" "}
                    {selected.experience || "-"}
                  </p>
                  <p className="font-helvetica text-sm">
                    <span className="font-bold">Motivation:</span>{" "}
                    {selected.motivation || "-"}
                  </p>
                  <p className="font-helvetica text-sm">
                    <span className="font-bold">Referral:</span>{" "}
                    {selected.referral || "-"}
                  </p>
                </div>
              )
            ) : (
              <p className="text-gray-500 font-helvetica">
                Select an application to view details.
              </p>
            )}
          </div>
        </div>
      )}

      <p className="mt-4 text-sm text-gray-500 font-helvetica">
        {filteredApplications.length} application
        {filteredApplications.length !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
