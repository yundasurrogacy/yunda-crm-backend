'use client';

import { useState } from 'react';
import Link from 'next/link';

interface AuthResult {
  success: boolean;
  message: string;
  data?: {
    userId?: string;
    token?: string;
  };
}

export default function AuthTestPage() {
  const [phoneLoginResult, setPhoneLoginResult] = useState<AuthResult | null>(null);
  const [wxLoginResult, setWxLoginResult] = useState<AuthResult | null>(null);
  const [loading, setLoading] = useState({
    phone: false,
    wx: false,
  });

  // 手机号登录
  const [phoneForm, setPhoneForm] = useState({
    phone: '',
    code: '',
  });

  // 微信登录
  const [wxForm, setWxForm] = useState({
    code: '',
    codeSource: 'phone', // 'phone' | 'login'
  });

  // 处理手机号登录
  const handlePhoneLogin = async () => {
    if (!phoneForm.phone || !phoneForm.code) {
      setPhoneLoginResult({
        success: false,
        message: '请填写手机号和验证码',
      });
      return;
    }

    setLoading(prev => ({ ...prev, phone: true }));
    setPhoneLoginResult(null);

    try {
      const response = await fetch('/api/auth/phone-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: phoneForm.phone,
          code: phoneForm.code,
        }),
      });

      const data = await response.json();

      if (response.ok && data.userId && data.token) {
        setPhoneLoginResult({
          success: true,
          message: '登录成功',
          data: {
            userId: data.userId,
            token: data.token,
          },
        });
      } else {
        setPhoneLoginResult({
          success: false,
          message: data.error || '登录失败',
        });
      }
    } catch (error) {
      setPhoneLoginResult({
        success: false,
        message: error instanceof Error ? error.message : '请求失败',
      });
    } finally {
      setLoading(prev => ({ ...prev, phone: false }));
    }
  };

  // 处理微信登录
  const handleWxLogin = async () => {
    if (!wxForm.code) {
      setWxLoginResult({
        success: false,
        message: '请填写微信 code',
      });
      return;
    }

    setLoading(prev => ({ ...prev, wx: true }));
    setWxLoginResult(null);

    try {
      const response = await fetch('/api/auth/wx-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: wxForm.code,
          codeSource: wxForm.codeSource,
        }),
      });

      const data = await response.json();

      if (response.ok && data.userId && data.token) {
        setWxLoginResult({
          success: true,
          message: '登录成功',
          data: {
            userId: data.userId,
            token: data.token,
          },
        });
      } else {
        setWxLoginResult({
          success: false,
          message: data.error || '登录失败',
        });
      }
    } catch (error) {
      setWxLoginResult({
        success: false,
        message: error instanceof Error ? error.message : '请求失败',
      });
    } finally {
      setLoading(prev => ({ ...prev, wx: false }));
    }
  };

  // 复制 Token
  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    alert('Token 已复制到剪贴板');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-900">认证测试</h1>
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

          <div className="space-y-8">
            {/* 手机号登录 */}
            <div className="border rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <span className="text-2xl mr-2">📱</span>
                手机号登录
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                通过手机号和验证码进行登录，系统会自动注册或登录用户
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    手机号
                  </label>
                  <input
                    type="tel"
                    value={phoneForm.phone}
                    onChange={(e) => setPhoneForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="请输入手机号"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loading.phone}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    验证码
                  </label>
                  <input
                    type="text"
                    value={phoneForm.code}
                    onChange={(e) => setPhoneForm(prev => ({ ...prev, code: e.target.value }))}
                    placeholder="请输入验证码"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loading.phone}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    注意：当前为测试环境，验证码校验逻辑需要根据实际业务实现
                  </p>
                </div>

                <button
                  onClick={handlePhoneLogin}
                  disabled={loading.phone}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading.phone ? '登录中...' : '登录'}
                </button>

                {phoneLoginResult && (
                  <div
                    className={`p-4 rounded-lg border ${
                      phoneLoginResult.success
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-center mb-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          phoneLoginResult.success
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {phoneLoginResult.success ? '成功' : '失败'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{phoneLoginResult.message}</p>
                    {phoneLoginResult.success && phoneLoginResult.data && (
                      <div className="space-y-2">
                        {phoneLoginResult.data.userId && (
                          <div className="text-sm">
                            <span className="font-medium">用户ID:</span>{' '}
                            <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">
                              {phoneLoginResult.data.userId}
                            </code>
                          </div>
                        )}
                        {phoneLoginResult.data.token && (
                          <div className="text-sm">
                            <span className="font-medium">JWT Token:</span>
                            <div className="mt-1 flex items-center gap-2">
                              <code className="bg-gray-100 px-2 py-1 rounded text-xs break-all flex-1">
                                {phoneLoginResult.data.token}
                              </code>
                              <button
                                onClick={() => copyToken(phoneLoginResult.data!.token!)}
                                className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                              >
                                复制
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 微信登录 */}
            <div className="border rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <span className="text-2xl mr-2">🔐</span>
                微信登录
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                通过微信小程序 code 进行登录，支持手机号开发标签 code 和 wx.login code
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Code Source
                  </label>
                  <select
                    value={wxForm.codeSource}
                    onChange={(e) => setWxForm(prev => ({ ...prev, codeSource: e.target.value as 'phone' | 'login' }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loading.wx}
                  >
                    <option value="phone">手机号开发标签 (phone)</option>
                    <option value="login">微信登录 (login)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    微信 Code
                  </label>
                  <input
                    type="text"
                    value={wxForm.code}
                    onChange={(e) => setWxForm(prev => ({ ...prev, code: e.target.value }))}
                    placeholder="请输入微信 code"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loading.wx}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    注意：当前为测试环境，需要真实的微信 code 才能成功登录
                  </p>
                </div>

                <button
                  onClick={handleWxLogin}
                  disabled={loading.wx}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading.wx ? '登录中...' : '登录'}
                </button>

                {wxLoginResult && (
                  <div
                    className={`p-4 rounded-lg border ${
                      wxLoginResult.success
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-center mb-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          wxLoginResult.success
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {wxLoginResult.success ? '成功' : '失败'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{wxLoginResult.message}</p>
                    {wxLoginResult.success && wxLoginResult.data && (
                      <div className="space-y-2">
                        {wxLoginResult.data.userId && (
                          <div className="text-sm">
                            <span className="font-medium">用户ID:</span>{' '}
                            <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">
                              {wxLoginResult.data.userId}
                            </code>
                          </div>
                        )}
                        {wxLoginResult.data.token && (
                          <div className="text-sm">
                            <span className="font-medium">JWT Token:</span>
                            <div className="mt-1 flex items-center gap-2">
                              <code className="bg-gray-100 px-2 py-1 rounded text-xs break-all flex-1">
                                {wxLoginResult.data.token}
                              </code>
                              <button
                                onClick={() => copyToken(wxLoginResult.data!.token!)}
                                className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                              >
                                复制
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 使用说明 */}
            <div className="mt-8 bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-2">使用说明</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p>• <strong>手机号登录:</strong> 需要先发送验证码到手机，然后使用手机号和验证码登录</p>
                <p>• <strong>微信登录:</strong> 需要从小程序获取 code，支持手机号开发标签和 wx.login 两种方式</p>
                <p>• <strong>JWT Token:</strong> 登录成功后会返回 JWT Token，可用于后续 API 请求的身份验证</p>
                <p>• <strong>自动注册:</strong> 如果用户不存在，系统会自动创建新用户</p>
                <p>• 当前为测试环境，部分功能需要根据实际业务逻辑完善</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
