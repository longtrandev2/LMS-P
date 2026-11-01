export function FieldError({ text }: { text: string }) {
  return <p className="text-xs text-destructive">{text}</p>;
}
