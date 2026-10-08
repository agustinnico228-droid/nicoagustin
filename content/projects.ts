import type { Project } from "./types";

/*
 * Selected work, numbered 01–07. Facts only: from Nico's brief, the certificate images, and the facts recorded in
 * Ehjay Lorenzo's privacy-reviewed portfolio (C:\Users\Client\LPT\assets: content/data/projects.ts,
 * content/work/*.mdx, content/media/demos.json, docs/ASSETS.md). The wording here is Nico's own.
 *
 * Privacy (never relax): no customer or lead data anywhere; dashboard demos are sample data and say so;
 * the Sabbath CRM demo video stays out; the reporting app's own brand never appears.
 * Unknown facts are omitted (never placeholders) and listed in docs/INTAKE.md.
 *
 * Prose (summary, lede, problem, architecture, sections) is written in Nico's voice. "I" is used only for what Nico
 * built as the developer. His part in the Rooming House Expert campaign is not recorded, so that page describes the
 * campaign, not his role. Whether the websites (03–05) were built at Agora Data Driven or freelance is not recorded
 * either, so no page says which. `learned` is unknown for every project and stays undefined.
 */

const demoPreview = (slug: string, client: string, tab: string) => ({
  src: `/demos/${slug}/preview.jpg`,
  width: 1440,
  height: 900,
  alt: `${client} dashboard demo, ${tab}, with sample data`,
});

