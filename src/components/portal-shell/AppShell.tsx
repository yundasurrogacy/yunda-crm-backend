"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { YundaMark } from "@/components/brand/YundaMark";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import type { PortalNavItem } from "@/config/portal-nav";
import { isPortalNavActive } from "@/lib/portal-nav-active";
import type { PortalId } from "@/types/portal";
import { ConfirmDialogProvider } from "@/components/ui/ConfirmDialog";
import { PageEnter } from "./PageEnter";
import { PortalSwitcherFooter } from "./PortalSwitcherFooter";

/** 顶栏与侧栏同一块 Sky */
export const CRM_HEADER_OLD_BG = "#cad3d0";
export const CRM_SIDEBAR_OLD_BG = "#cad3d0";

export const CRM_SIDEBAR_STORAGE_KEY = "yunda_crm_sidebar_open";

function isMobileViewport() {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
}

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
  /** 右侧顶栏居中（默认 YUNDA 标志） */
  centerSlot?: ReactNode;
  children: React.ReactNode;
}) {
  const { t } = useTranslation("portal");
  const pathname = usePathname() ?? "/";
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const skipExpandOnMount = useRef(true);

  useEffect(() => {
    try {
      if (isMobileViewport()) {
        setSidebarOpen(false);
        return;
      }
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
      if (!isMobileViewport()) {
        try {
          localStorage.setItem(CRM_SIDEBAR_STORAGE_KEY, next ? "1" : "0");
        } catch {
          /* ignore */
        }
      }
      return next;
    });
  }

  /** 桌面：路由后展开侧栏；手机：点进页面后收起遮罩 */
  useEffect(() => {
    if (skipExpandOnMount.current) {
      skipExpandOnMount.current = false;
      return;
    }
    if (isMobileViewport()) {
      setSidebarOpen(false);
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
      <div className="flex max-h-screen min-h-screen overflow-hidden bg-main-bg">
        {sidebarOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-bark/35 md:hidden"
            aria-label={t("shell.menu")}
            onClick={() => setSidebarOpen(false)}
          />
        ) : null}

        <aside
          id="app-sidebar"
          style={{ background: CRM_SIDEBAR_OLD_BG }}
          className={
            sidebarOpen
              ? "fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col overflow-hidden border-r border-bark/15 text-sm md:static md:z-auto md:w-60"
              : "hidden"
          }
          aria-hidden={!sidebarOpen}
        >
          {sidebarOpen ? (
            <>
              <div className="crm-font-display shrink-0 px-4 pb-3 pt-5 text-lg font-semibold text-bark md:px-5 md:text-xl">
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
                        "shrink-0 rounded-md px-3 py-2.5 text-[15px] font-medium transition-all duration-150",
                        active
                          ? "border border-bark/25 bg-petal text-bark shadow-sm"
                          : "border border-transparent text-bark hover:bg-petal/55",
                      ].join(" ")}
                    >
                      {t(item.labelKey)}
                    </Link>
                  );
                })}
              </nav>
              <div className="mt-auto shrink-0 border-t border-bark/15 px-3 pb-4 pt-3 md:px-4 md:pb-5">
                <PortalSwitcherFooter shell={shell} />
              </div>
            </>
          ) : null}
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <header
            className="z-20 flex h-16 shrink-0 items-center gap-3 border-b border-bark/15 px-4 md:h-[4.5rem] md:gap-4 md:px-8"
            style={{ background: CRM_HEADER_OLD_BG }}
          >
            <button
              type="button"
              onClick={() => toggleSidebar()}
              className="crm-font-display inline-flex shrink-0 items-center gap-2 rounded-md px-2 py-1.5 text-lg font-medium tracking-wider text-bark transition-colors duration-150 hover:bg-petal/50 md:text-xl"
              aria-expanded={sidebarOpen}
              aria-controls="app-sidebar"
              aria-label={t("shell.menu")}
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
              <span className="hidden sm:inline">{t("shell.menu")}</span>
            </button>

            <div className="flex min-w-0 flex-1 items-center justify-center">
              {centerSlot ?? <YundaMark />}
            </div>

            <div className="ami-ui shrink-0">
              <LanguageSwitcher variant="header" />
            </div>
          </header>

          <main className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-main-bg px-3 py-3 md:px-4 md:py-4">
            <PageEnter>{children}</PageEnter>
          </main>
        </div>
      </div>
    </ConfirmDialogProvider>
  );
}
