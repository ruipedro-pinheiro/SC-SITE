# SC Site Handoff For Codex Running Directly On The Pi

Ce handoff est pour un Codex qui doit travailler **directement sur le Raspberry Pi** dans `/home/pedro/sc-site`, et **pas** via le montage Fedora `/home/pedro/rpi/sc-site`.

## Règle de base

Travaille **sur le Pi** dans :

```bash
cd /home/pedro/sc-site
```

Ne travaille pas depuis Fedora sur `/home/pedro/rpi/sc-site` pour les commandes Bun/Next. Le montage FUSE/sshfs a déjà cassé la résolution des workspaces et des `node_modules`.

## Pourquoi il faut travailler sur le Pi

Le repo côté Fedora (`/home/pedro/rpi/sc-site`) est un montage du Pi. Ça a déjà provoqué :

- résolution de workspaces Bun foireuse
- symlinks `node_modules` cassés
- erreurs de résolution qui n’existent pas quand on exécute directement sur le Pi

Les `node_modules` ont déjà été réinstallés directement sur le Pi. Les anciens backups ont été sortis du repo et rangés ailleurs.

## Ce qui a déjà été corrigé

### 1. Contrat `buyAt` cassé

Le bug :

- `apps/api/src/lib/ship-mapper.ts` mettait `vehicle.urlStore` dans `ship.buyAt`
- ensuite la page detail faisait un lien `/shops?q=...` à partir de `buyAt`
- résultat : pour les ships sans shop ingame mais avec URL RSI, l’UI fabriquait un faux lien vers `/shops` à partir d’une URL externe

Ce qui a été fait :

- `buyAt` ne représente plus que le **shop ingame**
- nouveau champ `pledgeStoreUrl` pour l’URL RSI

Fichiers déjà modifiés :

- `apps/api/src/lib/ship-mapper.ts`
- `apps/web/lib/api.ts`
- `packages/ui/src/sc/types.ts`
- `packages/ui/src/sc/IdentityPanel.tsx`
- `apps/web/app/(catalog)/ships/[slug]/page.tsx`

### 2. Filtre `company` mort

Le bug :

- `apps/api/src/services/vehicles-service.ts` filtrait sur `manufacturers.name_code`
- dans la DB actuelle, `manufacturers.name_code` est `NULL` partout
- donc `company=ANVL` renvoyait 0 résultat alors qu’il y a bien des vaisseaux Anvil

Ce qui a été fait :

- ajout d’un resolver de code constructeur dans `apps/api/src/lib/manufacturer-code.ts`
- `mapVehicleToShip()` utilise désormais ce resolver
- `listVehicles()` accepte les codes dérivés, le slug, ou le nom constructeur
- `listManufacturers()` renvoie aussi un `nameCode` résolu au lieu de rester à `null`

Fichiers déjà modifiés :

- `apps/api/src/lib/manufacturer-code.ts`
- `apps/api/src/lib/ship-mapper.ts`
- `apps/api/src/services/vehicles-service.ts`

### 3. Pagination Starmap fausse sur le fallback System -> Star

Le bug :

- `apps/api/src/services/locations-service.ts` faisait bien le fallback `Stanton System` -> `Stanton`
- mais `total` restait calculé avec le `whereClause` d’origine
- résultat : page 1 affichait 5 résultats et `total=5` alors qu’il y a 119 enfants sous l’étoile

Ce qui a été fait :

- `effectiveWhereClause` suit la requête réellement utilisée
- `total` est recalculé sur la clause fallback quand le fallback s’active

Fichier déjà modifié :

- `apps/api/src/services/locations-service.ts`

### 4. Viewer 3D : mutation GLTF + fallback wireframe + double montage

Le problème initial :

- `apps/web/components/ShipViewer3D.tsx` mutait la scène renvoyée par `useGLTF`
- les matériaux du GLTF étaient écrasés par un matériau gris générique
- le fallback était un octaèdre wireframe
- la page ship montait deux viewers pour le même GLB : un en backdrop desktop, un autre dans la pile mobile, juste masqué en CSS

Ce qui a été fait :

- ajout de `apps/web/components/ship-viewer-3d-scene.ts`
- `normalizeShipScene(scene)` clone la scène, la recentre, la scale, et ne mute plus la scène cache
- le fallback wireframe a été supprimé
- la page detail a été refondue pour un **single hero media mount**
- le viewer garde le **vrai GLTF**, pas un mesh recoloré en gris

Fichiers déjà modifiés :

- `apps/web/components/ship-viewer-3d-scene.ts`
- `apps/web/components/ShipViewer3D.tsx`
- `apps/web/app/(catalog)/ships/[slug]/page.tsx`

## Tests déjà ajoutés

Les régressions ont été verrouillées avec ces tests :

- `apps/api/src/routes/vehicles.test.ts`
- `apps/api/src/routes/locations.test.ts`
- `apps/web/components/ship-viewer-3d-scene.test.ts`

## Résultat actuel des tests

Cette commande a été passée avec succès :

