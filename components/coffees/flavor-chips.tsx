import { Badge } from "@/components/ui/badge";

export function FlavorChips({ notes, limit }: { notes: string[]; limit?: number }) {
  const visibleNotes = limit ? notes.slice(0, limit) : notes;

  if (!visibleNotes.length) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {visibleNotes.map((note) => (
        <Badge key={note} variant="soft">
          {note}
        </Badge>
      ))}
    </div>
  );
}