export const projects: Project[] = [
  {
    slug: "client-reporting-dashboards",
    index: "01",
    title: "Client reporting dashboards",
    kind: "Reporting system · 5 live demos",
    year: "2025–2026",
    context: "Agora Data Driven",
    summary: "One reporting system for five client businesses. Each gets a dashboard of KPI cards, SVG charts, tables, the ads that ran and written insights.",
    lede: "I built one reporting system that gives five very different businesses a dashboard each, in plain JavaScript, with every chart drawn as SVG by the page's own code.",
    problem: [
      "Each client's numbers lived in several places: Meta and Shopify (pulled in through Windsor.ai), ActiveCampaign, Campaign Monitor, Klaviyo, sales and stock records, CRM stage history and a quiz feed. The job was to bring them together on one page per client.",
      "Three of the dashboards (Honey Tribe, MeloYelo and Rooming House Expert) grew out of earlier Looker reports. Notes in the code mark where a metric matches the old Looker figure and where it corrects it.",
    ],
    techs: ["html-css", "javascript", "svg-charts", "python", "windsor", "meta-ads", "shopify", "activecampaign", "campaign-monitor", "klaviyo"],
    stack: ["HTML, CSS, vanilla JavaScript (ES5-safe)", "Inline SVG charts", "Python data export", "Windsor.ai (Meta, Shopify)", "ActiveCampaign", "Campaign Monitor", "Klaviyo"],
    role: "Fullstack developer at Agora Data Driven",
    cover: demoPreview("rooming-house-expert", "Rooming House Expert", "Meta funnel tab"),
    architecture: {
      body: [
        "Every client has one dashboard page and one data file. The page is HTML with inline CSS and vanilla JavaScript, served from that client's own path inside a client portal.",
      ],
      bullets: [
        "Data: a Python export job pulls the client's sources and writes a single data.json next to the page.",
        "Refresh: a Sync button asks the server to run the export again.",
        "Rendering: the page reads data.json and draws everything in the browser, from KPI cards and tables to every chart as inline SVG.",
        "Checks: the JavaScript stays ES5-safe and has to pass an esprima syntax check before each deploy.",
      ],
      diagram: "dashboards",
    },
    sections: [
      {
        heading: "Inside each dashboard",
        body: ["All five are built from the same parts. What changes from client to client is the tabs, the metrics and the color theme."],
        bullets: [
          "A header with a “data through” date and the Sync button.",
          "Period presets, plus a separate benchmark period that every KPI is compared against.",
          "Day, week or month grain, with relative or absolute chart axes.",
          "KPI scorecards that show the change against the benchmark.",
          "Time-series and breakdown charts, sortable tables and a gallery of the ads that ran.",
          "Insight cards that sum up the period in plain words.",
        ],
      },
      {
        heading: "One dashboard per business",
        bullets: [
          "Honey Tribe, an online clothing and jewelry shop: Shopify sales, a Shopify × Meta funnel, products and audience.",
          "MeloYelo, an e-bike brand: sales against the financial-year bike target, riders and leads (with speed-to-lead per agent), inventory and production, and marketing.",
          "Riverdance RV Resort: paid social measured against industry benchmarks, and email.",
          "Rooming House Expert: the Meta funnel, email, the lead magnet and its email sequence, demographics and placements.",
          "The Contract Shop, which gets its leads from a business quiz: how quiz leads convert, and Meta lead generation.",
        ],
      },
      {
        heading: "No framework, no chart library",
        body: [
          "There is no React, no Vue and no charting package in these pages. Each one is plain HTML, CSS and JavaScript that reads one JSON file and draws its own SVG charts.",
        ],
      },
    ],
    demos: [
      { slug: "rooming-house-expert", client: "Rooming House Expert", title: "Meta funnel, email, lead magnet, demographics", src: "/demos/rooming-house-expert/index.html", preview: demoPreview("rooming-house-expert", "Rooming House Expert", "Meta funnel tab") },
      { slug: "meloyelo", client: "MeloYelo", title: "E-bike sales, riders and leads, inventory, marketing", src: "/demos/meloyelo/index.html", preview: demoPreview("meloyelo", "MeloYelo", "sales performance tab") },
      { slug: "honey-tribe", client: "Honey Tribe", title: "Shopify sales, Shopify × Meta funnel, product and audience", src: "/demos/honey-tribe/index.html", preview: demoPreview("honey-tribe", "Honey Tribe", "sales overview tab") },
      { slug: "riverdance-rv", client: "Riverdance RV Resort", title: "Paid social and email", src: "/demos/riverdance-rv/index.html", preview: demoPreview("riverdance-rv", "Riverdance RV Resort", "paid social tab") },
      { slug: "the-contract-shop", client: "The Contract Shop", title: "Quiz-lead diagnostics and Meta lead generation", src: "/demos/the-contract-shop/index.html", preview: demoPreview("the-contract-shop", "The Contract Shop", "quiz diagnostic tab") },
    ],
    disclosures: [
      "Demo — sample data: every figure, chart and insight in the demos is generated sample data, not the clients' results.",
      "Customer and lead names, emails, account IDs and street addresses were removed. Filters and sorting are visible but switched off; the tabs work.",
    ],
  },
  {
    slug: "rooming-house-expert-campaign",
    index: "02",
    title: "Rooming House Expert lead campaign",
    kind: "Meta lead campaign · real results",
    year: "2026",
    summary: "A Meta lead campaign offering a free conversion guide, with a strategy call as the next step. 257 leads in one month at A$25.01 each.",
    lede: "Rooming House Expert offered a free guide on Meta in exchange for a lead, and the form's follow-up invited each new lead to book a free strategy call.",
    problem: [
      "The objective was leads for the Ultimate Rooming House Conversion Guide, a free download from Rooming House Expert.",
      "A lead was not meant to be the end point. The next step was a conversation, so the instant form's follow-up pointed people to a free strategy call.",
    ],
    sections: [
      {
        heading: "Campaign setup",
        bullets: [
          "Objective: leads, collected with a Meta instant form.",
          "Next step: the form's additional action, “Book Free Strategy Call”.",
          "Budget: A$200 a day.",
          "Placements: feeds and in-stream reels; stories, status, reels, search results, apps and sites; Facebook search results.",
          "Attribution: 7-day click or 1-day view.",
        ],
      },
      {
        heading: "Where the numbers come from",
        body: [
          "The results below are taken from the campaign's one-page Excel report for 1 August to 1 September 2026, in Australian dollars. The client approved them for publication.",
        ],
      },
    ],
    techs: ["meta-ads", "excel"],
    stack: ["Meta Ads Manager", "Meta instant forms", "Excel reporting"],
    client: { name: "Rooming House Expert", url: "https://www.roominghouse.expert/" },
    kpis: {
      title: "Campaign results",
      period: "1 Aug – 1 Sep 2026",
      currency: "AUD",
      attribution: "7-day click or 1-day view",
      kpis: [
        { label: "Leads", value: "257", emphasis: true },
        { label: "Cost per lead", value: "A$25.01", emphasis: true },
        { label: "Spend", value: "A$6,427.45", note: "A$200 daily budget" },
        { label: "Click-to-lead rate", value: "14%", note: "about 7 link clicks per lead" },
        { label: "Reach", value: "78,091" },
        { label: "Impressions", value: "223,501" },
        { label: "Frequency", value: "2.86" },
        { label: "Link clicks", value: "1,837" },
        { label: "Link CTR", value: "0.82%" },
        { label: "Cost per link click", value: "A$3.50" },
        { label: "CPM", value: "A$28.76" },
      ],
      reading: [
        "Lead volume was strong and the cost per lead held up at that volume.",
        "Frequency stayed healthy, with no clear sign of ad fatigue yet.",
        "The number to improve: a 0.82% link click-through rate leaves room for a stronger hook in the creative.",
      ],
    },
    credits: ["Ad creative by Ehjay Lorenzo"],
    disclosures: ["Results approved by the client for publication. Campaign, ad set and ad names are not shown."],
  },
  {
    slug: "sabbath-spa",
    index: "03",
    title: "Sabbath Spa & Wellness Hub",
    kind: "Website + operations portal (CRM)",
    summary: "A spa website and operations portal: online booking, digital waivers, memberships, in-room café orders and a staff back office.",
    lede: "I built a single Next.js app for a spa with two branches: guests come in through a portal, and staff sign in to a back office.",
    techs: ["nextjs", "react", "typescript", "tailwind", "supabase", "zod", "resend"],
    stack: ["Next.js", "React", "TypeScript", "Tailwind CSS", "Supabase (database + auth)", "React Hook Form + Zod", "Resend"],
    role: "Fullstack developer",
    client: { name: "Sabbath Spa & Wellness Hub" },
    cover: { src: "/media/poster/sabbath-spa/website.jpg", width: 1280, height: 580, alt: "Sabbath Spa & Wellness Hub website hero, 'Embrace the Gift of Rest', over a collage of spa rooms" },
    architecture: {
      body: [
        "The portal is one Next.js app, written in TypeScript with React and Tailwind CSS. Guests and staff use the same app from two entry points.",
      ],
      bullets: [
        "Database and sign-in: Supabase.",
        "Forms: React Hook Form, with Zod schemas for validation.",
        "Email: Resend.",
      ],
      diagram: "sabbath",
    },
    sections: [
      {
        heading: "The website",
        body: [
          "The public site opens on “Embrace the Gift of Rest” over a collage of the spa's rooms. Below it come a welcome, the signature massages and Sabasu, the in-house café. Book Now stays in the header.",
        ],
      },
      {
        heading: "For guests",
        bullets: [
          "Book a Session: choose the service and the therapist, and reserve a time.",
          "Digital Waiver: a health intake form and a liability waiver, filled in online.",
          "Membership: discounts, VIP packages and priority booking.",
          "Sabasu: coffee, pasta and pastries ordered to the room.",
        ],
      },
      {
        heading: "For staff",
        body: ["The same back office also covers Le Nails, a nail brand."],
        bullets: [
          "A bookings ledger for each branch, filtered by brand (Sabbath or Le Nails), searchable by customer, date or service, with CSV export.",
          "Clients, Staff, Payments and Waivers.",
          "Audit logs.",
        ],
      },
    ],
    videos: [
      {
        src: "/media/video/sabbath-spa/website.mp4",
        poster: "/media/poster/sabbath-spa/website.jpg",
        width: 1280,
        height: 580,
        title: "Sabbath Spa & Wellness Hub website",
        description: "Screen recording of the website: the 'Embrace the Gift of Rest' hero over a tilted photo collage, a logo loader, the welcome section, the services line, a massage carousel and the footer.",
        durationSec: 19.3,
      },
    ],
    gallery: [
      { src: "/media/img/sabbath-spa/crm-portal-home.jpg", width: 1740, height: 908, alt: "Digital Operations Portal home: the Sabbath logo above five cards for Book a Session, Digital Waiver, Membership, Sabasu and Staff Portal.", caption: "Portal home: booking, waivers, membership, in-room ordering and the staff entrance." },
      { src: "/media/img/sabbath-spa/crm-bookings-ledger.jpg", width: 1900, height: 858, alt: "Staff back office, Bookings Ledger: sidebar, branch tabs, search, category tabs and column headings; the booking rows and signed-in account are blurred.", caption: "Staff back office: the bookings ledger. Booking rows and the signed-in account are blurred." },
    ],
    disclosures: ["Customer data is blurred in the back-office screenshot. The portal's own walkthrough video is not shown because it contains customer records."],
  },
  {
    slug: "rooming-house-expert",
    index: "04",
    title: "Rooming House Expert",
    kind: "Website",
    summary: "A React website for a father-and-son business that turns existing homes into compliant rooming houses in Victoria, Australia.",
    lede: "I built Rooming House Expert's website, a React site whose job is to explain a niche investment and get visitors on a call.",
    techs: ["react", "react-router", "vite"],
    stack: ["React", "React Router", "Vite"],
    role: "Fullstack developer",
    client: { name: "Rooming House Expert", url: "https://www.roominghouse.expert/" },
    live: { href: "https://www.roominghouse.expert/", label: "Visit the live site" },
    cover: { src: "/media/poster/rooming-house-expert/website.jpg", width: 1280, height: 588, alt: "Rooming House Expert website hero, 'The Future of Investing', over a brick house" },
    architecture: {
      body: ["A single-page app in React. React Router handles the pages, and Vite builds it."],
      diagram: "spa",
    },
    sections: [
      {
        heading: "What's on the site",
        body: [
          "Rooming House Expert converts existing homes into compliant rooming houses in Victoria and handles the plans, permits and compliance along the way. The page runs from top to bottom like this:",
        ],
        bullets: [
          "The hero, “The Future of Investing”, over property photos, with Explore Properties and Our Services.",
          "The founders' story, “Trust Built on Family Values”.",
          "The team's track record, under “Redefining the Standard of Living”.",
          "A philosophy statement and Featured Properties.",
          "A closing prompt, “Could your property work as a Rooming House? Let's find out, fast.”, with Book a Call Now.",
          "A newsletter sign-up, and a chat button on every screen.",
        ],
      },
      {
        heading: "Navigation",
        body: ["Book a Call Now stays in the header, next to Home, Properties, Services, Shop and Learn More."],
      },
    ],
    videos: [
      {
        src: "/media/video/rooming-house-expert/website.mp4",
        poster: "/media/poster/rooming-house-expert/website.jpg",
        width: 1280,
        height: 588,
        title: "Rooming House Expert website",
        description: "Screen recording of the website: the 'The Future of Investing' hero, the founders section, company stats, featured properties, the call-to-action band and the footer. The client-stories section is cut out.",
        durationSec: 21.1,
      },
    ],
    disclosures: ["The client-stories section (investor names and income figures) is cut from the recording."],
  },
  {
    slug: "hydrate-medbar",
    index: "05",
    title: "HydRate Medbar",
    kind: "Website",
    summary: "A website for a medical aesthetics and IV hydration studio in Long Island City, New York, covering treatments, gift vouchers and booking.",
    lede: "I built the website for HydRate Medbar, a medical aesthetics and IV hydration studio in Long Island City, New York.",
    sections: [
      {
        heading: "What's on the site",
        bullets: [
          "A logo loader, then the hero, “Elevated Beauty & Wellness”, with Book Now.",
          "“Where Science Meets Serenity”, an introduction to the studio.",
          "Treatment cards for Botox & Fillers, IV Drip Therapy, Laser Hair Removal and Microneedling.",
          "Client testimonials.",
          "A footer with opening hours, links and social accounts.",
        ],
      },
      {
        heading: "Navigation",
        body: ["The menu covers Services, Gift Vouchers, About Us and the Blog, and Book Now is always in reach."],
      },
    ],
    techs: [],
    stack: [],
    role: "Fullstack developer",
    client: { name: "HydRate Medbar" },
    cover: { src: "/media/poster/hydrate-medbar/website.jpg", width: 1280, height: 586, alt: "HydRate Medbar website hero, 'Elevated Beauty & Wellness', over a silhouette at sunset" },
    videos: [
      {
        src: "/media/video/hydrate-medbar/website.mp4",
        poster: "/media/poster/hydrate-medbar/website.jpg",
        width: 1280,
        height: 586,
        title: "HydRate Medbar website",
        description: "Screen recording of the website: the 'Elevated Beauty & Wellness' hero, a logo loader, 'Where Science Meets Serenity', treatment cards, a testimonial and the footer. The testimonial's name and the footer contact details are blurred.",
        durationSec: 19.5,
      },
    ],
    disclosures: ["The testimonial's name and the contact details are blurred in the recording."],
  },
  {
    slug: "latte-with-lata",
    index: "06",
    title: "Latte with Lata",
    kind: "Website · team build",
    summary: "A static site for “a cafe with a microphone”: the café's story, its menu and recorded episodes. A team build, hosted on GitHub Pages.",
    lede: "A hand-written static site, built as a team, for a café that records conversations at its corner table.",
    techs: ["html-css", "javascript", "gsap", "github-pages"],
    stack: ["HTML, CSS, JavaScript modules", "GSAP (ScrollTrigger, SplitText)", "Splide", "GitHub Pages"],
    role: "Fullstack developer (team build)",
    live: { href: "https://addbp.github.io/latewlatta01/", label: "View the site" },
    cover: { src: "/media/poster/latte-with-lata/website.jpg", width: 1280, height: 612, alt: "Latte with Lata website: the title 'LATTE WITH LATA' over a dark coffee photo" },
    architecture: {
      body: ["No framework: the team wrote the site by hand, and GitHub Pages serves it."],
      bullets: [
        "HTML written by hand.",
        "CSS in layers: design tokens, a base stylesheet, then one stylesheet per section.",
        "JavaScript modules, with GSAP (ScrollTrigger and SplitText) for the title and scroll animations.",
        "Splide for the carousels.",
      ],
      diagram: "static-site",
    },
    sections: [
      {
        heading: "What's on the site",
        body: [
          "Latte with Lata calls itself “a cafe with a microphone”. It records conversations with people who build careers, organizations and movements around purpose, at the corner table on Thursday nights, and publishes them as episodes.",
        ],
        bullets: [
          "An animated title: “Latte with Lata: Real Conversations. Built on Purpose.”",
          "The café's story, “From First Pour to Last Word”.",
          "The menu, with See the Menu and Book a Table.",
          "The latest episodes, each with its guest, date and running time, plus All Episodes.",
          "“Meet Lata”, the host's section.",
          "A footer with opening hours, the podcast's channels (Spotify, Apple Podcasts, YouTube, RSS) and links to every section.",
        ],
      },
    ],
    videos: [
      {
        src: "/media/video/latte-with-lata/website.mp4",
        poster: "/media/poster/latte-with-lata/website.jpg",
        width: 1280,
        height: 612,
        title: "Latte with Lata website",
        description: "Screen recording of the website: the kinetic 'LATTE WITH LATA' title, a reload with its letter-reveal intro, café and menu sections, episode cards, the host section and the footer. The footer contact details are blurred.",
        durationSec: 31.1,
      },
    ],
    disclosures: ["Its contact details are placeholders, so this is not a client's live site."],
  },
  {
    slug: "omdena-bhutan-voice-assistant",
    index: "07",
    title: "Voice-first public-service assistant",
    kind: "Omdena AI Innovation Challenge · Bhutan",
    year: "2026",
    context: "Omdena",
    summary: "An Omdena AI Innovation Challenge testing whether voice, Dzongkha–English NLP and AI agents can make Bhutan's public services easier to reach.",
    lede: "Can voice, Dzongkha–English language technology and cooperating AI agents make public services easier for Bhutan's citizens to reach?",
    problem: [
      "Many citizens of Bhutan, especially in rural areas, still struggle with fragmented government workflows, language barriers and digital platforms that are hard to use.",
      "Recent progress in conversational AI, agent-based systems and NLP for low-resource languages suggests a new route. The challenge set out to test it with a voice-enabled, multilingual, agent-based public-service assistant prototype.",
    ],
    techs: [],
    stack: ["Conversational AI", "Dzongkha–English NLP", "Multi-agent workflow automation"],
    role: "Fullstack Engineer",
    architecture: {
      body: ["The challenge brief combines three ingredients and asks whether, together, they can realistically simplify access to public services:"],
      bullets: [
        "Voice interaction, so people can speak to the assistant.",
        "Dzongkha–English natural language processing.",
        "Multi-agent workflow automation behind the conversation.",
      ],
      diagram: "omdena",
    },
    sections: [
      {
        heading: "Scope",
        body: [
          "The challenge was exploratory and research-oriented on purpose. The goal was not a production-ready platform. It was to check technical feasibility, surface the limits and collect architectural insights that could inform a later Phase 3 production system for the Royal Government of Bhutan.",
        ],
      },
      {
        heading: "My part",
        body: ["I took part as a Fullstack Engineer and received a Certificate of Achievement dated July 27, 2026."],
      },
    ],
    verify: { href: "https://confirm.omdena.com/INxnf_n", label: "Verify the certificate" },
    disclosures: ["Exploratory and research-oriented by design: a prototype to test feasibility, not a production platform."],
  },
];

export const projectBySlug = (slug: string) => projects.find((p) => p.slug === slug);
