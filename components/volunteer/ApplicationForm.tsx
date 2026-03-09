"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DEFAULT_VOLUNTEER_POSITIONS } from "@/lib/volunteer-positions";
import type { VolunteerPosition } from "@/lib/types/volunteer";

const ApplicationForm = () => {
  const searchParams = useSearchParams();
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const [positions, setPositions] = useState<(VolunteerPosition & { id: string })[]>([]);
  const [positionsLoading, setPositionsLoading] = useState(true);
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    phone: "",
    city: "",
    state: "",
    interests: [] as string[],
    experience: "",
    availability: "",
    motivation: "",
    referral: "",
    positionId: "",
    positionTitle: "",
  });

  useEffect(() => {
    const fetchPositions = async () => {
      if (!db) {
        setPositions(
          DEFAULT_VOLUNTEER_POSITIONS.map((p, i) => ({
            id: `default-${i}`,
            ...p,
            order: p.order ?? i,
          })) as (VolunteerPosition & { id: string })[]
        );
        setPositionsLoading(false);
        return;
      }
      try {
        const q = query(
          collection(db, "volunteerPositions"),
          orderBy("order", "asc")
        );
        const snapshot = await getDocs(q);
        const allData = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as (VolunteerPosition & { id: string })[];
        const data = allData.filter((p) => p.published !== false);
        setPositions(data.length > 0 ? data : DEFAULT_VOLUNTEER_POSITIONS.map((p, i) => ({ id: `default-${i}`, ...p, order: p.order ?? i })) as (VolunteerPosition & { id: string })[]);
      } catch {
        setPositions(DEFAULT_VOLUNTEER_POSITIONS.map((p, i) => ({ id: `default-${i}`, ...p, order: p.order ?? i })) as (VolunteerPosition & { id: string })[]);
      } finally {
        setPositionsLoading(false);
      }
    };
    fetchPositions();
  }, []);

  useEffect(() => {
    const positionId = searchParams.get("position");
    if (positionId && positions.length > 0) {
      const pos = positions.find((p) => p.id === positionId);
      if (pos) {
        setFormState((prev) => ({
          ...prev,
          positionId: pos.id ?? "",
          positionTitle: pos.title ?? "",
        }));
      }
    }
  }, [searchParams, positions]);

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormState((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;

    if (checked) {
      setFormState((prev) => ({
        ...prev,
        interests: [...prev.interests, value],
      }));
    } else {
      setFormState((prev) => ({
        ...prev,
        interests: prev.interests.filter((interest) => interest !== value),
      }));
    }
  };

  const handleConsentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConsent(e.target.checked);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formState.name ||
      !formState.email ||
      !formState.city ||
      !formState.state ||
      formState.interests.length === 0 ||
      !formState.availability ||
      !formState.motivation ||
      !consent
    ) {
      alert("Please fill in all required fields");
      return;
    }

    setLoading(true);
    setError(null);

    if (!db) {
      setError("Application submission is temporarily unavailable.");
      setLoading(false);
      return;
    }

    try {
      const { positionId, positionTitle, ...rest } = formState;
      await addDoc(collection(db, "volunteerApplications"), {
        ...rest,
        positionId: positionId || undefined,
        positionTitle: positionTitle || undefined,
        submittedAt: serverTimestamp(),
        status: "pending",
      });

      // Send email notifications via Resend (admin + volunteer confirmation)
      const emailRes = await fetch("/api/volunteer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formState),
      });
      if (!emailRes.ok) {
        console.warn("Emails could not be sent:", await emailRes.text());
        // Don't fail the submission - data is saved to Firebase
      }

      setSubmitted(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to submit application. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const volunteerAreas = [
    { id: "research", label: "Research & Archiving" },
    { id: "education", label: "Education & Curriculum" },
    { id: "outreach", label: "Community Outreach" },
    { id: "events", label: "Events & Fundraising" },
    { id: "digital", label: "Digital Content Creation" },
    { id: "tech", label: "Technology & Development" },
  ];

  return (
    <section id="apply" ref={ref} className="py-16 md:py-24 bg-white">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="font-neue-kabel font-bold text-3xl md:text-4xl mb-4">
              Volunteer Application
            </h2>
            <p className="font-helvetica text-[var(--text-secondary)] max-w-2xl mx-auto">
              Thank you for your interest in volunteering with The Black History
              Foundation. Please complete the form below to apply. Our volunteer
              coordinator will contact you within 3-5 business days.
            </p>
          </motion.div>

          {!submitted ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <form
                onSubmit={handleSubmit}
                className="bg-[var(--bg-secondary)] p-8 rounded-lg"
              >
                {error && (
                  <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-md text-sm">
                    {error}
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label
                      htmlFor="name"
                      className="block font-helvetica font-bold mb-2"
                    >
                      Full Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formState.name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="email"
                      className="block font-helvetica font-bold mb-2"
                    >
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formState.email}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="phone"
                      className="block font-helvetica font-bold mb-2"
                    >
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formState.phone}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    />
                  </div>
                  <div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="city"
                          className="block font-helvetica font-bold mb-2"
                        >
                          City *
                        </label>
                        <input
                          type="text"
                          id="city"
                          name="city"
                          value={formState.city}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="state"
                          className="block font-helvetica font-bold mb-2"
                        >
                          State *
                        </label>
                        <input
                          type="text"
                          id="state"
                          name="state"
                          value={formState.state}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block font-helvetica font-bold mb-2">
                    Areas of Interest (Select all that apply) *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {volunteerAreas.map((area) => (
                      <div key={area.id} className="flex items-center">
                        <input
                          type="checkbox"
                          id={area.id}
                          name="interests"
                          value={area.id}
                          onChange={handleCheckboxChange}
                          className="h-5 w-5 text-[var(--primary)] border-gray-300 rounded focus:ring-[var(--primary)]"
                        />
                        <label
                          htmlFor={area.id}
                          className="ml-2 font-helvetica"
                        >
                          {area.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-6">
                  <label
                    htmlFor="position"
                    className="block font-helvetica font-bold mb-2"
                  >
                    Position applying for
                  </label>
                  <select
                    id="position"
                    name="position"
                    value={formState.positionId}
                    onChange={(e) => {
                      const id = e.target.value;
                      const pos = positions.find((p) => p.id === id);
                      setFormState((prev) => ({
                        ...prev,
                        positionId: id,
                        positionTitle: pos?.title ?? "",
                      }));
                    }}
                    disabled={positionsLoading}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  >
                    <option value="">General interest</option>
                    {positions
                      .filter((p) => !String(p.id).startsWith("default-"))
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="mb-6">
                  <label
                    htmlFor="experience"
                    className="block font-helvetica font-bold mb-2"
                  >
                    Relevant Experience
                  </label>
                  <textarea
                    id="experience"
                    name="experience"
                    value={formState.experience}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    placeholder="Share any relevant skills, experience, or qualifications..."
                  ></textarea>
                </div>

                <div className="mb-6">
                  <label
                    htmlFor="availability"
                    className="block font-helvetica font-bold mb-2"
                  >
                    Availability *
                  </label>
                  <select
                    id="availability"
                    name="availability"
                    value={formState.availability}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  >
                    <option value="">Select availability</option>
                    <option value="1-5 hours">1-5 hours per week</option>
                    <option value="6-10 hours">6-10 hours per week</option>
                    <option value="11-15 hours">11-15 hours per week</option>
                    <option value="16+ hours">16+ hours per week</option>
                    <option value="events only">Events only</option>
                  </select>
                </div>

                <div className="mb-6">
                  <label
                    htmlFor="motivation"
                    className="block font-helvetica font-bold mb-2"
                  >
                    Why do you want to volunteer with TBHF? *
                  </label>
                  <textarea
                    id="motivation"
                    name="motivation"
                    value={formState.motivation}
                    onChange={handleChange}
                    required
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    placeholder="Tell us why you're interested in our mission..."
                  ></textarea>
                </div>

                <div className="mb-6">
                  <label
                    htmlFor="referral"
                    className="block font-helvetica font-bold mb-2"
                  >
                    How did you hear about us?
                  </label>
                  <input
                    type="text"
                    id="referral"
                    name="referral"
                    value={formState.referral}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>

                <div className="flex items-center mb-6">
                  <input
                    type="checkbox"
                    id="consent"
                    name="consent"
                    required
                    checked={consent}
                    onChange={handleConsentChange}
                    className="h-5 w-5 text-[var(--primary)] border-gray-300 rounded focus:ring-[var(--primary)]"
                  />
                  <label
                    htmlFor="consent"
                    className="ml-2 font-helvetica text-sm"
                  >
                    I agree to receive communications from The Black History
                    Foundation and understand that my information will be
                    processed in accordance with the Privacy Policy. *
                  </label>
                </div>

                <div className="text-center">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-8 py-3 bg-[var(--primary)] text-white rounded-md font-helvetica font-bold hover:bg-[var(--primary-dark)] transition-colors disabled:opacity-70 flex items-center justify-center mx-auto"
                  >
                    {loading ? (
                      <>
                        <svg
                          className="animate-spin h-5 w-5 mr-2"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Submitting...
                      </>
                    ) : (
                      "Submit Application"
                    )}
                  </button>
                </div>

                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-500">
                    Your application will be reviewed by our volunteer
                    coordinator within 3-5 business days.
                  </p>
                </div>
              </form>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="bg-[var(--bg-secondary)] p-8 rounded-lg text-center"
            >
              <div className="inline-flex items-center justify-center h-16 w-16 bg-green-100 rounded-full mb-6">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 className="font-neue-kabel font-bold text-2xl mb-4">
                Application Submitted!
              </h3>
              <p className="font-helvetica text-[var(--text-secondary)] mb-6 max-w-lg mx-auto">
                Thank you for your interest in volunteering with The Black
                History Foundation. Our volunteer coordinator will review your
                application and contact you within 3-5 business days.
              </p>
              <Link
                href="/"
                className="inline-block font-helvetica font-bold text-[var(--primary)] hover:text-[var(--primary-dark)] transition-colors"
              >
                Return to Home Page →
              </Link>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
};

export default ApplicationForm;
