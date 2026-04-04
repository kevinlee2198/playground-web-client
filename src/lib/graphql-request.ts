import { jsonToGraphQLQuery } from "json-to-graphql-query";
import { headers } from "next/headers";
import { auth } from "./auth";
import { env } from "./env";
import { GRAPHQL_PATH } from "./graphql-config";

function buildRequestObject(
  data: BodyInit,
  inputHeaders: object = {},
): Request {
  const baseUrl = env.API_SERVER_URL + GRAPHQL_PATH;

  return new Request(baseUrl, {
    method: "POST",
    mode: "cors",
    headers: {
      "Content-Type": "application/json",
      ...inputHeaders,
    },
    body: data,
  });
}

async function fetchData<T>(
  data: string,
  inputHeaders?: object,
  options?: NextFetchOptions,
): Promise<T> {
  const response = await fetch(buildRequestObject(data, inputHeaders), options);
  if (!response.ok) {
    throw new Error(
      `GraphQL request failed with status ${response.status} ${response.statusText}`,
    );
  }
  return response.json();
}

async function query(
  query: object,
  headers?: object,
  options?: NextFetchOptions,
): Promise<GraphQLResponse> {
  const body = JSON.stringify({
    query: jsonToGraphQLQuery({ query }),
  });
  return fetchData(body, headers, options);
}

async function mutate(
  mutation: object,
  headers: object,
  options?: NextFetchOptions,
): Promise<GraphQLResponse> {
  const body = JSON.stringify({
    query: jsonToGraphQLQuery({ mutation }),
  });
  return fetchData(body, headers, options);
}

async function getAuthHeaders() {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });

  if (!session?.user?.id) {
    return {};
  }

  try {
    const tokenResponse = await auth.api.getAccessToken({
      headers: reqHeaders,
      body: { providerId: "keycloak" },
    });

    if (!tokenResponse?.accessToken) {
      console.warn(
        "[getAuthHeaders] Token empty despite valid session — stale session",
      );
      return {};
    }

    return { Authorization: `Bearer ${tokenResponse.accessToken}` };
  } catch (error) {
    console.warn(
      "[getAuthHeaders] Token fetch failed:",
      error instanceof Error ? error.message : String(error),
    );
    return {};
  }
}

async function authQuery(q: object, options?: NextFetchOptions) {
  const h = await getAuthHeaders();
  return query(q, h, options);
}

async function authMutate(m: object, options?: NextFetchOptions) {
  const h = await getAuthHeaders();
  return mutate(m, h, options);
}

/** See https://nextjs.org/docs/app/api-reference/functions/fetch */
interface NextFetchOptions {
  cache?: "force-cache" | "no-store";
  next?: {
    revalidate?: false | 0 | number;
    tags?: [string];
  };
}

interface GraphQLResponse {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  errors: GraphQLError[];
}

// Spring GraphQL error format — see extensions.classification
interface GraphQLError {
  message: string;
  locations: { line: number; column: number }[];
  path: (string | number)[];
  extensions: GraphQLErrorExtensions;
}

enum ErrorClassification {
  BAD_REQUEST = "BAD_REQUEST",
  FORBIDDEN = "FORBIDDEN",
  INTERNAL_ERROR = "INTERNAL_ERROR",
  NOT_FOUND = "NOT_FOUND",
  UNAUTHORIZED = "UNAUTHORIZED",
}

interface GraphQLErrorExtensions {
  classification: ErrorClassification;
  [key: string]: unknown;
}

function hasUnauthorizedError(response: GraphQLResponse): boolean {
  return (
    response.errors?.some(
      (e) => e.extensions?.classification === ErrorClassification.UNAUTHORIZED,
    ) ?? false
  );
}

export { authMutate, authQuery, ErrorClassification, hasUnauthorizedError, mutate, query };
export type { GraphQLError, GraphQLErrorExtensions, GraphQLResponse, NextFetchOptions };
