# FormMirror Marketing Site

A production-ready marketing experience for the FormMirror Chrome extension. Built with React 18, Vite, TypeScript, Tailwind CSS, React Router, Framer Motion, and MDX.

## Getting started

```bash
cd marketing-site
npm install
npm run dev
```

### Available scripts

- `npm run dev` – Start the Vite development server with hot reload.
- `npm run build` – Generate a production build in `dist/`.
- `npm run preview` – Preview the production build locally.
- `npm run lint` – Lint TypeScript/TSX files with ESLint.
- `npm run typecheck` – Run TypeScript project references.

### Environment variables

Create a `.env` file to override defaults:

```
VITE_CONTACT_ENDPOINT=https://your-api.example.com/contact
VITE_REPO_URL=https://github.com/ehfuzzz/formmirror-extension
```

If `VITE_CONTACT_ENDPOINT` is unset the contact page will show a `mailto:` fallback.

## Project structure

```
marketing-site/
├── index.html
├── package.json
├── src/
│   ├── components/
│   ├── content/docs/
│   ├── pages/
│   ├── routes/
│   └── styles/
├── tailwind.config.ts
├── tsconfig.json
└── vite.config.ts
```

## Deployment on AWS

### Option A — AWS Amplify Hosting

1. Push this repository to GitHub.
2. In the Amplify console, **New app → Host web app** and connect the repo.
3. Set the build settings:
   ```yaml
   version: 1
   applications:
     - appRoot: marketing-site
       frontend:
         phases:
           preBuild:
             commands:
               - npm install
           build:
             commands:
               - npm run build
         artifacts:
           baseDirectory: dist
           files:
             - '**/*'
         cache:
           paths:
             - node_modules/**/*
   ```
4. Add environment variables for `VITE_CONTACT_ENDPOINT` and `VITE_REPO_URL` if needed.
5. Deploy. Amplify serves the `dist/` output via a global CDN with HTTPS.

### Option B — Amazon S3 + CloudFront

1. Build the site:
   ```bash
   cd marketing-site
   npm install
   npm run build
   ```
2. Create an S3 bucket (static hosting disabled) and enable Object Ownership (bucket owner preferred).
3. Upload the contents of `dist/` to the bucket. Use the AWS CLI for cache-control headers:
   ```bash
   aws s3 sync dist/ s3://YOUR_BUCKET --delete --cache-control "public, max-age=31536000" --exclude index.html
   aws s3 cp dist/index.html s3://YOUR_BUCKET/index.html --cache-control "no-cache, max-age=0"
   ```
4. Create a CloudFront distribution pointing to the bucket with an Origin Access Control (OAC).
5. Set the default root object to `index.html` and add custom error responses for `403` and `404` that return `index.html` with HTTP 200 (to support SPA routing).
6. Attach a CloudFront Function or Lambda@Edge to inject security headers:
   - `Content-Security-Policy: default-src 'self'; frame-ancestors 'none'; upgrade-insecure-requests`
   - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
   - `X-Content-Type-Options: nosniff`
   - `Referrer-Policy: strict-origin-when-cross-origin`
7. Configure Route 53 or your DNS provider to point to the CloudFront distribution.

## Contact API example

A sample AWS Lambda handler using SES lives in [`serverless/contact-handler.ts`](./serverless/contact-handler.ts). Deploy it with API Gateway + Lambda, then set `VITE_CONTACT_ENDPOINT` to the invocation URL. The handler validates payloads, sends email via SES, and returns structured JSON.

## Accessibility and performance

- WCAG 2.1 AA color contrast (white + grey + blue palette).
- Prefers-reduced-motion support for motion-heavy components.
- SEO-friendly meta tags per route via `react-helmet-async`.
- MDX-driven docs with copy-to-clipboard code blocks.

## License

FormMirror marketing site is released under the Apache 2.0 license, matching the extension.
