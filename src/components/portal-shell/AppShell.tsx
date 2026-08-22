"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import type { PortalNavItem } from "@/config/portal-nav";
import { isPortalNavActive } from "@/lib/portal-nav-active";
import type { PortalId } from "@/types/portal";
import { ConfirmDialogProvider } from "@/components/ui/ConfirmDialog";
import { PageEnter } from "./PageEnter";
import { PortalSwitcherFooter } from "./PortalSwitcherFooter";

/** 对齐 yunda-admin-system CommonSidebar / CommonHeader 的壳层色块 */
export const CRM_HEADER_OLD_BG = "#c3ccc2";
export const CRM_SIDEBAR_OLD_BG = "#bfc9bf";

export const CRM_SIDEBAR_STORAGE_KEY = "yunda_crm_sidebar_open";

export function AppShell({
  sidebarTitleKey,
  navItems,
  shell,
  centerSlot,
  children,
}: {
  sidebarTitleKey: string;
  navItems: readonly PortalNavItem[];
  /** 侧栏账号条：管理端 / 业务端口 */
  shell: "admin" | PortalId;
  /** 顶栏居中（如 AM 的 YUNDA） */
  centerSlot?: ReactNode;
  children: React.ReactNode;
}) {
  const { t } = useTranslation("portal");
  const pathname = usePathname() ?? "/";
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const skipExpandOnMount = useRef(true);

  useEffect(() => {
    try {
      const v = localStorage.getItem(CRM_SIDEBAR_STORAGE_KEY);
      if (v === "0") setSidebarOpen(false);
      else if (v === "1") setSidebarOpen(true);
    } catch {
      /* ignore */
    }
  }, []);

  function toggleSidebar() {
    setSidebarOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(CRM_SIDEBAR_STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  /** 路由切换后展开侧栏（跳过首次挂载，以免覆盖 localStorage 里的折叠偏好） */
  useEffect(() => {
    if (skipExpandOnMount.current) {
      skipExpandOnMount.current = false;
      return;
    }
    setSidebarOpen(true);
    try {
      localStorage.setItem(CRM_SIDEBAR_STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
  }, [pathname]);

  return (
    <ConfirmDialogProvider>
      <div className="flex max-h-screen min-h-screen flex-col overflow-hidden bg-main-bg">
        <header
          className="z-50 flex h-16 shrink-0 items-center gap-4 border-b border-sage-300/60 px-5 shadow-[0_1px_0_rgba(39,31,24,0.04)] md:h-[4.5rem] md:px-8"
          style={{ background: CRM_HEADER_OLD_BG }}
        >
          <button
            type="button"
            onClick={() => toggleSidebar()}
            className="crm-font-display inline-flex shrink-0 items-center gap-2 rounded-md px-2 py-1.5 text-lg font-medium tracking-wider text-sage-800 transition-colors duration-150 hover:bg-white/40 md:text-xl"
            aria-expanded={sidebarOpen}
            aria-controls="app-sidebar"
          >
            <span className="flex h-9 w-9 items-center justify-center md:h-10 md:w-10" aria-hidden>
              <Image
                src="/images/left_icon.svg"
                alt=""
                width={40}
                height={40}
                className="h-8 w-8 md:h-10 md:w-10"
              />
            </span>
            <span>{t("shell.menu")}</span>
          </button>

          <div className="min-w-0 flex-1 text-center">{centerSlot}</div>

          <div className="ami-ui shrink-0">
            <LanguageSwitcher variant="header" />
          </div>
        </header>

        <div className="flex min-h-0 flex-1 overflow-hidden bg-main-bg">
          <aside
            id="app-sidebar"
            style={{ background: CRM_SIDEBAR_OLD_BG }}
            className={
              sidebarOpen
                ? "flex w-60 shrink-0 flex-col overflow-hidden border-r border-sage-300/60 text-sm transition-[width,padding,opacity] duration-200 ease-out"
                : "w-0 shrink-0 overflow-hidden border-0 p-0 opacity-0 transition-[width,padding,opacity] duration-200 ease-out"
            }
            aria-hidden={!sidebarOpen}
          >
            {sidebarOpen ? (
              <>
                <div className="crm-font-display shrink-0 px-4 pb-3 pt-5 text-lg font-semibold text-[#271f18] md:px-5 md:text-xl">
                  {t(sidebarTitleKey)}
                </div>
                <nav className="crm-font-display flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden px-3 pb-2 md:px-4">
                  {navItems.map((item) => {
                    const active = isPortalNavActive(pathname, item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        prefetch
                        aria-current={active ? "page" : undefined}
                        className={[
                          "ami-ui shrink-0 rounded-md px-3 py-2.5 text-[15px] font-medium transition-all duration-150",
                          active
                            ? "bg-white/80 text-brand-brown shadow-sm ring-2 ring-brand-brown/30"
                            : "text-[#271f18] hover:bg-white/35 hover:text-sage-900",
                        ].join(" ")}
                      >
                        {t(item.labelKey)}
                      </Link>
                    );
                  })}
                </nav>
                <div className="shrink-0 px-3 pb-4 md:px-4 md:pb-5">
                  <PortalSwitcherFooter shell={shell} />
                </div>
              </>
            ) : null}
          </aside>

          <main className="relative min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-main-bg px-5 py-5 md:px-6 md:py-6 lg:px-8 lg:py-6">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 -z-10 opacity-80"
              style={{
                background:
                  "radial-gradient(ellipse 50% 35% at 0% 0%, rgba(191,201,191,0.35), transparent 70%)",
              }}
            />
            <PageEnter>{children}</PageEnter>
          </main>
        </div>
      </div>
    </ConfirmDialogProvider>
  );
}
