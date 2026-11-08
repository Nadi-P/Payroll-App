"use client";

import { Icon } from "@/components/typography/icon/Icon";
import { searchInputStyles } from "./searchInput.styles";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  size?: "sm" | "md" | "lg";
}

export function SearchInput({ value, onChange, placeholder, size }: SearchInputProps) {
  return (
    <span className={searchInputStyles.wrap}>
      <span className={searchInputStyles.icon}>
        <Icon name="search" size="sm" />
      </span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={searchInputStyles.input(size)}
      />
    </span>
  );
}
