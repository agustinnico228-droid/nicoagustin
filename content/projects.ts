import type { Project } from "./types";

/*
 * Selected work, numbered 01–07. Facts only: from Nico's brief, the certificate images, and the facts recorded in
 * Ehjay Lorenzo's privacy-reviewed portfolio (C:\Users\Client\LPT\assets: content/data/projects.ts,
 * content/work/*.mdx, content/media/demos.json, docs/ASSETS.md). The wording here is Nico's own.
 *
 * Privacy (never relax): no customer or lead data anywhere; dashboard demos are sample data and say so; the Sabbath
 * portal walkthrough is shown only because it was recorded on the demo build with sample data (its title card says
 * so; Nico asked for it on 2026-10-09); the reporting app's own brand never appears.
 * Unknown facts are omitted (never placeholders) and listed in docs/INTAKE.md.
 *
 * Prose is written in Nico's voice. Answers of 2026-10-09: he set up and created the Rooming House Expert campaign;
 * the Agora Data Driven role was full-time; projects 03–06 were built between July 2025 and October 2026 (shown as
 * 2025–2026) during his tenure at Agora Data Driven; Sabbath isn't live yet and is hosted on GitHub; HydRate Medbar
 * was built in Visual Studio; the Omdena work used VS Code with JavaScript, HTML and CSS. The problem, result and
 * "What I learned" lines added that day were drafted from the project files and live sites at Nico's request.
 */

const demoPreview = (slug: string, client: string, tab: string) => ({
  src: `/demos/${slug}/preview.jpg`,
  width: 1440,
  height: 900,
  alt: `Sample-data demo of the ${client} dashboard, open on the ${tab}`,
});

