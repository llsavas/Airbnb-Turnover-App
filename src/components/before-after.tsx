// "Antes" (photos of the report) and "Depois" (photos sent when resolving).
export function BeforeAfter({
  before,
  after,
  size = "h-20 w-20",
}: {
  before: string[];
  after: string[];
  size?: string;
}) {
  if (before.length === 0 && after.length === 0) return null;
  const strip = (label: string, urls: string[], tone: string) =>
    urls.length > 0 && (
      <div>
        <p className={`mb-1 text-[11px] font-semibold tracking-wide uppercase ${tone}`}>{label}</p>
        <div className="flex flex-wrap gap-2">
          {urls.map((url) => (
            <a key={url} href={url} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element -- signed private URL */}
              <img src={url} alt={label} className={`${size} rounded-lg object-cover ring-1 ring-slate-200`} />
            </a>
          ))}
        </div>
      </div>
    );
  return (
    <div className="flex flex-wrap gap-4">
      {strip("Antes", before, "text-red-700")}
      {strip("Depois", after, "text-emerald-700")}
    </div>
  );
}