```bash
cd /home/pedro/sc-site
export PATH="$HOME/.bun/bin:$PATH"
NODE_ENV=test bun test \
  apps/api/src/routes/vehicles.test.ts \
  apps/api/src/routes/locations.test.ts \
  apps/web/components/ship-viewer-3d-scene.test.ts
```

Les 5 tests passaient.

## Blocker actuel

Le boulot n’est **pas** fini. Le blocker actuel est côté `apps/web`.

### État exact du problème

Après la refonte du viewer, deux soucis de build sont apparus :

1. Barrel import de `@react-three/drei`
   - ça tirait `Text.js`
   - erreur `troika-worker-utils`
   - déjà contourné en supprimant les imports barrel

2. Wrapper `OrbitControls` de drei
   - ça tirait `three-stdlib/index.js`
   - erreur `potpack`
   - réponse actuelle : remplacement par un wrapper local qui importe `OrbitControls` plus directement

### Dernier échec de typecheck

Le dernier `bun run typecheck` échouait sur :

```text
@sc-site/web typecheck: error TS2688: Cannot find type definition file for 'bun'.
```

Cause :

- `apps/web/tsconfig.json` a été modifié pour ajouter `"types": ["node", "bun"]`
- mais `apps/web` n’a pas `@types/bun` disponible dans son contexte de typecheck

## Ce que le prochain Codex doit faire

### Étape 1. Travailler sur le Pi

```bash
ssh pedro@100.105.42.81
cd /home/pedro/sc-site
export PATH="$HOME/.bun/bin:$PATH"
```

### Étape 2. Finir le typecheck web proprement

Il faut corriger le problème Bun types dans `apps/web`.

Deux options propres :

1. Soit ajouter `@types/bun` à `apps/web/devDependencies`
2. Soit enlever le besoin de types Bun côté web si possible

Vu l’état actuel, la voie la plus rapide et la plus propre est probablement :

- ajouter `@types/bun` dans `apps/web/package.json`
- faire un `bun install` **sur le Pi**

Ensuite rerun :

```bash
bun run typecheck
```

### Étape 3. Vérifier que le wrapper local `OrbitControls` compile vraiment

Fichier à vérifier :

- `apps/web/components/ShipViewer3D.tsx`

Points à valider :

- plus d’import depuis le barrel `@react-three/drei`
- plus d’import qui remonte `three-stdlib/index.js`
- `OrbitControls` compile bien avec le chemin actuel

### Étape 4. Build explicite du web

Quand le typecheck est vert :

```bash
bun --filter @sc-site/web build
```

Ne te fie pas juste au dev server Next si une grosse erreur a eu lieu avant. Le dev server peut rester dans un état intermédiaire.

### Étape 5. Relancer les serveurs si nécessaire

État vu au moment du handoff :

- web dev tournait
- API ne tournait pas (`127.0.0.1:3001/health` refusé)

Le prochain Codex doit lancer l’API directement sur le Pi si elle n’est pas déjà levée :

```bash
bun --filter @sc-site/api dev
```

Et, si le web est resté bloqué après les erreurs de build, relancer aussi :

```bash
bun --filter @sc-site/web dev
```

## Vérifications à faire une fois les serveurs relancés

### Pages à vérifier

- `http://127.0.0.1:3000/ships/carrack`
- `http://127.0.0.1:3000/ships/avenger-titan`
- `http://127.0.0.1:3000/ships/600i-executive-edition`
- `http://127.0.0.1:3001/health`

### Attendus

#### `carrack`

- plus d’écran rouge Next build error
- un seul viewer 3D monté
- vrai GLTF en 3D, pas un wireframe
- layout desktop : viewer full-bleed + panels flottants

#### `avenger-titan`

- `where to buy` pointe vers `/shops?q=Teasa%20Spaceport%20-%20New%20Deal`
- présence séparée éventuelle du lien RSI via `pledgeStoreUrl`

#### `600i-executive-edition`

- pas de faux lien `/shops` basé sur URL RSI
- présence de `pledgeStoreUrl`
- `buyAt` absent si pas de shop ingame

## Fichiers touchés dans cette session

- `apps/api/src/lib/manufacturer-code.ts`
- `apps/api/src/lib/ship-mapper.ts`
- `apps/api/src/services/vehicles-service.ts`
- `apps/api/src/services/locations-service.ts`
- `apps/api/src/routes/vehicles.test.ts`
- `apps/api/src/routes/locations.test.ts`
- `apps/web/components/ship-viewer-3d-scene.ts`
- `apps/web/components/ship-viewer-3d-scene.test.ts`
- `apps/web/components/ShipViewer3D.tsx`
- `apps/web/app/(catalog)/ships/[slug]/page.tsx`
- `apps/web/lib/api.ts`
- `apps/web/tsconfig.json`
- `packages/ui/src/sc/types.ts`
- `packages/ui/src/sc/IdentityPanel.tsx`

## Résumé ultra court pour le prochain Codex

Travaille directement sur `/home/pedro/sc-site` sur le Pi. Les régressions API et la logique viewer sont déjà codées et testées. Le blocage restant est côté `apps/web` : finir le typage Bun proprement, vérifier que `ShipViewer3D.tsx` compile sans tirer les dépendances cassées de drei/three-stdlib, puis rebuild et relancer `web + api`.