export const projects: Project[] = [
  {
    slug: "client-reporting-dashboards",
    index: "01",
    title: "Client reporting dashboards",
    kind: "Reporting system · 5 live demos",
    year: "2025–2026",
    context: "Agora Data Driven",
    summary: "One reporting system powering five client dashboards, each mixing KPI cards, SVG charts, tables, a gallery of ads and plain-language insights.",
    lede: "I wrote a single reporting system in plain JavaScript that hands each of five quite different businesses its own dashboard. The page's own code draws every chart in SVG.",
    problem: [
      "The numbers sat in a lot of separate places. Across the five clients, that meant ActiveCampaign, Campaign Monitor, Klaviyo, Meta and Shopify (both pulled through Windsor.ai), CRM stage history, a quiz feed, and sales and stock records. My task was to put each client's sources onto a single page.",
      "Honey Tribe's, MeloYelo's and Rooming House Expert's dashboards began life as Looker reports. Where my figure matches the old Looker one, a comment in the code says so; where the Looker number was wrong and mine corrects it, the comment says that instead.",
    ],
    techs: ["html-css", "javascript", "svg-charts", "python", "windsor", "meta-ads", "shopify", "activecampaign", "campaign-monitor", "klaviyo"],
    stack: ["HTML, CSS, vanilla JavaScript (ES5-safe)", "Inline SVG charts", "Python data export", "Windsor.ai (Meta, Shopify)", "ActiveCampaign", "Campaign Monitor", "Klaviyo"],
    role: "Fullstack developer at Agora Data Driven",
    cover: demoPreview("rooming-house-expert", "Rooming House Expert", "Meta funnel tab"),
    architecture: {
      body: [
        "Per client, there are just two files, the dashboard page and the data behind it. Both sit under that client's own path in a client portal, and the page itself is HTML with inline styles and vanilla JavaScript.",
      ],
      bullets: [
        "Data: a Python export runs for each client, collects everything from their sources and leaves a data.json file in the same place as the page.",
        "Refresh: hitting Sync makes the server repeat the export.",
        "Rendering: the page loads data.json and turns it into KPI cards, tables and inline SVG charts right in the browser.",
        "Checks: the code stays ES5-safe, and every deploy waits on an esprima syntax check.",
      ],
      diagram: "dashboards",
    },
    sections: [
      {
        heading: "Shared building blocks",
        body: ["All five share one component kit. Per client, only the tabs, the metrics and the color theme differ."],
        bullets: [
          "At the top, the date the data runs through, next to the Sync button.",
          "Quick period presets. A benchmark period, picked on its own, is the baseline for every KPI.",
          "You can switch the charts between daily, weekly and monthly views, and between relative and absolute axes.",
          "A scorecard per KPI, showing how far it moved versus the benchmark.",
          "Charts over time and charts that split a total, tables you can sort, and a gallery of the ads that ran.",
          "Insight cards that put the period into plain language.",
        ],
      },
      {
        heading: "Tabs per client",
        bullets: [
          "Honey Tribe sells clothing and jewelry online. Its dashboard looks at what sells on Shopify, product by product, at the audience, and at a funnel that joins Shopify and Meta data.",
          "For the e-bike brand MeloYelo, the dashboard measures bike sales against the financial-year target and also covers marketing, inventory and production, and riders and leads, including how fast each agent follows up a lead (speed-to-lead).",
          "Riverdance RV Resort's dashboard looks at two things, email performance and paid social measured against what is typical in its industry.",
          "Rooming House Expert gets demographics and placements, email, the Meta funnel, and the lead magnet together with the emails that follow it.",
          "The Contract Shop finds its leads through a business quiz, so its dashboard digs into how those quiz leads convert, next to Meta lead generation.",
        ],
      },
      {
        heading: "What the pages leave out",
        body: [
          "These pages load no React, no Vue and no charting package. Each dashboard is one HTML file with its own CSS and JavaScript, which fetches one JSON file and renders the SVG charts itself.",
        ],
      },
      {
        heading: "The result",
        body: [
          "All five clients got a single page in their portal. It refreshes from that client's sources on demand, compares every KPI with a benchmark period and writes its own plain-language reading of the period.",
        ],
      },
    ],
    learned: [
      "Rebuilding figures that clients already knew from Looker taught me to leave a note in the code wherever a number matches the old report and wherever it deliberately differs, so a changed figure always comes with its reason.",
    ],
    demos: [
      { slug: "rooming-house-expert", client: "Rooming House Expert", title: "Lead magnet, email, demographics, Meta funnel", src: "/demos/rooming-house-expert/index.html", preview: demoPreview("rooming-house-expert", "Rooming House Expert", "Meta funnel tab") },
      { slug: "meloyelo", client: "MeloYelo", title: "Marketing, stock and production, riders and leads, bike sales", src: "/demos/meloyelo/index.html", preview: demoPreview("meloyelo", "MeloYelo", "sales performance tab") },
      { slug: "honey-tribe", client: "Honey Tribe", title: "Products, audience, sales and the Shopify × Meta funnel", src: "/demos/honey-tribe/index.html", preview: demoPreview("honey-tribe", "Honey Tribe", "sales overview tab") },
      { slug: "riverdance-rv", client: "Riverdance RV Resort", title: "Email and paid social", src: "/demos/riverdance-rv/index.html", preview: demoPreview("riverdance-rv", "Riverdance RV Resort", "paid social tab") },
      { slug: "the-contract-shop", client: "The Contract Shop", title: "Meta lead gen, and how quiz leads convert", src: "/demos/the-contract-shop/index.html", preview: demoPreview("the-contract-shop", "The Contract Shop", "quiz diagnostic tab") },
    ],
    disclosures: [
      "Demo — sample data: nothing in these demos is a real client result. The figures, the charts and the written insights are all made up for demonstration.",
      "In the demos, the name, email address, account ID and street address of every customer and lead have been stripped. You can switch tabs, but the filters and sorting are shown in an off state.",
    ],
    credits: ["Ad creative by Ehjay Lorenzo: the ad images in the Rooming House Expert and Riverdance RV Resort demos (their “ads that ran” panels)."],
  },
  {
    slug: "rooming-house-expert-campaign",
    index: "02",
    title: "Rooming House Expert lead campaign",
    kind: "Meta lead campaign · real results",
    year: "2026",
    summary: "A Meta lead campaign I set up: a free conversion guide in exchange for a lead, then a strategy call. 257 leads in one month at A$25.01 each.",
    lede: "I set up and created this Meta campaign for Rooming House Expert. The offer was a free guide, and anyone who filled in the form was invited to book a free strategy call.",
    problem: [
      "Gathering leads was the point. The draw was a free guide, the Ultimate Rooming House Conversion Guide.",
      "The download only opened the door; once the form was in, people were invited to a free strategy call.",
    ],
    sections: [
      {
        heading: "Campaign setup",
        bullets: [
          "Sign-ups were taken through a Meta instant form, with the campaign objective set to leads.",
          "People who submitted were then shown “Book Free Strategy Call” as the next step.",
          "The budget was set at A$200 per day.",
          "Placements covered Facebook search results, feeds and in-stream reels, plus stories, status, reels, search results, apps and sites.",
          "Conversions were counted on a 7-day click or 1-day view attribution window.",
        ],
      },
      {
        heading: "Source of the figures",
        body: [
          "The figures below are copied from a single-page Excel report on the campaign, which covers 1 August to 1 September 2026. Amounts are in Australian dollars, and the client has approved publishing them.",
        ],
      },
    ],
    techs: ["meta-ads"],
    stack: ["Meta Ads Manager", "Meta instant forms", "Excel reporting"],
    role: "Set up and created the campaign in Meta Ads Manager",
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
        "Plenty of leads came in, and each one stayed reasonably priced even at that volume.",
        "At 2.86, frequency was still comfortable; the ads did not yet look worn out.",
        "What could improve: just 0.82% of impressions turned into a link click, which suggests the creative's opening hook could work harder.",
      ],
    },
    learned: [
      "A healthy cost per lead can still hide a weak first impression. At A$25.01 a lead the volume was strong, yet only 0.82% of impressions became link clicks, which pointed to the ad's opening hook, not the budget, as the next thing to improve.",
    ],
    disclosures: ["The client approved these results for publication. Names of the campaign, its ad sets and its ads are left out."],
  },
  {
    slug: "sabbath-spa",
    index: "03",
    title: "Sabbath Spa & Wellness Hub",
    kind: "Website + operations portal (CRM)",
    year: "2025–2026",
    context: "Agora Data Driven",
    summary: "A spa's site and portal, where guests book sessions, sign waivers, take out memberships and order café food to the room, and staff run a back office.",
    lede: "The spa has two branches, and I built a single Next.js app that serves guests through a portal and staff through a back office they sign in to.",
    techs: ["nextjs", "react", "typescript", "tailwind", "supabase", "zod", "resend"],
    stack: ["Next.js", "React", "TypeScript", "Tailwind CSS", "Supabase (database + auth)", "React Hook Form + Zod", "Resend", "GitHub (hosting)"],
    role: "Fullstack developer",
    client: { name: "Sabbath Spa & Wellness Hub" },
    problem: [
      "With two branches and a nail brand sharing one back office, the spa needed bookings, waivers, memberships, in-room café orders, payments and staff schedules in a single system that guests and staff could both use.",
    ],
    cover: { src: "/media/poster/sabbath-spa/website.jpg", width: 1280, height: 580, alt: "Photos of the spa's rooms in a collage behind the headline 'Embrace the Gift of Rest' on the Sabbath Spa & Wellness Hub home page" },
    architecture: {
      body: [
        "Everything lives in one codebase. The language is TypeScript, the framework Next.js on React, and the styling Tailwind CSS. Guests and staff each reach it through their own entrance.",
      ],
      bullets: [
        "Supabase holds the data and handles who can sign in.",
        "Forms are built with React Hook Form and checked against Zod schemas.",
        "Outgoing email goes through Resend.",
      ],
      diagram: "sabbath",
    },
    sections: [
      {
        heading: "The website",
        body: [
          "The first thing a visitor sees is the line “Embrace the Gift of Rest” on top of photos of the spa's rooms arranged as a collage. Scrolling on, there's a welcome, the signature massages, and Sabasu, the spa's own café. A Book Now button sits in the header the whole way down.",
        ],
      },
      {
        heading: "For guests",
        bullets: [
          "Guests choose a service and a therapist in Book a Session, then hold a time slot.",
          "Guests complete their health intake and sign the liability waiver online, under Digital Waiver.",
          "Members get lower prices and VIP packages, and their bookings get priority.",
          "Through Sabasu, the in-house café, a guest can get coffee, pasta or pastries delivered to the room.",
        ],
      },
      {
        heading: "For staff",
        body: ["Le Nails, a nail brand, runs through this back office too."],
        bullets: [
          "Bookings are kept in a ledger for each branch. Staff can narrow it to Sabbath or Le Nails, look a booking up by customer, date or service, and download it as CSV.",
          "There are also screens for staff, clients, waivers and payments.",
          "Audit logs.",
        ],
      },
      {
        heading: "The result",
        body: [
          "One Next.js app with two entrances. On the guest side, people reserve a session, fill in the waiver, take a membership and have café orders brought to their room. Staff get a POS overview per branch, a daily therapist timeline, the bookings ledger with CSV export, client profiles with visit history and waiver details, membership tiers with remaining sessions, a staff roster, a payments ledger behind a manager PIN, and an audit trail of every create, edit and delete.",
        ],
      },
    ],
    learned: [
      "Putting each client's waiver details and visit history on one profile taught me that a back office earns staff's trust when the record they need is a single click from the booking.",
    ],
    videos: [
      {
        src: "/media/video/sabbath-spa/website.mp4",
        poster: "/media/poster/sabbath-spa/website.jpg",
        width: 1280,
        height: 580,
        title: "Sabbath Spa & Wellness Hub website",
        description: "A short screen capture. It starts on 'Embrace the Gift of Rest' and its tilted photo collage, plays the logo loader, then moves through the welcome, a row listing the services and a carousel of massages before ending at the footer.",
        durationSec: 19.3,
      },
      {
        src: "/media/video/sabbath-spa/crm-demo.mp4",
        poster: "/media/poster/sabbath-spa/crm-demo.jpg",
        width: 1280,
        height: 720,
        title: "Operations portal walkthrough (demo build, sample data)",
        description: "A captioned product walkthrough recorded on the portal's demo build with sample data, as its title card says: the portal home, the POS overview for each branch, the daily therapist schedule, the bookings ledger with CSV export, the client directory and a client profile with waiver details and visit history, membership tiers with remaining sessions, the staff roster, the payments ledger behind a manager PIN, digital waivers and the audit trail.",
        durationSec: 136.6,
      },
    ],
    gallery: [
      { src: "/media/img/sabbath-spa/crm-portal-home.jpg", width: 1740, height: 908, alt: "Five cards (Book a Session, Digital Waiver, Membership, Sabasu, Staff Portal) sit below the Sabbath logo on the front screen of the Digital Operations Portal.", caption: "From the portal's first screen, a guest can book, sign a waiver, sign up for membership or order to their room, and staff can head to their own side." },
      { src: "/media/img/sabbath-spa/crm-bookings-ledger.jpg", width: 1900, height: 858, alt: "Staff back office open on the Bookings Ledger, showing a sidebar, tabs for each branch and each category, a search box and the column headings. Anything identifying, from customer rows to the logged-in user, is blurred.", caption: "The bookings ledger, seen from the staff side, with customer rows and the logged-in user blurred out." },
    ],
    disclosures: ["The portal walkthrough was recorded on the demo build with sample data, as its title card says. In the ledger screenshot, every customer row is blurred out. The site isn't live yet."],
  },
  {
    slug: "rooming-house-expert",
    index: "04",
    title: "Rooming House Expert",
    kind: "Website",
    year: "2025–2026",
    context: "Agora Data Driven",
    summary: "React site for a father-and-son team in Victoria, Australia, who take existing homes and turn them into compliant rooming houses.",
    lede: "I built this site in React, and it has two jobs: make an unusual investment easy to grasp, and move visitors toward a call.",
    techs: ["react", "react-router", "vite"],
    stack: ["React", "React Router", "Vite"],
    role: "Fullstack developer",
    client: { name: "Rooming House Expert", url: "https://www.roominghouse.expert/" },
    live: { href: "https://www.roominghouse.expert/", label: "Visit the live site" },
    problem: [
      "Rooming House Expert sells a service most owners have never considered: turning an ordinary home into a compliant, higher-yield rooming house. The site had to make that idea clear, earn trust and turn interest into booked calls.",
    ],
    cover: { src: "/media/poster/rooming-house-expert/website.jpg", width: 1280, height: 588, alt: "A brick house behind the headline 'The Future of Investing' on the Rooming House Expert home page" },
    architecture: {
      body: ["It's a single-page app written in React. Vite does the build, and moving between pages goes through React Router."],
      diagram: "spa",
    },
    sections: [
      {
        heading: "Top to bottom",
        body: [
          "The business takes existing homes in Victoria and turns them into compliant rooming houses, looking after plans, permits and compliance as part of the job. Scrolling the home page, you meet:",
        ],
        bullets: [
          "The page opens on property photos and the line “The Future of Investing”, with two ways in: Explore Properties and Our Services.",
          "“Trust Built on Family Values”, where the founders tell their story.",
          "A track-record section headed “Redefining the Standard of Living”.",
          "A statement of the company's philosophy, followed by Featured Properties.",
          "Near the end comes the line “Think your property might work as a Rooming House? Let’s find out, fast.”, answered with Book a Call Now.",
          "A form to subscribe to the newsletter, plus a chat button that follows you on every screen.",
        ],
      },
      {
        heading: "Navigation",
        body: ["Home, Properties, Services, Shop and Learn More make up the header menu, and Book a Call Now never leaves it."],
      },
      {
        heading: "The result",
        body: [
          "It runs live at roominghouse.expert. Book a Call Now stays in the header and closes the home page as well, around the founders' story, the featured properties, a newsletter sign-up and a chat button on every screen.",
        ],
      },
    ],
    learned: [
      "Repeating one action, Book a Call Now, in the header and again at the end of the page taught me to build each section of a service site toward a single next step.",
    ],
    videos: [
      {
        src: "/media/video/rooming-house-expert/website.mp4",
        poster: "/media/poster/rooming-house-expert/website.jpg",
        width: 1280,
        height: 588,
        title: "Rooming House Expert website",
        description: "The capture scrolls the home page from top to bottom, past the hero ('The Future of Investing'), the founders, some company stats and the featured properties to the call-to-action band and footer. One part is missing on purpose, the client stories.",
        durationSec: 21.1,
      },
    ],
    disclosures: ["The recording skips the client-stories section because it names investors and shows their income."],
  },
  {
    slug: "hydrate-medbar",
    index: "05",
    title: "HydRate Medbar",
    kind: "Website",
    year: "2025–2026",
    context: "Agora Data Driven",
    summary: "Website for a Long Island City, New York studio offering medical aesthetics and IV hydration, with its treatments, gift vouchers and booking.",
    lede: "Long Island City, New York, is home to HydRate Medbar, a studio for medical aesthetics and IV hydration. I built its website.",
    sections: [
      {
        heading: "What's on the site",
        bullets: [
          "The site starts by playing its logo loader; next comes “Elevated Beauty & Wellness” in the hero, beside a Book Now button.",
          "The studio introduces itself under “Where Science Meets Serenity”.",
          "The treatments each get a card of their own, namely Botox & Fillers, IV Drip Therapy, Laser Hair Removal and Microneedling.",
          "A section of what clients have said.",
          "The page closes with opening times, links and where to follow the studio on social media.",
        ],
      },
      {
        heading: "Navigation",
        body: ["The menu reads Services, Gift Vouchers, About Us and Blog, and Book Now is always one tap away."],
      },
      {
        heading: "The result",
        body: [
          "The site is live at hydratemedbar.com: the treatments (Botox & Fillers, IV Drip Therapy, Laser Hair Removal and Microneedling among them), gift vouchers, a blog, and Book Now buttons that open the studio's booking page on Timely.",
        ],
      },
    ],
    learned: [
      "Sending Book Now to the studio's existing Timely page, instead of building a booking system, taught me to plug into the tools a client already runs on.",
    ],
    techs: ["react", "react-router", "vite"],
    stack: ["React", "React Router", "Vite", "Lenis (smooth scrolling)", "Visual Studio"],
    role: "Fullstack developer",
    client: { name: "HydRate Medbar" },
    live: { href: "https://www.hydratemedbar.com/", label: "Visit the live site" },
    problem: [
      "A medical aesthetics and IV hydration studio has to feel calm and clinical at the same time, explain its treatments clearly and get visitors to book.",
    ],
    architecture: {
      body: ["A single-page React app built with Vite, with React Router for the pages. I built it in Visual Studio."],
      bullets: ["Lenis smooths the scrolling.", "Book Now opens the studio's booking page on Timely."],
      diagram: "spa",
    },
    cover: { src: "/media/poster/hydrate-medbar/website.jpg", width: 1280, height: 586, alt: "A silhouette at sunset behind the headline 'Elevated Beauty & Wellness' on the HydRate Medbar home page" },
    videos: [
      {
        src: "/media/video/hydrate-medbar/website.mp4",
        poster: "/media/poster/hydrate-medbar/website.jpg",
        width: 1280,
        height: 586,
        title: "HydRate Medbar website",
        description: "The recording runs through the 'Elevated Beauty & Wellness' hero, a logo loader, 'Where Science Meets Serenity', the treatment cards, one testimonial and the footer. For privacy, the reviewer's name is blurred, and so is the contact information in the footer.",
        durationSec: 19.5,
      },
    ],
    disclosures: ["In the recording, the contact details and the name on the testimonial are blurred."],
  },
  {
    slug: "latte-with-lata",
    index: "06",
    title: "Latte with Lata",
    kind: "Website · team build",
    year: "2025–2026",
    context: "Agora Data Driven",
    summary: "A team-built static site on GitHub Pages for “a cafe with a microphone”, covering the café's story, the menu and its recorded episodes.",
    lede: "Built by hand as a team: a static website for a café where conversations at the corner table get recorded and released.",
    techs: ["html-css", "javascript", "gsap", "github-pages"],
    stack: ["HTML, CSS, JavaScript modules", "GSAP (ScrollTrigger, SplitText)", "Splide", "GitHub Pages"],
    role: "Fullstack developer (team build)",
    live: { href: "https://addbp.github.io/latewlatta01/", label: "View the site" },
    problem: [
      "A café that is also a podcast needs one site for two audiences: people coming in for coffee, who want the menu and the story, and listeners, who want the latest episodes.",
    ],
    cover: { src: "/media/poster/latte-with-lata/website.jpg", width: 1280, height: 612, alt: "A dark photo of coffee behind the words 'LATTE WITH LATA' on the site's first screen" },
    architecture: {
      body: ["There's no framework. We wrote every file ourselves, and the result is hosted on GitHub Pages."],
      bullets: [
        "The markup is plain HTML, typed out by hand.",
        "Styles come in layers: design tokens first, then a base stylesheet, then a stylesheet for each section.",
        "Scripts are JavaScript modules; GSAP's ScrollTrigger and SplitText animate the title and the scrolling.",
        "Carousels use the Splide library.",
      ],
      diagram: "static-site",
    },
    sections: [
      {
        heading: "What's on the site",
        body: [
          "“A cafe with a microphone” is how Latte with Lata sums itself up. Its guests are people who build careers, organizations and movements around purpose; they sit down at the corner table on Thursday nights, and each talk is released as an episode.",
        ],
        bullets: [
          "The title animates in: “Latte with Lata: Real Conversations. Built on Purpose.”",
          "“From First Pour to Last Word”, where the café tells its own story.",
          "See the Menu and Book a Table are the two buttons in the menu section.",
          "A set of recent episodes, with an All Episodes link. Every card names the guest and gives a date and a running time.",
          "A section about the host, “Meet Lata”.",
          "The footer gives opening hours and links to every section, and says where the podcast can be heard: Spotify, Apple Podcasts, YouTube and RSS.",
        ],
      },
      {
        heading: "The result",
        body: [
          "The team's site went up on GitHub Pages with an animated title, the café's story, the menu with Book a Table, recent episodes showing guest, date and running time, a page for the host, and the podcast's channels in the footer.",
        ],
      },
    ],
    learned: [
      "Splitting the CSS into tokens, a base layer and one stylesheet per section let each of us work on a different section without breaking anyone else's styles.",
    ],
    videos: [
      {
        src: "/media/video/latte-with-lata/website.mp4",
        poster: "/media/poster/latte-with-lata/website.jpg",
        width: 1280,
        height: 612,
        title: "Latte with Lata website",
        description: "Screen capture of the 'LATTE WITH LATA' title in motion, a reload so the letters reveal themselves again, then the café, the menu, episode cards, the host and the footer, whose contact details are blurred.",
        durationSec: 31.1,
      },
    ],
    disclosures: ["No client runs this as a live site; the contact details on it are stand-ins."],
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
    techs: ["javascript", "html-css"],
    stack: ["JavaScript", "HTML & CSS", "VS Code", "Conversational AI", "Dzongkha–English NLP", "Multi-agent workflow automation"],
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
        body: ["I took part as a Fullstack Engineer, working in VS Code with JavaScript, HTML and CSS, and received a Certificate of Achievement dated July 27, 2026."],
      },
    ],
    verify: { href: "https://confirm.omdena.com/INxnf_n", label: "Verify the certificate" },
    disclosures: ["Exploratory and research-oriented by design: a prototype to test feasibility, not a production platform."],
  },
];

export const projectBySlug = (slug: string) => projects.find((p) => p.slug === slug);
