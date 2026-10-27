import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { OutputConflict } from "./use-solution-runs";

const clip = (text: string) => text.length > 400 ? `${text.slice(0, 400)}…` : text;

/** Hỏi trước khi ghi đè output mong đợi khác với output của lời giải. */
export function OutputConflictDialog({ conflicts, onOverwrite, onKeep }: {
  conflicts: OutputConflict[]; onOverwrite: (keys: string[]) => void; onKeep: () => void;
}) {
  return <AlertDialog open onOpenChange={(open) => !open && onKeep()}>
    <AlertDialogContent className="max-h-[88dvh] overflow-y-auto sm:max-w-2xl">
      <AlertDialogHeader>
        <AlertDialogTitle>{conflicts.length} test có output khác lời giải</AlertDialogTitle>
        <AlertDialogDescription>Các test dưới đây đã có output mong đợi nhưng lời giải in ra kết quả khác. Ghi đè bằng output của lời giải?</AlertDialogDescription>
      </AlertDialogHeader>
      <ul className="divide-y">
        {conflicts.map((conflict) => <li key={conflict.key} className="space-y-1.5 py-3 first:pt-0">
          <p className="text-xs font-semibold">Test #{conflict.index + 1}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {[["Đang lưu", conflict.expected], ["Lời giải in ra", conflict.output]].map(([label, text]) => <div key={label} className="min-w-0">
              <p className="mb-1 text-[11px] text-muted-foreground">{label}</p>
              <pre className="max-h-32 overflow-auto rounded-md bg-secondary px-3 py-2 font-mono text-xs whitespace-pre-wrap break-all">{clip(text) || "(rỗng)"}</pre>
            </div>)}
          </div>
        </li>)}
      </ul>
      <AlertDialogFooter>
        <AlertDialogCancel onClick={onKeep}>Giữ nguyên</AlertDialogCancel>
        <AlertDialogAction onClick={() => onOverwrite(conflicts.map((c) => c.key))}>Ghi đè {conflicts.length} test</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
