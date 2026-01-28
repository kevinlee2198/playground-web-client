"use server";

import { authQuery } from "@/lib/graphql-request";

interface CurrentUserInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export async function fetchCurrentUser(): Promise<CurrentUserInfo | null> {
  try {
    const response = await authQuery({
      me: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    return response.data?.me ?? null;
  } catch {
    return null;
  }
}
