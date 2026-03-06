"use client";

import { useState, useEffect, useCallback } from "react";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { ShieldPlus, Pencil, Trash2 } from "lucide-react";

interface AdminUser {
  uid: string;
  email: string;
}

export default function AdminUsersManager() {
  const { user } = useAdminAuth();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [addEmail, setAddEmail] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingUid, setDeletingUid] = useState<string | null>(null);

  const getAuthHeaders = useCallback(async () => {
    const token = await user?.getIdToken();
    return {
      Authorization: token ? `Bearer ${token}` : "",
    };
  }, [user]);

  const fetchAdmins = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/admin/users", { headers });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to load admins");
      }
      const data = await res.json();
      setAdmins(data.users ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load admins");
    } finally {
      setLoading(false);
    }
  }, [user, getAuthHeaders]);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addEmail.trim()) return;
    setSaving(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ email: addEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to invite admin");
      const invitedEmail = addEmail.trim();
      setAddEmail("");
      setShowAddForm(false);
      setSuccessMessage(
        data.invited
          ? `Invite sent to ${invitedEmail}. They'll receive an email to set their password.`
          : `${invitedEmail} already had an account and has been added as an admin.`
      );
      setTimeout(() => setSuccessMessage(null), 5000);
      await fetchAdmins();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to invite admin");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUid) return;
    const email = editEmail.trim() || undefined;
    const password = editPassword || undefined;
    if (!email && !password) {
      setEditingUid(null);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ uid: editingUid, email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update admin");
      setEditingUid(null);
      setEditEmail("");
      setEditPassword("");
      await fetchAdmins();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update admin");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (uid: string) => {
    if (!confirm("Remove this admin? They will no longer be able to sign in.")) return;
    setDeletingUid(uid);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/admin/users?uid=${encodeURIComponent(uid)}`, {
        method: "DELETE",
        headers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to delete admin");
      await fetchAdmins();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete admin");
    } finally {
      setDeletingUid(null);
    }
  };

  const startEdit = (a: AdminUser) => {
    setEditingUid(a.uid);
    setEditEmail(a.email);
    setEditPassword("");
  };

  const isCurrentUser = (uid: string) => user?.uid === uid;

  return (
    <div>
      <h2 className="font-neue-kabel font-bold text-xl mb-4">Admin Users</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md font-helvetica text-sm">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-3 bg-green-50 text-green-800 rounded-md font-helvetica text-sm">
          {successMessage}
        </div>
      )}

      <div className="mb-6">
        {!showAddForm ? (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white font-helvetica font-bold rounded-md hover:bg-[var(--primary-dark)] transition-colors"
          >
            <ShieldPlus size={18} />
            Add Admin
          </button>
        ) : (
          <form onSubmit={handleAdd} className="p-4 border border-gray-200 rounded-lg bg-gray-50 space-y-3 max-w-md">
            <h3 className="font-helvetica font-bold text-sm text-gray-700">Invite Admin</h3>
            <p className="font-helvetica text-sm text-gray-600">
              Enter their email. They&apos;ll receive a link to set their password.
            </p>
            <input
              type="email"
              placeholder="Email"
              value={addEmail}
              onChange={(e) => setAddEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-[var(--primary)] text-white font-helvetica font-bold rounded-md hover:bg-[var(--primary-dark)] disabled:opacity-50"
              >
                {saving ? "Sending invite..." : "Send invite"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setAddEmail("");
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 font-helvetica rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {loading ? (
        <div className="py-8 text-center text-gray-500">Loading...</div>
      ) : admins.length === 0 ? (
        <div className="py-8 text-center text-gray-500">No admin users yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="py-3 font-helvetica font-bold">Email</th>
                <th className="py-3 font-helvetica font-bold w-32">Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((a) => (
                <tr key={a.uid} className="border-b border-gray-100">
                  <td className="py-3 font-helvetica">
                    {editingUid === a.uid ? (
                      <form onSubmit={handleEdit} className="flex flex-wrap gap-2 items-center">
                        <input
                          type="email"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          placeholder="Email"
                          className="px-3 py-1.5 border border-gray-300 rounded text-sm"
                        />
                        <input
                          type="password"
                          value={editPassword}
                          onChange={(e) => setEditPassword(e.target.value)}
                          placeholder="New password (optional)"
                          className="px-3 py-1.5 border border-gray-300 rounded text-sm"
                        />
                        <button
                          type="submit"
                          disabled={saving}
                          className="text-[var(--primary)] font-helvetica text-sm hover:underline disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingUid(null);
                            setEditEmail("");
                            setEditPassword("");
                          }}
                          className="text-gray-500 font-helvetica text-sm hover:underline"
                        >
                          Cancel
                        </button>
                      </form>
                    ) : (
                      <span>
                        {a.email}
                        {isCurrentUser(a.uid) && (
                          <span className="ml-2 text-xs text-gray-500">(you)</span>
                        )}
                      </span>
                    )}
                  </td>
                  <td className="py-3">
                    {editingUid !== a.uid && (
                      <div className="flex gap-3">
                        <button
                          onClick={() => startEdit(a)}
                          className="text-[var(--primary)] hover:text-[var(--primary-dark)] font-helvetica text-sm flex items-center gap-1"
                        >
                          <Pencil size={14} />
                          Edit
                        </button>
                        {!isCurrentUser(a.uid) && (
                          <button
                            onClick={() => handleDelete(a.uid)}
                            disabled={deletingUid === a.uid}
                            className="text-red-600 hover:text-red-800 font-helvetica text-sm flex items-center gap-1 disabled:opacity-50"
                          >
                            <Trash2 size={14} />
                            {deletingUid === a.uid ? "Deleting..." : "Delete"}
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-sm text-gray-500 font-helvetica">
        {admins.length} admin{admins.length !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
