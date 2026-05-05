'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getClient } from '@/config-lib/graphql-client';
import type { Users } from '@/types/graphql';

interface QueryResult {
  success: boolean;
  message: string;
  data?: any;
  query?: string;
}

export default function GraphQLTestPage() {
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [mutationResult, setMutationResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState({
    query: false,
    mutation: false,
  });

  // 查询表单
  const [queryForm, setQueryForm] = useState({
    userId: '1',
    limit: '10',
  });

  // 变更表单
  const [mutationForm, setMutationForm] = useState({
    userId: '1',
    nickname: '',
    bio: '',
  });

  // 执行查询
  const handleQuery = async () => {
    setLoading(prev => ({ ...prev, query: true }));
    setQueryResult(null);

    try {
      const client = getClient();
      const userId = parseInt(queryForm.userId) || 3;
      const limit = parseInt(queryForm.limit) || 10;

      // 使用 execute 方法执行 GraphQL 查询（推荐方式）
      const query = `
        query GetUsers($userId: bigint!, $limit: Int) {
          # 根据主键查询单个用户
          user: users_by_pk(id: $userId) {
            id
            nickname
            mobile
            bio
            avatar_url
            created_at
          }
          # 查询用户列表
          users(limit: $limit, order_by: { created_at: desc }) {
            id
            nickname
            mobile
            bio
            avatar_url
            created_at
          }
        }
      `;

      const result = await client.execute<{
        user: Users | null;
        users: Users[];
      }>({
        query,
        variables: {
          userId,
          limit,
        },
      });

      setQueryResult({
        success: true,
        message: '查询成功',
        data: result,
        query,
      });
    } catch (error) {
      setQueryResult({
        success: false,
        message: error instanceof Error ? error.message : '查询失败',
      });
    } finally {
      setLoading(prev => ({ ...prev, query: false }));
    }
  };

  // 执行变更
  const handleMutation = async () => {
    if (!mutationForm.nickname && !mutationForm.bio) {
      setMutationResult({
        success: false,
        message: '请至少填写昵称或简介',
      });
      return;
    }

    setLoading(prev => ({ ...prev, mutation: true }));
    setMutationResult(null);

    try {
      const client = getClient();
      const userId = parseInt(mutationForm.userId) || 3;

      // 构建更新对象
      const updateData: any = {};
      if (mutationForm.nickname) {
        updateData.nickname = mutationForm.nickname;
      }
      if (mutationForm.bio) {
        updateData.bio = mutationForm.bio;
      }

      // 使用 execute 方法执行 GraphQL 变更（推荐方式）
      const mutation = `
        mutation UpdateUser($userId: bigint!, $updateData: users_set_input!) {
          update_users_by_pk(
            pk_columns: { id: $userId }
            _set: $updateData
          ) {
            id
            nickname
            mobile
            bio
            avatar_url
            updated_at
          }
        }
      `;

      const result = await client.execute<{
        update_users_by_pk: Users | null;
      }>({
        query: mutation,
        variables: {
          userId,
          updateData,
        },
      });

      setMutationResult({
        success: true,
        message: '更新成功',
        data: result,
        query: mutation,
      });

      // 清空表单
      setMutationForm(prev => ({
        ...prev,
        nickname: '',
        bio: '',
      }));
    } catch (error) {
      setMutationResult({
        success: false,
        message: error instanceof Error ? error.message : '更新失败',
      });
    } finally {
      setLoading(prev => ({ ...prev, mutation: false }));
    }
  };

  // 格式化 JSON
  const formatJSON = (obj: any) => {
    return JSON.stringify(obj, null, 2);
  };

  // 复制到剪贴板
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('已复制到剪贴板');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-900">GraphQL 测试</h1>
            <Link
              href="/api-test"
              className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              返回测试中心
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 查询测试 */}
            <div className="border rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <span className="text-2xl mr-2">🔍</span>
                数据查询
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                使用 execute 方法执行 GraphQL 查询，支持类型安全的查询结果
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    用户ID（查询单个用户）
                  </label>
                  <input
                    type="number"
                    value={queryForm.userId}
                    onChange={(e) => setQueryForm(prev => ({ ...prev, userId: e.target.value }))}
                    placeholder="请输入用户ID"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loading.query}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    列表查询数量
                  </label>
                  <input
                    type="number"
                    value={queryForm.limit}
                    onChange={(e) => setQueryForm(prev => ({ ...prev, limit: e.target.value }))}
                    placeholder="请输入查询数量"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loading.query}
                  />
                </div>

                <button
                  onClick={handleQuery}
                  disabled={loading.query}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading.query ? '查询中...' : '执行查询'}
                </button>

                {queryResult && (
                  <div
                    className={`p-4 rounded-lg border ${
                      queryResult.success
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          queryResult.success
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {queryResult.success ? '成功' : '失败'}
                      </span>
                      {queryResult.query && (
                        <button
                          onClick={() => copyToClipboard(queryResult.query!)}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          复制查询
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{queryResult.message}</p>
                    {queryResult.success && queryResult.data && (
                      <div className="mt-2">
                        <details className="mt-2">
                          <summary className="cursor-pointer text-sm font-medium text-gray-700 mb-2">
                            查看结果数据
                          </summary>
                          <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-64">
                            {formatJSON(queryResult.data)}
                          </pre>
                        </details>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 变更测试 */}
            <div className="border rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <span className="text-2xl mr-2">✏️</span>
                数据变更
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                使用 execute 方法执行 GraphQL 变更，支持更新用户信息
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    用户ID
                  </label>
                  <input
                    type="number"
                    value={mutationForm.userId}
                    onChange={(e) => setMutationForm(prev => ({ ...prev, userId: e.target.value }))}
                    placeholder="请输入用户ID"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loading.mutation}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    昵称（可选）
                  </label>
                  <input
                    type="text"
                    value={mutationForm.nickname}
                    onChange={(e) => setMutationForm(prev => ({ ...prev, nickname: e.target.value }))}
                    placeholder="请输入新昵称"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loading.mutation}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    简介（可选）
                  </label>
                  <textarea
                    value={mutationForm.bio}
                    onChange={(e) => setMutationForm(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="请输入简介"
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loading.mutation}
                  />
                </div>

                <button
                  onClick={handleMutation}
                  disabled={loading.mutation}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading.mutation ? '更新中...' : '执行更新'}
                </button>

                {mutationResult && (
                  <div
                    className={`p-4 rounded-lg border ${
                      mutationResult.success
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          mutationResult.success
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {mutationResult.success ? '成功' : '失败'}
                      </span>
                      {mutationResult.query && (
                        <button
                          onClick={() => copyToClipboard(mutationResult.query!)}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          复制变更
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{mutationResult.message}</p>
                    {mutationResult.success && mutationResult.data && (
                      <div className="mt-2">
                        <details className="mt-2">
                          <summary className="cursor-pointer text-sm font-medium text-gray-700 mb-2">
                            查看结果数据
                          </summary>
                          <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-64">
                            {formatJSON(mutationResult.data)}
                          </pre>
                        </details>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 使用说明 */}
          <div className="mt-8 bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">使用说明</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p>• <strong>优先使用 execute 方法:</strong> 推荐使用 <code className="bg-gray-200 px-1 rounded">client.execute()</code> 方法执行 GraphQL 查询和变更，提供更好的灵活性和类型安全</p>
              <p>• <strong>类型安全:</strong> 所有查询结果都有完整的 TypeScript 类型定义，由 GraphQL schema 自动生成</p>
              <p>• <strong>查询示例:</strong> 支持根据主键查询单个用户和条件查询用户列表</p>
              <p>• <strong>变更示例:</strong> 支持更新用户信息，可以只更新部分字段</p>
              <p>• <strong>变量类型:</strong> 注意 GraphQL 变量类型，如 <code className="bg-gray-200 px-1 rounded">bigint!</code> 需要使用数字类型</p>
              <p>• 确保已正确配置 GraphQL 端点和认证信息</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
