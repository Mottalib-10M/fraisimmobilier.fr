#!/usr/bin/env python3
"""Jeu de données communal du site (RECETTE §4 : script rejouable, jamais de collecte au runtime).

Trois sources officielles, téléchargées dans scripts/data-src/ si elles n'y sont pas :
  1. Zonage A/B/C en vigueur depuis le 26 juin 2026 — ministère chargé du logement (data.gouv.fr,
     « Liste des communes selon le zonage ABC »). Sert au PTZ et à la taxe sur les plus-values.
  2. Taux de taxe foncière sur les propriétés bâties et de TEOM votés pour 2025, par commune —
     DGFiP, jeu « Fiscalité locale des particuliers » (data.economie.gouv.fr), exercice 2025, le
     dernier publié au 4 octobre 2026 (les taux 2026 paraîtront avec le REI 2026).
  3. Taux de taxe d'aménagement votés (part communale sans secteur, parts départementale et
     régionale) — DGFiP, « Taxe d'aménagement - Éléments de taxation votés par les collectivités à
     partir de 2022 » (data.economie.gouv.fr). On retient, pour chaque collectivité, la dernière
     délibération définitive entrée en vigueur au plus tard le 1er janvier 2026.

Sorties :
  src/data/communes/<dép>.json [code INSEE, nom, zone (0 Abis · 1 A · 2 B1 · 3 B2 · 4 C), taux TFPB global, taux TEOM, taux TA communal]
                               (null quand la collectivité n'a rien voté ou que la donnée manque)
  src/data/ta-departements.json {"dep": {"taux": 2.5, "effet": "2022-01-01"}, ..., "_region_idf": 1.0}
  src/data/communes-stats.json  comptes par zone et par département, grandes villes (pages, au build)

    python3 scripts/build-communes.py
"""
import csv, json, os, sys, urllib.request
from collections import Counter, defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'data-src')
OUT = os.path.join(HERE, '..', 'src', 'data')
URLS = {
    'zonage-abc-2026-06-26.csv': 'https://static.data.gouv.fr/resources/liste-des-communes-selon-le-zonage-abc/20260703-091314/liste-ensemble-des-communes-zonage-abc-en-vigueur-26-juin-2026.csv',
    'fiscalite-locale-2025.csv': 'https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/fiscalite-locale-des-particuliers/exports/csv?where=exercice%3D%222025%22&select=insee_com,libcom,dep,libdep,mpoid,e12vote,e22,e32vote,e52,e52a,e52tasa,e52ggemapi,taux_global_tfb,taux_plein_teom,q03&delimiter=%3B',
    'ta-communes.csv': 'https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/delta_deliberation_tam_17_01_23/exports/csv?where=zone_application%3D%22Communale%22%20and%20section%20is%20null&select=departement,commune,libelle_commune,date_effet,date_fin,def_prov,taux,locaux_habitation,abris_de_jardin,locaux_finances_a_l_aide_du_pret_ne_portant_pas_interet&delimiter=%3B',
    'ta-departements.csv': 'https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/delta_deliberation_tam_17_01_23/exports/csv?where=zone_application%21%3D%22Communale%22&delimiter=%3B',
}
DATE_TA = '2026-01-01'
ZONES = {'Abis': 0, 'A': 1, 'B1': 2, 'B2': 3, 'C': 4}


def fetch(name):
    p = os.path.join(SRC, name)
    if not os.path.exists(p):
        os.makedirs(SRC, exist_ok=True)
        print('téléchargement', name)
        urllib.request.urlretrieve(URLS[name], p)
    return p


def rows(name):
    with open(fetch(name), encoding='utf-8-sig', newline='') as f:
        return list(csv.DictReader(f, delimiter=';'))


def fnum(s):
    s = (s or '').strip()
    return round(float(s), 2) if s else None


def dep_code(d):
    d = d.strip()
    return d.zfill(2) if d.isdigit() and len(d) < 3 else d


# 1. zonage : la liste de référence des communes (nom officiel, accents compris)
zon = rows('zonage-abc-2026-06-26.csv')
zcol = [c for c in zon[0].keys() if c.startswith('Zonage')][0]
communes = {}
for r in zon:
    z = r[zcol].strip()
    if z not in ZONES:
        sys.exit(f'zone inconnue {z!r} pour {r["CODGEO"]}')
    communes[r['CODGEO']] = {'nom': r['LIBGEO'].strip(), 'dep': r['DEP'].strip(), 'zone': ZONES[z]}

