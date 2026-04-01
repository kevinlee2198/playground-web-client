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
    mode: "cors", // no-cors, cors, same-origin
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
  return response.json();
}

async function query(
  query: object,
  headers?: object,
  options?: NextFetchOptions,
): Promise<GraphQLResponse> {
  const graphQLQuery = { query: query };
  const body = JSON.stringify({
    query: jsonToGraphQLQuery(graphQLQuery),
  });
  return await fetchData(body, headers, options);
}

async function mutate(
  mutation: object,
  headers: object,
  options?: NextFetchOptions,
): Promise<GraphQLResponse> {
  const graphQLQuery = { mutation: mutation };
  const body = JSON.stringify({
    query: jsonToGraphQLQuery(graphQLQuery),
  });
  return await fetchData(body, headers, options);
}

async function getAuthHeaders() {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });

  if (!session?.user?.id) {
    return {};
  }

  // Get the Keycloak access token from the account cookie
  const tokenResponse = await auth.api.getAccessToken({
    headers: reqHeaders,
    body: { providerId: "keycloak" },
  });

  const accessToken = tokenResponse?.accessToken;
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
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
  errors: [GraphQLError];
}

// See https://netflix.github.io/dgs/error-handling/#error-specification for more information
interface GraphQLError {
  message: string;
  locations: [string];
  path: [string | number];
  extensions: TypedError;
}

enum ErrorType {
  BAD_REQUEST = "BAD_REQUEST",
  FAILED_PRECONDITION = "FAILED_PRECONDITION",
  INTERNAL = "INTERNAL",
  NOT_FOUND = "NOT_FOUND",
  PERMISSION_DENIED = "PERMISSION_DENIED",
  UNAUTHENTICATED = "UNAUTHENTICATED",
  UNAVAILABLE = "UNAVAILABLE",
  UNKNOWN = "UNKNOWN",
}

interface TypedError {
  /**
   * An error code from the ErrorType enumeration.
   * An errorType is a fairly coarse characterization
   * of an error that should be sufficient for client
   * side branching logic.
   */
  errorType: ErrorType;

  /**
   * The ErrorDetail is an optional field which will
   * provide more fine grained information on the error
   * condition. This allows the ErrorType enumeration to
   * be small and mostly static so that application branching
   * logic can depend on it. The ErrorDetail provides a
   * more specific cause for the error. This enumeration
   * will be much larger and likely change/grow over time.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errorDetail?: any;

  /**
   * Indicates the source that issued the error. For example, could
   * be a backend service name, a domain graph service name, or a
   * gateway. In the case of client code throwing the error, this
   * may be a client library name, or the client app name.
   */
  origin?: string;

  /**
   * Optionally provided based on request flag
   * Could include e.g. stacktrace or info from
   * upstream service
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  debugInfo?: any;

  /**
   * Http URI to a page detailing additional
   * information that could be used to debug
   * the error. This information may be general
   * to the class of error or specific to this
   * particular instance of the error.
   */
  debugUri?: string;
}

export { authMutate, authQuery, ErrorType, mutate, query };
export type { GraphQLError, GraphQLResponse, NextFetchOptions, TypedError };
