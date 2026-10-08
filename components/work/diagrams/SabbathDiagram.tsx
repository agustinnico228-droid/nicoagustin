import { Flow, type FlowSpec } from "./Flow";

const spec: FlowSpec = {
  label:
    "Architecture of the Sabbath Spa operations portal: guests (booking, waiver, membership, in-room ordering) and staff (the back office) use one Next.js app built with React, TypeScript, Tailwind CSS and React Hook Form with Zod, which uses Supabase for the database and auth and Resend for email.",
  stages: [
    {
      boxes: [
        { title: "Guests", items: ["Booking", "Waiver", "Membership", "In-room ordering"] },
        {
          title: "Staff back office",
          items: ["Bookings ledger", "Clients", "Staff", "Payments", "Waivers", "Audit log"],
        },
      ],
    },
    {
      boxes: [
        {
          title: "Next.js app",
          items: ["React", "TypeScript", "Tailwind CSS", "React Hook Form + Zod"],
          tone: "accent",
        },
      ],
    },
    {
      boxes: [
        { title: "Supabase", items: ["Database", "Auth"] },
        { title: "Resend", items: ["Email"] },
      ],
    },
  ],
  steps: [
    "Guests use the portal to book, sign a waiver, manage a membership and order in-room.",
    "Staff use the back office: bookings ledger, clients, staff, payments, waivers and audit log.",
    "Both are one Next.js app built with React, TypeScript, Tailwind CSS and React Hook Form with Zod.",
    "The app stores data and signs people in with Supabase (database and auth), and sends email with Resend.",
  ],
};

export function SabbathDiagram() {
  return <Flow spec={spec} />;
}
