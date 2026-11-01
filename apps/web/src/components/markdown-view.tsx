import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

const components: Components = {
  h1: ({ children }) => <h3 className="mt-5 mb-2 font-heading text-lg font-semibold first:mt-0">{children}</h3>,
  h2: ({ children }) => <h4 className="mt-5 mb-2 font-heading text-base font-semibold first:mt-0">{children}</h4>,
  h3: ({ children }) => <h5 className="mt-4 mb-1.5 text-sm font-semibold first:mt-0">{children}</h5>,
  p: ({ children }) => <p className="my-2 leading-7 first:mt-0 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-6">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-6">{children}</ol>,
  a: ({ children, href }) => <a href={href} target="_blank" rel="noreferrer noopener" className="text-primary underline underline-offset-4">{children}</a>,
  blockquote: ({ children }) => <blockquote className="my-3 border-l-2 pl-4 text-muted-foreground">{children}</blockquote>,
  table: ({ children }) => <div className="my-3 overflow-x-auto"><table className="w-full border-collapse text-sm">{children}</table></div>,
  th: ({ children }) => <th className="border px-3 py-1.5 text-left font-semibold">{children}</th>,
  td: ({ children }) => <td className="border px-3 py-1.5">{children}</td>,
  pre: ({ children }) => <pre className="my-3 overflow-x-auto rounded-lg border bg-muted/60 p-3 font-mono text-xs leading-5 [&_code]:bg-transparent [&_code]:p-0">{children}</pre>,
  code: ({ children, className }) => <code className={cn("rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]", className)}>{children}</code>,
};

/** Hiển thị Markdown (GFM) an toàn: bỏ qua HTML thô — docs/assessment-spec.md §1.1. */
export function MarkdownView({ source, className }: { source: string | null | undefined; className?: string }) {
  if (!source?.trim()) return null;
  return <div className={cn("text-sm break-words", className)}>
    <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml components={components}>{source}</ReactMarkdown>
  </div>;
}
