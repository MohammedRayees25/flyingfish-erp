"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, User } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { NAV_ITEMS } from "@/config/nav";
import { canAccess, type Module } from "@/lib/permissions";
import type { UserRole } from "@prisma/client";
import { globalSearch, type GlobalSearchResult } from "@/actions/search";

export function CommandPalette({ role }: { role: UserRole }) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<GlobalSearchResult[]>([]);
  const [isSearching, startSearch] = React.useTransition();
  const router = useRouter();

  const navItems = NAV_ITEMS.filter(
    (item) => !item.comingSoon && canAccess(role, item.module as Module)
  );

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  React.useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(() => {
      startSearch(async () => {
        setResults(await globalSearch(query));
      });
    }, 200);
    return () => clearTimeout(timeout);
  }, [query]);

  function go(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  return (
    <>
      <Button
        variant="outline"
        className="w-full max-w-sm justify-start gap-2 text-muted-foreground sm:w-64"
        onClick={() => setOpen(true)}
      >
        <Search className="size-4" />
        <span className="flex-1 text-left">Search guests, pages…</span>
        <kbd className="hidden rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium sm:inline-block">
          ⌘K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen} shouldFilter={false}>
        <CommandInput
          placeholder="Search guests, bookings, pages…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {query.trim().length >= 2 ? (
            <>
              {!isSearching && results.length === 0 ? (
                <CommandEmpty>No results found.</CommandEmpty>
              ) : null}
              {results.length > 0 ? (
                <CommandGroup heading="Guests">
                  {results.map((result) => (
                    <CommandItem
                      key={result.id}
                      value={result.id}
                      onSelect={() => go(result.href)}
                    >
                      <User />
                      <div className="flex flex-col">
                        <span>{result.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {result.subtitle}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}
            </>
          ) : (
            <CommandGroup heading="Go to">
              {navItems.map((item) => (
                <CommandItem
                  key={item.href}
                  value={item.label}
                  onSelect={() => go(item.href)}
                >
                  <item.icon />
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
