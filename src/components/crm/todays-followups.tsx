import { Clock, MessageCircle, Phone } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { whatsappHref, telHref } from "@/lib/contact-links";

export type FollowUpLead = {
  id: string;
  fullName: string;
  phone: string;
  followUpAt: Date;
};

export function TodaysFollowups({ leads }: { leads: FollowUpLead[] }) {
  if (leads.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No follow-ups scheduled for today.
      </p>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-border">
      {leads.map((lead) => (
        <li key={lead.id} className="flex items-center justify-between gap-3 py-3">
          <div className="flex flex-col">
            <span className="text-sm font-medium">{lead.fullName}</span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="size-3" /> {format(lead.followUpAt, "h:mm a")}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" asChild>
              <a
                href={whatsappHref(lead.phone)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`WhatsApp ${lead.fullName}`}
              >
                <MessageCircle className="size-4 text-success" />
              </a>
            </Button>
            <Button variant="ghost" size="icon" asChild>
              <a href={telHref(lead.phone)} aria-label={`Call ${lead.fullName}`}>
                <Phone className="size-4 text-primary" />
              </a>
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
