export function PageSpinner() {
  return (
    <div className="grid min-h-[60dvh] place-items-center" role="status" aria-label="Načítavam">
      <span className="h-10 w-10 animate-spin rounded-full border-[3px] border-primary/25 border-t-primary" />
    </div>
  );
}
