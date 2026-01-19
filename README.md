This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Authentication

This project uses [better-auth](https://www.better-auth.com/) to handle authentication. It uses keycloak as the IDP and better auth as a stateless management system.

## Features

This project is a NextJS webapp that makes playing sports with friends easier. It contains aspects of Facebook, Twitch, and Strava.
Users can friend other users, schedule sporting events like basketball games with their friends, and track their stats. Users can also livestream their
sporting event. Live chat with friends is also available.

## Server

This webapp communicates with a spring boot server using GraphQL. Use the `graphql-request.ts` file to communicate with it

## Development with Claude Code

This project uses [Claude Code](https://claude.ai/code) with specialized subagents for spec-driven development.

### Subagent Workflow

1. `/requirements` - Product manager interviews you and writes requirements
2. `/design` - Principal engineer creates technical design
3. `/implementation` - Frontend engineer implements the feature
4. `/qa` - Verifies implementation against requirements
5. `/code-reviewer` - Reviews code quality and security
6. `/debugger` - Troubleshoots issues

Specifications are stored in `.claudedoc/<feature-name>/` with `requirements.md`, `design.md`, and `qa-report.md`.

See `CLAUDE.md` for full documentation.
