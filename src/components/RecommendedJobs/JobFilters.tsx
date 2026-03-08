import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Filter, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LocationGroup } from "@/utils/locationNormalizer";

interface JobFiltersProps {
  locationGroups: LocationGroup[];
  departments: { label: string; count: number }[];
  locationFilter: string;
  departmentFilter: string;
  locationOpen: boolean;
  onLocationOpenChange: (open: boolean) => void;
  onLocationChange: (val: string) => void;
  onDepartmentChange: (val: string) => void;
  onClear: () => void;
}

export const JobFilters = ({
  locationGroups,
  departments,
  locationFilter,
  departmentFilter,
  locationOpen,
  onLocationOpenChange,
  onLocationChange,
  onDepartmentChange,
  onClear,
}: JobFiltersProps) => {
  const hasActiveFilters = locationFilter !== "all" || departmentFilter !== "all";

  if (locationGroups.length === 0 && departments.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
      {locationGroups.length > 0 && (
        <Popover open={locationOpen} onOpenChange={onLocationOpenChange}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="w-[200px] h-8 text-xs justify-between font-normal">
              {locationFilter === "all" ? "All Locations" : locationFilter}
              <ChevronDown className="ml-1 h-3 w-3 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[240px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search locations..." className="h-8 text-xs" />
              <CommandList>
                <CommandEmpty>No locations found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value="all"
                    onSelect={() => { onLocationChange("all"); onLocationOpenChange(false); }}
                    className="text-xs"
                  >
                    <Check className={cn("mr-2 h-3 w-3", locationFilter === "all" ? "opacity-100" : "opacity-0")} />
                    All Locations
                  </CommandItem>
                </CommandGroup>
                {locationGroups.map(({ group, cities }) => (
                  <CommandGroup key={group} heading={group !== "Remote" && group !== "Hybrid" ? group : undefined}>
                    {cities.map(c => (
                      <CommandItem
                        key={c.label}
                        value={c.label}
                        onSelect={() => { onLocationChange(c.label); onLocationOpenChange(false); }}
                        className="text-xs"
                      >
                        <Check className={cn("mr-2 h-3 w-3", locationFilter === c.label ? "opacity-100" : "opacity-0")} />
                        {c.label} ({c.count})
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
      {departments.length > 0 && (
        <Select value={departmentFilter} onValueChange={onDepartmentChange}>
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map(dep => (
              <SelectItem key={dep.label} value={dep.label}>{dep.label} ({dep.count})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={onClear}>
          Clear filters
        </Button>
      )}
    </div>
  );
};
