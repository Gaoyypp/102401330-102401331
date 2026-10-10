/**
 * detail.js —— 详情页：完整信息展示、一键复制联系方式、发布者更新状态
 */
(function () {
  'use strict';
  var U = AppUtils;
  var store = Store.getDefaultStore();

  function getIdFromUrl() {
    var m = location.search.match(/[?&]id=([^&]+)/);
    return m ? decodeURIComponent(m[1]) : '';
  }

  function render(post) {
    var isLost = post.type === 'lost';
    var resolved = post.status === 'resolved';
    var isOwner = store.canManage(post);
    var endLabel = isLost ? '已找到' : '已归还'; // 结束动作文案随类型变化
    var currentLabel = U.statusLabel(post);      // 当前状态文案：进行中 / 已找到 / 已归还

    var typeBadge = isLost
      ? '<span class="badge badge-lost">🧡 寻物启事</span>'
      : '<span class="badge badge-found">💙 失物招领</span>';
    var statusBadge = resolved
      ? '<span class="badge badge-resolved">✅ ' + endLabel + '</span>'
      : '<span class="badge badge-active">⏳ 进行中</span>';

    var imgHtml = post.image
      ? '<img class="detail-img show" src="' + post.image + '" alt="物品照片">'
      : '';

    var resolvedBanner = resolved
      ? '<div style="background:var(--success-light);border:1px solid #86efac;color:#15803d;' +
        'border-radius:10px;padding:12px 16px;margin-bottom:14px;font-size:14.5px;">' +
        '✅ 该信息已被发布者标记为「' + endLabel + '」，流程已结束，<b>请勿再重复联系</b>。</div>'
      : '';

    var ownerPanel = '';
    if (isOwner) {
      var actionBtn = resolved
        ? '<button class="btn btn-outline btn-block" id="btn-reopen">↩️ 重新开放（标记为进行中）</button>'
        : '<button class="btn btn-success btn-block" id="btn-resolve">✅ 标记为「' + endLabel + '」</button>';
      ownerPanel =
        '<div class="owner-tip">🔒 你是这条信息的发布者，可在物品找回 / 归还后更新状态，更新后其他用户将在列表和详情页看到结果。</div>' +
        actionBtn +
        '<button class="btn btn-danger-outline btn-sm btn-block" id="btn-delete" style="margin-top:8px;">🗑 删除此信息</button>';
    }

    var html =
      resolvedBanner +
      '<div class="detail-wrap">' +
        '<div class="detail-main">' +
          imgHtml +
          '<div class="detail-badges">' + typeBadge + statusBadge +
            '<span class="badge badge-category">' + U.categoryLabel(post.category) + '</span>' +
          '</div>' +
          '<h1 class="detail-title">' + U.escapeHtml(post.itemName) + '</h1>' +
          '<table class="detail-table">' +
            '<tr><th>相关地点</th><td>📍 ' + U.escapeHtml(post.location) + '</td></tr>' +
            '<tr><th>' + (isLost ? '遗失日期' : '拾取日期') + '</th><td>🗓️ ' + U.escapeHtml(post.eventDate) + '</td></tr>' +
            '<tr><th>发布时间</th><td>' + new Date(post.createdAt).toLocaleString('zh-CN') +
              '（' + U.timeAgo(post.createdAt) + '）</td></tr>' +
            (resolved && post.resolvedAt
              ? '<tr><th>结束时间</th><td>' + new Date(post.resolvedAt).toLocaleString('zh-CN') + '</td></tr>' : '') +
            '<tr><th>信息编号</th><td><code>' + U.escapeHtml(post.id) + '</code></td></tr>' +
          '</table>' +
          '<h3 style="font-size:15px;margin:14px 0 2px;">详细描述</h3>' +
          '<div class="detail-desc">' + U.escapeHtml(post.description) + '</div>' +
        '</div>' +

        '<aside class="detail-side">' +
          '<div class="side-card">' +
            '<h3>📞 联系发布者</h3>' +
            (resolved ? '<div class="owner-tip" style="margin-top:0;">该信息已结束，如仍有疑问可礼貌联系核实。</div>' : '') +
            '<div class="contact-box">' +
              '<div class="c-name">' + U.escapeHtml(post.contactName) + '（发布者）</div>' +
              '<div class="c-val" id="contact-val">' + U.escapeHtml(post.contact) + '</div>' +
              '<button class="btn btn-primary btn-sm btn-block" id="btn-copy">📋 一键复制联系方式</button>' +
            '</div>' +
            ownerPanel +
            '<a class="btn btn-ghost btn-sm btn-block" style="margin-top:10px;" href="index.html">返回信息列表</a>' +
          '</div>' +
        '</aside>' +
      '</div>';

    document.getElementById('detail-area').innerHTML = html;

    /* 复制联系方式 */
    document.getElementById('btn-copy').addEventListener('click', function () {
      var text = '联系人：' + post.contactName + '\n联系方式：' + post.contact +
        '\n物品：' + post.itemName + '（信息编号 ' + post.id + '）';
      copyText(text, '联系方式已复制，可直接粘贴给对方');
    });

    /* 发布者：标记结束 */
    var btnResolve = document.getElementById('btn-resolve');
    if (btnResolve) {
      btnResolve.addEventListener('click', function () {
        var tip = isLost
          ? '确认已找回该物品吗？\n确认后该信息将被标记为「已找到」，其他用户将看到结束状态。'
          : '确认已将物品归还失主吗？\n确认后该信息将被标记为「已归还」，其他用户将看到结束状态。';
        if (!window.confirm(tip)) return;
        var r = store.updateStatus(post.id, 'resolved');
        if (r.ok) { toast('已标记为「' + endLabel + '」', 'success'); setTimeout(function () { location.reload(); }, 700); }
        else toast(r.error || '操作失败', 'error');
      });
    }

    /* 发布者：重新开放 */
    var btnReopen = document.getElementById('btn-reopen');
    if (btnReopen) {
      btnReopen.addEventListener('click', function () {
        if (!window.confirm('确认将这条信息重新标记为「进行中」吗？')) return;
        var r = store.updateStatus(post.id, 'active');
        if (r.ok) { toast('已重新开放', 'success'); setTimeout(function () { location.reload(); }, 700); }
        else toast(r.error || '操作失败', 'error');
      });
    }

    /* 发布者：删除该信息 */
    var btnDelete = document.getElementById('btn-delete');
    if (btnDelete) {
      btnDelete.addEventListener('click', function () {
        if (!window.confirm('确认删除「' + post.itemName + '」吗？\n删除后该信息将从列表消失且无法恢复。')) return;
        var r = store.remove(post.id);
        if (r.ok) {
          toast('已删除', 'success');
          setTimeout(function () { location.href = 'my-posts.html'; }, 700);
        } else {
          toast(r.error || '删除失败', 'error');
        }
      });
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    var id = getIdFromUrl();
    var post = id ? store.getById(id) : null;
    if (!post) {
      document.getElementById('not-found').style.display = 'block';
      document.getElementById('detail-area').innerHTML = '';
      return;
    }
    render(post);
  });
})();
