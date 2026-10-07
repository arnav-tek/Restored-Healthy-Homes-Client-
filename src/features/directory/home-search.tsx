import type { Category } from "@/domain/categories";
import type { DemoLocation } from "@/domain/location";
import { Button } from "@/components/ui/button";
import {
  CategoryField,
  LocationField,
  SupportedLocations,
} from "./search-fields";
import { Search } from "lucide-react";
import { SearchForm } from "./search-form";
export function HomeSearch({
  catalog,
  locations,
}: {
  catalog: readonly Category[];
  locations: readonly DemoLocation[];
}) {
  return (
    <div className="hero-search">
      <h2 className="sr-only">Find professionals</h2>
      <SearchForm label="Find professionals">
        <LocationField value="" locations={locations} />
        <CategoryField catalog={catalog} selected="" />
        <Button type="submit">
          Search <Search size={18} aria-hidden="true" />
        </Button>
      </SearchForm>
      <SupportedLocations locations={locations} variant="hero" />
    </div>
  );
}
