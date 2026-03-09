# The Black History Foundation Website

A modern responsive website for The Black History Foundation (TBHF), a non-profit organization dedicated to preserving and promoting Black history and cultural heritage.

## Features

- Responsive design that works well on mobile, tablet, and desktop
- Interactive elements including scroll animations and hover effects
- Comprehensive information about the foundation's mission and programs
- User-friendly donation system with various payment options
- Volunteer application form and information
- Contact form for inquiries and partnership opportunities
- Admin dashboard for managing newsletter subscribers, volunteer applications, and volunteer positions (at `/admin`)

## Pages

- **Home** - Main landing page showcasing the foundation's mission and key information
- **About** - Detailed information about the foundation, team, and programs
- **Volunteer** - Information about volunteer opportunities and an application form
- **Contact** - Contact information and a contact form
- **Donate** - Donation form with various payment options

## Design System

The website follows a cohesive design system:

- **Typography**:
  - **Helvetica** - Used for body text and general content for clarity and readability
  - **Neue Kabel** - Used for headings and important text to create visual interest

- **Colors**:
  - Primary: Firebrick Red (#B22222)
  - Secondary: Gold (#FFD700)
  - Accent: Dark Green (#006400)
  - Neutrals: Varying shades of black, white, and gray

- **Visual Elements**:
  - Interactive waves background on the homepage
  - Scroll animations for content sections
  - Hover effects on interactive elements
  - Consistent spacing and layout principles

## Technology Stack

- **Next.js** - React framework for server-side rendering and static site generation
- **TypeScript** - For type safety and better developer experience
- **Tailwind CSS** - For styling components
- **Framer Motion** - For animations and transitions
- **React Intersection Observer** - For scroll-based animations

## Getting Started

### Prerequisites

- Node.js (v18 or newer)
- pnpm package manager

### Installation

1. Clone the repository
2. Install dependencies:
```bash
pnpm install
```

3. Configure Firebase (required for newsletter, volunteer forms, and admin):
   - Create a project at [Firebase Console](https://console.firebase.google.com)
   - Enable Firestore Database and Authentication (Email/Password)
   - Copy `.env.example` to `.env.local` and add your Firebase config values
   - Deploy Firestore rules: `firebase deploy --only firestore:rules`
   - Create an admin user in Authentication, then add a document to the `admins` collection with the document ID set to that user's UID

4. Run the development server:
```bash
pnpm dev
```

5. Open your browser and navigate to `http://localhost:3000`

## Admin Dashboard

Access the admin dashboard at `/admin` to manage newsletter subscribers, volunteer applications, volunteer positions, contact messages, board of directors, and more. You must be logged in with an account that has a document in the Firestore `admins` collection (document ID = your user UID).

### Volunteer Management System

The admin panel includes a full volunteer management system:

- **Volunteer Positions** – Create, edit, and manage volunteer opportunity cards. Positions can be saved as drafts (not visible on the public site) or published.
- **LinkedIn Job Descriptions** – When creating a position, optionally generate an AI-powered LinkedIn-style job description. Edit the draft, save it, then copy to clipboard (with application form link) for manual posting to LinkedIn.
- **Volunteer Applications** – View applications with full recruitment tracking: resume uploads, interview scheduling, onboarding status, and extended workflow (pending → reviewed → interview_scheduled → interviewed → offered → onboarded → closed).
- **Position Selection** – The public volunteer form lets applicants choose a specific position from a dropdown; positions can be pre-selected via URL (`/volunteer?position={id}#apply`).

**Environment variables for volunteer features:**

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | For AI job descriptions | Get from [Anthropic Console](https://console.anthropic.com/) |
| `VOLUNTEER_FORM_URL` | Optional | Override the application URL in generated job descriptions (default: uses `NEXT_PUBLIC_VERCEL_URL` or production URL) |

**Resume uploads** require Firebase Storage to be enabled and the service account to have Storage Admin permissions. The storage bucket is configured via `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`.

## Building for Production

```bash
pnpm build
```

## License

This project is licensed under the MIT License.

## Acknowledgements

- Design inspired by modern non-profit websites
- Images from various sources (placeholder images used for demonstration)
