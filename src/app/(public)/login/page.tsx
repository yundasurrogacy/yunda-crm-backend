"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";

function LoginForm() {
  const router = useRouter();
  const { t } = useTranslation(["auth", "common"]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function localizedError(res: Response): string {
    switch (res.status) {
      case 400:
        return t("auth:errors.badRequest");
      case 401:
        return t("auth:errors.invalidCredentials");
      case 503:
        return t("auth:errors.systemUnavailable");
      default:
        return t("auth:errors.generic");
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", email, password }),
      });
      await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(localizedError(res));
        return;
      }
      router.replace("/select-portal");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <h1 className="crm-font-display mb-2 text-2xl font-semibold text-brand-brown">{t("auth:title")}</h1>
      <p className="mb-6 text-sm leading-relaxed text-sage-700">{t("auth:subtitle")}</p>
      <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
        <label className="block text-sm">
          <span className="font-medium text-sage-800">{t("auth:email")}</span>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 w-full rounded-md border border-sage-300 bg-white/90 px-3 py-2.5 text-sm shadow-sm transition focus:border-brand-brown focus:outline-none focus:ring-[3px] focus:ring-brand-brown/30"
            autoComplete="username"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-sage-800">{t("auth:password")}</span>
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5 w-full rounded-md border border-sage-300 bg-white/90 px-3 py-2.5 text-sm shadow-sm transition focus:border-brand-brown focus:outline-none focus:ring-[3px] focus:ring-brand-brown/30"
            autoComplete="current-password"
          />
        </label>
        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" disabled={pending} className="crm-btn crm-btn-primary w-full py-2.5">
          {pending ? t("auth:submitPending") : t("auth:submit")}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  const { t } = useTranslation("common");
  return (
    <Suspense fallback={<p className="text-sm text-sage-800">{t("loading")}</p>}>
      <LoginForm />
    </Suspense>
  );
}
