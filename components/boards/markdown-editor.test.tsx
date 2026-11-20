import * as React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MarkdownEditor, MarkdownView } from "./markdown-editor";

function renderView(value: string) {
  return render(<MarkdownView value={value} />).container;
}

function Harness({ initial = "", onSubmit }: { initial?: string; onSubmit?: () => void }) {
  const [value, setValue] = React.useState(initial);
  return (
    <>
      <MarkdownEditor value={value} onChange={setValue} onSubmit={onSubmit} />
      <output data-testid="value">{value}</output>
    </>
  );
}

function setup(initial = "", onSubmit?: () => void) {
  render(<Harness initial={initial} onSubmit={onSubmit} />);
  const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
  return {
    textarea,
    value: () => (screen.getByTestId("value").textContent ?? ""),
  };
}

function select(textarea: HTMLTextAreaElement, start: number, end = start) {
  textarea.focus();
  textarea.setSelectionRange(start, end);
}

function flushFrames() {
  act(() => {
    jest.runOnlyPendingTimers();
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => setTimeout(() => cb(0), 0) as unknown as number);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe("MarkdownView inline", () => {
  it("renders bold", () => {
    const c = renderView("**سلام**");
    expect(c.querySelector("strong")?.textContent).toBe("سلام");
  });

  it("terminates on bold (regression: infinite loop)", () => {
    const c = renderView("**a** and **b** and ~~c~~ and *d*");
    expect(c.querySelectorAll("strong")).toHaveLength(2);
    expect(c.querySelector("del")?.textContent).toBe("c");
    expect(c.querySelector("em")?.textContent).toBe("d");
  });

  it("renders italic with asterisk and underscore", () => {
    const c = renderView("*a* _b_");
    expect([...c.querySelectorAll("em")].map((e) => e.textContent)).toEqual(["a", "b"]);
  });

  it("does not italicize snake_case identifiers", () => {
    const c = renderView("use my_var_name here");
    expect(c.querySelector("em")).toBeNull();
    expect(c.textContent).toBe("use my_var_name here");
  });

  it("renders italic nested inside bold", () => {
    const c = renderView("**bold *it* bold**");
    const strong = c.querySelector("strong");
    expect(strong?.textContent).toBe("bold it bold");
    expect(strong?.querySelector("em")?.textContent).toBe("it");
  });

  it("renders bold italic", () => {
    const c = renderView("***x***");
    expect(c.querySelector("strong em, em strong")?.textContent).toBe("x");
    expect(c.textContent).toBe("x");
  });

  it("renders inline code without parsing markdown inside", () => {
    const c = renderView("`**not bold**`");
    expect(c.querySelector("code")?.textContent).toBe("**not bold**");
    expect(c.querySelector("strong")).toBeNull();
  });

  it("renders safe links and blocks javascript: urls", () => {
    const c = renderView("[ok](https://a.com) [bad](javascript:alert(1))");
    const links = c.querySelectorAll("a");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "https://a.com");
    expect(links[0]).toHaveAttribute("target", "_blank");
    expect(links[0]).toHaveAttribute("rel", "noopener noreferrer");
    expect(c.textContent).toContain("[bad](javascript:alert(1))");
  });

  it("autolinks urls without trailing punctuation", () => {
    const c = renderView("see https://a.com/x. and (https://b.com)");
    const hrefs = [...c.querySelectorAll("a")].map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(["https://a.com/x", "https://b.com"]);
    expect(c.textContent).toBe("see https://a.com/x. and (https://b.com)");
  });

  it("escapes html", () => {
    const c = renderView("<img src=x onerror=alert(1)>");
    expect(c.querySelector("img")).toBeNull();
    expect(c.textContent).toBe("<img src=x onerror=alert(1)>");
  });

  it("keeps unmatched markers as text", () => {
    const c = renderView("a ** b ~~ c ` d");
    expect(c.textContent).toBe("a ** b ~~ c ` d");
  });
});

describe("MarkdownView blocks", () => {
  it("renders headings", () => {
    const c = renderView("# a\n## b\n### c\n#### d");
    const divs = [...c.querySelectorAll("div.font-semibold")].map((d) => d.textContent);
    expect(divs).toEqual(["a", "b", "c"]);
    expect(c.textContent).toContain("#### d");
  });

  it("renders rtl ordered list with rtl direction on the list", () => {
    const c = renderView("سلام\n1. ایتم اول\n2. دوم\n3. سوم");
    const ol = c.querySelector("ol")!;
    expect(ol).toHaveAttribute("dir", "rtl");
    const items = [...ol.querySelectorAll("li")];
    expect(items.map((li) => li.textContent)).toEqual(["ایتم اول", "دوم", "سوم"]);
    items.forEach((li) => expect(li).not.toHaveAttribute("dir"));
  });

  it("renders ltr bullet list", () => {
    const c = renderView("- a\n- b");
    const ul = c.querySelector("ul")!;
    expect(ul).toHaveAttribute("dir", "ltr");
    expect(ul.querySelectorAll("li")).toHaveLength(2);
  });

  it("uses first strong character for direction", () => {
    const c = renderView("1. **123** سلام\n2. b");
    expect(c.querySelector("ol")).toHaveAttribute("dir", "rtl");
  });

  it("keeps ordered list numbers", () => {
    const c = renderView("3. a\n4. b");
    expect([...c.querySelectorAll("li")].map((li) => li.getAttribute("value"))).toEqual(["3", "4"]);
  });

  it("supports persian digits in ordered lists", () => {
    const c = renderView("۱. اول\n۲. دوم");
    const items = [...c.querySelectorAll("ol li")];
    expect(items.map((li) => li.textContent)).toEqual(["اول", "دوم"]);
    expect(items.map((li) => li.getAttribute("value"))).toEqual(["1", "2"]);
    expect((c.querySelector("ol") as HTMLElement).style.listStyleType).toBe("persian");
  });

  it("renders nested list indentation", () => {
    const c = renderView("- a\n  - b\n    - c");
    const items = [...c.querySelectorAll("li")] as HTMLElement[];
    expect(items.map((li) => li.style.marginInlineStart)).toEqual(["0rem", "1.25rem", "2.5rem"]);
  });

  it("does not treat bold line as list", () => {
    const c = renderView("**bold** line");
    expect(c.querySelector("ul")).toBeNull();
    expect(c.querySelector("strong")?.textContent).toBe("bold");
  });

  it("renders blockquote", () => {
    const c = renderView("> a\n> **b**\nc");
    const bq = c.querySelector("blockquote")!;
    expect(bq.textContent).toBe("ab");
    expect(bq.querySelector("strong")?.textContent).toBe("b");
  });

  it("renders fenced code verbatim", () => {
    const c = renderView("```\n**x**\n- y\n```\nafter");
    expect(c.querySelector("pre")?.textContent).toBe("**x**\n- y");
    expect(c.querySelector("strong")).toBeNull();
    expect(c.textContent).toContain("after");
  });

  it("handles unclosed code fence", () => {
    const c = renderView("```\ncode");
    expect(c.querySelector("pre")?.textContent).toBe("code");
  });

  it("preserves empty lines and CRLF", () => {
    const c = renderView("a\r\n\r\nb");
    expect(c.querySelectorAll("br")).toHaveLength(1);
    expect(c.textContent).toBe("ab");
  });

  it("renders large input quickly", () => {
    const big = Array.from({ length: 2000 }, (_, i) => `${i + 1}. **item** *${i}* https://x.com/${i}`).join("\n");
    const t = performance.now();
    const c = renderView(big);
    expect(c.querySelectorAll("li")).toHaveLength(2000);
    expect(performance.now() - t).toBeLessThan(3000);
  });
});

describe("MarkdownEditor toolbar", () => {
  const click = (title: RegExp) => {
    fireEvent.click(screen.getByTitle(title));
    flushFrames();
  };

  it("bold wraps selection and keeps it selected", () => {
    const { textarea, value } = setup("hello world");
    select(textarea, 0, 5);
    click(/^Bold/);
    expect(value()).toBe("**hello** world");
    expect([textarea.selectionStart, textarea.selectionEnd]).toEqual([2, 7]);
  });

  it("bold toggles off when already bold", () => {
    const { textarea, value } = setup("**hello** world");
    select(textarea, 2, 7);
    click(/^Bold/);
    expect(value()).toBe("hello world");
    expect([textarea.selectionStart, textarea.selectionEnd]).toEqual([0, 5]);
  });

  it("bold toggles off when selection includes markers", () => {
    const { textarea, value } = setup("**hello** world");
    select(textarea, 0, 9);
    click(/^Bold/);
    expect(value()).toBe("hello world");
  });

  it("bold with empty selection inserts selected placeholder", () => {
    const { textarea, value } = setup("");
    select(textarea, 0);
    click(/^Bold/);
    expect(value()).toBe("**bold text**");
    expect(textarea.value.slice(textarea.selectionStart, textarea.selectionEnd)).toBe("bold text");
  });

  it("bold keeps surrounding whitespace outside markers", () => {
    const { textarea, value } = setup("a hello b");
    select(textarea, 1, 8);
    click(/^Bold/);
    expect(value()).toBe("a **hello** b");
  });

  it("bold on multi-line selection wraps each line", () => {
    const { textarea, value } = setup("one\ntwo");
    select(textarea, 0, 7);
    click(/^Bold/);
    expect(value()).toBe("**one**\n**two**");
  });

  it("italic, strike, code and link wrap selection", () => {
    const { textarea, value } = setup("x");
    select(textarea, 0, 1);
    click(/^Italic/);
    expect(value()).toBe("*x*");
    select(textarea, 0, 3);
    click(/^Strikethrough/);
    expect(value()).toBe("~~*x*~~");
    select(textarea, 7);
    click(/^Code/);
    expect(value()).toBe("~~*x*~~`code`");
    select(textarea, 0, 0);
    click(/^Link/);
    expect(value().startsWith("[link text](https://)")).toBe(true);
  });

  it("italic on bold text produces bold italic and toggles back", () => {
    const { textarea, value } = setup("**x**");
    select(textarea, 2, 3);
    click(/^Italic/);
    expect(value()).toBe("***x***");
    expect([textarea.selectionStart, textarea.selectionEnd]).toEqual([3, 4]);
    click(/^Italic/);
    expect(value()).toBe("**x**");
    click(/^Bold/);
    expect(value()).toBe("x");
  });

  it("bold removes only bold from bold italic", () => {
    const { textarea, value } = setup("***x***");
    select(textarea, 3, 4);
    click(/^Bold/);
    expect(value()).toBe("*x*");
  });

  it("italic does not treat bold as italic", () => {
    const { textarea, value } = setup("**hello**");
    select(textarea, 0, 9);
    click(/^Italic/);
    expect(value()).toBe("***hello***");
  });

  it("code on multi-line selection creates fenced block", () => {
    const { textarea, value } = setup("a\nb");
    select(textarea, 0, 3);
    click(/^Code/);
    expect(value()).toBe("```\na\nb\n```");
    expect(textarea.value.slice(textarea.selectionStart, textarea.selectionEnd)).toBe("a\nb");
  });

  it("link uses selected url as href", () => {
    const { textarea, value } = setup("https://a.com");
    select(textarea, 0, 13);
    click(/^Link/);
    expect(value()).toBe("[link text](https://a.com)");
  });

  it("link selects the url placeholder when text is selected", () => {
    const { textarea, value } = setup("site");
    select(textarea, 0, 4);
    click(/^Link/);
    expect(value()).toBe("[site](https://)");
    expect(textarea.value.slice(textarea.selectionStart, textarea.selectionEnd)).toBe("https://");
  });

  it("heading, bullet, numbered and quote prefix lines", () => {
    const { textarea, value } = setup("a\nb");
    select(textarea, 0, 3);
    click(/^Numbered/);
    expect(value()).toBe("1. a\n2. b");
    select(textarea, 0, value().length);
    click(/^Numbered/);
    expect(value()).toBe("a\nb");
    select(textarea, 0, 3);
    click(/^Bulleted/);
    expect(value()).toBe("- a\n- b");
    select(textarea, 0, value().length);
    click(/^Bulleted/);
    expect(value()).toBe("a\nb");
    select(textarea, 0);
    click(/^Heading/);
    expect(value()).toBe("## a\nb");
    select(textarea, 0);
    click(/^Heading/);
    expect(value()).toBe("a\nb");
    select(textarea, 2);
    click(/^Quote/);
    expect(value()).toBe("a\n> b");
    click(/^Quote/);
    expect(value()).toBe("a\nb");
  });

  it("switching list type replaces the marker", () => {
    const { textarea, value } = setup("- a\n- b");
    select(textarea, 0, value().length);
    click(/^Numbered/);
    expect(value()).toBe("1. a\n2. b");
  });

  it("list prefix skips blank lines", () => {
    const { textarea, value } = setup("a\n\nb");
    select(textarea, 0, 4);
    click(/^Bulleted/);
    expect(value()).toBe("- a\n\n- b");
  });

  it("preview renders and toggles back without freezing (regression)", () => {
    const { textarea, value } = setup("سلام\n1. ایتم اول");
    select(textarea, 0, 4);
    click(/^Bold/);
    expect(value()).toBe("**سلام**\n1. ایتم اول");
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(document.querySelector("strong")?.textContent).toBe("سلام");
    expect(screen.getByTitle(/^Bold/)).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("**سلام**\n1. ایتم اول");
  });

  it("preview shows placeholder when empty", () => {
    setup("   ");
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    expect(screen.getByText("Nothing to preview")).toBeInTheDocument();
  });

  it("toolbar mousedown does not steal focus", () => {
    setup("x");
    const button = screen.getByTitle(/^Bold/);
    const event = fireEvent.mouseDown(button);
    expect(event).toBe(false);
  });
});

describe("MarkdownEditor keyboard", () => {
  const key = (textarea: HTMLTextAreaElement, init: Partial<KeyboardEventInit> & { key: string }) => {
    fireEvent.keyDown(textarea, init);
    flushFrames();
  };

  it("ctrl+b and ctrl+i", () => {
    const { textarea, value } = setup("x y");
    select(textarea, 0, 1);
    key(textarea, { key: "b", ctrlKey: true });
    expect(value()).toBe("**x** y");
    select(textarea, 6, 7);
    key(textarea, { key: "i", ctrlKey: true });
    expect(value()).toBe("**x** *y*");
  });

  it("ctrl+k inserts link", () => {
    const { textarea, value } = setup("x");
    select(textarea, 0, 1);
    key(textarea, { key: "k", ctrlKey: true });
    expect(value()).toBe("[x](https://)");
  });

  it("ctrl+enter submits", () => {
    const onSubmit = jest.fn();
    const { textarea } = setup("x", onSubmit);
    key(textarea, { key: "Enter", ctrlKey: true });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("enter continues bullet list", () => {
    const { textarea, value } = setup("- a");
    select(textarea, 3);
    key(textarea, { key: "Enter" });
    expect(value()).toBe("- a\n- ");
    expect(textarea.selectionStart).toBe(6);
  });

  it("enter continues numbered list", () => {
    const { textarea, value } = setup("1. a");
    select(textarea, 4);
    key(textarea, { key: "Enter" });
    expect(value()).toBe("1. a\n2. ");
  });

  it("enter continues persian numbered list", () => {
    const { textarea, value } = setup("۱. الف");
    select(textarea, textarea.value.length);
    key(textarea, { key: "Enter" });
    expect(value()).toBe("۱. الف\n۲. ");
  });

  it("enter renumbers following items", () => {
    const { textarea, value } = setup("1. a\n2. b");
    select(textarea, 4);
    key(textarea, { key: "Enter" });
    expect(value()).toBe("1. a\n2. \n3. b");
  });

  it("enter in middle of item splits it", () => {
    const { textarea, value } = setup("- abcd");
    select(textarea, 4);
    key(textarea, { key: "Enter" });
    expect(value()).toBe("- ab\n- cd");
    expect(textarea.selectionStart).toBe(7);
  });

  it("enter renumbering skips nested items and stops at list end", () => {
    const { textarea, value } = setup("1. a\n2. b\n   - x\n3. c\n\n1. other");
    select(textarea, 4);
    key(textarea, { key: "Enter" });
    expect(value()).toBe("1. a\n2. \n3. b\n   - x\n4. c\n\n1. other");
  });

  it("enter continues quote", () => {
    const { textarea, value } = setup("> a");
    select(textarea, 3);
    key(textarea, { key: "Enter" });
    expect(value()).toBe("> a\n> ");
  });

  it("enter on empty item ends list", () => {
    const { textarea, value } = setup("- a\n- ");
    select(textarea, 6);
    key(textarea, { key: "Enter" });
    expect(value()).toBe("- a\n");
  });

  it("enter on empty nested item outdents", () => {
    const { textarea, value } = setup("- a\n  - ");
    select(textarea, 8);
    key(textarea, { key: "Enter" });
    expect(value()).toBe("- a\n- ");
  });

  it("enter outside list is not intercepted", () => {
    const { textarea } = setup("plain");
    select(textarea, 5);
    const notPrevented = fireEvent.keyDown(textarea, { key: "Enter" });
    expect(notPrevented).toBe(true);
  });

  it("shift+enter is not intercepted in list", () => {
    const { textarea } = setup("- a");
    select(textarea, 3);
    expect(fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true })).toBe(true);
  });

  it("enter with cursor before marker is not intercepted", () => {
    const { textarea } = setup("- a");
    select(textarea, 0);
    expect(fireEvent.keyDown(textarea, { key: "Enter" })).toBe(true);
  });

  it("tab indents and shift+tab outdents list item", () => {
    const { textarea, value } = setup("- a");
    select(textarea, 3);
    key(textarea, { key: "Tab" });
    expect(value()).toBe("  - a");
    expect(textarea.selectionStart).toBe(5);
    key(textarea, { key: "Tab", shiftKey: true });
    expect(value()).toBe("- a");
    expect(textarea.selectionStart).toBe(3);
  });

  it("tab outside list keeps default focus behaviour", () => {
    const { textarea } = setup("plain");
    select(textarea, 2);
    expect(fireEvent.keyDown(textarea, { key: "Tab" })).toBe(true);
  });

  it("does not intercept keys while composing", () => {
    const { textarea, value } = setup("- a");
    select(textarea, 3);
    fireEvent.keyDown(textarea, { key: "Enter", isComposing: true });
    expect(value()).toBe("- a");
  });
});
