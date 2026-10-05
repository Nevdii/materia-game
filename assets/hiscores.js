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
    // Full bar = the payload's barMax (hardest boss's difficulty); falls back
    // to the top equipped value for older snapshots.
    var barMax = data.barMax || data.entries.reduce(function (m, e) { return Math.max(m, e.equippedValue); }, 0) || 1;
    var bossName = {};
    data.bosses.forEach(function (b) { bossName[b.key] = b.name; });

    body.textContent = '';
    var shown = data.entries.filter(function (e) { return !query || e.name.toLowerCase().indexOf(query) !== -1; });

    if (shown.length === 0) {
      var row = el('tr');
      var cell = el('td', 'muted', data.entries.length ? 'No players match that search.' : 'No one has defeated a boss or collected any materia yet - keep watching!');
      cell.colSpan = 4;
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
      tr.appendChild(nameCell);

      var progressCell = el('td');
      var progress = el('div', 'progress');
      var pips = el('div', 'pips');
      var defeated = {};
      (e.defeated || []).forEach(function (k) { defeated[k] = true; });
      data.bosses.forEach(function (b) {
        var pip = el('span', defeated[b.key] ? 'pip on' : 'pip');
        pip.title = b.name + (defeated[b.key] ? ' - defeated' : ' - not yet');
        pips.appendChild(pip);
      });
      progress.appendChild(pips);
      progress.appendChild(el('span', 'count', e.bossesDefeated + '/' + data.bosses.length));
      progressCell.appendChild(progress);
      tr.appendChild(progressCell);

      var powerCell = el('td');
      var power = el('div', 'power');
      var bar = el('span', 'bar');
      var fill = el('span', 'fill');
      fill.style.width = Math.min(100, Math.round((e.equippedValue / barMax) * 100)) + '%';
      bar.appendChild(fill);
      power.appendChild(bar);
      power.appendChild(el('span', 'n', String(e.equippedValue)));
      powerCell.appendChild(power);
      tr.appendChild(powerCell);

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
      cell.colSpan = 4;
      row.appendChild(cell);
      body.appendChild(row);
    });
})();
