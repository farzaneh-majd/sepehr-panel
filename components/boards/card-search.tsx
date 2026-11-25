"use client";

import { useState, useEffect, useRef, useMemo, useDeferredValue } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { normalizeSearchText, searchTokens, matchesTokens } from "@/lib/search";
import type { Card, BoardList } from "@/types/kanban";
import type { SearchResult, CardSearchProps } from "@/types/boards"

const MAX_RESULTS = 50;

export function CardSearch({ lists, onCardSelect, autoFocus, inputClassName }: CardSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const deferredQuery = useDeferredValue(query);

  const index = useMemo(
    () =>
      lists.flatMap((list) =>
        list.cards.map((card) => ({
          card,
          listName: list.name,
          id: String(card.id),
          title: normalizeSearchText(card.title),
          description: normalizeSearchText(card.description),
        }))
      ),
    [lists]
  );

  const { results, totalCount } = useMemo(() => {
    const tokens = searchTokens(deferredQuery);
    if (tokens.length === 0) return { results: [] as SearchResult[], totalCount: 0 };

    const idQuery = tokens.length === 1 ? tokens[0].replace(/^#/, "") : "";
    const byId: SearchResult[] = [];
    const byTitle: SearchResult[] = [];
    const byDescription: SearchResult[] = [];

    for (const item of index) {
      const result = { card: item.card, listName: item.listName };
      if (idQuery && item.id === idQuery) byId.push(result);
      else if (matchesTokens(item.title, tokens)) byTitle.push(result);
      else if (item.description && matchesTokens(`${item.title} ${item.description}`, tokens)) byDescription.push(result);
    }

    const all = [...byId, ...byTitle, ...byDescription];
    return { results: all.slice(0, MAX_RESULTS), totalCount: all.length };
  }, [index, deferredQuery]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [deferredQuery]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && results.length > 0) {
      e.preventDefault();
      handleSelectCard(results[selectedIndex].card);
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setQuery("");
    }
  };

  const handleSelectCard = (card: Card) => {
    onCardSelect(card);
    setIsOpen(false);
    setQuery("");
  };

  const getLabelColors = (card: Card) => {
    return card.labels?.slice(0, 4) || [];
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#626f86]" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          dir="auto"
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search cards..."
          autoFocus={autoFocus}
          className={cn(
            "w-64 border-[#b7bdc8] bg-[#f7f8f9] pl-9 pr-9 text-[15px] text-[#172b4d] placeholder:text-[#626f86] shadow-none selection:bg-[#85b8ff] selection:text-[#172b4d]",
            "hover:bg-white focus-visible:border-[#0c66e4] focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-[#0c66e4]",
            inputClassName
          )}
        />
        {query && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#626f86] hover:text-[#172b4d]"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {isOpen && query && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-y-auto overflow-hidden rounded-lg border border-[#dfe1e6] bg-white shadow-xl">
          {results.length === 0 ? (
            <div className="p-4 text-center text-[#626f86]">
              No results found
            </div>
          ) : (
            <div>
              <div className="border-b border-[#dfe1e6] px-3 py-2 text-xs text-[#626f86]">
                {totalCount > results.length ? `Cards (showing ${results.length} of ${totalCount})` : `Cards (${results.length})`}
              </div>
              {results.map((result, index) => (
                <button
                  key={result.card.id}
                  onClick={() => handleSelectCard(result.card)}
                  className={`w-full flex items-start gap-3 p-3 text-left transition-colors ${
                    index === selectedIndex
                      ? "bg-[#e9f2ff]"
                      : "hover:bg-[#091e420f]"
                  }`}
                >
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded bg-[#f1f2f4]">
                    <svg
                      className="h-4 w-4 text-[#626f86]"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <line x1="9" y1="9" x2="15" y2="9" />
                      <line x1="9" y1="13" x2="15" y2="13" />
                    </svg>
                  </div>

                  <div className="flex-1 min-w-0">
                    {getLabelColors(result.card).length > 0 && (
                      <div className="flex gap-1 mb-1">
                        {getLabelColors(result.card).map((label) => (
                          <div
                            key={label.id}
                            className="w-8 h-1.5 rounded-full"
                            style={{ backgroundColor: label.color }}
                          />
                        ))}
                      </div>
                    )}

                    <div dir="auto" className="truncate text-sm text-[#172b4d]">
                      {result.card.title}
                    </div>

                    <div className="mt-0.5 text-xs text-[#626f86]">
                      {result.listName}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
