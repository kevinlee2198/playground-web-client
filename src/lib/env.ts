import { z } from "zod";

const envSchema = z.object({
  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.url(),
  KEYCLOAK_CLIENT_ID: z.string().min(1),
  KEYCLOAK_URL: z.url(),
  KEYCLOAK_REALM: z.string().min(1),
  API_SERVER_URL: z.url(),
  // NEXT_PUBLIC_ vars are inlined at build time. This validates the server-side
  // runtime value only — ensure they are also set correctly at build time.
  NEXT_PUBLIC_API_SERVER_URL: z.url(),
});

// Set SKIP_ENV_VALIDATION=1 during Docker builds where server-only vars aren't present.
export const env = process.env.SKIP_ENV_VALIDATION
  ? (process.env as unknown as z.infer<typeof envSchema>)
  : envSchema.parse(process.env);
