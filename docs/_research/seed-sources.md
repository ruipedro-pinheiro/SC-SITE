# SEED — Curated SC source list (from Pedro, 2026-04-07)

This is the **canonical seed list** of Star Citizen tools, sites, and APIs that Pedro himself uses or knows about. Treat it as the AUTHORITATIVE STARTING POINT for the data sources research — not a list to validate, but a list to **deeply document, then multi-hop from** to find what each one references that we don't yet know about.

Pedro's note: this came from his own knowledge as an active SC player. If a source isn't on this list, either Pedro doesn't know it OR it's not worth knowing — the agent's job is to figure out which by following references from the listed sources.

---

## 🛠️ 1. Économie, Métiers & Crafting (la méta actuelle)

- **SCMDB** (Mission Database) — https://scmdb.net
  - Indispensable depuis l'alpha 4.7 et l'arrivée du Crafting. Base de données ultime pour trouver sur quelles missions farmer les "Blueprints" (plans de fabrication), où trouver les composants de craft.
  - **NEW & CURRENT** — was not in the old project's source list.

- **UEX Corp** — https://uexcorp.space
  - Le simulateur de marché. Planificateur de routes commerciales d'une profondeur inouïe avec suivi de l'économie dynamique. Has the public API the old project used.

- **SC Trade Tools** — https://sc-trade.tools
  - L'alternative classique à UEX pour trouver rapidement les meilleures routes de commerce, le meilleur acheteur pour des marchandises spécifiques, et les meilleurs spots de minage.

- **Regolith** — https://regolith.rocks/
  - Le meilleur outil absolu pour le **Minage**. Composition exacte de chaque lune, raffinerie optimale, bonus de rendement.

- **Hauler** — https://hauler.thespacecoder.space/
  - Compagnon de route dédié aux transporteurs spatiaux et à la gestion du fret.

## 🔍 2. Bases de Données, Équipements & Vaisseaux

- **Cornerstone Universal Item Finder** — https://finder.cstone.space
  - Le "Google" des objets Star Citizen. Indique exactement sur quelle planète/station acheter/louer le moindre composant, arme FPS, armure, vaisseau.
  - **Pedro has scrapes already**: `~/sc-data/cstone_all.json` (4.5 MB), `~/sc-data/cstone_shops.json`, `~/sc-data/all_shop_paths.json`, `~/sc-data/mining_heads_cstone.json`.

- **Erkul DPS Calculator** — https://www.erkul.games
  - Configurateur de vaisseaux de référence. Calcule DPS, consommation électrique, temps de recharge des boucliers en fonction des composants équipés virtuellement.
  - **Pedro has scrapes already**: `~/sc-data/erkul_all.json` (20 MB).

- **SPViewer** (SC Ships Performances Viewer) — https://www.spviewer.eu/
  - Pour pilotes pointilleux. Décortique modèle de vol, aérodynamisme, profil de signature radar, accélération précise de chaque vaisseau.
  - **Note**: the old project marked this as "stale", but Pedro just listed it as good for flight model details. Re-evaluate freshness.

## 🗺️ 3. Cartographie & Navigation Tactique

- **VerseGuide** — https://verseguide.com
  - GPS interactif communautaire 3D. Idéal pour trouver avant-postes cachés, grottes, "Jumptown" via triangulation de repères planétaires.

- **SnarePlan** — https://snareplan.dolus.eu/
  - Outil de niche pour la piraterie / anti-piraterie : calcule les points de croisement quantique pour poser des pièges (Quantum Snaring) sur les grandes routes.

- **ARK Starmap** (officiel CIG) — https://robertsspaceindustries.com/starmap
  - Carte stellaire officielle de tous les systèmes de l'univers SC.

## 💰 4. Gestion de Flotte & Achats (méta-game des "Pledges")

- **CCU Game** — https://ccugame.app
  - Calcule la chaîne d'achats Cross-Chassis Upgrade la moins chère pour obtenir un vaisseau cible avec de l'argent réel en profitant des promos. **Probablement hors scope du site** — c'est de la méta-pledge, pas de la donnée in-game.

- **Hangar Link** — https://hangar.link
  - Visualiser, gérer, partager sa flotte publiquement sous forme de liste.

- **FleetYards** — https://fleetyards.net
  - Grosse base de données vaisseaux + gestion de flotte.

