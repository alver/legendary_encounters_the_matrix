# Legendary Encounters: The Matrix — Solo (browser)

A browser-playable solo implementation of **all three films** from
*Legendary Encounters: A Matrix Deck Building Game*:

- **The Matrix** — *What Is the Matrix?* → *Know Thyself* → *He Is The One* (Become The One)
- **The Matrix Reloaded** — *The Oracle's Call* → *Free the Keymaker* → *The Source* (the Architect, the Tow Bomb Sentinels)
- **The Matrix Revolutions** — *Club Hel* → *The Battle of Zion* → *Everything That Has a Beginning* (the Oracle-Smith, the Deletion Program)

Personal use only.

Built with **Vite + TypeScript (strict) + React**. The game engine
(`src/game.ts`, `src/scripts.ts`) is framework-free and talks to any front end
through the `UIPort` interface — the React UI and the headless test bot are two
implementations of the same seam.

## Run

```bash
npm install
npm run dev
# open the printed URL (default http://localhost:5173/)
```

Quick start / testing: `/?avatar=AvatarTrinityMatrix` skips the setup screen
(add `&movie=reloaded` / `&movie=revolutions` for the other films).

Production build:

```bash
npm run build     # typecheck + bundle into dist/
npm run preview   # serve dist/ locally
```

## Project layout

```
index.html          minimal #root + /src/main.tsx entry
src/
  types.ts          all shared types (CardDef, GameState, ScriptHooks, UIPort…)
  version.ts        MX constants (row names, scan costs, phones…)
  cards.ts          card database (first film + shared) + deck builders
  cardsReloaded.ts  the Reloaded cards (hero groups, Keymaker, act mini-decks)
  cardsRevolutions.ts the Revolutions cards (hero groups, Seraph, act mini-decks)
  cardImages.ts     card id → art URL on legendarycardgame.com's CDN
  scripts.ts        per-card hooks, first film + merge of the per-film modules
  scriptsReloaded.ts / scriptsRevolutions.ts / scriptsShared.ts
  game.ts           the engine: state G, phases, actions, act progression
  ui/               React front end (store.ts is the engine↔React seam)
  styles/           the playmat CSS
tests/              Vitest: card-data invariants + the headless bot sim
```

Engine notes:

- The whole game state lives in one JSON-serializable object `G`
  (module-local in `src/game.ts`, read via `getG()`/`g()`); **undo** is a
  `snapshot()`/`restore()` of it. Keep it plain data.
- All player prompts go through the injected `UIPort`
  (`pick` / `chooseOption` / `confirmBox` / `showCard`), set with `setUI()`.
- In the React UI, `UIPort.render()` bumps a version counter
  (`useSyncExternalStore`) and prompts become modal components that resolve
  the engine's promise (`src/ui/store.ts`).

## What's implemented

- **Full solo rules**: Matrix/Action/Strike/Cleanup phases, the 5-space Matrix Row
  (push mechanics, scan costs 2/2/3/3/4), Combat Zone, Operations, phones
  (Subway/Alley + the 3® Combat-Zone pay phone, blocked at 3+ cards), Time Track,
  class-combo abilities, the solo Coordinate rule (once per turn discard a
  Coordinate card to draw), Sacrifice, Chase/Cover/Double Strike/Undefeatable/Evade,
  and the later films' keywords: Digital Hero (recruit from inside the Matrix),
  Buy Time 5®, Stationary, Wild Swing.
- **All three films, selectable at setup** with the rulebook's recommended
  hero-group / avatar lineups. 18 avatars (6 per film, Morpheus / Trinity /
  Niobe / Soren / Roland shared between Reloaded and Revolutions), 15 hero
  groups (incl. the Extra groups Neo, Keymaker and Seraph that join Zion
  mid-story), and every Act mini-deck + Extra card with scanned art.
- **The Matrix act flow**: complete both Act 1 Challenges → free Neo with a
  Hovercraft → defeat all 7 Training cards → talk to the Oracle → rescue the
  captive (7®) → defeat Agent Smith (12⚔, Subway or Combat Zone; or run for a
  **Minor Victory**) → raise the Time Track to 10 for the **Major Victory**.
