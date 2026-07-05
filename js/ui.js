// ui.js — rendering, input, modals. Single render path: UI.render() rebuilds
// every zone from `G`. All engine prompts come through UI.pick / chooseOption /
// confirmBox / showCard (promise-based modals).

const UI = (() => {
  const $ = id => document.getElementById(id);
  let busy = false;                 // an action (or modal) is resolving
  const snapshots = [];             // undo stack (JSON strings)

  /* ─────────── card elements ─────────── */
  function cardEl(c, opts = {}) {
    const el = document.createElement('div');
    el.className = 'card' + (opts.small ? ' small' : '');
    if (c && !c.faceUp && !opts.forceUp) {
      el.classList.add('back');
      el.innerHTML = '<div class="back-inner">THE<br>MATRIX</div>';
    } else if (c) {
      const img = document.createElement('img');
      img.src = D(c).image;
      img.alt = D(c).name;
      img.draggable = false;
      el.appendChild(img);
      el.addEventListener('mouseenter', () => showPreview(D(c).image));
      el.addEventListener('mouseleave', hidePreview);
    }
    if (opts.actionable) el.classList.add('actionable');
    if (opts.dim) el.classList.add('dim');
    if (opts.onClick) el.addEventListener('click', () => opts.onClick());
    if (opts.badge) {
      const b = document.createElement('div');
      b.className = 'card-badge';
      b.textContent = opts.badge;
      el.appendChild(b);
    }
    if (opts.buttons) {
      const tray = document.createElement('div');
      tray.className = 'card-btns';
      for (const btn of opts.buttons) {
        const b = document.createElement('button');
        b.textContent = btn.label;
        b.title = btn.title || '';
        b.addEventListener('click', e => { e.stopPropagation(); btn.onClick(); });
        tray.appendChild(b);
      }
      el.appendChild(tray);
    }
    return el;
  }
  function pileEl(arr, opts = {}) {
    const el = document.createElement('div');
    el.className = 'pile';
    if (!arr.length) { el.classList.add('empty'); el.textContent = '—'; return el; }
    const top = arr[arr.length - 1];
    el.appendChild(cardEl(top, { small: true, forceUp: opts.forceUp !== false }));
    const n = document.createElement('div');
    n.className = 'pile-count';
    n.textContent = arr.length;
    el.appendChild(n);
    if (opts.onClick) { el.classList.add('actionable'); el.addEventListener('click', opts.onClick); }
    return el;
  }
  function deckEl(count, opts = {}) {
    const el = document.createElement('div');
    el.className = 'card small back deck-stack' + (count === 0 ? ' empty' : '');
    el.innerHTML = count === 0 ? '<div class="back-inner">EMPTY</div>'
      : `<div class="back-inner">${opts.label || ''}</div><div class="pile-count">${count}</div>`;
    if (opts.onClick) { el.classList.add('actionable'); el.addEventListener('click', opts.onClick); }
    if (opts.topImage) {
      el.classList.remove('back');
      el.innerHTML = '';
      const img = document.createElement('img');
      img.src = opts.topImage;
      el.appendChild(img);
      const n = document.createElement('div');
      n.className = 'pile-count';
      n.textContent = count;
      el.appendChild(n);
    }
    return el;
  }

  /* ─────────── preview ─────────── */
  function showPreview(src) {
    const p = $('card-preview');
    p.innerHTML = `<img src="${src}">`;
    p.style.display = 'block';
  }
  function hidePreview() { $('card-preview').style.display = 'none'; }

  /* ─────────── guarded action dispatch (with undo snapshot) ─────────── */
  async function run(fn, { snapshot = true } = {}) {
    if (busy || !G || G.gameOver) { if (G && G.gameOver) render(); return; }
    if (G.phase !== 'action') return;
    busy = true;
    try {
      if (snapshot) pushSnapshot();
      await fn();
    } finally {
      busy = false;
      render();
    }
  }
  function pushSnapshot() {
    snapshots.push(JSON.stringify({ g: G, uid: uidCounter }));
    if (snapshots.length > 40) snapshots.shift();
  }
  function undo() {
    if (busy || !snapshots.length || !G || G.phase !== 'action' || G.gameOver) return;
    const s = JSON.parse(snapshots.pop());
    G = s.g;
    uidCounter = s.uid;
    log('↩ Undo.');
    render();
  }

  /* ─────────── modals (promise based) ─────────── */
  function openModal(id) { $(id).classList.add('open'); }
  function closeModal(id) { $(id).classList.remove('open'); }

  function pick(items, opts = {}) {
    return new Promise(resolve => {
      const min = opts.min ?? 1, max = opts.max ?? 1;
      $('pick-title').textContent = opts.title || 'Choose';
      $('pick-prompt').textContent = opts.prompt || '';
      const grid = $('pick-grid');
      grid.innerHTML = '';
      const chosen = new Set();
      const update = () => {
        $('pick-count').textContent = max > 1 ? `${chosen.size} / ${max}` : '';
        $('pick-confirm').disabled = chosen.size < min || chosen.size > max;
      };
      for (const it of items) {
        let el;
        if (it.spaceIdx != null && !it.id) {
          el = document.createElement('div');
          el.className = 'space-tile actionable';
          el.textContent = `${MX.ROW_NAMES[it.spaceIdx]} (scan)`;
        } else if (opts.facedown) {
          el = cardEl(it, {});
          el.classList.add('back');
          el.innerHTML = '<div class="back-inner">?</div>';
          const idx = G.matrixRow.findIndex(x => x && x.uid === it.uid);
          if (idx >= 0) {
            const b = document.createElement('div');
            b.className = 'card-badge';
            b.textContent = MX.ROW_NAMES[idx];
            el.appendChild(b);
          }
          el.classList.add('actionable');
        } else {
          el = cardEl(it, { forceUp: true, actionable: true });
        }
        el.addEventListener('click', () => {
          if (chosen.has(it)) { chosen.delete(it); el.classList.remove('selected'); }
          else if (chosen.size < max) { chosen.add(it); el.classList.add('selected'); }
          update();
        });
        grid.appendChild(el);
      }
      $('pick-skip').style.display = opts.skippable ? '' : 'none';
      update();
      const done = sel => { closeModal('pick-modal'); cleanup(); resolve(sel); };
      const onConfirm = () => done([...chosen]);
      const onSkip = () => done([]);
      function cleanup() {
        $('pick-confirm').removeEventListener('click', onConfirm);
        $('pick-skip').removeEventListener('click', onSkip);
      }
      $('pick-confirm').addEventListener('click', onConfirm);
      $('pick-skip').addEventListener('click', onSkip);
      openModal('pick-modal');
    });
  }

  function chooseOption(title, prompt, options) {
    return new Promise(resolve => {
      $('choice-title').textContent = title;
      $('choice-prompt').textContent = prompt;
      const box = $('choice-actions');
      box.innerHTML = '';
      for (const o of options) {
        const b = document.createElement('button');
        b.className = 'primary-btn';
        b.textContent = o.label;
        b.addEventListener('click', () => { closeModal('choice-modal'); resolve(o.value); });
        box.appendChild(b);
      }
      openModal('choice-modal');
    });
  }
  const confirmBox = (title, prompt, yes = 'Yes', no = 'No') =>
    chooseOption(title, prompt, [{ label: yes, value: true }, { label: no, value: false }]);

  function showCard(imgSrc, title) {
    return new Promise(resolve => {
      $('show-title').textContent = title || '';
      $('show-img').src = imgSrc;
      const ok = () => { $('show-ok').removeEventListener('click', ok); closeModal('show-modal'); resolve(); };
      $('show-ok').addEventListener('click', ok);
      openModal('show-modal');
    });
  }

  /* ─────────── rendering ─────────── */
  function render() {
    if (!G) return;
    renderTimeTrack();
    renderActs();
    renderRow();
    renderZones();
    renderPlayer();
    renderControls();
    renderSidebar();
    if (G.gameOver) renderGameOver();
  }

  function renderTimeTrack() {
    const box = $('tt-cells');
    box.innerHTML = '';
    for (let v = 10; v >= 1; v--) {
      const c = document.createElement('div');
      c.className = 'tt-cell' + (v === G.time ? ' current' : '') + (v <= 3 ? ' danger' : '');
      c.textContent = v;
      box.appendChild(c);
    }
  }

  function renderActs() {
    const key = `${G.act}.${G.part}`;
    const a = ACT_CARDS[key];
    const body = $('acts-body');
    body.innerHTML = '';
    const img = document.createElement('img');
    img.src = a.image;
    img.className = 'act-img actionable';
    img.title = 'Click to read the Act card';
    img.addEventListener('click', () => showCard(a.image, `Act ${G.act} Part ${G.part} — ${a.name}`));
    body.appendChild(img);
    $('objective').innerHTML = `<b>Act ${G.act} · Part ${G.part}</b> — ${a.objective}`;
  }

  function renderRow() {
    const row = $('matrix-row');
    row.innerHTML = '';
    for (let i = 0; i < 5; i++) {
      const space = document.createElement('div');
      space.className = 'row-space';
      const head = document.createElement('div');
      head.className = 'space-head';
      const phone = MX.PHONE_SPACES.includes(i)
        ? (G.flags.deadPhones[i] ? ' <span class="phone dead">☎✕</span>' : ' <span class="phone">☎</span>') : '';
      head.innerHTML = `${MX.ROW_NAMES[i]}${phone}<span class="scan-cost">scan ${MX.SCAN_COST[i]}⚔</span>`;
      space.appendChild(head);

      // Attached Jump challenge above the Building.
      if (i === 3 && G.attached.building) {
        const att = cardEl(G.attached.building, {
          small: true, forceUp: true, actionable: true,
          badge: 'JUMP',
          onClick: () => run(() => actJump()),
        });
        att.classList.add('attached');
        space.appendChild(att);
      }

      const c = G.matrixRow[i];
      if (c) {
        const opts = { small: true };
        if (!c.faceUp) {
          opts.actionable = inMatrix() && !G.turn.noScan && P().A >= MX.SCAN_COST[i];
          opts.onClick = () => run(() => actScan(i));
          opts.badge = `${MX.SCAN_COST[i]}⚔`;
        } else {
          const def = D(c);
          if (def.type === 'enemy') {
            const blocked = fightBlockReason(c);
            opts.actionable = !blocked;
            opts.onClick = () => run(() => actFight(c.uid));
            if (def.defeat != null) opts.badge = `${effectiveFightCost(c)}⚔`;
            if (def.evade) {
              opts.buttons = [{ label: `Evade ${def.evade}®`, onClick: () => run(() => actEvade(c.uid)) }];
            }
          } else if (def.type === 'challenge') {
            opts.actionable = true;
            opts.onClick = () => run(() => actCompleteChallenge(c.uid));
          }
        }
        space.appendChild(cardEl(c, opts));
      } else {
        const empty = document.createElement('div');
        empty.className = 'card small placeholder';
        empty.textContent = '';
        space.appendChild(empty);
      }
      row.appendChild(space);
    }
  }

  function challengeCost(def) {
    if (!def.defeat) return '';
    return ` (${def.defeat}${def.defeatType === 'R' ? '®' : '⚔'})`;
  }

  function renderZones() {
    // Matrix deck
    const md = $('matrix-deck-body');
    md.innerHTML = '';
    const topFaceUp = G.matrixDeck.length && G.matrixDeck[G.matrixDeck.length - 1].faceUp
      ? D(G.matrixDeck[G.matrixDeck.length - 1]).image : null;
    md.appendChild(deckEl(G.matrixDeck.length, { label: 'MATRIX', topImage: topFaceUp }));

    // Combat zone
    const cz = $('combat-zone-body');
    cz.innerHTML = '';
    for (const c of G.combatZone) {
      const def = D(c);
      const opts = { small: true, forceUp: true };
      if (def.type === 'enemy') {
        opts.actionable = !fightBlockReason(c);
        opts.onClick = () => run(() => actFight(c.uid));
        if (def.defeat != null) opts.badge = `${effectiveFightCost(c)}⚔`;
        if (def.evade) opts.buttons = [{ label: `Evade ${def.evade}®`, onClick: () => run(() => actEvade(c.uid)) }];
      } else if (def.type === 'challenge') {
        opts.actionable = true;
        opts.onClick = () => run(() => actCompleteChallenge(c.uid));
      }
      cz.appendChild(cardEl(c, opts));
    }
    $('cz-phone').classList.toggle('dead', G.combatZone.length >= MX.COMBAT_PHONE_BLOCKED_AT);

    // Operations
    const ops = $('operations-body');
    ops.innerHTML = '';
    for (const c of G.operations) {
      const def = D(c);
      ops.appendChild(cardEl(c, {
        small: true, forceUp: true, actionable: def.type === 'challenge',
        badge: def.type === 'challenge' && def.defeat ? `${def.defeat}${def.defeatType === 'R' ? '®' : '⚔'}` : null,
        onClick: () => run(() => actCompleteChallenge(c.uid)),
      }));
    }

    // Piles / decks
    $('defeated-enemies-body').replaceChildren(pileEl(G.defeatedEnemies));
    $('strikes-body').replaceChildren(deckEl(G.strikeDeck.length, { label: 'STRIKE' }));
    $('discarded-strikes-body').replaceChildren(pileEl(G.strikeDiscard));
    $('discarded-ces-body').replaceChildren(pileEl(G.discardedCES));
    $('defeated-heroes-body').replaceChildren(pileEl(G.defeatedHeroes));
    $('zion-body').replaceChildren(deckEl(G.zion.length, { label: 'ZION' }));

    // Hovercraft stack (recruitable)
    const hv = $('hovercraft-body');
    hv.innerHTML = '';
    const canHov = G.phase === 'action' && P().rsi === 'real' && P().R >= 3 && G.hovercraftStack.length;
    hv.appendChild(deckEl(G.hovercraftStack.length, {
      label: 'HOVER', onClick: canHov ? () => run(() => actRecruitHovercraft()) : null,
    }));
    if (canHov) hv.firstChild.classList.add('recruitable');

    // Dock
    const dock = $('dock-body');
    dock.innerHTML = '';
    G.dock.forEach((c, i) => {
      if (!c) { const ph = document.createElement('div'); ph.className = 'card small placeholder'; dock.appendChild(ph); return; }
      const afford = G.phase === 'action' && P().rsi === 'real' && P().R >= D(c).cost;
      dock.appendChild(cardEl(c, {
        small: true, forceUp: true, actionable: afford, dim: !afford,
        badge: `${D(c).cost}®`,
        onClick: () => run(() => actRecruitDock(i)),
      }));
    });

    // In-the-Matrix standee
    $('in-matrix-body').innerHTML = inMatrix()
      ? `<div class="standee">👤<br>${avatar().name}</div>` : '<div class="standee empty"></div>';
  }

  function renderPlayer() {
    const av = $('avatar-slot');
    av.innerHTML = '';
    const img = document.createElement('img');
    img.src = avatar().image;
    av.appendChild(img);
    img.addEventListener('mouseenter', () => showPreview(avatar().image));
    img.addEventListener('mouseleave', hidePreview);
    const hp = document.createElement('div');
    hp.className = 'hp' + (totalDamage() >= P().health - 3 ? ' danger' : '');
    hp.textContent = `${totalDamage()} / ${P().health} dmg`;
    av.appendChild(hp);

    $('rsi-indicator').textContent = inMatrix() ? 'IN THE MATRIX' : 'REAL WORLD';
    $('rsi-indicator').className = 'rsi ' + (inMatrix() ? 'matrix' : 'real');

    const strikes = $('player-strikes');
    strikes.innerHTML = '';
    for (const s of P().strikes)
      strikes.appendChild(cardEl(s, { small: true, forceUp: true, badge: `${D(s).damage || 0}` }));

    const rw = $('rw-enemies');
    rw.innerHTML = '';
    for (const c of G.realWorldEnemies) {
      rw.appendChild(cardEl(c, {
        small: true, forceUp: true,
        actionable: !fightBlockReason(c),
        badge: D(c).defeat != null ? `${D(c).defeat}⚔` : null,
        onClick: () => run(() => actFight(c.uid)),
      }));
    }

    $('status-bar').innerHTML =
      `<span class="stat pool-r">® ${P().R}</span>` +
      `<span class="stat pool-a">⚔ ${P().A}</span>` +
      `<span class="stat">Training ${G.flags.trainingDefeated}/7</span>`;
    $('deck-counts').textContent = ` — deck ${P().deck.length} · discard ${P().discard.length}`;

    // In play
    const ip = $('in-play');
    ip.innerHTML = '';
    for (const c of P().inPlay) {
      const buttons = [];
      if (D(c).kw.includes('Sacrifice'))
        buttons.push({ label: 'Sacrifice', onClick: () => run(() => actSacrifice(c.uid)) });
      ip.appendChild(cardEl(c, { small: true, forceUp: true, buttons: buttons.length ? buttons : null }));
    }

    // Hand
    const hand = $('hand');
    hand.innerHTML = '';
    for (const c of P().hand) {
      const buttons = [];
      if (D(c).kw.includes('Coordinate') && !G.turn.coordUsed && G.turnNo >= G.flags.noCoordUntilTurn)
        buttons.push({ label: '⇆ Coord', title: 'Solo Coordinate: discard to draw a card', onClick: () => run(() => actCoordinate(c.uid)) });
      hand.appendChild(cardEl(c, {
        forceUp: true, actionable: G.phase === 'action',
        onClick: () => run(() => actPlayCard(c.uid)),
        buttons: buttons.length ? buttons : null,
      }));
    }
  }

  function renderControls() {
    const box = $('action-buttons');
    box.innerHTML = '';
    const btn = (label, fn, opts = {}) => {
      const b = document.createElement('button');
      b.className = opts.ghost ? 'ghost-btn' : 'primary-btn';
      b.textContent = label;
      b.disabled = !!opts.disabled;
      if (opts.title) b.title = opts.title;
      b.addEventListener('click', fn);
      box.appendChild(b);
    };
    if (G.phase !== 'action') return;

    if (P().rsi === 'real') {
      btn('Enter the Matrix', () => run(() => actMove()), { disabled: G.turn.freeMoveUsed });
    } else {
      const free = phoneAvailable() != null;
      const pay = G.combatZone.length < MX.COMBAT_PHONE_BLOCKED_AT && P().R >= MX.COMBAT_PHONE_COST;
      btn('Exit the Matrix', () => run(() => actMove()), {
        disabled: G.turn.freeMoveUsed || !!leaveMatrixBlockReason() || (!free && !pay),
        title: leaveMatrixBlockReason() || (free ? 'Through a free phone' : pay ? 'Pay 3 ® (Combat Zone phone)' : 'No phone available'),
      });
    }
    if (G.act === 1 && G.part === 2)
      btn('★ Free Neo from the Matrix', () => run(() => actFreeNeo()),
        { disabled: P().rsi !== 'real' || !(P().inPlay.some(c => D(c).type === 'hovercraft') || G.turn.gainedHovercraft) });
    if (G.attached.building)
      btn('Jump! (Building must be clear)', () => run(() => actJump()),
        { disabled: !inMatrix() || !!G.matrixRow[3] });
    if (G.act === 3 && G.part === 2)
      btn('Run — Minor Victory', () => run(() => actMinorVictory(), { snapshot: false }), { ghost: true });
    if (G.act === 3 && G.part === 3 && G.time < 10)
      btn(`⚡ Raise Time Track to ${G.time + 1} (pay ${G.time + 1}⚔)`, () => run(() => actRaiseTime()),
        { disabled: P().A < G.time + 1 });
    btn('End Action Phase ▸', () => run(() => actEndPhase(), { snapshot: false }), { ghost: true });

    const tray = $('pending-tray');
    tray.innerHTML = '';
    G.pending.forEach((p, i) => {
      const b = document.createElement('button');
      b.className = 'pending-btn';
      b.textContent = `◈ ${p.label}`;
      b.addEventListener('click', () => run(() => actPending(i)));
      tray.appendChild(b);
    });
  }

  function renderSidebar() {
    const names = { matrix: 'Matrix Phase', action: 'Action Phase', strike: 'Strike Phase', cleanup: 'Cleanup', gameover: 'Game Over' };
    $('phase-banner').textContent = `Turn ${G.turnNo} — ${names[G.phase] || G.phase}`;
    const logBox = $('log');
    logBox.innerHTML = G.log.slice(-120).map(l => `<div class="log-line ${l.cls}">${l.msg}</div>`).join('');
    logBox.scrollTop = logBox.scrollHeight;
    $('btn-undo').disabled = !snapshots.length || G.phase !== 'action';
  }

  function renderGameOver() {
    $('gameover-title').textContent = G.gameOver.title;
    $('gameover-sub').textContent = G.gameOver.sub;
    openModal('gameover-modal');
  }

  /* ─────────── setup screen ─────────── */
  function setupScreen() {
    // ?avatar=AvatarTrinityMatrix — skip the setup screen (testing / quick start)
    const auto = new URLSearchParams(location.search).get('avatar');
    if (auto && AVATARS[auto] && !AVATARS[auto].hidden) {
      snapshots.length = 0;
      newGame(auto, {});
      render();
      startTurn();
      return;
    }
    const grid = $('avatar-grid');
    grid.innerHTML = '';
    let chosen = null;
    for (const a of Object.values(AVATARS)) {
      if (a.hidden) continue;
      const el = document.createElement('div');
      el.className = 'card avatar-pick';
      el.innerHTML = `<img src="${a.image}" draggable="false">
        <div class="av-name">${a.name}<br><small>♥${a.health} · spd ${a.speed}</small></div>`;
      el.addEventListener('mouseenter', () => showPreview(a.image));
      el.addEventListener('mouseleave', hidePreview);
      el.addEventListener('click', () => {
        grid.querySelectorAll('.selected').forEach(x => x.classList.remove('selected'));
        el.classList.add('selected');
        chosen = a.id;
        $('setup-start').disabled = false;
      });
      grid.appendChild(el);
    }
    $('setup-start').onclick = () => {
      if (!chosen) return;
      closeModal('setup-modal');
      snapshots.length = 0;
      newGame(chosen, {
        prepTurn: $('opt-prep').checked,
        dodgeBullets: $('opt-bullets').checked,
        systemCards: parseInt($('opt-system').value, 10) || 0,
      });
      render();
      startTurn();
    };
    openModal('setup-modal');
  }

  /* ─────────── how to play ─────────── */
  const HOWTO = `
<p><b>Goal:</b> play through all three Acts of <i>The Matrix</i> and win a Major Victory.
Lose if your damage reaches your health, or the Time Track hits 0, or the Strike deck fully runs out.</p>
<p><b>Turn:</b> ① Matrix Phase — a face-down card enters the Rooftops and pushes everything left
(off the Subway → the Combat Zone). ② Action Phase — play cards from your hand for ® (Recruit)
and ⚔ (Attack). ③ Strike Phase — each Combat-Zone enemy strikes: <i>you</i> if you're in the Matrix
(draw a Strike card = damage), the <i>Time Track</i> if you're in the Real World.
④ Cleanup — discard everything, draw 6.</p>
<p><b>Real World:</b> spend ® to recruit from the Dock or a Hovercraft (3®, always Coordinate).<br>
<b>In the Matrix:</b> spend ⚔ to scan face-down spaces (cost printed per space), fight revealed
enemies, and complete Challenges.</p>
<p><b>Moving:</b> once per turn, free. You can always enter the Matrix. To leave you need a phone:
Subway or Alley must be a <i>clear</i> space, or pay 3 ® in the Combat Zone (blocked with 3+ cards there).</p>
<p><b>Class combos:</b> a Hero's {class}: ability works if you played another Hero of that class
earlier this turn.</p>
<p><b>Solo Coordinate:</b> once per turn you may discard a Coordinate card (⇆ button) to draw a card.</p>
<p><b>Free Your Mind</b> resolves your Avatar's ability for the current Act.</p>
<p><b>Act 1:</b> complete both Challenges (they hide in the Matrix Deck), then gain/have a Hovercraft
while in the Real World and press <i>Free Neo</i>. <b>Act 2:</b> defeat all 7 Training cards
(don't forget the Jump), then See the Oracle. <b>Act 3:</b> rescue the captive (7®), defeat Agent Smith
(12⚔, Subway or Combat Zone), then become The One: raise the Time Track to 10 by paying ⚔ while
Evading the Agents with ®.</p>`;

  /* ─────────── wiring ─────────── */
  function init() {
    $('btn-restart').addEventListener('click', () => { closeModal('gameover-modal'); setupScreen(); });
    $('gameover-again').addEventListener('click', () => { closeModal('gameover-modal'); setupScreen(); });
    $('btn-undo').addEventListener('click', undo);
    $('btn-howto').addEventListener('click', () => { $('howto-body').innerHTML = HOWTO; openModal('howto-modal'); });
    $('howto-close').addEventListener('click', () => closeModal('howto-modal'));
    document.addEventListener('mousemove', e => {
      const p = $('card-preview');
      if (p.style.display !== 'block') return;
      const onLeft = e.clientX > window.innerWidth / 2;
      p.style.left = onLeft ? '12px' : 'auto';
      p.style.right = onLeft ? 'auto' : '340px';
    });
    setupScreen();
  }
  document.addEventListener('DOMContentLoaded', init);

  return { render, pick, chooseOption, confirmBox, showCard };
})();
