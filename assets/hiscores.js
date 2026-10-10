// Renders site/hiscores.json (written by the bot) into the Hiscores table.
// Plain script, no dependencies. Player names are inserted with textContent
// so a hostile Twitch name can never inject markup.

(function () {
  var body = document.getElementById('hs-body');
  var stats = document.getElementById('hs-stats');
  var banner = document.getElementById('hs-banner');
  var updated = document.getElementById('hs-updated');
  var search = document.getElementById('hs-search');
  var data = null;

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function timeAgo(iso) {
    var seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    if (seconds < 90) return 'just now';
    var minutes = Math.round(seconds / 60);
    if (minutes < 60) return minutes + ' min ago';
    var hours = Math.round(minutes / 60);
    if (hours < 36) return hours + ' hr ago';
    return Math.round(hours / 24) + ' days ago';
  }

  // One piece of gear, FF7-menu style: "Wpn. Buster Sword" then its slots as
  // orbs in the order the player filled them. Slots are linked in pairs (an
  // even count is all joined pairs; an odd count leaves the last one on its
  // own), like the in-game materia sockets.
  function renderGear(gear) {
    var row = el('div', 'gear');
    row.appendChild(el('span', 'gear-label', gear.label));
    row.appendChild(el('span', 'gear-name', gear.name));
    var sockets = el('span', 'sockets');
    for (var i = 0; i < gear.slots.length; i += 2) {
      var group = gear.slots.slice(i, i + 2);
      var link = el('span', group.length === 2 ? 'link joined' : 'link');
      group.forEach(function (slot) {
        var orb = el('span', slot ? 'orb ' + slot.color : 'orb empty');
        orb.title = slot ? slot.name : 'Empty slot';
        link.appendChild(orb);
      });
      sockets.appendChild(link);
    }
    row.appendChild(sockets);
    return row;
  }

  function renderStats() {
    stats.textContent = '';
    var entries = data.entries;
    var totalKills = entries.reduce(function (sum, e) { return sum + e.bossesDefeated; }, 0);
    var topBoss = entries.length ? entries[0].bossesDefeated : 0;
    [
      [entries.length, 'players ranked'],
      [totalKills, 'boss clears'],
      [topBoss + ' / ' + data.bosses.length, 'furthest progress'],
    ].forEach(function (pair) {
      var box = el('div', 'stat');
      box.appendChild(el('div', 'value', String(pair[0])));
      box.appendChild(el('div', 'label', pair[1]));
      stats.appendChild(box);
    });
  }

  function render() {
    var query = (search.value || '').trim().toLowerCase();
    var bossName = {};
    data.bosses.forEach(function (b) { bossName[b.key] = b.name; });

    body.textContent = '';
    var shown = data.entries.filter(function (e) { return !query || e.name.toLowerCase().indexOf(query) !== -1; });

    if (shown.length === 0) {
      var row = el('tr');
      var cell = el('td', 'muted', data.entries.length ? 'No players match that search.' : 'No one is on the board yet - equip a materia with !equip to appear here!');
      cell.colSpan = 5;
      row.appendChild(cell);
      body.appendChild(row);
      return;
    }

    shown.forEach(function (e) {
      var tr = el('tr', e.rank <= 3 ? 'top' + e.rank : '');
      tr.appendChild(el('td', 'num rank', String(e.rank)));

      var nameCell = el('td');
      var player = el('div', 'player');
      player.appendChild(el('span', null, e.name));
      (e.pets || []).forEach(function (pet) { player.appendChild(el('span', 'pet', pet)); });
      nameCell.appendChild(player);
      if (e.loadout && e.loadout.length) {
        var loadout = el('div', 'loadout');
        e.loadout.forEach(function (gear) { loadout.appendChild(renderGear(gear)); });
        nameCell.appendChild(loadout);
      }
      tr.appendChild(nameCell);

      var progressCell = el('td');
      var progress = el('div', 'progress');
      var pips = el('div', 'pips');
      var defeated = {};
      (e.defeated || []).forEach(function (k) { defeated[k] = true; });
      data.bosses.forEach(function (b) {
        var pip = el('span', (defeated[b.key] ? 'pip on' : 'pip') + (b.special ? ' special' : ''));
        pip.title = b.name + (defeated[b.key] ? ' - defeated' : ' - not yet');
        pips.appendChild(pip);
      });
      progress.appendChild(pips);
      progress.appendChild(el('span', 'count', e.bossesDefeated + '/' + data.bosses.length));
      progressCell.appendChild(progress);
      tr.appendChild(progressCell);

      // Equipped Materia Power: a flat number (with Deathblow it's the average;
      // hovering shows the range a fight can actually use).
      var powerCell = el('td', 'power-cell');
      var power = el('span', 'power-value', String(e.equippedValue));
      var lo = e.equippedMin === undefined ? e.equippedValue : e.equippedMin;
      var hi = e.equippedMax === undefined ? e.equippedValue : e.equippedMax;
      if (hi > lo) power.title = 'Average ' + e.equippedValue + ' (a fight can use ' + lo + '-' + hi + ')';
      powerCell.appendChild(power);
      tr.appendChild(powerCell);

      // Current Boss: the picture of whoever they're up to next.
      var bossCell = el('td');
      var current = el('div', 'current-boss');
      if (e.currentBoss && bossName[e.currentBoss]) {
        var img = el('img');
        img.src = 'assets/bosses/' + e.currentBoss + '.webp';
        img.alt = bossName[e.currentBoss];
        img.loading = 'lazy';
        current.appendChild(img);
        current.appendChild(el('span', 'current-boss-name', bossName[e.currentBoss]));
      } else {
        current.appendChild(el('span', 'current-boss-name cleared', 'All bosses cleared'));
      }
      bossCell.appendChild(current);
      tr.appendChild(bossCell);

      body.appendChild(tr);
    });
  }

  function show(json) {
    data = json;
    if (data.sample) {
      banner.hidden = false;
      banner.textContent = 'Showing sample data. Real standings appear once the bot has exported its first snapshot.';
    }
    updated.textContent = data.updatedAt && !data.sample ? 'Updated ' + timeAgo(data.updatedAt) : '';
    renderStats();
    render();
    search.addEventListener('input', render);
  }

  fetch('hiscores.json', { cache: 'no-cache' })
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(show)
    .catch(function () {
      body.textContent = '';
      var row = el('tr');
      var cell = el('td', 'muted', 'Could not load the standings right now. Try again in a minute.');
      cell.colSpan = 5;
      row.appendChild(cell);
      body.appendChild(row);
    });
})();
