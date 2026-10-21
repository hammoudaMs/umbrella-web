import { redirect } from "next/navigation";

/** Retours ops are not part of the expéditeur portal — use Colis filters. */
export default function ExpediteurRetoursPage() {
  redirect("/expediteur/parcels");
}
