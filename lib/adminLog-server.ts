import { getAdminDb } from "@/lib/firebase-admin";

export type AdminAction = "create" | "update" | "delete";

/**
 * Log an admin action from server-side (API routes).
 * Fails silently so it doesn't block the main operation.
 */
export async function logAdminActionServer(params: {
  action: AdminAction;
  resource: string;
  resourceId: string;
  details?: string;
  adminUid: string;
  adminEmail: string;
}): Promise<void> {
  const db = getAdminDb();
  if (!db) return;
  try {
    await db.collection("adminLogs").add({
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId,
      details: params.details ?? null,
      adminUid: params.adminUid,
      adminEmail: params.adminEmail,
      timestamp: new Date(),
    });
  } catch (err) {
    console.error("[adminLog] Failed to log action:", err);
  }
}
