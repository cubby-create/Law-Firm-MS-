# CalAdvoc — Law Firm Management System

A web application for modern law firms to manage clients, cases, documents, finances, staff, and day-to-day operations from one organized platform.

> **Note:** This project is currently a front-end web application with optional Supabase integration for authentication, profiles, firm data, and profile-image storage.

## Features

- Client and matter management
- Case and file tracking
- Dashboard and firm statistics
- Financial management, invoices, debtors, and creditors
- Budget and accounting support
- Staff and user management
- Role-based access support
- Document and profile-image storage
- Appointment, calendar, deadline, and hearing tracking
- Responsive marketing and account pages
- Trial-account support through Supabase

## Technology Stack

- **HTML5** — application pages and semantic structure
- **CSS3** — responsive styling and visual design
- **JavaScript** — account flows, navigation, and Supabase integration
- **Supabase** — authentication, PostgreSQL data, row-level security, and storage
- **PL/pgSQL** — database policies, trigger functions, and setup scripts

## Project Structure

```text
Law Firm MS/
├── index.html                  # Landing page
├── about.html                  # About page
├── features.html               # Feature overview
├── contact.html                # Contact page
├── account.html                # Account and subscription flows
├── dashboard.html              # Authenticated dashboard
├── dashboard-preview.html      # Dashboard preview
├── styles.css                  # Shared application styles
├── supabase-config.js          # Supabase client and data helpers
└── supabase-storage-setup.sql  # Database tables, policies, and storage setup
```

## Getting Started

### Prerequisites

- A modern web browser
- A local static web server (recommended)
- A Supabase project if authentication and persistent data are required

### Run locally

1. Clone the repository:

   ```bash
   git clone https://github.com/cubby-create/Law-Firm-MS-.git
   cd Law-Firm-MS-
   ```

2. Open the `Law Firm MS` directory.

3. Start a local static server. For example, with Python:

   ```bash
   cd "Law Firm MS"
   python -m http.server 8000
   ```

4. Visit [http://localhost:8000](http://localhost:8000) in your browser.

You can also open `index.html` directly, but a local server is recommended for authentication, storage, and browser security compatibility.

## Supabase Setup

The repository includes `supabase-storage-setup.sql`, which creates:

- `profiles` table
- `firm_data` table
- Row-level security policies
- A `profiles` storage bucket
- A profile-update timestamp trigger

To enable the backend:

1. Create or select a Supabase project.
2. Review the values in `Law Firm MS/supabase-config.js`.
3. Run `Law Firm MS/supabase-storage-setup.sql` in the Supabase SQL Editor.
4. Confirm that email authentication is enabled in Supabase Authentication settings.
5. Serve the application through a local or deployed web server and test account creation and sign-in.

### Security note

Only use a Supabase publishable/anonymous key in browser code. Never place a Supabase service-role key, database password, or other server-side secret in this repository. Review the project’s Supabase configuration and rotate any credential that may have been exposed unintentionally.

## Deployment

Because the application is primarily static, it can be deployed to services such as:

- GitHub Pages
- Netlify
- Vercel
- Cloudflare Pages
- Any web server capable of serving static HTML, CSS, and JavaScript

When deploying, update Supabase authentication redirect URLs and allowed site URLs to include the production domain.

## Current Limitations

- The contact form and some call-to-action controls currently provide front-end UI only unless connected to a backend workflow.
- Production billing, email delivery, audit logging, and advanced authorization should be configured before using the application with real firm data.
- Legal and financial data should be protected with an appropriate security, backup, privacy, and compliance review.

## Contributing

1. Create a feature branch.
2. Make focused changes.
3. Test the pages in a modern browser and verify Supabase flows when applicable.
4. Open a pull request with a clear description of the change.

## License

No license has been specified yet. Add a `LICENSE` file before distributing or accepting external contributions under specific terms.

## Contact

For project questions, open an issue in this repository:

https://github.com/cubby-create/Law-Firm-MS-/issues
