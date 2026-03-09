import { NextResponse } from "next/server";
import { getAdminDb, getAdminStorage } from "@/lib/firebase-admin";
import { verifyAdmin } from "@/lib/verifyAdmin";
import { FieldValue } from "firebase-admin/firestore";

const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
}

export async function POST(request: Request) {
  const verified = await verifyAdmin(request);
  if (verified instanceof NextResponse) return verified;

  const db = getAdminDb();
  const storage = getAdminStorage();
  if (!db || !storage) {
    return NextResponse.json({ error: "Server not configured" }, { status: 503 });
  }

  try {
    const formData = await request.formData();
    const applicationId = formData.get("applicationId") as string | null;
    const file = formData.get("file") as File | null;

    if (!applicationId || !file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "applicationId and file are required" },
        { status: 400 }
      );
    }

    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
    const isValidType =
      ALLOWED_TYPES.includes(file.type) || ALLOWED_EXTENSIONS.includes(ext);
    if (!isValidType) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: PDF, DOC, DOCX" },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB" },
        { status: 400 }
      );
    }

    const appRef = db.collection("volunteerApplications").doc(applicationId);
    const appSnap = await appRef.get();
    if (!appSnap.exists) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const timestamp = Date.now();
    const safeName = sanitizeFilename(file.name);
    const storagePath = `resumes/${applicationId}/${timestamp}-${safeName}`;

    const bucketName =
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
      `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.appspot.com`;
    const bucket = storage.bucket(bucketName);
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const blob = bucket.file(storagePath);
    await blob.save(fileBuffer, {
      metadata: { contentType: file.type },
    });

    const [signedUrl] = await blob.getSignedUrl({
      action: "read",
      expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    });

    await appRef.update({
      resumeUrl: signedUrl,
      resumeFileName: file.name,
      resumeUploadedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      resumeUrl: signedUrl,
      resumeFileName: file.name,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Upload resume error:", error);
    return NextResponse.json(
      {
        error: "Failed to upload resume",
        details: process.env.NODE_ENV === "development" ? message : undefined,
      },
      { status: 500 }
    );
  }
}
