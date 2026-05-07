import graphqlOrmfyClientConfig from "../goc.config";

const baseHeaders = graphqlOrmfyClientConfig.headers as Record<string, string>;

/** GraphQL 默认客户端：环境变量可覆盖 endpoint 与 admin secret */
export const graphqlClientInstanceConfig = {
  endpoint:
    process.env.HASURA_GRAPHQL_ENDPOINT ??
    process.env.HASURA_ENDPOINT ??
    graphqlOrmfyClientConfig.endpoint,
  headers: {
    ...baseHeaders,
    ...(process.env.HASURA_ADMIN_SECRET
      ? { "x-hasura-admin-secret": process.env.HASURA_ADMIN_SECRET }
      : {}),
  },
};

/** @deprecated 请使用 graphqlClientInstanceConfig */
export const hasuraGraphqlClientConfig = graphqlClientInstanceConfig;
