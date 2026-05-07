"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getClient } from "@/config-lib/graphql-client";

type UserDetail = {
  id: string;
  email: string;
  role: string;
  created_at: string;
  updated_at: string;
};

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const client = getClient();
        const query = `
          query OneUser($id: bigint!) {
            users(where: { id: { _eq: $id } }, limit: 1) {
              id
              email
              role
              created_at
              updated_at
            }
          }
        `;
        const result = await client.execute<{ users: UserDetail[] }>({
          query,
          variables: { id: userId },
        });
        const row = result.users?.[0];
        if (!row) throw new Error("not found");
        setUser(row);
      } catch {
        setError("用户不存在或无法访问");
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [userId]);

  if (loading) return <div className="p-10 text-sm text-sage-800">加载中…</div>;
  if (error || !user) {
    return (
      <div className="p-10 space-y-4">
        <p className="text-red-700">{error}</p>
        <button type="button" className="underline text-brand-brown" onClick={() => router.push("/users")}>
          返回列表
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-10">
      <button
        type="button"
        className="mb-6 text-sm text-brand-brown underline"
        onClick={() => router.push("/users")}
      >
        返回用户列表
      </button>
      <div className="card-surface rounded-lg border border-sage-300 p-6">
        <h1 className="text-xl font-semibold text-brand-brown">用户详情</h1>
        <dl className="mt-4 space-y-2 text-sm">
          <div>
            <dt className="text-sage-800">ID</dt>
            <dd>{user.id}</dd>
          </div>
          <div>
            <dt className="text-sage-800">邮箱</dt>
            <dd>{user.email}</dd>
          </div>
          <div>
            <dt className="text-sage-800">role</dt>
            <dd>{user.role}</dd>
          </div>
          <div>
            <dt className="text-sage-800">created_at</dt>
            <dd>{user.created_at}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
