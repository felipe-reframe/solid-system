"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { MapPin, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlaceResult } from "@/app/page";

interface AddressSearchProps {
  onPlaceSelect: (place: PlaceResult) => void;
  className?: string;
}

export function AddressSearch({ onPlaceSelect, className }: AddressSearchProps) {
  const [inputValue, setInputValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const placesLib = useMapsLibrary("places");

  useEffect(() => {
    if (!placesLib || !inputRef.current) return;

    autocompleteRef.current = new placesLib.Autocomplete(inputRef.current, {
      fields: ["formatted_address", "geometry", "place_id", "name"],
      types: ["address"],
    });

    const listener = autocompleteRef.current.addListener("place_changed", () => {
      const place = autocompleteRef.current?.getPlace();
      if (!place?.geometry?.location) return;

      const result: PlaceResult = {
        address: place.formatted_address ?? "",
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
        placeId: place.place_id ?? "",
      };

      onPlaceSelect(result);
      setInputValue(place.formatted_address ?? "");
    });

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
      // Remove the listener reference
      google.maps.event.removeListener(listener);
    };
  }, [placesLib, onPlaceSelect]);

  const handleClear = useCallback(() => {
    setInputValue("");
    if (inputRef.current) {
      inputRef.current.value = "";
      inputRef.current.focus();
    }
  }, []);

  return (
    <div className={cn("w-full max-w-2xl", className)}>
      <div
        className={cn(
          "relative flex items-center rounded-xl border bg-card transition-all duration-200",
          isFocused
            ? "border-primary shadow-lg shadow-primary/10 ring-1 ring-primary/20"
            : "border-border hover:border-muted-foreground/40"
        )}
      >
        <MapPin
          className={cn(
            "absolute left-4 h-5 w-5 flex-shrink-0 transition-colors duration-200",
            isFocused ? "text-primary" : "text-muted-foreground"
          )}
        />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Enter an address to get started…"
          className="w-full bg-transparent py-4 pl-12 pr-12 text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
          aria-label="Property address search"
          autoComplete="off"
        />
        {inputValue ? (
          <button
            onClick={handleClear}
            className="absolute right-4 flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted-foreground/20 hover:text-foreground transition-colors"
            aria-label="Clear address"
            type="button"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <Search className="absolute right-4 h-5 w-5 text-muted-foreground/40" />
        )}
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground/60">
        Powered by Google Maps · Start typing to see address suggestions
      </p>
    </div>
  );
}
