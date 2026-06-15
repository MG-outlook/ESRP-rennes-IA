"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Unwraps a response that the model wrapped entirely in a fenced code block.
 *
 * Asked to "répondre en Markdown", models frequently return their whole answer
 * inside ```` ```markdown … ``` ````. react-markdown then renders it as a code
 * block — monospace, with the raw `##` and `**` showing — instead of formatted
 * prose. We strip a leading fence (```` ``` ````/```` ```markdown ````/```` ```md ````)
 * and its trailing counterpart. Written to also work mid-stream, when only the
 * opening fence has arrived yet. Safe here because AI outputs are always prose,
 * never genuine code snippets.
 */
function stripWrappingFence(md: string): string {
  let s = md.trim();
  const open = s.match(/^```[ \t]*([a-zA-Z]*)[ \t]*\r?\n/);
  if (!open) return md;
  const lang = open[1].toLowerCase();
  if (lang !== "" && lang !== "markdown" && lang !== "md" && lang !== "text") {
    return md; // a real code block (js, python…) — leave it alone
  }
  s = s.slice(open[0].length);
  // Drop the closing fence when it sits at the very end (absent while streaming).
  s = s.replace(/\r?\n?[ \t]*```[ \t]*$/, "");
  return s;
}

/** Normalises unicode bullets (–, —, •, ·) at line start to Markdown "- ". */
function normalizeBullets(md: string): string {
  return md.replace(/^[ \t]*[–—•·][ \t]+/gm, "- ");
}

/**
 * Strips prose fences embedded inside the content (e.g. ```notes … ```).
 * The outer wrapper is already removed by stripWrappingFence; this handles
 * secondary fences the model sometimes adds around trailing sections like
 * "Notes" or unlabelled separators. Real code fences (```js, ```python…)
 * are left intact.
 */
function stripEmbeddedProseFences(md: string): string {
  const PROSE = new Set(["", "markdown", "md", "text", "notes", "note"]);
  return md.replace(
    /^[ \t]*```[ \t]*([a-zA-Z]*)[ \t]*\r?\n([\s\S]*?)^[ \t]*```[ \t]*\r?$/gm,
    (_m, lang: string, inner: string) =>
      PROSE.has(lang.toLowerCase()) ? inner.trimEnd() : _m
  );
}

/**
 * Promotes inline "section titles" to real headings.
 *
 * Models routinely write a section header as bold text at the start of a
 * paragraph, glued to the body: `**Situation sociale** Un dossier...`. That
 * renders as bold text inline with the paragraph, with no separation. We detect
 * a paragraph that BEGINS with **bold** followed by more text on the same line
 * and promote the bold run to its own heading, so titles sit detached from the
 * body — consistently across every AI output.
 */
function normalizeHeadings(md: string): string {
  return md.replace(
    /^[ \t]*\*\*(.+?)\*\*[ \t]*:?[ \t]+(?=\S)/gm,
    (_m, title: string) => `#### ${title.trim()}\n\n`
  );
}

/**
 * Renders AI output as properly formatted markdown (headings, lists, bold,
 * tables, rules…) with the workshop's typographic style. Used everywhere an
 * LLM response is displayed so participants read clean prose, not raw `###`
 * and `**` markup.
 */
export default function Markdown({ content }: { content: string }) {
  const normalized = normalizeHeadings(
    normalizeBullets(
      stripEmbeddedProseFences(stripWrappingFence(content))
    )
  );
  return (
    <div className="text-black leading-relaxed space-y-3">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold text-black mt-4 mb-2">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-bold text-black mt-4 mb-2">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-bold text-[#2D5A3D] mt-4 mb-1">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-base font-bold text-[#2D5A3D] mt-3 mb-1">{children}</h4>
          ),
          p: ({ children }) => <p className="text-black">{children}</p>,
          strong: ({ children }) => (
            <strong className="font-bold text-black">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          ul: ({ children }) => (
            <ul className="list-disc pl-6 space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-6 space-y-1">{children}</ol>
          ),
          li: ({ children }) => <li className="text-black">{children}</li>,
          hr: () => <hr className="border-t-2 border-[#E0E0E0] my-4" />,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-[#2D5A3D] pl-4 italic text-[#4A4A4A]">
              {children}
            </blockquote>
          ),
          code: ({ children }) => (
            <code className="px-1 bg-[#EDEDED] text-[#2D5A3D] text-[0.95em] rounded">
              {children}
            </code>
          ),
          table: ({ children }) => (
            <table className="w-full border-collapse border-2 border-black my-3">
              {children}
            </table>
          ),
          th: ({ children }) => (
            <th className="border border-black px-3 py-1 bg-[#F5F5F5] text-left font-bold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-black px-3 py-1">{children}</td>
          ),
        }}
      >
        {normalized}
      </ReactMarkdown>
    </div>
  );
}
