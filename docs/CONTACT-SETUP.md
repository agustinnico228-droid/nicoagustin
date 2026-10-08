# Contact form setup (email)

The website's contact form emails each message to Nico (agustinnico228@gmail.com) and to nobody else: no CC, no BCC.
It works through a small Google Apps Script "web app" that belongs to agustinnico228@gmail.com.
Nothing is stored anywhere else: the emails are the only record of the messages, so keep them.

The website needs two values to reach the script:

- `CONTACT_WEBHOOK_URL`: the web app's address (it ends with `/exec`). You get it in step 6.
- `CONTACT_SECRET`: a long random password, stored in two places (the script and the website). Claude gives it to
  you separately, once. It is not written in this file or anywhere in the code.

Until both are set on the website, the site shows an **"Email me instead"** link where the form would be, so nothing breaks.

> **Keep these private.** Never paste the `/exec` address or the secret into the code, a commit, an issue, a
> public chat or a shared document. They belong only in the script's settings, Vercel's settings and `.env.local`
> on this PC. (`pnpm check:push` refuses to push Apps Script addresses and secrets.)

Time needed: about 10 minutes. Do every step signed in as **agustinnico228@gmail.com**.
Tip: if your browser is signed in to several Google accounts, use a private (incognito) window signed in to this one
only. Apps Script sometimes picks the wrong account otherwise.

---

## 1. Create the script
1. Go to https://script.google.com and click **New project** (top left).
   A new tab opens with a file called `Code.gs` that holds a few lines of sample code (`function myFunction() { … }`).
2. Click the name at the top left (**Untitled project**), type **Portfolio contact form**, and click **Rename**.
3. Click inside `Code.gs`, select everything (**Ctrl+A**) and press **Delete**, so the file is empty.
4. In the website's folder, open `docs\contact\apps-script.gs` (right-click → **Open with** → **Notepad**).
   Select everything (**Ctrl+A**) and copy it (**Ctrl+C**).
5. Back in Apps Script, click inside the empty `Code.gs` and paste (**Ctrl+V**).
6. Click the **Save** icon (the floppy disk) or press **Ctrl+S**.

