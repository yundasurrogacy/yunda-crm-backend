/**
 * GraphQL 请求配置（拦截器可修改）
 */
export interface GraphQLRequestConfig {
  url: string;
  method: "POST";
  headers: Record<string, string>;
  body: string;
}

/**
 * GraphQL 标准响应体（含 data / errors）
 */
export interface GraphQLResponseBody<T = unknown> {
  data?: T;
  errors?: Array<{ message: string; locations?: unknown; path?: unknown }>;
}

/**
 * 请求拦截器：在发送前修改配置（如加 token、调试信息）
 */
export type RequestInterceptor = (
  config: GraphQLRequestConfig
) => GraphQLRequestConfig | Promise<GraphQLRequestConfig>;

/**
 * 响应拦截器：在返回前处理响应（如统一解析、调试）
 */
export type ResponseInterceptor = <T>(
  response: GraphQLResponseBody<T>
) => GraphQLResponseBody<T> | Promise<GraphQLResponseBody<T>>;

/**
 * 自定义请求函数（用于 Node 或自定义 fetch）
 * 返回 body 已解析为 JSON 的对象。
 */
export type CustomFetchFn = (
  url: string,
  init: RequestInit
) => Promise<{ ok: boolean; status: number; json: () => Promise<GraphQLResponseBody> }>;

export interface GraphQLClientOptions {
  endpoint: string;
  headers?: Record<string, string>;
  requestInterceptor?: RequestInterceptor;
  responseInterceptor?: ResponseInterceptor;
  /** 服务端或需代理时传入自定义 fetch */
  fetchFn?: CustomFetchFn;
}

export interface ExecuteOptions<V = Record<string, unknown>> {
  query: string;
  variables?: V;
  /**
   * 内存缓存时间（毫秒）。
   * 传入则按 query+variables 做缓存，在有效期内返回缓存（始终为最新一次请求结果）。
   * 不传则每次请求最新数据，且不写入缓存。
   */
  cacheMs?: number;
}
