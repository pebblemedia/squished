import { useState } from "react";
import { Check } from "lucide-react";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import type { FileKind } from "@/lib/files";
import { DESTINATIONS, GROUP_LABELS, type DestinationGroup } from "@/lib/destinations";
import {
  SIZE_PRESETS, fitToValue, valueToFit, sizeLabel, ruleFor, type FitChoice,
} from "@/lib/fit";

interface Props {
  value: FitChoice;
  /** File kinds in play; destinations without a matching rule are hidden. */
  kinds: FileKind[];
  onChange: (choice: FitChoice) => void;
  className?: string;
  placeholder?: string;
}

/** "Fit for" control: a size cap, or a destination's upload limit. */
export function FitPicker({ value, kinds, onChange, className, placeholder }: Props) {
  const [custom, setCustom] = useState(false);
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState<"KB" | "MB">("KB");

  const commitCustom = () => {
    const n = parseFloat(amount);
    setCustom(false);
    if (n > 0) onChange({ type: "size", bytes: Math.round(n * (unit === "MB" ? 1024 * 1024 : 1024)) });
  };

  if (custom) {
    return (
      <form
        className={`flex items-center gap-1 ${className ?? ""}`}
        onSubmit={(e) => { e.preventDefault(); commitCustom(); }}
      >
        <Input
          autoFocus
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Size"
          aria-label="Custom size limit"
          className="h-9 w-16 px-2 text-xs"
        />
        <Select value={unit} onValueChange={(v) => setUnit(v as "KB" | "MB")}>
          <SelectTrigger className="h-9 w-[62px] px-2 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="KB">KB</SelectItem>
            <SelectItem value="MB">MB</SelectItem>
          </SelectContent>
        </Select>
        <button type="submit" className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Set size limit">
          <Check className="size-4" />
        </button>
      </form>
    );
  }

  // Only destinations whose limit is worth compressing for (huge caps like Slack's 1 GB aren't).
  const fits = (slug: string) => kinds.some((k) => (ruleFor(slug, k)?.maxBytes ?? Infinity) <= 600 * 1024 * 1024);
  const groups = (Object.keys(GROUP_LABELS) as DestinationGroup[])
    .map((g) => ({ g, list: DESTINATIONS.filter((d) => d.group === g && fits(d.slug)) }))
    .filter((x) => x.list.length);
  const isPresetSize = value.type !== "size" || SIZE_PRESETS.includes(value.bytes);

  return (
    <Select
      value={value.type === "none" && placeholder ? "" : fitToValue(value)}
      onValueChange={(v) => (v === "custom" ? setCustom(true) : onChange(valueToFit(v)))}
    >
      <SelectTrigger className={`h-9 text-xs ${className ?? ""}`} aria-label="Fit for">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">No size limit</SelectItem>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Under a size</SelectLabel>
          {!isPresetSize && value.type === "size" && (
            <SelectItem value={fitToValue(value)}>Under {sizeLabel(value.bytes)}</SelectItem>
          )}
          {SIZE_PRESETS.map((b) => (
            <SelectItem key={b} value={`size:${b}`}>Under {sizeLabel(b)}</SelectItem>
          ))}
          <SelectItem value="custom">Custom size…</SelectItem>
        </SelectGroup>
        {groups.map(({ g, list }) => (
          <SelectGroup key={g}>
            <SelectSeparator />
            <SelectLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">{GROUP_LABELS[g]}</SelectLabel>
            {list.map((d) => (
              <SelectItem key={d.slug} value={`dest:${d.slug}`}>{d.name}</SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
