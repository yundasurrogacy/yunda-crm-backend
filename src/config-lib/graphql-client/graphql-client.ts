import type {
  GraphQLClientOptions,
  GraphQLRequestConfig,
  GraphQLResponseBody,
  ExecuteOptions,
  CustomFetchFn,
} from "./types";

function defaultFetchFn(
  url: string,
  init: RequestInit
): Promise<{ ok: boolean; status: number; json: () => Promise<GraphQLResponseBody> }> {
  return fetch(url, init).then(async (res) => ({
    ok: res.ok,
    status: res.status,
    json: () => res.json() as Promise<GraphQLResponseBody>,
  }));
}

/** 生成缓存 key：query + 稳定序列化的 variables */
function cacheKey(query: string, variables?: unknown): string {
  const normalized = variables == null ? "" : JSON.stringify(variables);
  return query + "\n" + normalized;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * 可多实例的 GraphQL 请求客户端。
 * - 每个实例独立 endpoint、拦截器、缓存，互不干扰。
 * - execute 支持可选 cacheMs（内存缓存，按 query+variables 判定）。
 * - 支持请求/响应拦截器，便于统一加 token、调试等。
 */
export class GraphQLClient {
  private readonly endpoint: string;
  private readonly baseHeaders: Record<string, string>;
  private readonly requestInterceptor?: GraphQLClientOptions["requestInterceptor"];
  private readonly responseInterceptor?: GraphQLClientOptions["responseInterceptor"];
  private readonly fetchFn: CustomFetchFn;
  private readonly cache = new Map<string, CacheEntry<unknown>>();

  constructor(options: GraphQLClientOptions) {
    this.endpoint = options.endpoint;
    this.baseHeaders = {
      "Content-Type": "application/json",
      ...options.headers,
    };
    this.requestInterceptor = options.requestInterceptor;
    this.responseInterceptor = options.responseInterceptor;
    this.fetchFn = options.fetchFn ?? defaultFetchFn;
  }

  /**
   * 执行 GraphQL 请求。
   * @param options.query - 查询/变更字符串
   * @param options.variables - 变量
   * @param options.cacheMs - 可选，缓存毫秒数；不传则请求最新且不缓存
   * @returns 解析后的 data 部分（若有 errors 会抛错）
   */
  async execute<T = unknown, V = Record<string, unknown>>(
    options: ExecuteOptions<V>
  ): Promise<T> {
    const { query, variables, cacheMs } = options;
    const key = cacheKey(query, variables);

    if (cacheMs != null && cacheMs > 0) {
      const hit = this.cache.get(key) as CacheEntry<T> | undefined;
      if (hit && Date.now() - hit.timestamp < cacheMs) {
        return hit.data as T;
      }
    }

    let config: GraphQLRequestConfig = {
      url: this.endpoint,
      method: "POST",
      headers: { ...this.baseHeaders },
      body: JSON.stringify({ query, variables: variables ?? {} }),
    };

    if (this.requestInterceptor) {
      config = await this.requestInterceptor(config);
    }

    const res = await this.fetchFn(config.url, {
      method: config.method,
      headers: config.headers,
      body: config.body,
    });

    let body = (await res.json()) as GraphQLResponseBody<T>;
    if (this.responseInterceptor) {
      body = (await this.responseInterceptor(body)) as GraphQLResponseBody<T>;
    }

    if (!res.ok) {
      const msg = body.errors?.[0]?.message ?? `HTTP ${res.status}`;
      throw new Error(msg);
    }
    if (body.errors?.length) {
      const msg = body.errors.map((e) => e.message).join("; ");
      throw new Error(msg);
    }

    const data = body.data as T;
    if (cacheMs != null && cacheMs > 0) {
      this.cache.set(key, { data, timestamp: Date.now() });
    }
    return data;
  }
}
