import { NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";

export async function POST(request: Request) {
  const db = getAdminDb();
  const auth = getAdminAuth();
  if (!db || !auth) {
    return NextResponse.json({ error: "Server not configured" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const token = typeof body?.token === "string" ? body.token : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!token) {
      return NextResponse.json({ error: "Invalid or expired link" }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const invitesSnapshot = await db
      .collection("adminInvites")
      .where("token", "==", token)
      .limit(1)
      .get();

    if (invitesSnapshot.empty) {
      return NextResponse.json({ error: "Invalid or expired link" }, { status: 400 });
    }

    const inviteDoc = invitesSnapshot.docs[0];
    const invite = inviteDoc.data();
    const email = invite?.email as string | undefined;
    const expiresAt = invite?.expiresAt;
    const revokedAt = invite?.revokedAt;

    if (!email) {
      return NextResponse.json({ error: "Invalid invite" }, { status: 400 });
    }

    if (revokedAt) {
      return NextResponse.json({ error: "This invite was revoked" }, { status: 400 });
    }

    const now = new Date();
    const expiry = expiresAt?.toDate ? expiresAt.toDate() : new Date(expiresAt);
    if (expiry < now) {
      await inviteDoc.ref.delete();
      return NextResponse.json({ error: "This invite has expired" }, { status: 400 });
    }

    const userRecord = await auth.createUser({ email, password });
    await db.collection("admins").doc(userRecord.uid).set({ email });
    await inviteDoc.ref.update({
      acceptedAt: new Date(),
      acceptedUid: userRecord.uid,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    const msg = err instanceof Error ? err.message : "Failed to set password";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