- **Reloaded act flow**: reveal the Backdoor and pay ® to scan through it →
  walk through to the Oracle (I Love Candy, three Smiths) → kiss Persephone with
  a Neo Hero in play → rescue the Keymaker (his 14 Digital Heroes join Zion) →
  the three-Challenge race at the Source (Power Station 4⚔, Emergency System 4®,
  Open the Door with a Keymaker Hero — all within one turn of the first!) →
  the Architect's choice (**Minor Victory**, or hope) → clear the Matrix down to
  the Inevitable card → defeat the **Tow Bomb Sentinels** (20⚔, feeding on the
  Time Track through your Neo Heroes) for the **Major Victory**.
- **Revolutions act flow**: chase the Trainman out of Club Hel (Mobil Ave,
  flipping Club Hel Guards, the obnoxious Merovingian) → the deal (Seraph joins
  Zion) → defeat the Merovingian (5⚔) → the Battle of Zion (Sentinel Swarms
  squatting the Dock, Sentinel Hunters, the Digger on Zion, Fly the Mechanical
  Line) → retreat to the Temple → defeat Bane, then Make an Offer to Deus Ex
  Machina (7®) → enter the Matrix one last time (or take the **Minor Victory**)
  → grind the **Oracle-Smith** down (each 5⚔ fight flips a Strike onto him, 15
  damage total; pay ® = your speed to dodge his strikes) → **Send the Deletion
  Program**: move the Time Track to the Smiths' ⚔ and delete all five while
  your own deck is consumed — **Major Victory**.
- **Quality of life**: hover previews of every card, undo (snapshot per action),
  game log, act card zoom, difficulty options (prep turn, +Speed health,
  Part of the System filler cards), in-game "How to play".

## UI crib sheet

- Click a hand card to **play** it; ⇆ button = solo Coordinate discard.
- Click a face-down row card to **scan**, a face-up enemy to **fight**,
  a challenge to **complete** it; gold buttons under cards = Evade / Sacrifice.
- Dock cards / Hovercraft stack: click to **recruit** (Real World, enough ®).
- Yellow ◈ buttons = pending "once this turn" effects.
- Buttons for the act-specific actions (Free Neo, Jump, Rescue the Keymaker,
  Minor Victory, Raise Time Track, Gain ⚔ per Neo, the Deletion Program moves)
  appear when the act makes them possible; Buy Time / Evade are gold buttons on
  the enemy cards. A 🚪® marker on a Row space = Backdoor (scan payable with ®).

## Testing & checks

```bash
npm test              # card-data invariants + finale paths + 10+10 bot games per film
npm run sim           # heavy regression: 50 + 50 headless bot games per film
npm run typecheck     # tsc --noEmit (strict)
npm run lint          # eslint (typescript-eslint + react-hooks + no-floating-promises)
```

The bot (`tests/bot.ts`) stubs `UIPort` with random auto-answers and plays full
games of all three films; any engine regression surfaces as a runtime error
or a game that never ends. `tests/finale.test.ts` drives the scripted endgames
(Tow Bomb Sentinels, the Deletion Program) that the random bot rarely reaches.

## Known limitations

- Solo only (1 player). Multiplayer-only content is stubbed accordingly:
  the Sentinel Destroyer is never placed (solo has no Real-World players in the
  finale), *One of You Is Going to Die* / *They're Not Moving* just hit you,
  "choose a player" effects target you, *Gotcha* / *Fight Through Hel* are plain
  Coordinates.
- Film presets only (the rulebook's recommended setups); "Make Your Own
  Stories" mix-and-match, campaign/scars mode and Traitor modes are **not**
  implemented.
- No mid-game save; a game lives until the tab reloads (there is Undo, though).
- Minor rules shortcuts: "put the rest back in any order" effects keep the
  original order; two-sided Act cards are shown as side A until they flip;
  *I Can See You*'s combo scan may target any face-down space.
