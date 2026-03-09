import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { verifyAdmin } from "@/lib/verifyAdmin";

type GenerateJobDescriptionBody = {
  title: string;
  description: string;
  commitment?: string;
  location?: string;
  category?: string;
};

const SYSTEM_PROMPT = `You are a professional HR writer for a nonprofit organization. Generate a LinkedIn-style volunteer job description that is professional, engaging, and suitable for posting on LinkedIn or similar platforms. Include:
- A compelling headline and intro about the organization (The Black History Foundation - dedicated to preserving and promoting African history, culture, and heritage)
- Clear role title and overview
- Key responsibilities
- Qualifications and skills (appropriate for volunteer work)
- Time commitment and location
- What volunteers will gain / impact
- A clear call-to-action to apply that MUST include the application form URL provided in the request

Keep it concise but comprehensive. Use professional tone. Format with clear sections. Do NOT include placeholder text like [Company Name] - use "The Black History Foundation" throughout. Always end with an "Apply" or "How to Apply" section that includes the full application URL.`;

export async function POST(request: Request) {
  const verified = await verifyAdmin(request);
  if (verified instanceof NextResponse) return verified;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI service is not configured. Add ANTHROPIC_API_KEY to .env.local" },
      { status: 500 }
    );
  }

  try {
    const body = (await request.json()) as GenerateJobDescriptionBody;
    const { title, description, commitment = "", location = "Remote", category = "" } = body;

    if (!title || !description) {
      return NextResponse.json(
        { error: "Title and description are required" },
        { status: 400 }
      );
    }

    const formUrl =
      process.env.VOLUNTEER_FORM_URL ||
      (process.env.NEXT_PUBLIC_VERCEL_URL
        ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}/volunteer#apply`
        : "https://theblackhistoryfoundation.org/volunteer#apply");

    const anthropic = new Anthropic({ apiKey: apiKey.trim() });
    const categoryLabel =
      {
        research: "Research & Archiving",
        outreach: "Community Outreach",
        education: "Education & Curriculum",
        digital: "Digital Content Creation",
        events: "Events & Fundraising",
        tech: "Technology & Development",
      }[category] || category;

    const userMessage = `Generate a LinkedIn-style volunteer job description for this role:

Title: ${title}
Description: ${description}
${commitment ? `Time commitment: ${commitment}` : ""}
${location ? `Location: ${location}` : ""}
${categoryLabel ? `Category: ${categoryLabel}` : ""}

Organization: The Black History Foundation - a nonprofit dedicated to empowering the African diaspora by preserving and promoting African history, culture, and heritage.

IMPORTANT: Include the application form URL in your call-to-action section. Application URL: ${formUrl}`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const draft = textBlock && "text" in textBlock ? textBlock.text : "";

    if (!draft) {
      return NextResponse.json(
        { error: "Failed to generate job description" },
        { status: 500 }
      );
    }

    return NextResponse.json({ draft });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const details = error instanceof Error && "status" in error ? String((error as { status?: number }).status) : "";
    console.error("Generate job description error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate job description",
        details: process.env.NODE_ENV === "development" ? message : undefined,
        ...(details && { statusCode: details }),
      },
      { status: 500 }
    );
  }
}
