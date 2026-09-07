import { redirect } from "next/navigation";

export default function CaseManagerCreateCasePage() {
  redirect("/case_manager/my-cases?create=1");
}
