"use client";

import * as React from "react";
import {
  Bold,
  Code,
  Heading,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Strikethrough,
} from "lucide-react";
import { cn } from "@/lib/utils";

type InlineToken = React.ReactNode;

const INLINE_PATTERN = new RegExp(
  [
    "(?<code>`[^`\\n]+`)",
    "(?<boldItalic>\\*\\*\\*(?=\\S)[^\\n]+?(?<=\\S)\\*\\*\\*)",
    "(?<bold>\\*\\*(?=\\S)[^\\n]+?(?<=\\S)\\*\\*)",
    "(?<strike>~~(?=\\S)[^\\n]+?(?<=\\S)~~)",
    "(?<italic>\\*(?=[^\\s*])[^\\n*]*?(?<=[^\\s*])\\*)",
    "(?<underscore>(?<![\\p{L}\\p{N}_])_(?=[^\\s_])[^\\n_]*?(?<=[^\\s_])_(?![\\p{L}\\p{N}_]))",
    "(?<link>\\[[^\\]\\n]+\\]\\([^)\\s]+\\))",
    "(?<url>https?:\\/\\/[^\\s<]+)",
  ].join("|"),
  "gu"
);

const DIGIT = "[0-9\\u06F0-\\u06F9\\u0660-\\u0669]";
const ORDERED_ITEM = new RegExp(`^\\s*${DIGIT}+[.)]\\s+`);
const BULLET_ITEM = /^\s*[-*+]\s+/;
const RTL_CHAR = /[֐-ࣿיִ-﷿ﹰ-ﻼ]/;
const STRONG_CHAR = /[A-Za-zÀ-ɏͰ-ϿЀ-ӿ֐-ࣿיִ-﷿ﹰ-ﻼ]/;

function textDirection(text: string): "rtl" | "ltr" {
  const first = text.match(STRONG_CHAR)?.[0];
  return first && RTL_CHAR.test(first) ? "rtl" : "ltr";
}

function toLatinDigits(text: string): string {
  return text
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
}

function formatNumber(n: number, sample: string): string {
  const base = /[۰-۹]/.test(sample) ? 0x06f0 : /[٠-٩]/.test(sample) ? 0x0660 : 0;
  return base ? String(n).replace(/\d/g, (d) => String.fromCharCode(base + Number(d))) : String(n);
}

function safeHref(url: string): string | null {
  return /^(https?:\/\/|mailto:)/i.test(url) ? url : null;
}

function trimUrl(url: string): string {
  let result = url;
  while (result) {
    const last = result[result.length - 1];
    if (/[.,;:!?'"*_~،؛]/.test(last)) {
      result = result.slice(0, -1);
    } else if (last === ")" && (result.match(/\(/g)?.length ?? 0) < (result.match(/\)/g)?.length ?? 0)) {
      result = result.slice(0, -1);
    } else {
      break;
    }
  }
  return result;
}

const LINK_CLASS = "text-blue-400 underline underline-offset-2 hover:text-blue-300";

function renderInline(text: string, keyPrefix: string): InlineToken[] {
  const nodes: InlineToken[] = [];
  const pattern = new RegExp(INLINE_PATTERN);
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = pattern.exec(text)) !== null) {
    const groups = match.groups ?? {};
    let token = match[0];
    if (groups.url) {
      token = trimUrl(token);
      if (!token) {
        pattern.lastIndex = match.index + 1;
        continue;
      }
    }
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    const key = `${keyPrefix}-${index++}`;

    if (groups.code) {
      nodes.push(<code key={key} className="rounded bg-white/10 px-1 py-0.5 font-mono text-[0.85em]">{token.slice(1, -1)}</code>);
    } else if (groups.boldItalic) {
      nodes.push(
        <strong key={key} className="font-semibold text-gray-100">
          <em>{renderInline(token.slice(3, -3), key)}</em>
        </strong>
      );
    } else if (groups.bold) {
      nodes.push(<strong key={key} className="font-semibold text-gray-100">{renderInline(token.slice(2, -2), key)}</strong>);
    } else if (groups.strike) {
      nodes.push(<del key={key}>{renderInline(token.slice(2, -2), key)}</del>);
    } else if (groups.italic || groups.underscore) {
      nodes.push(<em key={key}>{renderInline(token.slice(1, -1), key)}</em>);
    } else if (groups.link) {
      const [, label, url] = token.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/) || [];
      const href = safeHref(url || "");
      nodes.push(
        href ? (
          <a key={key} href={href} target="_blank" rel="noopener noreferrer" className={LINK_CLASS} onClick={(e) => e.stopPropagation()}>
            {label}
          </a>
        ) : (
          token
        )
      );
    } else if (groups.url) {
      nodes.push(
        <a key={key} href={token} target="_blank" rel="noopener noreferrer" className={cn(LINK_CLASS, "break-all")} onClick={(e) => e.stopPropagation()}>
          {token}
        </a>
      );
    }
    lastIndex = match.index + token.length;
    pattern.lastIndex = lastIndex;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

