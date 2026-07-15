"use client";

import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PhotoUrlsField({
  value,
  onChange,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
}) {
  function updateAt(index: number, url: string) {
    const next = [...value];
    next[index] = url;
    onChange(next);
  }

  function removeAt(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function add() {
    onChange([...value, ""]);
  }

  return (
    <div className="flex flex-col gap-2">
      {value.map((url, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            type="url"
            placeholder="https://…"
            value={url}
            onChange={(e) => updateAt(index, e.target.value)}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => removeAt(index)}
            aria-label="Remove photo URL"
          >
            <X className="size-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add} className="self-start">
        <Plus className="size-4" /> Add photo URL
      </Button>
    </div>
  );
}
