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
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
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
            "w-64 pl-9 pr-9 bg-black/15 dark:bg-black/15 border-white/20 text-white placeholder:text-white/60 shadow-none selection:bg-blue-500/60 selection:text-white",
            "hover:bg-black/25 focus-visible:bg-[#22272b] dark:focus-visible:bg-[#22272b] focus-visible:border-blue-500 focus-visible:ring-1 focus-visible:ring-blue-500",
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
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {isOpen && query && (
        <div className="absolute top-full right-0 left-0 mt-2 bg-[#1d2125] border border-[#3d4449] rounded-lg shadow-xl overflow-hidden z-50 max-h-96 overflow-y-auto">
          {results.length === 0 ? (
            <div className="p-4 text-center text-gray-400">
              No results found
            </div>
          ) : (
            <div>
              <div className="px-3 py-2 text-xs text-gray-500 border-b border-[#3d4449]">
                {totalCount > results.length ? `Cards (showing ${results.length} of ${totalCount})` : `Cards (${results.length})`}
              </div>
              {results.map((result, index) => (
                <button
                  key={result.card.id}
                  onClick={() => handleSelectCard(result.card)}
                  className={`w-full flex items-start gap-3 p-3 text-left transition-colors ${
                    index === selectedIndex
                      ? "bg-blue-600/20"
                      : "hover:bg-white/5"
                  }`}
                >
                  <div className="w-8 h-8 bg-[#22272b] rounded flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-4 h-4 text-gray-400"
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

                    <div dir="auto" className="text-sm text-gray-200 truncate">
                      {result.card.title}
                    </div>

                    <div className="text-xs text-gray-500 mt-0.5">
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
