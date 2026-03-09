import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { Resend } from "resend";
import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";
import { logAdminActionServer } from "@/lib/adminLog-server";

const resend = new Resend(process.env.RESEND_API_KEY);

async function verifyAdmin(request: Request): Promise<{ uid: string } | NextResponse> {
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

export async function GET(request: Request) {
  const verified = await verifyAdmin(request);
  if (verified instanceof NextResponse) return verified;

  const db = getAdminDb();
  const auth = getAdminAuth();
  if (!db || !auth) {
    return NextResponse.json({ error: "Server not configured" }, { status: 503 });
  }

  try {
    const adminsSnapshot = await db.collection("admins").get();
    const uids = adminsSnapshot.docs.map((d) => d.id);

    const users: { uid: string; email: string }[] = [];
    for (const uid of uids) {
      try {
        const userRecord = await auth.getUser(uid);
        users.push({ uid: userRecord.uid, email: userRecord.email ?? "" });
      } catch {
        users.push({ uid, email: "(deleted)" });
      }
    }

    const invitesSnapshot = await db.collection("adminInvites").orderBy("createdAt", "desc").get();
    const invites: {
      id: string;
      email: string;
      dateEmailed: string;
      dateAccepted: string | null;
      dateRevoked: string | null;
      acceptedUid: string | null;
    }[] = [];
    const now = new Date();
    for (const doc of invitesSnapshot.docs) {
      const d = doc.data();
      const email = (d.email as string) ?? "";
      const createdAt = d.createdAt?.toDate?.() ?? d.createdAt;
      const acceptedAt = d.acceptedAt?.toDate?.() ?? d.acceptedAt;
      const revokedAt = d.revokedAt?.toDate?.() ?? d.revokedAt;
      const acceptedUid = (d.acceptedUid as string) ?? null;
      const expiresAt = d.expiresAt?.toDate?.() ?? d.expiresAt;
      if (!email) continue;
      const isExpired = expiresAt && new Date(expiresAt) < now && !acceptedAt && !revokedAt;
      if (isExpired) continue;
      invites.push({
        id: doc.id,
        email,
        dateEmailed: createdAt ? new Date(createdAt).toISOString() : "",
        dateAccepted: acceptedAt ? new Date(acceptedAt).toISOString() : null,
        dateRevoked: revokedAt ? new Date(revokedAt).toISOString() : null,
        acceptedUid,
      });
    }

    return NextResponse.json({ users, invites });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to list admins" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const verified = await verifyAdmin(request);
  if (verified instanceof NextResponse) return verified;

  const db = getAdminDb();
  const auth = getAdminAuth();
  if (!db || !auth) {
    return NextResponse.json({ error: "Server not configured" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const recordAsRevoked = body?.recordAsRevoked === true;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    if (recordAsRevoked) {
      const existingInvite = await db
        .collection("adminInvites")
        .where("email", "==", email)
        .limit(1)
        .get();
      if (!existingInvite.empty) {
        return NextResponse.json(
          { error: "This email is already in the invitations list." },
          { status: 400 }
        );
      }
      const now = new Date();
      const inviteRef = await db.collection("adminInvites").add({
        email,
        createdAt: now,
        revokedAt: now,
      });
      const actor = await auth.getUser(verified.uid).catch(() => null);
      await logAdminActionServer({
        action: "create",
        resource: "adminInvites",
        resourceId: inviteRef.id,
        details: `record as revoked: ${email}`,
        adminUid: verified.uid,
        adminEmail: actor?.email ?? "",
      });
      return NextResponse.json({ success: true, recordedAsRevoked: true });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey || !apiKey.startsWith("re_")) {
      return NextResponse.json(
        { error: "Email service is not configured for admin invites" },
        { status: 503 }
      );
    }

    const existingUser = await auth.getUserByEmail(email).catch(() => null);
    if (existingUser) {
      const adminDoc = await db.collection("admins").doc(existingUser.uid).get();
      if (adminDoc.exists) {
        return NextResponse.json({ error: "This email is already an admin" }, { status: 400 });
      }
      await db.collection("admins").doc(existingUser.uid).set({ email });
      const baseUrl =
        process.env.NEXT_PUBLIC_SITE_URL ||
        request.headers.get("origin") ||
        "https://theblackhistoryfoundation.org";
      const loginUrl = `${baseUrl}/admin`;
      const fromEmail =
        process.env.RESEND_FROM_EMAIL ||
        "The Black History Foundation <onboarding@resend.dev>";
      const actor = await auth.getUser(verified.uid).catch(() => null);
      await logAdminActionServer({
        action: "create",
        resource: "adminUsers",
        resourceId: existingUser.uid,
        details: `added existing user: ${email}`,
        adminUid: verified.uid,
        adminEmail: actor?.email ?? "",
      });
      await resend.emails.send({
        from: fromEmail,
        to: email,
        subject: "You've been added as an admin – The Black History Foundation",
        html: `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #1a1a2e;">You've been added as an admin</h2>
  <p>You now have admin access to The Black History Foundation. Sign in with your existing password at:</p>
  <p style="margin: 20px 0;"><a href="${loginUrl}" style="display: inline-block; background: #1a1a2e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Sign in to Admin</a></p>
  <p style="font-size: 12px; color: #666;">If you didn't expect this, you can safely ignore this email.</p>
</body>
</html>`,
      });
      return NextResponse.json({ success: true, invited: false });
    }

    const existingInvite = await db
      .collection("adminInvites")
      .where("email", "==", email)
      .limit(1)
      .get();
    if (!existingInvite.empty) {
      return NextResponse.json(
        { error: "An invite was already sent to this email. Please check their inbox or wait for it to expire." },
        { status: 400 }
      );
    }

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const inviteRef = await db.collection("adminInvites").add({
      email,
      token,
      createdAt: new Date(),
      expiresAt,
    });

    const actor = await auth.getUser(verified.uid).catch(() => null);
    await logAdminActionServer({
      action: "create",
      resource: "adminInvites",
      resourceId: inviteRef.id,
      details: `invite sent: ${email}`,
      adminUid: verified.uid,
      adminEmail: actor?.email ?? "",
    });

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      request.headers.get("origin") ||
      "https://theblackhistoryfoundation.org";
    const setPasswordUrl = `${baseUrl}/admin/set-password?token=${token}`;
    const fromEmail =
      process.env.RESEND_FROM_EMAIL ||
      "The Black History Foundation <onboarding@resend.dev>";

    const result = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: "Set your admin password – The Black History Foundation",
      html: `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #1a1a2e;">You've been invited as an admin</h2>
  <p>You've been invited to join The Black History Foundation admin panel. Click the button below to set your password and complete your account setup.</p>
  <p style="margin: 20px 0;"><a href="${setPasswordUrl}" style="display: inline-block; background: #1a1a2e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Set your password</a></p>
  <p style="font-size: 12px; color: #666;">This link expires in 7 days. If you didn't expect this invite, you can safely ignore this email.</p>
  <p style="font-size: 12px; color: #666;">If the button doesn't work, copy this link: ${setPasswordUrl}</p>
</body>
</html>`,
    });

    if (result.error) {
      console.error("Resend invite email error:", result.error);
      return NextResponse.json(
        { error: "Failed to send invite email", details: result.error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, invited: true });
  } catch (err) {
    console.error(err);
    const msg = err instanceof Error ? err.message : "Failed to invite admin";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const verified = await verifyAdmin(request);
  if (verified instanceof NextResponse) return verified;

  const db = getAdminDb();
  const auth = getAdminAuth();
  if (!db || !auth) {
    return NextResponse.json({ error: "Server not configured" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const uid = typeof body?.uid === "string" ? body.uid : "";
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : undefined;
    const password = typeof body?.password === "string" ? body.password : undefined;

    if (!uid) {
      return NextResponse.json({ error: "Admin uid is required" }, { status: 400 });
    }

    const adminDoc = await db.collection("admins").doc(uid).get();
    if (!adminDoc.exists) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 });
    }

    const updates: { email?: string; password?: string } = {};
    if (email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
      }
      updates.email = email;
    }
    if (password !== undefined) {
      if (password.length < 6) {
        return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
      }
      updates.password = password;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    await auth.updateUser(uid, updates);
    if (email) {
      await db.collection("admins").doc(uid).update({ email });
    }
    const actor = await auth.getUser(verified.uid).catch(() => null);
    await logAdminActionServer({
      action: "update",
      resource: "adminUsers",
      resourceId: uid,
      details: email ? `email updated` : `password updated`,
      adminUid: verified.uid,
      adminEmail: actor?.email ?? "",
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    const msg = err instanceof Error ? err.message : "Failed to update admin";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const verified = await verifyAdmin(request);
  if (verified instanceof NextResponse) return verified;

  const db = getAdminDb();
  const auth = getAdminAuth();
  if (!db || !auth) {
    return NextResponse.json({ error: "Server not configured" }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get("uid");
    const inviteId = searchParams.get("inviteId");

    if (inviteId) {
      const inviteRef = db.collection("adminInvites").doc(inviteId);
      const inviteDoc = await inviteRef.get();
      if (!inviteDoc.exists) {
        return NextResponse.json({ error: "Invite not found" }, { status: 404 });
      }
      const data = inviteDoc.data();
      if (data?.acceptedAt) {
        return NextResponse.json({ error: "Cannot revoke an accepted invite" }, { status: 400 });
      }
      if (data?.revokedAt) {
        return NextResponse.json({ error: "Invite was already revoked" }, { status: 400 });
      }
      await inviteRef.update({ revokedAt: new Date() });
      return NextResponse.json({ success: true });
    }

    if (!uid) {
      return NextResponse.json({ error: "Admin uid or inviteId is required" }, { status: 400 });
    }

    if (uid === verified.uid) {
      return NextResponse.json({ error: "You cannot delete your own admin account" }, { status: 400 });
    }

    const adminDoc = await db.collection("admins").doc(uid).get();
    if (!adminDoc.exists) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 });
    }

    const deletedEmail = (await auth.getUser(uid).catch(() => null))?.email ?? "";
    await db.collection("admins").doc(uid).delete();
    await auth.deleteUser(uid);
    const actor = await auth.getUser(verified.uid).catch(() => null);
    await logAdminActionServer({
      action: "delete",
      resource: "adminUsers",
      resourceId: uid,
      details: `removed admin: ${deletedEmail}`,
      adminUid: verified.uid,
      adminEmail: actor?.email ?? "",
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    const msg = err instanceof Error ? err.message : "Failed to delete admin";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
