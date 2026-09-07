export type HelpStep = {
  titleKey: string;
  bodyKey: string;
  image?: string;
};

export type HelpSection = {
  id: string;
  titleKey: string;
  introKey?: string;
  steps: HelpStep[];
};

export type HelpFaq = {
  qKey: string;
  aKey: string;
};

export type PortalHelpDoc = {
  role: "admin" | "case_manager" | "intended_parent" | "surrogate_mother";
  titleKey: string;
  subtitleKey: string;
  sections: HelpSection[];
  faqs?: HelpFaq[];
};

export const ADMIN_HELP: PortalHelpDoc = {
  role: "admin",
  titleKey: "help.admin.title",
  subtitleKey: "help.admin.subtitle",
  sections: [
    {
      id: "login",
      titleKey: "help.admin.login.title",
      steps: [
        { titleKey: "help.admin.login.s1_title", bodyKey: "help.admin.login.s1_body", image: "/help/01-login.png" },
        { titleKey: "help.admin.login.s2_title", bodyKey: "help.admin.login.s2_body", image: "/help/02-select-portal.png" },
      ],
    },
    {
      id: "accounts",
      titleKey: "help.admin.accounts.title",
      steps: [
        { titleKey: "help.admin.accounts.s1_title", bodyKey: "help.admin.accounts.s1_body", image: "/help/04-admin-users.png" },
        { titleKey: "help.admin.accounts.s2_title", bodyKey: "help.admin.accounts.s2_body" },
        { titleKey: "help.admin.accounts.s3_title", bodyKey: "help.admin.accounts.s3_body" },
      ],
    },
    {
      id: "cases",
      titleKey: "help.admin.cases.title",
      steps: [
        { titleKey: "help.admin.cases.s1_title", bodyKey: "help.admin.cases.s1_body", image: "/help/07-admin-create-case.png" },
        { titleKey: "help.admin.cases.s2_title", bodyKey: "help.admin.cases.s2_body" },
        { titleKey: "help.admin.cases.s3_title", bodyKey: "help.admin.cases.s3_body" },
        { titleKey: "help.admin.cases.s4_title", bodyKey: "help.admin.cases.s4_body" },
      ],
    },
    {
      id: "replace-gc",
      titleKey: "help.admin.replace.title",
      steps: [
        { titleKey: "help.admin.replace.s1_title", bodyKey: "help.admin.replace.s1_body" },
        { titleKey: "help.admin.replace.s2_title", bodyKey: "help.admin.replace.s2_body" },
        { titleKey: "help.admin.replace.s3_title", bodyKey: "help.admin.replace.s3_body", image: "/help/09-admin-replace-gc.png" },
      ],
    },
  ],
  faqs: [
    { qKey: "help.admin.faq.q1", aKey: "help.admin.faq.a1" },
    { qKey: "help.admin.faq.q2", aKey: "help.admin.faq.a2" },
    { qKey: "help.admin.faq.q3", aKey: "help.admin.faq.a3" },
    { qKey: "help.admin.faq.q4", aKey: "help.admin.faq.a4" },
    { qKey: "help.admin.faq.q5", aKey: "help.admin.faq.a5" },
    { qKey: "help.admin.faq.q6", aKey: "help.admin.faq.a6" },
    { qKey: "help.admin.faq.q7", aKey: "help.admin.faq.a7" },
  ],
};

