import graphqlOrmfyClientConfig from "../goc.config";

/** 与 `src/project-config.ts` 一致，便于本地用 `.env` 中的 Hasura 凭证拉取 schema */
const endpoint =
  process.env.HASURA_GRAPHQL_ENDPOINT ??
  process.env.HASURA_ENDPOINT ??
  graphqlOrmfyClientConfig.endpoint;

const baseHeaders = (graphqlOrmfyClientConfig.headers || {}) as Record<string, string>;
const headers = {
  ...baseHeaders,
  ...(process.env.HASURA_ADMIN_SECRET
    ? { "x-hasura-admin-secret": process.env.HASURA_ADMIN_SECRET }
    : {}),
};

const defaultConfig = {
  schema: [
    {
      [endpoint]: {
        headers,
      },
    },
  ],
  documents: [],
  generates: {
    "./graphql/schema.graphql": {
      plugins: ["schema-ast"],
    },
    // 如需生成 types:
    "./src/types/graphql.ts": {
      plugins: ["typescript"],
    },
  },
};

export default defaultConfig;
