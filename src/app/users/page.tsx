"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getClient } from "@/config-lib/graphql-client";

type UserRow = {
  id: string;
  email: string;
  role: string;
  created_at: string;
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const client = getClient();
        const query = `
          query ListUsers($limit: Int!) {
            users(limit: $limit, order_by: { created_at: desc }) {
              id
              email
              role
              created_at
            }
          }
        `;
        const result = await client.execute<{ users: UserRow[] }>({
          query,
          variables: { limit: 80 },
        });
        setUsers(result.users ?? []);
      } catch {
        setError("无法读取 users（检查 Hasura 与 goc.config）");
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold text-brand-brown">Users（脚手架）</h1>
      <p className="mb-4 text-sm text-sage-800">
        与 schema 对齐的极简列表。统一登录做起来后可迁走或收口到 /admin。
      </p>
      {loading ? <p className="text-sm text-sage-800">加载中…</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <ul className="space-y-2">
        {users.map((u) => (
          <li key={u.id}>
            <Link
              className="text-brand-brown underline"
              href={`/users/${u.id}`}
            >
              {u.email}
            </Link>
            <span className="ml-2 text-xs text-sage-800">{u.role}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