function listLevel(line: string): number {
  return Math.floor((line.match(/^\s*/)?.[0].length ?? 0) / 2);
}

export function MarkdownView({ value, className }: { value: string; className?: string }) {
  const lines = value.split(/\r?\n/);
  const blocks: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const key = `b-${i}`;

    if (line.trim().startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      blocks.push(
        <pre key={key} dir="ltr" className="my-1 overflow-x-auto rounded-md bg-black/30 p-3 font-mono text-xs text-gray-200">
          {codeLines.join("\n")}
        </pre>
      );
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      const size = heading[1].length === 1 ? "text-lg" : heading[1].length === 2 ? "text-base" : "text-sm";
      blocks.push(
        <div key={key} dir="auto" className={cn("mt-2 mb-1 font-semibold text-gray-100", size)}>
          {renderInline(heading[2], key)}
        </div>
      );
      i++;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      blocks.push(
        <blockquote key={key} dir="auto" className="my-1 border-s-2 border-gray-500 ps-3 text-gray-400">
          {quoteLines.map((q, qi) => (
            <div key={qi}>{renderInline(q, `${key}-${qi}`)}</div>
          ))}
        </blockquote>
      );
      continue;
    }

    if (BULLET_ITEM.test(line)) {
      const items: { text: string; level: number }[] = [];
      while (i < lines.length && BULLET_ITEM.test(lines[i])) {
        items.push({ text: lines[i].replace(BULLET_ITEM, ""), level: listLevel(lines[i]) });
        i++;
      }
      blocks.push(
        <ul key={key} dir={textDirection(items[0].text)} className="my-1 list-disc ps-5 space-y-0.5">
          {items.map((item, ii) => (
            <li key={ii} style={{ marginInlineStart: `${item.level * 1.25}rem` }} className={item.level > 0 ? "list-[circle]" : undefined}>
              {renderInline(item.text, `${key}-${ii}`)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    if (ORDERED_ITEM.test(line)) {
      const items: { text: string; level: number; number: number }[] = [];
      while (i < lines.length && ORDERED_ITEM.test(lines[i])) {
        items.push({
          text: lines[i].replace(ORDERED_ITEM, ""),
          level: listLevel(lines[i]),
          number: parseInt(toLatinDigits(lines[i].trim()), 10),
        });
        i++;
      }
      const listStyleType = /^\s*[۰-۹]/.test(line) ? "persian" : /^\s*[٠-٩]/.test(line) ? "arabic-indic" : undefined;
      blocks.push(
        <ol key={key} dir={textDirection(items[0].text)} style={{ listStyleType }} className="my-1 list-decimal ps-5 space-y-0.5">
          {items.map((item, ii) => (
            <li key={ii} value={item.number} style={{ marginInlineStart: `${item.level * 1.25}rem` }}>
              {renderInline(item.text, `${key}-${ii}`)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    blocks.push(
      <div key={key} dir="auto">
        {line ? renderInline(line, key) : <br />}
      </div>
    );
    i++;
  }

  return <div className={cn("text-sm leading-relaxed text-gray-300 break-words", className)}>{blocks}</div>;
}

type Edit = { value: string; start: number; end: number };

type ToolbarAction = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  run: (value: string, start: number, end: number) => Edit;
};

function lineBounds(value: string, start: number, end: number) {
  const effectiveEnd = end > start && value[end - 1] === "\n" ? end - 1 : end;
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const lineEndIndex = value.indexOf("\n", effectiveEnd);
  return { lineStart, lineEnd: lineEndIndex === -1 ? value.length : lineEndIndex };
}

function starRun(text: string, from: number, step: 1 | -1): number {
  let count = 0;
  for (let i = from; i >= 0 && i < text.length && text[i] === "*"; i += step) count++;
  return count;
}

function hasMarker(marker: string, text: string, left: number, right: number): boolean {
  if (marker === "*") {
    return starRun(text, left, -1) % 2 === 1 && starRun(text, right, 1) % 2 === 1;
  }
  if (marker === "**") {
    return starRun(text, left, -1) >= 2 && starRun(text, right, 1) >= 2;
  }
  return text.slice(left - marker.length + 1, left + 1) === marker && text.slice(right, right + marker.length) === marker;
}

function isWrapped(marker: string, text: string): boolean {
  if (text.length <= marker.length * 2) return false;
  if (marker === "*" || marker === "**") {
    const lead = starRun(text, 0, 1);
    if (lead !== starRun(text, text.length - 1, -1) || lead * 2 >= text.length) return false;
    return marker === "*" ? lead % 2 === 1 : lead >= 2;
  }
  return text.startsWith(marker) && text.endsWith(marker);
}

function toggleSegment(segment: string, marker: string, unwrap: boolean): string {
  const lead = segment.match(/^\s*/)?.[0] ?? "";
  const trail = segment.slice(lead.length).match(/\s*$/)?.[0] ?? "";
  const core = segment.slice(lead.length, segment.length - trail.length);
  if (!core) return segment;
  if (unwrap) return isWrapped(marker, core) ? lead + core.slice(marker.length, -marker.length) + trail : segment;
  return isWrapped(marker, core) ? segment : lead + marker + core + marker + trail;
}

function toggleInline(value: string, start: number, end: number, marker: string, placeholder: string): Edit {
  const size = marker.length;
  const selected = value.slice(start, end);

  if (selected.includes("\n")) {
    const segments = selected.split("\n");
    const filled = segments.filter((s) => s.trim());
    const unwrap = filled.length > 0 && filled.every((s) => isWrapped(marker, s.trim()));
    const replaced = segments.map((s) => toggleSegment(s, marker, unwrap)).join("\n");
    return { value: value.slice(0, start) + replaced + value.slice(end), start, end: start + replaced.length };
  }

  let s = start;
  let e = end;
  if (selected.trim()) {
    s += selected.length - selected.trimStart().length;
    e -= selected.length - selected.trimEnd().length;
  } else {
    e = s = start;
  }

  if (s !== e && hasMarker(marker, value, s - 1, e)) {
    return { value: value.slice(0, s - size) + value.slice(s, e) + value.slice(e + size), start: s - size, end: e - size };
  }

  const text = value.slice(s, e);
  if (text && isWrapped(marker, text)) {
    return { value: value.slice(0, s) + text.slice(size, -size) + value.slice(e), start: s, end: e - size * 2 };
  }

  const inner = text || placeholder;
  return { value: value.slice(0, s) + marker + inner + marker + value.slice(e), start: s + size, end: s + size + inner.length };
}

function insertLink(value: string, start: number, end: number): Edit {
  const text = value.slice(start, end).trim();
  if (/^https?:\/\/\S+$/.test(text)) {
    const label = "link text";
    return { value: `${value.slice(0, start)}[${label}](${text})${value.slice(end)}`, start: start + 1, end: start + 1 + label.length };
  }
  const label = text || "link text";
  const url = "https://";
  const next = `${value.slice(0, start)}[${label}](${url})${value.slice(end)}`;
  const urlStart = start + label.length + 3;
  return text ? { value: next, start: urlStart, end: urlStart + url.length } : { value: next, start: start + 1, end: start + 1 + label.length };
}

function insertCode(value: string, start: number, end: number): Edit {
  const selected = value.slice(start, end);
  if (!selected.includes("\n")) return toggleInline(value, start, end, "`", "code");
  const before = start > 0 && value[start - 1] !== "\n" ? "\n" : "";
  const after = end < value.length && value[end] !== "\n" ? "\n" : "";
  const block = `${before}\`\`\`\n${selected}\n\`\`\`${after}`;
  const innerStart = start + before.length + 4;
  return { value: value.slice(0, start) + block + value.slice(end), start: innerStart, end: innerStart + selected.length };
}

type LineKind = "heading" | "bullet" | "ordered" | "quote";

const LINE_PREFIX: Record<LineKind, RegExp> = {
  heading: /^(\s*)#{1,6}\s+/,
  bullet: /^(\s*)[-*+]\s+/,
  ordered: new RegExp(`^(\\s*)${DIGIT}+[.)]\\s+`),
  quote: /^(\s*)>\s?/,
};

const ANY_LIST_MARKER = new RegExp(`^([-*+]|${DIGIT}+[.)])\\s+`);

function toggleLines(value: string, start: number, end: number, kind: LineKind): Edit {
  const { lineStart, lineEnd } = lineBounds(value, start, end);
  const lines = value.slice(lineStart, lineEnd).split("\n");
  const filled = lines.filter((line) => line.trim());
  const pattern = LINE_PREFIX[kind];
  const remove = filled.length > 0 && filled.every((line) => pattern.test(line));
  let counter = 0;

  const replacedLines = lines.map((line) => {
    if (filled.length > 0 && !line.trim()) return line;
    if (remove) return line.replace(pattern, "$1");
    const indent = line.match(/^\s*/)?.[0] ?? "";
    let content = line.slice(indent.length);
    if (kind === "bullet" || kind === "ordered") content = content.replace(ANY_LIST_MARKER, "");
    if (kind === "heading") content = content.replace(/^#{1,6}\s+/, "");
    const prefix = kind === "heading" ? "## " : kind === "bullet" ? "- " : kind === "ordered" ? `${++counter}. ` : "> ";
    return indent + prefix + content;
  });

  const replaced = replacedLines.join("\n");
  const next = value.slice(0, lineStart) + replaced + value.slice(lineEnd);
  if (start === end && lines.length === 1) {
    const cursor = Math.max(lineStart, start + replaced.length - (lineEnd - lineStart));
    return { value: next, start: cursor, end: cursor };
  }
  return { value: next, start: lineStart, end: lineStart + replaced.length };
}

const LIST_ITEM = new RegExp(`^(\\s*)([-*+]|${DIGIT}+[.)]|>)(\\s+)(.*)$`);
const NUMBERED_MARKER = new RegExp(`^(${DIGIT}+)([.)])$`);

function renumberFollowing(rest: string, indent: string, from: number, sample: string): string {
  const lines = rest.split("\n");
  const itemPattern = new RegExp(`^(\\s*)(${DIGIT}+)([.)]\\s+)`);
  let expected = from;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(itemPattern);
    if (match && match[1] === indent) {
      lines[i] = indent + formatNumber(expected++, sample) + line.slice(match[1].length + match[2].length);
    } else if (line.trim() && (line.match(/^\s*/)?.[0].length ?? 0) > indent.length) {
      continue;
    } else {
      break;
    }
  }
  return lines.join("\n");
}

function continueList(value: string, start: number, end: number): Edit | null {
  if (start !== end) return null;
  const { lineStart, lineEnd } = lineBounds(value, start, start);
  const match = value.slice(lineStart, lineEnd).match(LIST_ITEM);
  if (!match) return null;

  const [, indent, marker, spacing, content] = match;
  if (start < lineStart + indent.length + marker.length + spacing.length) return null;

  if (!content.trim()) {
    const replacement = indent ? `${indent.slice(2)}${marker}${spacing}` : "";
    const cursor = lineStart + replacement.length;
    return { value: value.slice(0, lineStart) + replacement + value.slice(lineEnd), start: cursor, end: cursor };
  }

  const numbered = marker.match(NUMBERED_MARKER);
  const current = numbered ? parseInt(toLatinDigits(numbered[1]), 10) : 0;
  const nextMarker = numbered ? `${formatNumber(current + 1, numbered[1])}${numbered[2]}` : marker;
  const insertion = `\n${indent}${nextMarker}${spacing}`;
  const rest = numbered ? renumberFollowing(value.slice(start), indent, current + 2, numbered[1]) : value.slice(start);
  const cursor = start + insertion.length;
  return { value: value.slice(0, start) + insertion + rest, start: cursor, end: cursor };
}

function indentListItem(value: string, start: number, end: number, outdent: boolean): Edit | null {
  if (start !== end) return null;
  const { lineStart, lineEnd } = lineBounds(value, start, start);
  const line = value.slice(lineStart, lineEnd);
  if (!LIST_ITEM.test(line) || line.trimStart().startsWith(">")) return null;

  if (outdent) {
    const remove = line.startsWith("  ") ? 2 : line.startsWith(" ") ? 1 : 0;
    const cursor = Math.max(lineStart, start - remove);
    return { value: value.slice(0, lineStart) + value.slice(lineStart + remove), start: cursor, end: cursor };
  }
  return { value: `${value.slice(0, lineStart)}  ${value.slice(lineStart)}`, start: start + 2, end: start + 2 };
}

function replaceRange(textarea: HTMLTextAreaElement, start: number, end: number, text: string, onChange: (value: string) => void) {
  const original = textarea.value;
  textarea.focus();
  textarea.setSelectionRange(start, end);
  const command = text ? "insertText" : "delete";
  const applied = typeof document !== "undefined" && document.execCommand?.(command, false, text);
  if (!applied) onChange(original.slice(0, start) + text + original.slice(end));
}

function commitEdit(textarea: HTMLTextAreaElement, edit: Edit, onChange: (value: string) => void) {
  const previous = textarea.value;
  const next = edit.value;
  if (previous !== next) {
    let prefix = 0;
    while (prefix < previous.length && prefix < next.length && previous[prefix] === next[prefix]) prefix++;
    let suffix = 0;
    while (
      suffix < previous.length - prefix &&
      suffix < next.length - prefix &&
      previous[previous.length - 1 - suffix] === next[next.length - 1 - suffix]
    ) {
      suffix++;
    }
    replaceRange(textarea, prefix, previous.length - suffix, next.slice(prefix, next.length - suffix), onChange);
  }
  textarea.setSelectionRange(edit.start, edit.end);
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(edit.start, edit.end);
  });
}

const BOLD: ToolbarAction = { icon: Bold, title: "Bold (Ctrl+B)", run: (v, s, e) => toggleInline(v, s, e, "**", "bold text") };
const ITALIC: ToolbarAction = { icon: Italic, title: "Italic (Ctrl+I)", run: (v, s, e) => toggleInline(v, s, e, "*", "italic text") };
const LINK: ToolbarAction = { icon: Link2, title: "Link (Ctrl+K)", run: insertLink };

const ACTIONS: ToolbarAction[] = [
  { icon: Heading, title: "Heading", run: (v, s, e) => toggleLines(v, s, e, "heading") },
  BOLD,
  ITALIC,
  { icon: Strikethrough, title: "Strikethrough", run: (v, s, e) => toggleInline(v, s, e, "~~", "text") },
  { icon: List, title: "Bulleted list", run: (v, s, e) => toggleLines(v, s, e, "bullet") },
  { icon: ListOrdered, title: "Numbered list", run: (v, s, e) => toggleLines(v, s, e, "ordered") },
  { icon: Quote, title: "Quote", run: (v, s, e) => toggleLines(v, s, e, "quote") },
  { icon: Code, title: "Code", run: insertCode },
  LINK,
];

export function MarkdownEditor({
  value,
  onChange,
  placeholder,
  autoFocus,
  onSubmit,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  onSubmit?: () => void;
}) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = React.useState(false);

  const run = (compute: (value: string, start: number, end: number) => Edit | null): boolean => {
    const textarea = textareaRef.current;
    if (!textarea) return false;
    const edit = compute(textarea.value, textarea.selectionStart, textarea.selectionEnd);
    if (!edit) return false;
    commitEdit(textarea, edit, onChange);
    return true;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;
    const mod = e.ctrlKey || e.metaKey;
    const key = e.key.toLowerCase();
    if (mod && !e.altKey && key === "b") {
      e.preventDefault();
      run(BOLD.run);
    } else if (mod && !e.altKey && key === "i") {
      e.preventDefault();
      run(ITALIC.run);
    } else if (mod && !e.altKey && key === "k") {
      e.preventDefault();
      run(LINK.run);
    } else if (mod && e.key === "Enter") {
      e.preventDefault();
      onSubmit?.();
    } else if (e.key === "Enter" && !e.shiftKey && !e.altKey && !mod) {
      if (run(continueList)) e.preventDefault();
    } else if (e.key === "Tab" && !mod && !e.altKey) {
      if (run((v, s, end) => indentListItem(v, s, end, e.shiftKey))) e.preventDefault();
    }
  };

  return (
    <div className="rounded-lg border border-[#3d4449] bg-[#22272b] focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
      <div className="flex items-center gap-0.5 border-b border-[#3d4449] px-2 py-1">
        {ACTIONS.map((action) => (
          <button
            key={action.title}
            type="button"
            title={action.title}
            aria-label={action.title}
            disabled={preview}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => run(action.run)}
            className="rounded p-1.5 text-gray-400 hover:bg-white/10 hover:text-gray-100 disabled:opacity-40"
          >
            <action.icon className="h-4 w-4" />
          </button>
        ))}
        <button
          type="button"
          onClick={() => setPreview((p) => !p)}
          className={cn(
            "ms-auto rounded px-2 py-1 text-xs text-gray-400 hover:bg-white/10 hover:text-gray-100",
            preview && "bg-white/10 text-gray-100"
          )}
        >
          {preview ? "Edit" : "Preview"}
        </button>
      </div>
      {preview ? (
        <div className="min-h-[150px] p-3">
          {value.trim() ? <MarkdownView value={value} /> : <span className="text-sm text-gray-500">Nothing to preview</span>}
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          dir="auto"
          autoFocus={autoFocus}
          className="block w-full min-h-[150px] resize-y bg-transparent p-3 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none"
        />
      )}
    </div>
  );
}
