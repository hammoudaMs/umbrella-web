"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { MessagesInbox } from "@/components/MessagesInbox";
import { LoadingBlock } from "@/components/ui";
import { useT } from "@/i18n/locale-context";

function MessagesInner() {
  const params = useSearchParams();
  const peer = params.get("peer");
  const parcel = params.get("parcel");
  return (
    <MessagesInbox
      initialPeerUserId={peer ? Number(peer) : undefined}
      initialParcelId={parcel ? Number(parcel) : undefined}
    />
  );
}

export default function MessagesPage() {
  const t = useT();
  return (
    <Suspense fallback={<LoadingBlock rows={2} label={t("messages.loading")} />}>
      <MessagesInner />
    </Suspense>
  );
}
