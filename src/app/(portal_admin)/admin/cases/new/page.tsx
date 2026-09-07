import { redirect } from "next/navigation";

export default function AdminCreateCasePage() {
  redirect("/admin/cases?create=1");
}
