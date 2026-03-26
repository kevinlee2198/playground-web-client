"use server";

import { auth } from "@/lib/auth";
import { authMutate, authQuery } from "@/lib/graphql-request";
import { MutationErrorType } from "@/lib/graphql-result";
import { EnumType } from "json-to-graphql-query";
import { headers } from "next/headers";
import { cache } from "react";
import { z } from "zod";

const updatePreferencesSchema = z.object({
  measurementUnit: z.enum(["METRIC", "IMPERIAL"]).optional(),
  notificationsEnabled: z.boolean().optional(),
  emailDigestFrequency: z.enum(["DAILY", "WEEKLY", "NEVER"]).optional(),
  profileVisibility: z.enum(["PUBLIC", "PRIVATE"]).optional(),
  showOnlineStatus: z.boolean().optional(),
  showGameHistory: z.boolean().optional(),
  showStatistics: z.boolean().optional(),
  preferredSports: z
    .array(z.enum(["BASEBALL", "BASKETBALL", "FOOTBALL", "TENNIS", "PICKLEBALL"]))
    .optional(),
});

const preferencesSelection = {
  measurementUnit: true,
  notificationsEnabled: true,
  emailDigestFrequency: true,
  profileVisibility: true,
  showOnlineStatus: true,
  showGameHistory: true,
  showStatistics: true,
  preferredSports: true,
} as const;

export interface UserPreferences {
  measurementUnit: string;
  notificationsEnabled: boolean;
  emailDigestFrequency: string;
  profileVisibility: string;
  showOnlineStatus: boolean;
  showGameHistory: boolean;
  showStatistics: boolean;
  preferredSports: string[];
}

export const loadUserPreferences = cache(
  async (): Promise<UserPreferences | null> => {
    try {
      const response = await authQuery({
        me: {
          preferences: preferencesSelection,
        },
      });

      if (response.errors?.length > 0) {
        return null;
      }

      return response.data?.me?.preferences ?? null;
    } catch (error) {
      console.error("Failed to load user preferences:", error);
      return null;
    }
  },
);

export interface UpdatePreferencesInput {
  measurementUnit?: string;
  notificationsEnabled?: boolean;
  emailDigestFrequency?: string;
  profileVisibility?: string;
  showOnlineStatus?: boolean;
  showGameHistory?: boolean;
  showStatistics?: boolean;
  preferredSports?: string[];
}

/** Fields that need EnumType wrapping for json-to-graphql-query. */
const enumFields = new Set([
  "measurementUnit",
  "emailDigestFrequency",
  "profileVisibility",
]);

interface UpdatePreferencesResult {
  success: boolean;
  preferences?: UserPreferences;
  errorType?: string;
  message?: string;
}

export async function updatePreferences(
  input: UpdatePreferencesInput,
): Promise<UpdatePreferencesResult> {
  // Verify authentication inside the server action
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return {
      success: false,
      errorType: MutationErrorType.UNEXPECTED_ERROR,
      message: "Not authenticated",
    };
  }

  try {
    const validated = updatePreferencesSchema.parse(input);

    const gqlInput: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(validated)) {
      if (value === undefined) continue;
      if (key === "preferredSports" && Array.isArray(value)) {
        gqlInput[key] = value.map((s) => new EnumType(s));
      } else if (enumFields.has(key)) {
        gqlInput[key] = new EnumType(value as string);
      } else {
        gqlInput[key] = value;
      }
    }

    const response = await authMutate({
      updateUserPreferences: {
        __args: { input: gqlInput },
        __typename: true,
        __on: [
          {
            __typeName: "UpdateUserPreferencesResponse",
            preferences: preferencesSelection,
          },
        ],
      },
    });

    if (response.errors?.length > 0) {
      return {
        success: false,
        errorType: MutationErrorType.GRAPHQL_ERROR,
        message: response.errors[0].message,
      };
    }

    const data = response.data?.updateUserPreferences;
    if (!data || data.__typename !== "UpdateUserPreferencesResponse") {
      return {
        success: false,
        errorType: MutationErrorType.UNEXPECTED_ERROR,
        message: "Unexpected response",
      };
    }

    return { success: true, preferences: data.preferences };
  } catch {
    return {
      success: false,
      errorType: MutationErrorType.UNEXPECTED_ERROR,
      message: "Failed to update preferences",
    };
  }
}

export async function loadBlockedUsers(first: number, after?: string) {
  try {
    const response = await authQuery({
      blockedUsers: {
        __args: {
          first,
          ...(after ? { after } : {}),
        },
        edges: {
          cursor: true,
          node: {
            id: true,
            displayName: true,
            username: true,
          },
        },
        pageInfo: {
          hasNextPage: true,
          endCursor: true,
        },
      },
    });

    if (response.errors?.length > 0) {
      return null;
    }

    return response.data?.blockedUsers || null;
  } catch (error) {
    console.error("Failed to load blocked users:", error);
    return null;
  }
}
