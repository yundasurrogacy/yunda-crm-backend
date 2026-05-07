import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { ClientI18nProvider } from "@/components/i18n/ClientI18nProvider";
import { CRM_I18N_LANG_KEY, parseCrmLang } from "@/i18n/constants";

export const metadata: Metadata = {
  title: "孕达 CRM",
  description: "Yunda surrogacy CRM",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const initialLng = parseCrmLang(cookieStore.get(CRM_I18N_LANG_KEY)?.value);
  const isZh = initialLng === "zh-CN";

  return (
    <html lang={isZh ? "zh-CN" : "en"} suppressHydrationWarning className={isZh ? "lang-zh" : undefined}>
      <body className="min-h-screen bg-background antialiased">
        <ClientI18nProvider initialLng={initialLng}>{children}</ClientI18nProvider>
      </body>
    </html>
  );
}
