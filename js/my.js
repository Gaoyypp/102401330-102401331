/**
 * my.js —— 我的发布：查看本人发布、更新状态（已找到 / 已归还 / 重新开放）
 */
(function () {
  'use strict';
  var U = AppUtils;
  var store = Store.getDefaultStore();
  store.seedIfEmpty(); // 直接打开本页时也保证有演示数据

  function itemHtml(p) {
    var isLost = p.type === 'lost';
    var resolved = p.status === 'resolved';
    var endLabel = U.statusLabel(p);

    var typeBadge = isLost
      ? '<span class="badge badge-lost">🧡 寻物</span>'
      : '<span class="badge badge-found">💙 招领</span>';
    var statusBadge = resolved
      ? '<span class="badge badge-resolved">✅ ' + endLabel + '</span>'
      : '<span class="badge badge-active">⏳ 进行中</span>';

    var iconBg = isLost ? 'thumb-lost' : 'thumb-found';
    var stateBtn = resolved
      ? '<button class="btn btn-outline btn-sm btn-reopen" data-id="' + U.escapeHtml(p.id) + '">↩️ 重新开放</button>'
      : '<button class="btn btn-success btn-sm btn-resolve" data-id="' + U.escapeHtml(p.id) +
        '">✅ 标记为「' + (isLost ? '已找到' : '已归还') + '」</button>';

    return '<div class="my-item">' +
      '<div class="mi-ico ' + iconBg + '">' + (window.CATEGORY_ICON[p.category] || '📦') + '</div>' +
      '<div class="mi-main">' +
        '<div class="mi-title">' + typeBadge + ' ' + U.escapeHtml(p.itemName) + ' ' + statusBadge + '</div>' +
        '<div class="mi-sub">📍 ' + U.escapeHtml(p.location) + '　🗓️ ' + U.escapeHtml(p.eventDate) +
          '　🕒 发布于 ' + U.timeAgo(p.createdAt) +
          (resolved && p.resolvedAt ? '　✔ 结束于 ' + U.timeAgo(p.resolvedAt) : '') +
        '</div>' +
      '</div>' +
      '<div class="mi-actions">' +
        '<a class="btn btn-ghost btn-sm" href="detail.html?id=' + encodeURIComponent(p.id) + '">查看详情</a>' +
        stateBtn +
      '</div>' +
    '</div>';
  }

  function render() {
    var mine = store.getMine();
    var list = document.getElementById('my-list');
    var empty = document.getElementById('empty');
    if (mine.length === 0) {
      list.innerHTML = '';
      empty.style.display = 'block';
      return;
    }
    empty.style.display = 'none';
    list.innerHTML = mine.map(itemHtml).join('');

    list.querySelectorAll('.btn-resolve').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-id');
        var p = store.getById(id);
        if (!p) return;
        var word = p.type === 'lost' ? '已找到' : '已归还';
        if (!window.confirm('确认将「' + p.itemName + '」标记为「' + word + '」吗？')) return;
        var r = store.updateStatus(id, 'resolved');
        if (r.ok) { toast('已标记为「' + word + '」', 'success'); render(); }
        else toast(r.error || '操作失败', 'error');
      });
    });

    list.querySelectorAll('.btn-reopen').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-id');
        if (!window.confirm('确认将这条信息重新标记为「进行中」吗？')) return;
        var r = store.updateStatus(id, 'active');
        if (r.ok) { toast('已重新开放', 'success'); render(); }
        else toast(r.error || '操作失败', 'error');
      });
    });
  }

  document.addEventListener('DOMContentLoaded', render);
})();
