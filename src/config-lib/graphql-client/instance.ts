import { graphqlClientInstanceConfig as config } from "@/project-config";
import { GraphQLClient } from "./graphql-client";
import type { RequestInterceptor, ResponseInterceptor } from "./types";

const endpoint = config.endpoint;
const headers = config.headers ?? {};

const requestInterceptor: RequestInterceptor = (cfg) => ({
  ...cfg,
  headers: { ...cfg.headers, ...headers },
});

const responseInterceptor: ResponseInterceptor = (response) => response;

let clientInstance: GraphQLClient | null = null;

function getClientInstance(): GraphQLClient {
  if (clientInstance) return clientInstance;
  clientInstance = new GraphQLClient({
    endpoint,
    headers,
    requestInterceptor,
    responseInterceptor,
  });
  if (typeof window !== "undefined" && !(window as unknown as { graphqlClient: GraphQLClient }).graphqlClient) {
    (window as unknown as { graphqlClient: GraphQLClient }).graphqlClient = clientInstance;
  }
  if (typeof globalThis !== "undefined" && !(globalThis as unknown as { graphqlClient: GraphQLClient }).graphqlClient) {
    (globalThis as unknown as { graphqlClient: GraphQLClient }).graphqlClient = clientInstance;
  }
  return clientInstance;
}

export function getClient(): GraphQLClient {
  return getClientInstance();
}

export const GraphqlClientInstance = getClientInstance();
export default GraphqlClientInstance;
