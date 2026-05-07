import type { LucideIcon } from "lucide-react";
import {
  Baby,
  CalendarPlus,
  ClipboardList,
  Dna,
  FileSignature,
  GraduationCap,
  Handshake,
  HeartPulse,
  Scale,
  Stethoscope,
  UserRound,
} from "lucide-react";

/** 与 `CANONICAL_CASE_STAGES` 顺序一一对应（旧版 AM 仪表风格图标） */
export const AM_STAGE_ICON_COMPONENTS: readonly LucideIcon[] = [
  Handshake,
  CalendarPlus,
  ClipboardList,
  FileSignature,
  Stethoscope,
  Scale,
  Dna,
  HeartPulse,
  GraduationCap,
  UserRound,
  Baby,
];