- **Starship42** — https://www.starship42.com
  - **⚠️ INSPIRATION CLEF POUR LE MOCKUP** : générateur 3D pour poser tous les vaisseaux côte à côte à l'échelle (FleetView). C'est exactement le vibe "unique three.js" que Pedro veut.

## 📚 5. Savoir, Wiki & Lore (l'encyclopédie)

- **Star Citizen Tools** — https://starcitizen.tools
  - Le wiki de référence en anglais.

- **Wiki SC Francophone** — https://wikistarcitizen.fr
  - **NEW** — Pedro est francophone, source francophone à intégrer pour les fallbacks de lore.

- **Citizen History** — https://citizen-history.com
  - Frise chronologique ultime du lore.

- **Galactapedia** (officiel CIG) — https://robertsspaceindustries.com/galactapedia

- **The People's Radio** — https://thepeoplesradio.space/
  - Webradio fan, diffuse musique et pubs "in-lore". **Easter egg potentiel** : ambient audio sur le site pendant qu'on browse.

## 🏛️ 6. Plateformes Officielles CIG

- **Site & Store** — https://robertsspaceindustries.com/

- **Issue Council** — https://issue-council.robertsspaceindustries.com/
  - Pour reporter les bugs. Obligatoire pour testeurs. Hors scope du site mais à savoir.

- **RSI Telemetry** — https://robertsspaceindustries.com/telemetry
  - Comparer ses performances PC (FPS) avec la communauté. Hors scope.

- **DevTracker RSI** — https://robertsspaceindustries.com/community/devtracker
  - Traquer les réponses officielles des devs sur le forum. **Pourrait être intéressant** pour un fil "What's new in SC" sur le site.

## 🖥️ 7. Logiciels Hub Communautaires

- **SC-Toolbox** — https://github.com/ScPlaceholder/SC-Toolbox
  - **⚠️ RÉFÉRENCE D'ARCHITECTURE** : application/launcher communautaire qui intègre déjà craft + mission DB + UEX + simulateur cargo. Étudier comment ils ont structuré l'intégration multi-sources avant d'implémenter notre propre couche.

---

## What the data-sources agent must do with this seed

1. **For each entry above**, produce a deep section in `SOURCES.md`:
   - Verify the URL works (WebFetch)
   - Document auth requirements, public/private API, rate limits, ToS
   - Document the EXACT data fields exposed (entities + field lists, not vague categories)
   - Note freshness (when was the site last updated, when was the data last refreshed)
   - Note reliability (Cloudflare blocks, downtimes if known)
   - Note license/legal status of using their data

2. **Multi-hop from each source**: each site references other tools, APIs, partners, GitHub repos, Discord servers, etc. Follow those links and document them too. Add them to the catalog. The seed list is the starting point; the final catalog should be ≥ the seed.

3. **Cross-reference with what Pedro already has on disk**: `~/sc-data/cstone_*.json` ↔ Cornerstone, `~/sc-data/erkul_all.json` ↔ Erkul, `~/sc-data/uex_*.json` ↔ UEX, `~/sc-data/wiki_*.json` ↔ SC Wiki API, etc. Document which on-disk file came from which live source so we know what's reusable.

