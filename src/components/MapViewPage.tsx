"use client";
import { useMemo, useState } from "react";
import Link from "./ResultLink";
import RestoreResults from "./RestoreResults";
import { useCatalog } from "./CatalogProvider";
import { useSearch } from "./SearchProvider";
import { useNowTick } from "./OpenBadge";
import { filterCafes } from "@/lib/filter-cafes";
import { useLang } from "@/i18n/LangProvider";
import CafeThumb from "./CafeThumb";
import MapBlock from "./map/MapBlock";
import ExplorerControls from "./ExplorerControls";
export default function MapViewPage() {
  const cafes = useCatalog(); const { filters } = useSearch(); const { t, tr, lang } = useLang(); const now = useNowTick();
  const [selected, setSelected] = useState<string | null>(null);
  const results = useMemo(() => filterCafes(cafes, filters, new Date(now), lang), [cafes, filters, now, lang]);
  const active = results.some(c => c.slug === selected) ? selected : null;
  return <div className="mx-auto max-w-6xl px-4 py-10"><h1 className="text-3xl font-bold">{t("map.title")}</h1><p>{t("map.subtitle")}</p>
    <RestoreResults ready={now > 0} /><ExplorerControls count={results.length} map />
    <div className="map-results"><div className="map-list">{results.map(c => <article key={c.slug} className={active === c.slug ? "is-selected" : ""}>
      <button aria-pressed={active === c.slug} onClick={() => setSelected(c.slug)} className="map-select"><span className="relative h-20 w-24 shrink-0 overflow-hidden rounded-lg"><CafeThumb cafe={c} sizes="96px" /></span><span><strong>{tr(c.name)}</strong><span className="block text-sm">{tr(c.address)}</span></span></button>
      <Link href={`/cafes/${c.slug}`} className="inline-block underline px-3 py-2">{t("detail.viewCafe")}</Link>
    </article>)}</div><MapBlock cafes={results} selectedSlug={active} onSelect={setSelected} className="map-canvas" /></div>
    {!results.length && <p role="status">{t("cafes.emptyHint")}</p>}
    <p className="mt-3">{lang === "th" ? "เลือกร้านจากรายการเพื่อเน้นหมุดบนแผนที่" : "Select a cafe in the list to focus its pin"}</p>
  </div>;
}
