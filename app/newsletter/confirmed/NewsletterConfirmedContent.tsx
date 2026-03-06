"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Layout from "@/components/common/Layout";

export default function NewsletterConfirmedContent() {
  const searchParams = useSearchParams();
  const status = searchParams.get("status") || "confirmed";

  const isSuccess = status === "confirmed";

  return (
    <Layout>
      <section className="min-h-[60vh] flex items-center justify-center py-16 px-4">
        <div className="max-w-xl mx-auto text-center">
          <div
            className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-6 ${
              isSuccess ? "bg-green-100 text-green-600" : "bg-amber-100 text-amber-600"
            }`}
          >
            {isSuccess ? (
              <svg
                className="w-10 h-10"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : (
              <svg
                className="w-10 h-10"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            )}
          </div>

          <h1 className="font-neue-kabel font-bold text-3xl md:text-4xl mb-4 text-[var(--accent-black)]">
            {isSuccess
              ? "You're All Set!"
              : status === "expired" || status === "invalid"
                ? "Link Expired or Invalid"
                : "Something Went Wrong"}
          </h1>

          <p className="font-helvetica text-gray-600 mb-8 text-lg">
            {isSuccess
              ? "Thank you for confirming your newsletter subscription. You'll receive updates on our programs, events, and how you can contribute to preserving Black history."
              : status === "expired" || status === "invalid"
                ? "This confirmation link has expired or is invalid. Please subscribe again from our homepage."
                : "We couldn't complete your confirmation. Please try subscribing again."}
          </p>

          <Link
            href="/"
            className="inline-block bg-[var(--primary)] text-white font-helvetica font-bold py-3 px-8 rounded-md hover:bg-[var(--primary-dark)] transition-colors"
          >
            Go to Home Page
          </Link>
        </div>
      </section>
    </Layout>
  );
}
