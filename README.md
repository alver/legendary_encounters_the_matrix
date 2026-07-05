# Legendary Encounters: The Matrix — Solo (browser)

A browser-playable solo implementation of the **first film** ("The Matrix") from
*Legendary Encounters: A Matrix Deck Building Game*: Act 1 *What Is the Matrix?*,
Act 2 *Know Thyself*, Act 3 *He Is The One* — from "show Neo what the Matrix is"
all the way to **Become The One**. Pure HTML/JS/CSS, no build step, personal use only.

## Run

```bash
cd game
python3 -m http.server 8917
# open http://localhost:8917/
```

A local server is required (the game loads the card images).
Quick start / testing: `http://localhost:8917/?avatar=AvatarTrinityMatrix` skips the setup screen.

## What's implemented

- **Full solo rules**: Matrix/Action/Strike/Cleanup phases, the 5-space Matrix Row
  (push mechanics, scan costs 2/2/3/3/4), Combat Zone, Operations, phones
  (Subway/Alley + the 3® Combat-Zone pay phone, blocked at 3+ cards), Time Track,
  class-combo abilities, the solo Coordinate rule (once per turn discard a
  Coordinate card to draw), Sacrifice, Chase/Cover/Double Strike/Undefeatable/Evade.
- **All avatars of the first film**: Thomas Anderson→Neo (starts in the Matrix,
  flips when Act 2 begins), Morpheus, Trinity, Switch, Apoc, Mouse — with their
  per-Act *Free Your Mind* abilities.
- **All cards of the first film** with scanned art: starters, 5 Hovercrafts,
  40 Strikes (incl. Blinded / Incoming / Not Like This), hero groups Morpheus /
  Trinity / Tank / Nebuchadnezzar Crew, the 14 Neo Extra heroes, the 5 Oracle
  gifts, and every Act mini-deck + Extra card (Deja Vu → A Glitch in the Matrix,
  They Cut the Hardline, the Jump training, See The Oracle, Cypher, Agents
  Jones/Brown body-swap, the Inevitable card, Rescue the Captive, Agent Smith,
  the three Evade-Agents finale with He's Gone / Now Get Up / Become The One).
- **Act flow**: complete both Act 1 Challenges → free Neo with a Hovercraft →
  defeat all 7 Training cards → talk to the Oracle → rescue the captive (7®) →
  defeat Agent Smith (12⚔, Subway or Combat Zone; or run for a **Minor Victory**) →
  raise the Time Track to 10 for the **Major Victory**.
- **Quality of life**: hover previews of every card, undo (snapshot per action),
  game log, act card zoom, difficulty options (prep turn, +Speed health,
  Part of the System filler cards), in-game "How to play".

## UI crib sheet

- Click a hand card to **play** it; ⇆ button = solo Coordinate discard.
- Click a face-down row card to **scan**, a face-up enemy to **fight**,
  a challenge to **complete** it; gold buttons under cards = Evade / Sacrifice.
- Dock cards / Hovercraft stack: click to **recruit** (Real World, enough ®).
- Yellow ◈ buttons = pending "once this turn" effects.
- Buttons for the act-specific actions (Free Neo, Jump, Minor Victory,
  Raise Time Track) appear when the act makes them possible.

## Testing

```bash
node tools/sim.js 20          # headless bot games — expect 0 errors
node tools/sim.js 20 --cheat  # bot with resource cheat: storms through all 3 acts
```

## Known limitations

- Solo only (1 player). Multiplayer-only content is stubbed accordingly:
  the Sentinel Destroyer is never placed (solo has no Real-World players in the
  finale), *One of You Is Going to Die* / *They're Not Moving* just hit you.
- Reloaded / Revolutions acts, hero groups (Keymaker, Seraph, etc.), campaign
  mode, Traitor modes are **not** implemented.
- No mid-game save; a game lives until the tab reloads (there is Undo, though).
- Minor rules shortcuts: "put the rest back in any order" effects keep the
  original order; the two-sided Act 3 Part 3 card is shown as side A only.
