import { useEffect, useMemo, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { cpp } from "@codemirror/lang-cpp";
import { java } from "@codemirror/lang-java";
import { python } from "@codemirror/lang-python";
import { cn } from "@/lib/utils";

type EditorLanguage = "python" | "c" | "cpp" | "java" | "text";

function languageExtension(language: EditorLanguage) {
  if (language === "python") return [python()];
  if (language === "java") return [java()];
  if (language === "c" || language === "cpp") return [cpp()];
  return [];
}

/** Theo dõi class `dark` trên <html> để đổi theme editor theo app. */
function useDarkMode() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  useEffect(() => {
    const observer = new MutationObserver(() => setDark(document.documentElement.classList.contains("dark")));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return dark;
}

/** Editor code dùng chung (CodeMirror 6, đóng gói cùng bundle — chạy offline). */
export function CodeEditor({ value, onChange, language, readOnly = false, minHeight = "16rem", maxHeight, className, ariaLabel }: {
  value: string; onChange?: (value: string) => void; language: EditorLanguage; readOnly?: boolean;
  minHeight?: string; maxHeight?: string; className?: string; ariaLabel?: string;
}) {
  const dark = useDarkMode();
  const extensions = useMemo(() => languageExtension(language), [language]);
  return <div className={cn("overflow-hidden rounded-lg border bg-card text-sm", className)} aria-label={ariaLabel}>
    <CodeMirror value={value} onChange={onChange} extensions={extensions} editable={!readOnly} readOnly={readOnly}
      theme={dark ? "dark" : "light"} minHeight={minHeight} maxHeight={maxHeight}
      basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLine: !readOnly, autocompletion: false, tabSize: 4 }} />
  </div>;
}
