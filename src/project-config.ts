import graphqlOrmfyClientConfig from "../goc.config";

/** GraphQL 默认客户端实例的配置（endpoint、headers） */
export const graphqlClientInstanceConfig = {
  endpoint: graphqlOrmfyClientConfig.endpoint,
  headers: graphqlOrmfyClientConfig.headers,
};

/** @deprecated 请使用 graphqlClientInstanceConfig */
export const hasuraGraphqlClientConfig = graphqlClientInstanceConfig;