'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getClient } from '@/config-lib/graphql-client';
import type { Users } from '@/types/graphql';

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;
  
  const [user, setUser] = useState<Users | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const client = getClient();
        
        // 使用 GraphQL 查询获取单个用户数据
        const query = `
          query GetUser($id: bigint!) {
            users(where: { id: { _eq: $id } }, limit: 1) {
              id
              nickname
              mobile
              avatar_url
              bio
              email
              created_at
              updated_at
            }
          }
        `;
        
        const result = await client.execute<{ users: Users[] }>({
          query,
          variables: {
            id: userId
          }
        });
        
        if (!result.users || result.users.length === 0) {
          throw new Error('用户不存在');
        }
        
        setUser(result.users[0]);
      } catch (err) {
        console.error('获取用户数据失败:', err);
        setError('获取用户数据失败，请稍后重试');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUser();
    }
  }, [userId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <p className="text-red-600">{error || '用户不存在'}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            返回
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 返回按钮 */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回用户列表
          </button>
        </div>

        {/* 用户基本信息卡片 */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">用户详情</h1>
          </div>
          
          <div className="p-6">
            <div className="flex items-start space-x-6">
              {/* 头像 */}
              <div className="flex-shrink-0">
                {user.avatar_url ? (
                  <img
                    className="h-24 w-24 rounded-full object-cover"
                    src={user.avatar_url}
                    alt={user.nickname ?? ''}
                  />
                ) : (
                  <div className="h-24 w-24 rounded-full bg-gray-300 flex items-center justify-center">
                    <span className="text-gray-600 text-2xl font-medium">
                      {user.nickname?.charAt(0)?.toUpperCase() || '?'}
                    </span>
                  </div>
                )}
              </div>
              
              {/* 基本信息 */}
              <div className="flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">{user.nickname}</h2>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500">用户ID</label>
                        <p className="text-gray-900">{user.id}</p>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-gray-500">手机号</label>
                        <p className="text-gray-900">{user.mobile || '未绑定'}</p>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-gray-500">邮箱</label>
                        <p className="text-gray-900">{user.email || '—'}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* 个人简介 */}
                {user.bio && (
                  <div className="mt-6">
                    <label className="text-sm font-medium text-gray-500">个人简介</label>
                    <p className="mt-1 text-gray-900 bg-gray-50 p-3 rounded-lg">
                      {user.bio}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 时间信息卡片 */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">时间信息</h2>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-500">注册时间</label>
                <p className="mt-1 text-gray-900">{formatDate(user.created_at)}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">最后更新</label>
                <p className="mt-1 text-gray-900">{formatDate(user.updated_at)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
