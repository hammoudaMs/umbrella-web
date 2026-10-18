import { redirect } from "next/navigation";

/** Zones live inside Finances — single stock/goods hub for expéditeur. */
export default function ExpediteurZonesPage() {
  redirect("/expediteur/finances");
}