export const CM_HELP: PortalHelpDoc = {
  role: "case_manager",
  titleKey: "help.cm.title",
  subtitleKey: "help.cm.subtitle",
  sections: [
    {
      id: "dashboard",
      titleKey: "help.cm.dashboard.title",
      steps: [
        { titleKey: "help.cm.dashboard.s1_title", bodyKey: "help.cm.dashboard.s1_body", image: "/help/13-cm-dashboard.png" },
        { titleKey: "help.cm.dashboard.s2_title", bodyKey: "help.cm.dashboard.s2_body" },
      ],
    },
    {
      id: "progress",
      titleKey: "help.cm.progress.title",
      steps: [
        { titleKey: "help.cm.progress.s1_title", bodyKey: "help.cm.progress.s1_body" },
        { titleKey: "help.cm.progress.s2_title", bodyKey: "help.cm.progress.s2_body" },
      ],
    },
    {
      id: "trust-files",
      titleKey: "help.cm.trust.title",
      steps: [
        { titleKey: "help.cm.trust.s1_title", bodyKey: "help.cm.trust.s1_body" },
        { titleKey: "help.cm.trust.s2_title", bodyKey: "help.cm.trust.s2_body" },
      ],
    },
    {
      id: "replace-gc",
      titleKey: "help.cm.replace.title",
      steps: [
        { titleKey: "help.cm.replace.s1_title", bodyKey: "help.cm.replace.s1_body" },
        { titleKey: "help.cm.replace.s2_title", bodyKey: "help.cm.replace.s2_body", image: "/help/09-admin-replace-gc.png" },
      ],
    },
  ],
  faqs: [
    { qKey: "help.cm.faq.q1", aKey: "help.cm.faq.a1" },
    { qKey: "help.cm.faq.q2", aKey: "help.cm.faq.a2" },
    { qKey: "help.cm.faq.q3", aKey: "help.cm.faq.a3" },
  ],
};

export const IP_HELP: PortalHelpDoc = {
  role: "intended_parent",
  titleKey: "help.ip.title",
  subtitleKey: "help.ip.subtitle",
  sections: [
    {
      id: "home",
      titleKey: "help.ip.home.title",
      steps: [
        { titleKey: "help.ip.home.s1_title", bodyKey: "help.ip.home.s1_body", image: "/help/15-ip-home.png" },
        { titleKey: "help.ip.home.s2_title", bodyKey: "help.ip.home.s2_body", image: "/help/16-ip-case-progress.png" },
      ],
    },
    {
      id: "privacy",
      titleKey: "help.ip.privacy.title",
      steps: [
        { titleKey: "help.ip.privacy.s1_title", bodyKey: "help.ip.privacy.s1_body" },
        { titleKey: "help.ip.privacy.s2_title", bodyKey: "help.ip.privacy.s2_body" },
        { titleKey: "help.ip.privacy.s3_title", bodyKey: "help.ip.privacy.s3_body" },
      ],
    },
    {
      id: "messages",
      titleKey: "help.ip.messages.title",
      steps: [{ titleKey: "help.ip.messages.s1_title", bodyKey: "help.ip.messages.s1_body" }],
    },
  ],
  faqs: [
    { qKey: "help.ip.faq.q1", aKey: "help.ip.faq.a1" },
    { qKey: "help.ip.faq.q2", aKey: "help.ip.faq.a2" },
    { qKey: "help.ip.faq.q3", aKey: "help.ip.faq.a3" },
  ],
};

export const SM_HELP: PortalHelpDoc = {
  role: "surrogate_mother",
  titleKey: "help.sm.title",
  subtitleKey: "help.sm.subtitle",
  sections: [
    {
      id: "profile",
      titleKey: "help.sm.profile.title",
      steps: [
        { titleKey: "help.sm.profile.s1_title", bodyKey: "help.sm.profile.s1_body" },
        { titleKey: "help.sm.profile.s2_title", bodyKey: "help.sm.profile.s2_body", image: "/help/18-gc-birth-history.png" },
      ],
    },
    {
      id: "case",
      titleKey: "help.sm.case.title",
      steps: [
        { titleKey: "help.sm.case.s1_title", bodyKey: "help.sm.case.s1_body" },
        { titleKey: "help.sm.case.s2_title", bodyKey: "help.sm.case.s2_body" },
      ],
    },
  ],
  faqs: [
    { qKey: "help.sm.faq.q1", aKey: "help.sm.faq.a1" },
    { qKey: "help.sm.faq.q2", aKey: "help.sm.faq.a2" },
  ],
};

export function helpDocForPath(pathname: string): PortalHelpDoc {
  if (pathname.startsWith("/admin")) return ADMIN_HELP;
  if (pathname.startsWith("/case_manager")) return CM_HELP;
  if (pathname.startsWith("/intended_parent")) return IP_HELP;
  return SM_HELP;
}
