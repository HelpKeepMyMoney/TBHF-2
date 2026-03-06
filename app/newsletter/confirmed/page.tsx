import { Suspense } from "react";
import NewsletterConfirmedContent from "./NewsletterConfirmedContent";
import Layout from "@/components/common/Layout";

function ConfirmedFallback() {
  return (
    <Layout>
      <section className="min-h-[60vh] flex items-center justify-center py-16 px-4">
        <div className="max-w-xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-6 bg-gray-100 text-gray-400 animate-pulse" />
          <div className="h-10 bg-gray-200 rounded mb-4 w-64 mx-auto animate-pulse" />
          <div className="h-4 bg-gray-100 rounded mb-8 w-full max-w-md mx-auto animate-pulse" />
          <div className="h-12 bg-gray-200 rounded w-40 mx-auto animate-pulse" />
        </div>
      </section>
    </Layout>
  );
}

export default function NewsletterConfirmedPage() {
  return (
    <Suspense fallback={<ConfirmedFallback />}>
      <NewsletterConfirmedContent />
    </Suspense>
  );
}