# 2. taux de taxe foncière et de TEOM 2025
fis = {r['insee_com']: r for r in rows('fiscalite-locale-2025.csv')}
manq_tf = 0
for code, c in communes.items():
    f = fis.get(code)
    c['tfb'] = fnum(f['taux_global_tfb']) if f else None
    c['teom'] = fnum(f['taux_plein_teom']) if f else None
    c['pop'] = int(float(f['mpoid'])) if f and f['mpoid'] else 0
    if c['tfb'] is None:
        manq_tf += 1

# 3. taxe d'aménagement : dernière délibération en vigueur au 1er janvier 2026
ta = defaultdict(list)
for r in rows('ta-communes.csv'):
    if r['def_prov'] != 'DEFINITIF' or r['date_effet'][:10] > DATE_TA:
        continue
    if r['date_fin'] and r['date_fin'][:10] < DATE_TA:
        continue
    # Paris délibère comme « Ville de Paris », sans numéro de commune : code INSEE 75056.
    code = '75056' if not r['commune'].strip() and dep_code(r['departement']) == '75' else dep_code(r['departement']) + r['commune'].strip().zfill(3)
    ta[code].append((r['date_effet'][:10], fnum(r['taux'])))
for code, c in communes.items():
    v = sorted(ta.get(code, []))
    c['ta'] = v[-1][1] if v else None

tadep, region = {}, None
for r in rows('ta-departements.csv'):
    if r['def_prov'] != 'DEFINITIF' or r['date_effet'][:10] > DATE_TA:
        continue
    d = dep_code(r['departement'])
    if r['zone_application'] == 'Régionale':
        region = fnum(r['taux'])
        continue
    if d not in tadep or r['date_effet'][:10] >= tadep[d]['effet']:
        tadep[d] = {'taux': fnum(r['taux']), 'effet': r['date_effet'][:10]}
tadep = dict(sorted(tadep.items()))
tadep['_region_idf'] = region

# sorties
# Un fichier par département, chargé à la demande par le navigateur (quelques kilo-octets chacun) ;
# communes triées par nom, comme dans un sélecteur.
pdir = os.path.join(OUT, 'communes')
os.makedirs(pdir, exist_ok=True)
for f in os.listdir(pdir):
    os.remove(os.path.join(pdir, f))
bydep = defaultdict(list)
for k, c in communes.items():
    bydep[c['dep']].append([k, c['nom'], c['zone'], c['tfb'], c['teom'], c['ta']])
for d, lst in bydep.items():
    lst.sort(key=lambda x: (x[1].lower(), x[0]))
    with open(os.path.join(pdir, f'{d}.json'), 'w', encoding='utf-8') as f:
        json.dump(lst, f, ensure_ascii=False, separators=(',', ':'))
with open(os.path.join(OUT, 'ta-departements.json'), 'w', encoding='utf-8') as f:
    json.dump(tadep, f, ensure_ascii=False, indent=1)

# Commune la plus peuplée de chaque département : valeur par défaut quand on change de département.
principale = {}
for k, c in communes.items():
    if c['dep'] not in principale or c['pop'] > communes[principale[c['dep']]]['pop']:
        principale[c['dep']] = k
with open(os.path.join(OUT, 'communes-principales.json'), 'w', encoding='utf-8') as f:
    json.dump(dict(sorted(principale.items())), f, ensure_ascii=False, separators=(',', ':'))

parzone = Counter(c['zone'] for c in communes.values())
pardep = defaultdict(lambda: [0, 0, 0, 0, 0])
for c in communes.values():
    pardep[c['dep']][c['zone']] += 1
villes = sorted((c for c in communes.values() if c['tfb'] is not None), key=lambda c: -c['pop'])[:40]
code_of = {id(c): k for k, c in communes.items()}
stats = {
    'zonage_date': '2026-06-26', 'fiscalite_exercice': 2025, 'ta_date': DATE_TA,
    'communes': len(communes), 'par_zone': [parzone[i] for i in range(5)],
    'par_departement': dict(sorted(pardep.items())),
    'sans_taux_tf': manq_tf, 'avec_taux_ta': sum(1 for c in communes.values() if c['ta'] is not None),
    'villes': [{'code': code_of[id(c)], 'nom': c['nom'], 'dep': c['dep'], 'zone': c['zone'], 'tfb': c['tfb'], 'teom': c['teom'], 'ta': c['ta'], 'pop': c['pop']} for c in villes],
}
with open(os.path.join(OUT, 'communes-stats.json'), 'w', encoding='utf-8') as f:
    json.dump(stats, f, ensure_ascii=False, indent=1)
print(f"{len(communes)} communes · par zone {stats['par_zone']} · sans taux TF {manq_tf} · taux TA communal {stats['avec_taux_ta']} · {len(tadep) - 1} départements TA, région IDF {region}")
