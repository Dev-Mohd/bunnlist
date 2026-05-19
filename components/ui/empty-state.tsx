import Link from "next/link";

type EmptyStateProps = {
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
};

export function EmptyState({ title, description, actionHref, actionLabel }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-stone-300 bg-white px-6 py-12 text-center">
      <h2 className="text-xl font-bold text-stone-950">{title}</h2>
      {description ? <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-stone-600">{description}</p> : null}
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="mt-6 inline-flex h-11 items-center justify-center rounded-md bg-amber-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-700 focus:ring-offset-2"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
