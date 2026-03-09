import { NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";

export async function verifyAdmin(request: Request): Promise<{ uid: string } | NextResponse> {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const auth = getAdminAuth();
  const db = getAdminDb();
  if (!auth || !db) {
    return NextResponse.json({ error: "Server not configured" }, { status: 503 });
  }

  try {
    const decoded = await auth.verifyIdToken(token);
    const uid = decoded.uid;

    const adminDoc = await db.collection("admins").doc(uid).get();
    if (!adminDoc.exists) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return { uid };
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
