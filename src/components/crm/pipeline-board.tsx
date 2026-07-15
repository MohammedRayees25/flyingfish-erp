"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { MessageCircle, Phone, Repeat } from "lucide-react";
import { toast } from "sonner";
import type { LeadStage } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateLeadStage } from "@/actions/crm";
import { LEAD_STAGE_ORDER, LEAD_STAGE_LABELS } from "@/lib/crm-labels";
import { whatsappHref, telHref } from "@/lib/contact-links";

export type PipelineLead = {
  id: string;
  fullName: string;
  phone: string;
  source: string | null;
  followUpAt: Date | null;
  isRepeatCustomer: boolean;
  stage: LeadStage;
};

export function PipelineBoard({
  leadsByStage,
}: {
  leadsByStage: Record<LeadStage, PipelineLead[]>;
}) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {LEAD_STAGE_ORDER.map((stage) => (
        <div key={stage} className="flex w-72 shrink-0 flex-col gap-3 rounded-xl border bg-muted/30 p-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">{LEAD_STAGE_LABELS[stage]}</h3>
            <Badge variant="secondary">{leadsByStage[stage].length}</Badge>
          </div>
          <div className="flex flex-col gap-2">
            {leadsByStage[stage].length === 0 ? (
              <p className="rounded-md border border-dashed py-6 text-center text-xs text-muted-foreground">
                No leads at this stage.
              </p>
            ) : (
              leadsByStage[stage].map((lead) => <LeadCard key={lead.id} lead={lead} />)
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function LeadCard({ lead }: { lead: PipelineLead }) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  function handleStageChange(stage: string) {
    startTransition(async () => {
      const result = await updateLeadStage(lead.id, stage as LeadStage);
      if (result?.error) toast.error(result.error);
      else {
        toast.success("Stage updated");
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-card p-3 shadow-xs">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium">{lead.fullName}</span>
        {lead.isRepeatCustomer ? (
          <Badge variant="success" className="shrink-0">
            <Repeat className="size-3" /> Repeat
          </Badge>
        ) : null}
      </div>
      <span className="text-xs text-muted-foreground">{lead.phone}</span>
      {lead.source || lead.followUpAt ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {lead.source ? <Badge variant="outline">{lead.source}</Badge> : null}
          {lead.followUpAt ? (
            <Badge variant="secondary">Follow-up {format(lead.followUpAt, "d MMM, h:mm a")}</Badge>
          ) : null}
        </div>
      ) : null}
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="size-8" asChild>
          <a
            href={whatsappHref(lead.phone)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`WhatsApp ${lead.fullName}`}
          >
            <MessageCircle className="size-4 text-success" />
          </a>
        </Button>
        <Button variant="outline" size="icon" className="size-8" asChild>
          <a href={telHref(lead.phone)} aria-label={`Call ${lead.fullName}`}>
            <Phone className="size-4 text-primary" />
          </a>
        </Button>
        <Select value={lead.stage} onValueChange={handleStageChange} disabled={isPending}>
          <SelectTrigger className="h-8 flex-1 text-xs" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LEAD_STAGE_ORDER.map((s) => (
              <SelectItem key={s} value={s}>
                {LEAD_STAGE_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
