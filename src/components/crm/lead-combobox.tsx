"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2, X, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { searchLeadsForSelect, type LeadOption } from "@/actions/crm";

// Optional "referred by" picker — mirrors GuestCombobox but searches Leads
// and (unlike GuestCombobox) supports clearing back to "no referral" since
// referredById is optional on the schema.
export function LeadCombobox({
  value,
  onChange,
  initialLabel,
  excludeId,
}: {
  value: string;
  onChange: (leadId: string, lead: LeadOption | null) => void;
  initialLabel?: string;
  excludeId?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [options, setOptions] = React.useState<LeadOption[]>([]);
  const [isPending, startTransition] = React.useTransition();
  const [selectedLabel, setSelectedLabel] = React.useState(initialLabel ?? "");

  React.useEffect(() => {
    setSelectedLabel(initialLabel ?? "");
  }, [initialLabel]);

  React.useEffect(() => {
    if (!open) return;
    const timeout = setTimeout(() => {
      startTransition(async () => {
        setOptions(await searchLeadsForSelect(query, excludeId));
      });
    }, 200);
    return () => clearTimeout(timeout);
  }, [query, open, excludeId]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className={cn("flex items-center gap-2 truncate", !value && "text-muted-foreground")}>
            <UserPlus className="size-4 shrink-0" />
            {selectedLabel || "No referral (optional)"}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search leads by name or phone…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {isPending ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Searching…
              </div>
            ) : (
              <>
                <CommandEmpty>No leads found.</CommandEmpty>
                <CommandGroup>
                  {value ? (
                    <CommandItem
                      value="__clear__"
                      onSelect={() => {
                        onChange("", null);
                        setSelectedLabel("");
                        setOpen(false);
                      }}
                    >
                      <X className="mr-1 size-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Clear referral</span>
                    </CommandItem>
                  ) : null}
                  {options.map((lead) => (
                    <CommandItem
                      key={lead.id}
                      value={lead.id}
                      onSelect={() => {
                        onChange(lead.id, lead);
                        setSelectedLabel(`${lead.fullName} · ${lead.phone}`);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn("mr-1 size-4", value === lead.id ? "opacity-100" : "opacity-0")}
                      />
                      <div className="flex flex-col">
                        <span>{lead.fullName}</span>
                        <span className="text-xs text-muted-foreground">{lead.phone}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
