import type { CaseFileRow } from "@/lib/case-manager/case-files";
import { listCaseFilesForParty } from "@/lib/case-manager/case-files";
import type { CaseMessageRow } from "@/lib/case-manager/case-messages";
import { listCaseMessages } from "@/lib/case-manager/case-messages";
import type { AmCaseDetail, CaseDetailAccessMode } from "@/lib/case-manager/fetch-case-detail";
import { fetchCaseDetail } from "@/lib/case-manager/fetch-case-detail";
import type { TrustLedgerEntry } from "@/lib/case-manager/trust-ledger";
import { listPartyVisibleTrustLedger } from "@/lib/case-manager/trust-ledger";
import type { CrmSession } from "@/types/portal";

export type PartyTrustSnapshot = {
  balance: string;
  entries: TrustLedgerEntry[];
};

export type PartyCasePagePayload = AmCaseDetail & {
  files: CaseFileRow[];
  messages: CaseMessageRow[];
  trust: PartyTrustSnapshot | null;
};

type PartyCaseMode = Extract<CaseDetailAccessMode, "intended_parent_api" | "surrogate_mother_api">;

/** 门户案例详情：一次返回摘要、附件、留言、（准父母）信托，避免浏览器连打 3～4 个 GET。 */
export async function fetchPartyCasePagePayload(
  session: CrmSession,
  id: string,
  mode: PartyCaseMode,
): Promise<PartyCasePagePayload | null> {
  const includeTrust = mode === "intended_parent_api";
  const [detailR, filesR, messagesR, trustR] = await Promise.allSettled([
    fetchCaseDetail(session, id, { mode }),
    listCaseFilesForParty(session, id, mode),
    listCaseMessages(session, id, mode),
    includeTrust ? listPartyVisibleTrustLedger(session, id) : Promise.resolve(null),
  ]);

  if (detailR.status === "rejected") throw detailR.reason;
  const detail = detailR.value;
  if (!detail) return null;

  return {
    ...detail,
    files: filesR.status === "fulfilled" && filesR.value ? filesR.value : [],
    messages: messagesR.status === "fulfilled" && messagesR.value ? messagesR.value : [],
    trust: trustR.status === "fulfilled" ? trustR.value : null,
  };
}
