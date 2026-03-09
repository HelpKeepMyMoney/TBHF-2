"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import Link from "next/link";
import SectionHeading from "../common/SectionHeading";
import Button from "../common/Button";
import { db } from "@/lib/firebase";
import { DEFAULT_VOLUNTEER_POSITIONS } from "@/lib/volunteer-positions";
import { DEFAULT_VOLUNTEER_TESTIMONIALS } from "@/lib/volunteer-testimonials";

const CATEGORY_ICONS: Record<string, string> = {
  research: "📚",
  outreach: "🤝",
  education: "📖",
  digital: "📱",
  events: "🎉",
  tech: "💻",
};

const GetInvolvedSection = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.2,
  });

  const [volunteering, setVolunteering] = useState<
    { title: string; description: string; icon: string; commitment?: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [testimonials, setTestimonials] = useState<
    { quote: string; name: string; role: string; image: string }[]
  >([]);
  const [testimonialsLoading, setTestimonialsLoading] = useState(true);

  useEffect(() => {
    const fetchPositions = async () => {
      if (!db) {
        setVolunteering(
          DEFAULT_VOLUNTEER_POSITIONS.slice(0, 4).map((p) => ({
            title: p.title,
            description: p.description,
            icon: CATEGORY_ICONS[p.category] ?? "📋",
            commitment: p.commitment,
          }))
        );
        setLoading(false);
        return;
      }
      try {
        const positionsRef = collection(db, "volunteerPositions");
        const q = query(positionsRef, orderBy("order", "asc"));
        const snapshot = await getDocs(q);
        const allPositions = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as { title: string; description: string; category: string; commitment?: string; published?: boolean }[];
        const positions = allPositions.filter((p) => p.published !== false);
        const display = (positions.length > 0 ? positions : DEFAULT_VOLUNTEER_POSITIONS)
          .slice(0, 4)
          .map((p) => ({
            title: p.title,
            description: p.description,
            icon: CATEGORY_ICONS[p.category] ?? "📋",
            commitment: p.commitment,
          }));
        setVolunteering(display);
      } catch {
        setVolunteering(
          DEFAULT_VOLUNTEER_POSITIONS.slice(0, 4).map((p) => ({
            title: p.title,
            description: p.description,
            icon: CATEGORY_ICONS[p.category] ?? "📋",
            commitment: p.commitment,
          }))
        );
      } finally {
        setLoading(false);
      }
    };
    fetchPositions();
  }, []);

  useEffect(() => {
    const fetchTestimonials = async () => {
      if (!db) {
        setTestimonials(DEFAULT_VOLUNTEER_TESTIMONIALS);
        setTestimonialsLoading(false);
        return;
      }
      try {
        const testimonialsRef = collection(db, "volunteerTestimonials");
        const q = query(testimonialsRef, orderBy("order", "asc"));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((docSnap) => docSnap.data()) as {
          quote: string;
          name: string;
          role: string;
          image: string;
        }[];
        setTestimonials(data);
      } catch {
        setTestimonials(DEFAULT_VOLUNTEER_TESTIMONIALS);
      } finally {
        setTestimonialsLoading(false);
      }
    };
    fetchTestimonials();
  }, []);

  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const testimonialInterval = useRef<NodeJS.Timeout | null>(null);

  // Auto-advance testimonials
  useEffect(() => {
    if (inView && testimonials.length > 0) {
      testimonialInterval.current = setInterval(() => {
        setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
      }, 6000);
    }

    return () => {
      if (testimonialInterval.current) {
        clearInterval(testimonialInterval.current);
      }
    };
  }, [inView, testimonials.length]);

  return (
    <section
      ref={ref}
      className="py-16 md:py-24 relative bg-cover bg-center text-white"
      style={{
        backgroundImage:
          "linear-gradient(rgba(0,0,0,0.8), rgba(0,0,0,0.8)), url('https://picsum.photos/1920/600?blur=2')",
      }}
    >
      <div className="container mx-auto px-4 sm:px-6">
        <SectionHeading
          subtitle="Get Involved"
          title="Be a Guardian of Black History"
          description="We need dedicated volunteers to research, document, and share Black history. Your time and skills can make a lasting impact on preserving our heritage."
          centered
          light
        />

        {/* Volunteer opportunities - from admin-managed positions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
          {loading ? (
            <div className="col-span-full text-center py-8 font-helvetica text-gray-300">
              Loading volunteer opportunities...
            </div>
          ) : (
            volunteering.map((item, index) => (
              <motion.div
                key={`${item.title}-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-6 hover:bg-opacity-20 transition-all border border-white border-opacity-20"
              >
                <div className="w-12 h-12 rounded-full mb-4 flex items-center justify-center text-2xl">
                  {item.icon}
                </div>
                <h3 className="font-neue-kabel font-bold text-xl mb-2">
                  {item.title}
                </h3>
                <p className="font-helvetica text-gray-300 mb-4">
                  {item.description}
                </p>
                {item.commitment && (
                  <p className="font-helvetica text-sm text-gray-400 mb-4">
                    {item.commitment}
                  </p>
                )}
                <Link
                  href="/volunteer#apply"
                  className="font-helvetica font-medium text-[var(--secondary)] hover:text-white transition-colors inline-flex items-center gap-1"
                >
                  Apply →
                </Link>
              </motion.div>
            ))
          )}
        </div>

        {/* Testimonials - from admin-managed */}
        {!testimonialsLoading && testimonials.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-20"
          >
            <h3 className="font-neue-kabel font-bold text-2xl mb-8 text-center">
              Volunteer Testimonials
            </h3>

            <div className="relative max-w-3xl mx-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTestimonial}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.5 }}
                  className="bg-white bg-opacity-5 backdrop-blur-sm rounded-lg p-8 border border-white border-opacity-10"
                >
                  <div className="text-center">
                    <div className="mb-6 text-[var(--secondary)] text-4xl">
                      &quot;
                    </div>
                    <p className="font-helvetica text-lg italic mb-6">
                      {testimonials[activeTestimonial].quote}
                    </p>
                    <div className="flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full overflow-hidden mr-4">
                        <img
                          src={
                            testimonials[activeTestimonial].image ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(testimonials[activeTestimonial].name)}&size=96&background=B22222&color=fff`
                          }
                          alt={`${testimonials[activeTestimonial].name}, ${testimonials[activeTestimonial].role} - Volunteer testimonial for The Black History Foundation`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="text-left">
                        <div className="font-neue-kabel font-bold">
                          {testimonials[activeTestimonial].name}
                        </div>
                        <div className="font-helvetica text-sm text-gray-300">
                          {testimonials[activeTestimonial].role}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Dots navigation */}
              <div className="flex justify-center mt-6 space-x-2">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveTestimonial(index)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      activeTestimonial === index
                        ? "bg-[var(--secondary)] w-8"
                        : "bg-white bg-opacity-50"
                    }`}
                    aria-label={`Go to testimonial ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="mt-16 text-center"
        >
          <Button href="/volunteer" variant="secondary" size="lg">
            Join Our Volunteer Team
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default GetInvolvedSection;