## 2. Add the secret
1. In the left sidebar, click **Project Settings** (the gear icon).
2. Scroll down to **Script Properties** and click **Add script property**.
3. **Property:** `CONTACT_SECRET` · **Value:** the secret Claude gave you (the same value as the website's `CONTACT_SECRET`).
   Paste it with no spaces before or after it.
4. Click **Save script properties**.

## 3. Check the setup (optional, recommended)
1. In the left sidebar, click **Editor** (the `< >` icon).
2. In the toolbar, open the list of functions (it shows a name such as `doPost`), choose **checkSetup**, and click **Run**.
3. The first time, Google asks for permission: follow [step 5](#5-authorize), then click **Run** again if needed.
4. The **Execution log** at the bottom should say `Setup OK. The secret is set (64 characters)…` and how many emails
   the account can still send today. It sends nothing.
   If it shows an error instead, the error says what's missing (usually the script property from step 2).

## 4. Deploy it as a web app
1. Click **Deploy** (top right) → **New deployment**.
2. Next to **Select type**, click the gear icon → **Web app**.
3. **Description:** `Contact form`.
4. **Execute as:** **Me (agustinnico228@gmail.com)**. The emails are then sent from this account, to this account.
5. **Who has access:** **Anyone**. This lets the website reach the script without a Google sign-in.
   Without the secret, nobody can send anything through it: the script answers "unauthorized" and sends no email.
6. Click **Deploy**.

## 5. Authorize
Google asks for permission the first time (in step 3 or step 4). If you already allowed it in step 3, it may skip this.
1. Click **Authorize access** and choose **agustinnico228@gmail.com**.
2. You'll see **"Google hasn't verified this app"**. That's expected: this is your own private script, and Google
   only reviews apps that are published for other people to use. Nothing is wrong.
   Click **Advanced** (bottom left), then **Go to Portfolio contact form (unsafe)**.
3. The next screen lists what the script may do. It asks only to **send email as you** (it can't read your inbox,
   your Drive or anything else). If the screen shows checkboxes, tick that one (or **Select all**).
   Click **Allow** (or **Continue**).

## 6. Copy the web app URL
After **Deploy**, the dialog shows a **Web app** URL that starts with `https://script.google.com/macros/s/` and ends
with `/exec`. Click **Copy**, and keep it somewhere private for the next step.
(You can find it again later under **Deploy → Manage deployments**.)

Quick check: paste the URL into a browser tab. You should see `{"ok":false,"error":"post_only"}`. That means it's
live (the website sends messages with POST, which a browser tab doesn't).

## 7. Connect the website (Vercel)
1. Go to https://vercel.com → the project **nicoagustin** → **Settings** → **Environment Variables**.
2. **Add:** key `CONTACT_WEBHOOK_URL`, value = the web app URL from step 6. Tick **Production** and **Preview**,
   turn on **Sensitive**, and click **Save**.
3. Check that `CONTACT_SECRET` is also there for **Production** and **Preview** (marked **Sensitive**), with the same
   value as the script property. If it isn't, add it the same way.
4. **Deployments** → the latest deployment → **⋯** → **Redeploy**. (Or just tell Claude, who can redeploy for you.)
   The site decides between the form and "Email me instead" when it's built, so the form appears only after a new build.

## 8. Test it
1. Open the live site and click any **Let's talk** / contact button (or scroll to the Contact section at the bottom
   of the home page). The pop-up should show the form, not "Email me instead".
2. Fill it in with your own name and a second email address of yours, and click **Send message**. (If you're very
   quick, it asks you to press Send again: it refuses messages sent within 3 seconds, which stops simple spam bots.)
   The message box starts with a short letter for the chosen inquiry type: edit it before sending (an unedited letter
   is refused with "Add a few details about the role or project.").
3. Within a few seconds "Thanks — your message is on its way. Nico will reply to …" appears, and an email arrives at
   agustinnico228@gmail.com. The first ones may land in Spam (see [Spam and Promotions](#spam-and-promotions)).

---

## What each message looks like
- **From:** Portfolio contact form `<agustinnico228@gmail.com>` (the account that owns the script)
- **To:** agustinnico228@gmail.com, and nobody else (no CC, no BCC)
- **Reply-To:** the visitor's address, so **Reply** answers the visitor directly.
- **Subject**, by the inquiry type the visitor chose (the company in brackets only when they gave one):

  | The visitor chose | Subject |
  |---|---|
  | Hire full-time | `Hiring enquiry: Ana Cruz (Acme Studio)` |
  | Freelance project | `Freelance project: Ana Cruz (Acme Studio)` |
  | Other | `Message: Ana Cruz` |

- **Body** (plain text, the time in Philippine time, Asia/Manila):
  ```
  New message from the contact form on Nico Agustin's portfolio.

  Name: Ana Cruz
  Email: ana@example.com
  Company: Acme Studio
  Inquiry type: Freelance project
  Page: /work/sabbath-spa
  Received: 2026-10-08 14:30 (Philippine time)

  Message:
  Hi Nico, …

  --
  Reply to this email to answer Ana Cruz directly.
  ```
  **Company** and **Page** show `-` when empty. **Page** is the page on the site the visitor wrote from.

## Updating the script
To install a newer `docs/contact/apps-script.gs`, publish it **without changing the URL**:
1. Go to https://script.google.com as agustinnico228@gmail.com, open **Portfolio contact form**, click `Code.gs`,
   select everything, and paste the new script over it. **Save**.
2. **Deploy → Manage deployments** → select the **Contact form** deployment → the pencil icon (**Edit**) →
   **Version:** **New version** → **Deploy**. If Google asks for permission again, follow step 5.

Don't use **New deployment** for changes: that creates a second, different URL, and the website would keep using the old one.

## The daily email limit
A free Gmail account can send script emails to **100 recipients a day**, so about **100 messages a day**. When the
limit is reached, the form says the message couldn't be sent and shows Nico's email address instead; the limit
frees up again within 24 hours. **checkSetup** (step 3) shows how many are left today.

So that nobody can use up that limit by replaying the form, the script also limits itself: at most **20 messages
per clock hour**, none once fewer than **10** of the day's emails are left (it answers `rate_limited`), and the
same message from the same address again within **10 minutes** is refused (`duplicate`). In those cases the visitor
sees "try again in a moment, or email me instead" with Nico's address. The script keeps only a counter and a hash
for this, never what anyone wrote. If the script was already installed before these limits were added, paste the
new `apps-script.gs` and publish it as in [Updating the script](#updating-the-script) (**Deploy → Manage
deployments → Edit → Version: New version → Deploy**); until then the old version, without limits, keeps running.

## Spam and Promotions
The first messages may land in **Spam** or **Promotions**. Open the message and click **Not spam**
(or drag it to **Primary**). To keep them out of Spam for good:
1. Click the **Show search options** icon at the right of the Gmail search bar.
2. **From:** `agustinnico228@gmail.com` and **Has the words:** `"Nico Agustin's portfolio"` → **Create filter**.
3. Tick **Never send it to Spam** (and, if you like, **Categorize as: Primary**) → **Create filter**.

## Changing (rotating) the secret
Do this if the secret may have leaked, or whenever you like. Do both sides at once: until they match, the form
answers "couldn't be sent" and shows Nico's email address.
1. Make a new one. Press the **Windows key**, type **PowerShell**, open **Windows PowerShell**, paste this line and press **Enter**:
   ```powershell
   $b = [byte[]]::new(32); [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); -join ($b | ForEach-Object { $_.ToString('x2') }) | Set-Clipboard
   ```
   Nothing is printed: a 64-character random secret is now on your clipboard.
   (Alternative, with Node.js: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.)
2. In the script: **Project Settings → Script Properties** → **Edit script properties** → replace the value of
   `CONTACT_SECRET` → **Save script properties**. No new deployment is needed: the script reads it on every message.
3. In Vercel: **Settings → Environment Variables** → `CONTACT_SECRET` → **⋯** → **Edit** → paste → **Save**, then
   **Deployments → ⋯ → Redeploy** (or tell Claude). If you test on this PC, change it in `.env.local` too.

## Troubleshooting
When a message fails, the website's log (Vercel → the project → **Logs**, or the `run-local.bat` window) has a line
`[contact] webhook failed: …` with the reason. In Apps Script, **Executions** (left sidebar) lists every run of the
script and any error (never what the visitor wrote).

| The log says | What to do |
|---|---|
| `the script answered ok:false (unauthorized)` | The secret in the script property and on the website differ. Look for a stray space or a missing character, fix one side, and redeploy if you changed Vercel. |
| `… (not_configured)` | The `CONTACT_SECRET` script property is missing, misspelled, or shorter than 16 characters (step 2). |
| `… (invalid)` | The script rejected the fields (no name, no message, or an email address it couldn't read). The website checks the same things first, so the script is probably out of date: paste the current `docs/contact/apps-script.gs` and publish a new version. |
| `… (bad_request)` | The request didn't look like the website's (not JSON, or over 30,000 characters). Check that `CONTACT_WEBHOOK_URL` is this script's URL. |
| `… (mail_failed)` | The script couldn't send the email. Usually the [daily limit](#the-daily-email-limit) is used up (it frees up within 24 hours), or the permission was removed: run **checkSetup** (step 3) and allow it again. **Executions** shows the error. |
| `… (server_error)` | Something unexpected failed in the script. **Executions** shows the error. If the code was edited by hand, paste `docs/contact/apps-script.gs` again. |
| `the response was not JSON (check the deployment's access is Anyone)` | **Who has access** isn't **Anyone** (**Deploy → Manage deployments** → pencil → **Who has access: Anyone** → **Deploy**), or the URL is wrong: it must end in `/exec`, not `/dev`. |
| `no answer within 10s` | Google was slow. Try again; if it keeps happening, check **Executions**. |
| `HTTP 404` | The deployment was deleted or archived. Copy the current URL from **Manage deployments** into Vercel and redeploy. |
| "Email me instead" instead of the form | Both variables are in Vercel (or `.env.local`), spelled exactly, the URL starts with `https://`, and the secret has at least 16 characters. Then redeploy (or run `run-local.bat` again). The build log has a `[contact] …` line saying which value is the problem. |
| "Thanks…" appears but no email | Check **Spam** and **Promotions**, then **Executions** in Apps Script. |

## Testing on this PC (optional)
1. `.env.local` in the website's folder already holds `CONTACT_SECRET`. Open it with Notepad and add one line, with no
   quotes and no spaces:
   ```
   CONTACT_WEBHOOK_URL=<the web app URL from step 6>
   ```
2. Save, close Notepad, and double-click `run-local.bat`. It rebuilds the site (needed after changing these values)
   and opens it at http://localhost:3002 (or the next free port).
3. Go to the Contact section and send a message as in step 8. This sends a real email.

## For developers
- The form: `components/contact/` · the server action and validation: `lib/contact/` · the script: `docs/contact/apps-script.gs`.
- `ContactLink` (`components/contact/ContactLink.tsx`) opens the pop-up; its `inquiry` prop (`hire` | `freelance` |
  `other`, default `freelance`) preselects the type and its letter. In code: `openContactDialog(opener, inquiry?)`
  from `lib/contact/dialog.ts`.
- The website sends the inquiry type's label (`INQUIRY_TYPES` in `lib/contact/fields.ts`) and the script chooses the
  subject from it (`subject_()`). If a label changes, change the script too; `apps-script.test.mjs` fails until they agree.
- Tests without Google: `pnpm test:apps-script` (runs the script against mocked MailApp, PropertiesService, Utilities
  and ContentService), `pnpm test:contact` and `pnpm test:dialog` (build the site, run it on port 3002 against a local
  fake of the web app in `tests/e2e/fake-webhook.mjs`, and check the flows with and without JavaScript). The last two
  leave `.next` built with test values: run `pnpm build` before `pnpm start` or a deploy.
