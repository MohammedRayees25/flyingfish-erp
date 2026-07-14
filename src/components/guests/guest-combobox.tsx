"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2, User } from "lucide-react";
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
import { searchGuestsForSelect, type GuestOption } from "@/actions/guests";

export function GuestCombobox({
  value,
  onChange,
  initialLabel,
}: {
  value: string;
  onChange: (guestId: string, guest: GuestOption) => void;
  initialLabel?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [options, setOptions] = React.useState<GuestOption[]>([]);
  const [isPending, startTransition] = React.useTransition();
  const [selectedLabel, setSelectedLabel] = React.useState(initialLabel ?? "");

  React.useEffect(() => {
    if (!open) return;
    const timeout = setTimeout(() => {
      startTransition(async () => {
        setOptions(await searchGuestsForSelect(query));
      });
    }, 200);
    return () => clearTimeout(timeout);
  }, [query, open]);

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
            <User className="size-4 shrink-0" />
            {selectedLabel || "Select guest…"}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search by name or phone…"
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
                <CommandEmpty>No guests found.</CommandEmpty>
                <CommandGroup>
                  {options.map((guest) => (
                    <CommandItem
                      key={guest.id}
                      value={guest.id}
                      onSelect={() => {
                        onChange(guest.id, guest);
                        setSelectedLabel(`${guest.fullName} · ${guest.phone}`);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-1 size-4",
                          value === guest.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col">
                        <span>{guest.fullName}</span>
                        <span className="text-xs text-muted-foreground">{guest.phone}</span>
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
