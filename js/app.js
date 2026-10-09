/**
 * app.js —— 首页：统计概览、搜索、筛选、列表渲染
 */
(function () {
  'use strict';
  var U = AppUtils;
  var store = Store.getDefaultStore();
  store.seedIfEmpty();

  var state = { keyword: '', type: 'all', category: 'all', status: 'all', location: '' };

  /* -------------------------------- 渲染统计 -------------------------------- */
  function renderStats() {
    var s = U.summarize(store.getAll());
    var cards = [
      { ico: '📋', cls: 'ico-blue', num: s.total, lbl: '信息总数' },
      { ico: '🧡', cls: 'ico-orange', num: s.lost, lbl: '寻物启事' },
      { ico: '💙', cls: 'ico-cyan', num: s.found, lbl: '失物招领' },
      { ico: '✅', cls: 'ico-green', num: s.resolved, lbl: '已结束' }
    ];
    document.getElementById('stats').innerHTML = cards.map(function (c) {
      return '<div class="stat-card"><div class="ico ' + c.cls + '">' + c.ico + '</div>' +
        '<div><div class="num">' + c.num + '</div><div class="lbl">' + c.lbl + '</div></div></div>';
    }).join('');
  }

  /* -------------------------------- 卡片模板 -------------------------------- */
  function cardHtml(p, keyword) {
    var isLost = p.type === 'lost';
    var typeBadge = isLost
      ? '<span class="badge badge-lost">🧡 寻物启事</span>'
      : '<span class="badge badge-found">💙 失物招领</span>';
    var statusBadge = p.status === 'resolved'
      ? '<span class="badge badge-resolved">' + U.statusLabel(p) + '</span>'
      : '<span class="badge badge-active">进行中</span>';

    var thumb;
    if (p.image) {
      thumb = '<div class="post-thumb thumb-has-img" style="background-image:url(\'' + p.image + '\')">' +
        '<span class="badge-corner">' + typeBadge + '</span>';
    } else {
      thumb = '<div class="post-thumb ' + (isLost ? 'thumb-lost' : 'thumb-found') + '">' +
        (window.CATEGORY_ICON[p.category] || '📦') +
        '<span class="badge-corner">' + typeBadge + '</span>';
    }
    if (p.status === 'resolved') {
      thumb += '<div class="badge-resolved-corner">' + U.statusLabel(p) + '</div>';
    }
    thumb += '</div>';

    return '<article class="post-card" data-id="' + U.escapeHtml(p.id) + '">' +
      thumb +
      '<div class="post-body">' +
        '<div class="post-title">' + U.highlight(U.truncate(p.itemName, 24), keyword) + '</div>' +
        '<div class="post-meta">' +
          '<span>🏷️ <span class="badge badge-category">' + U.categoryLabel(p.category) + '</span></span>' +
          '<span>📍 ' + U.highlight(U.escapeHtml(p.location), keyword) + '</span>' +
          '<span>🗓️ ' + U.escapeHtml(p.eventDate) + '</span>' +
        '</div>' +
        '<div class="post-foot">' +
          statusBadge +
          '<span class="post-time">' + U.timeAgo(p.createdAt) + '</span>' +
        '</div>' +
      '</div></article>';
  }

  /* -------------------------------- 渲染列表 -------------------------------- */
  function renderList() {
    var all = store.getAll();
    var list = U.filterPosts(all, state);
    var grid = document.getElementById('post-grid');
    var empty = document.getElementById('empty');

    document.getElementById('result-count').textContent =
      '共找到 ' + list.length + ' 条信息（系统共 ' + all.length + ' 条）';

    if (list.length === 0) {
      grid.innerHTML = '';
      empty.style.display = 'block';
      var hasCondition = state.keyword || state.type !== 'all' || state.category !== 'all' ||
        state.status !== 'all' || state.location;
      document.getElementById('empty-tip').textContent = hasCondition
        ? '没有符合当前筛选条件的信息，试试更换关键词或点击“重置条件”。'
        : '目前还没有任何信息，快来发布第一条吧。';
      return;
    }
    empty.style.display = 'none';
    grid.innerHTML = list.map(function (p) { return cardHtml(p, state.keyword); }).join('');

    grid.querySelectorAll('.post-card').forEach(function (card) {
      card.addEventListener('click', function () {
        location.href = 'detail.html?id=' + encodeURIComponent(card.getAttribute('data-id'));
      });
    });
  }

  /* -------------------------------- 事件绑定 -------------------------------- */
  function bindEvents() {
    var kwInput = document.getElementById('keyword');
    var locInput = document.getElementById('location');

    function refresh() {
      state.keyword = kwInput.value;
      state.location = locInput.value;
      renderList();
    }

    document.getElementById('btn-search').addEventListener('click', refresh);
    kwInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') refresh(); });
    locInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') refresh(); });
    kwInput.addEventListener('input', refresh);
    locInput.addEventListener('input', refresh);

    document.getElementById('category').addEventListener('change', function (e) {
      state.category = e.target.value; renderList();
    });
    document.getElementById('status').addEventListener('change', function (e) {
      state.status = e.target.value; renderList();
    });

    document.getElementById('type-tabs').addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-type]');
      if (!btn) return;
      this.querySelectorAll('button').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      state.type = btn.getAttribute('data-type');
      renderList();
    });

    document.getElementById('btn-reset').addEventListener('click', function () {
      kwInput.value = ''; locInput.value = '';
      document.getElementById('category').value = 'all';
      document.getElementById('status').value = 'all';
      document.querySelectorAll('#type-tabs button').forEach(function (b, i) {
        b.classList.toggle('active', i === 0);
      });
      state = { keyword: '', type: 'all', category: 'all', status: 'all', location: '' };
      renderList();
      toast('已重置筛选条件');
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    renderStats();
    bindEvents();
    renderList();
  });
})();