4. **Categorize by sc-site relevance**: tools that feed into our DB (data sources), tools that are inspiration for our UX (Starship42), tools that are out-of-scope (CCU Game), tools that are easter eggs (People's Radio).

---

# SEED v2 — Extraction techniques + emphasis (Pedro, 2026-04-07, second message)

This second update is **how-to-extract**, not just what-exists. It also names the foundational source (`github.com/sc-data`) and the value-add example that defines the site's differentiator.

## 🗄️ Sources de données brutes (datamining)

- **`github.com/sc-data`** — **THE GRAAL**. GitHub org containing JSON files extracted from `.p4k` at every game patch (vehicles, components, items). The cleanest, most automated import path. **Use this as the foundation for ships/items/components**, and use UEX/SC Wiki/erkul/etc. as enrichment layers. The agent should clone/fetch from this org and document EVERY repo inside, EVERY JSON file shape, the update cadence (per patch), and the file format conventions.
  - Action item: list all repos under github.com/sc-data, map each to entity types, document JSON shapes.

- **Star Citizen Data Mining Discord** — central community of people decoding `Data.p4k`. Not directly fetchable as data, but a reference of WHO's actively maintaining the extraction tools. Mention in SOURCES.md as "where the techniques come from".

- **P-Link / starcitizen-api.com** — third-party API that normalizes RSI data (Orgs, Members, Comm-links). Often paid/limited. Document price/limits.

## 🛠️ Sites méta — quoi extraire de chacun

For each site below, the agent must document **(a) what data to extract** and **(b) the extraction technique** (public API / partner JSON / F12 sniff / scraping with Playwright):

- **Erkul** (https://www.erkul.games/)
  - Data to extract: **Loadouts** + composant prices.
  - Extraction technique: **Erkul has an internal API** visible in the F12 Network tab (XHR). Find the JSON URL it loads at startup.

- **CStone Item Finder** (https://finder.cstone.space/)
  - Data to extract: **Localisation précise** of every item (Inventory/Shop). Their Shops/Inventories DB is "extrêmement propre".
  - Extraction technique: TBD by agent — F12 sniff first, scraping if needed.

- **UEX Corp** (https://uexcorp.space/)
  - Data to extract: prix dynamiques des commodités, terminaux, capacités de stockage.
  - Extraction technique: **They offer JSON/CSV exports for partners**. Investigate the partner program. Otherwise the public API (already known from old project).

- **SCMDB** (https://scmdb.net/)
  - Data to extract: arbres de missions, pré-requis de réputation, **loot tables** (very hard to find elsewhere).
  - Extraction technique: TBD.

- **SPViewer** (https://www.spviewer.eu/)
  - Data to extract: courbes de poussée, aérodynamisme, signatures IR/EM.
  - Extraction technique: TBD — likely F12 sniff.

## 🗺️ Géographie / environnement

- **VerseGuide** (https://verseguide.com/) — coordonnées (OM, POI, épaves).
- **Regolith** (https://regolith.rocks/) — probabilités d'apparition des minerais (Quantanium, etc.) par zone.
- **SnarePlan** (https://snareplan.dolus.eu/) — modélisation des routes Quantum (utile pour calculer temps de trajet dans la DB).

## 📈 How to "Gather" data properly — Pedro's recommended stack

**A. Web scraping (Python / Node.js)**
- Libs: BeautifulSoup, Playwright
- Targets: Comm-links sur le site officiel, Spectrum
- ⚠️ RSI n'aime pas le scraping intensif → mettre des **rate limits** explicites (delays entre requêtes).

**B. Parsing de fichiers du jeu** — *the most pro method*
- Tools: **StarXml**, **P4K-Explorer**
- Workflow:
  1. Extract `Data.p4k` from the game install
  2. Convert binary files (`.xml`, `.dcb`) to JSON
  3. Inject JSON into the DB
- This is what `github.com/sc-data` does for us automatically per patch — so we don't need to do it ourselves UNLESS we want data sc-data doesn't expose.

**C. F12 Network analysis** — *the smart shortcut*
- Many sites (Erkul, UEX, CStone) load big `.json` files at startup that contain their entire DB.
- Open browser DevTools → Network tab → filter XHR → reload site
- You'll see URLs to `vessels.json`, `items.json`, etc. **That's the direct URL to their backing data**.
- The agent must do this for each site that doesn't have a documented public API — Pedro is on the Pi without a browser, but the agent can use Playwright headless OR `curl` with the right headers to find the JSON URLs.

## 🔀 Cross-source query — THE differentiator of sc-site

The value-add of the site is **answering questions that span multiple sources**, which no individual site can handle. Pedro's example:

> *"Quel est le vaisseau ayant le plus gros réservoir Quantum (data: SPViewer) qui peut aussi transporter un STV (data: FleetYards) et qui est achetable à Orison (data: CStone) ?"*

This is the design north star for both ingestion and UX:
- **Ingestion**: must converge data from ≥3 sources into one unified `Vehicle` row queryable in SQL.
- **UX (mockup-designer)**: must support composable filters across these dimensions (quantum tank size + cargo capability + buyable location). A "saved query" / "share link" concept is implied.
- **Schema**: must NOT silo the data per source. Aggregated entities only.

This is **more important than the visual differentiator**. The 3D mockup is the wow factor; the cross-source query is the reason people stay.

## Sites complémentaires Pedro mentioned in v2

- **Galactapedia** (API RSI officielle pour le lore)
- **Issue Council** — pour lier les bugs connus à des items spécifiques dans la DB (interesting feature: "this ship has 3 known critical bugs")
- **Star Citizen Tools** (https://starcitizen.tools/) — wiki — descriptions textuelles + historiques de patches

