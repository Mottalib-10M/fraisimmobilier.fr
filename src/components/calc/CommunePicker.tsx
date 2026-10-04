/**
 * Choix de la commune en deux sélecteurs natifs (département puis commune), RECETTE §17.1.
 * La liste du département par défaut arrive du build (premier rendu identique au HTML servi) ;
 * les autres départements se chargent à la demande, depuis le site lui-même.
 */
import { useEffect, useState } from 'react';
import SelectField from '../ui/SelectField';
import { DEP_CODES, depName, loadDep, principale, toCommune, type Commune, type CommuneRow } from '../../lib/communes';

interface Props { id: string; lang: 'fr' | 'en'; dep: string; code: string; initialRows: CommuneRow[]; initialDep: string; onChange: (c: Commune) => void}

export default function CommunePicker({ id, lang, dep, code, initialRows, initialDep, onChange }: Props) {
  const fr = lang === 'fr';
  const [rows, setRows] = useState<CommuneRow[]>(initialRows);
  const [rowsDep, setRowsDep] = useState(initialDep);
  useEffect(() => {
    if (dep === rowsDep) return;
    let alive = true;
    loadDep(dep).then((r) => { if (!alive || !r.length) return; setRows(r); setRowsDep(dep); if (!r.some((x) => x[0] === code)) onChange(toCommune(r.find((x) => x[0] === principale(dep)) ?? r[0], dep)); });
    return () => { alive = false; };
  }, [dep]);
  const pickDep = (d: string) => { loadDep(d).then((r) => { if (!r.length) return; setRows(r); setRowsDep(d); const big = r.find((x) => x[0] === principale(d)) ?? r[0]; onChange(toCommune(big, d)); }); };
  const pickCode = (c: string) => { const r = rows.find((x) => x[0] === c); if (r) onChange(toCommune(r, rowsDep)); };
  const value = rows.some((x) => x[0] === code) ? code : rows[0]?.[0] ?? '';
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <SelectField id={`${id}-dep`} label={fr ? 'Département' : 'Département'} value={rowsDep} onChange={pickDep} options={DEP_CODES.map((d) => ({ value: d, label: `${d} · ${depName(d, lang)}` }))} />
      <SelectField id={`${id}-com`} label={fr ? 'Commune' : 'Municipality'} value={value} onChange={pickCode} options={rows.map((r) => ({ value: r[0], label: r[1] }))} />
    </div>
  );
}
