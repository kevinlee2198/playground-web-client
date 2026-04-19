/**
 * Centralized backend entity IDs for test fixtures.
 *
 * These are backend schema IDs used in GraphQL mock responses.
 * Better Auth session IDs (strings) live in auth.fixture.ts — don't mix them.
 */

/** Backend user ID for the primary test user (matches auth fixture) */
export const TEST_BACKEND_USER_ID = 1;

/** Backend user ID for a secondary "other" user */
export const OTHER_USER_ID = 2;

/** Backend user ID for a blocked user */
export const BLOCKED_USER_ID = 3;

/** Backend user ID for a follow requester */
export const FOLLOW_REQUESTER_USER_ID = 4;
