"use client";

import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type AdminAction = "create" | "update" | "delete";

export interface AdminLogEntry {
  action: AdminAction;
  resource: string;
  resourceId: string;
  details?: string;
  adminUid: string;
  adminEmail: string;
  timestamp: unknown;
}

/**
 * Log an admin action to Firestore. Call after successful mutations.
 * Fails silently so it doesn't block the main operation.
 */
export async function logAdminAction(params: {
  action: AdminAction;
  resource: string;
  resourceId: string;
  details?: string;
  adminUid: string;
  adminEmail: string;
}): Promise<void> {
  if (!db) return;
  try {
    await addDoc(collection(db, "adminLogs"), {
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId,
      details: params.details ?? null,
      adminUid: params.adminUid,
      adminEmail: params.adminEmail,
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    console.error("[adminLog] Failed to log action:", err);
  }
}
