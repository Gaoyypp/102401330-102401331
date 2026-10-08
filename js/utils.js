/**
 * utils.js —— 校园失物招领系统的纯逻辑工具函数
 * 不依赖 DOM / localStorage，可直接在 Node 与浏览器中被单元测试引用。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AppUtils = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /** 物品类别字典（value => 中文文案） */
  var CATEGORIES = {
    card: '证件卡片',
    electronics: '电子设备',
    books: '书籍文具',
    keys: '钥匙',
    clothing: '衣物配饰',
    other: '其他物品'
  };

  /** 信息类型字典 */
  var TYPES = {
    lost: '寻物启事',
    found: '失物招领'
  };

  /** 信息状态字典 */
  var STATUS = {
    active: '进行中',
    resolved: '已结束'
  };

  var CATEGORY_KEYS = Object.keys(CATEGORIES);
  var TYPE_KEYS = Object.keys(TYPES);

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  /** Date / 时间戳 => YYYY-MM-DD */
  function formatDate(input) {
    var d = input instanceof Date ? input : new Date(input);
    if (isNaN(d.getTime())) return '';
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  /** 今天的 YYYY-MM-DD（本地时区） */
  function todayStr() {
    return formatDate(new Date());
  }

  /**
   * 生成信息编号，形如 LF20261009183012A3F9
   * 前缀 LF + 14 位时间 + 4 位随机大写字母数字
   */
  function generateId() {
    var d = new Date();
    var ts = '' + d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate()) +
      pad2(d.getHours()) + pad2(d.getMinutes()) + pad2(d.getSeconds());
    var rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return 'LF' + ts + rand;
  }

  /** HTML 转义，防止 XSS（用户输入渲染到页面前必须经过此函数） */
  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /** 超长文本截断 */
  function truncate(str, len) {
    var s = String(str == null ? '' : str);
    return s.length > len ? s.slice(0, len) + '…' : s;
  }

  /**
   * 校验联系方式。
   * 支持：手机号、QQ 号、微信号、邮箱，以及“微信：xxx”这类带标签的写法。
   */
  function isValidContact(raw) {
    var s = String(raw == null ? '' : raw).trim();
    if (!s || s.length < 5 || s.length > 50) return false;

    // 11 位手机号
    if (/^1[3-9]\d{9}$/.test(s)) return true;
    // QQ 号：5~12 位数字，首位非 0
    if (/^[1-9]\d{4,11}$/.test(s)) return true;
    // 微信号：6~20 位，字母开头，可含字母、数字、减号、下划线
    if (/^[a-zA-Z][a-zA-Z0-9_-]{5,19}$/.test(s)) return true;
    // 邮箱
    if (/^[\w.+-]+@[\w-]+(\.[\w-]+)+$/.test(s)) return true;

    // 带标签形式，例如 “微信：zhang_san2026”“电话 13800001111”
    var m = s.match(/^(电话|手机|微信|wx|vx|QQ|qq|邮箱|email|e-mail)\s*[:：]?\s*(.+)$/i);
    if (m) {
      var body = m[2].trim();
      if (body.length < 5 || body.length > 40) return false;
      return /^[\w.@\-\u4e00-\u9fa5]{5,40}$/.test(body);
    }
    return false;
  }

  /**
   * 校验一条发布信息（白盒测试重点函数）。
   * @returns {{valid:boolean, errors:string[]}}
   */
  function validatePost(data) {
    var errors = [];
    data = data || {};

    if (TYPE_KEYS.indexOf(data.type) === -1) {
      errors.push('请选择信息类型（寻物启事或失物招领）');
    }

    var itemName = String(data.itemName || '').trim();
    if (!itemName) {
      errors.push('物品名称不能为空');
    } else if (itemName.length > 30) {
      errors.push('物品名称不能超过 30 个字');
    }

    if (CATEGORY_KEYS.indexOf(data.category) === -1) {
      errors.push('请选择物品类别');
    }

    var location = String(data.location || '').trim();
    if (!location) {
      errors.push('相关地点不能为空');
    } else if (location.length > 30) {
      errors.push('相关地点不能超过 30 个字');
    }

    if (!data.eventDate) {
      errors.push('请选择日期');
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(data.eventDate)) {
      errors.push('日期格式不正确');
    } else if (data.eventDate > todayStr()) {
      errors.push('日期不能晚于今天');
    }

    var description = String(data.description || '').trim();
    if (description.length < 5) {
      errors.push('详细描述至少需要 5 个字');
    } else if (description.length > 200) {
      errors.push('详细描述不能超过 200 个字');
    }

    var contactName = String(data.contactName || '').trim();
    if (!contactName) {
      errors.push('联系人称呼不能为空');
    } else if (contactName.length > 10) {
      errors.push('联系人称呼不能超过 10 个字');
    }

    if (!String(data.contact || '').trim()) {
      errors.push('联系方式不能为空');
    } else if (!isValidContact(data.contact)) {
      errors.push('联系方式格式不正确，请填写手机号 / QQ号 / 微信号 / 邮箱，或“微信：账号”形式');
    }

    return { valid: errors.length === 0, errors: errors };
  }

  /**
   * 关键词命中判断：关键词按空白拆成多个词，全部命中才算匹配（AND 语义）。
   * 在物品名称、地点、描述、联系人称呼中查找。
   */
  function matchKeyword(post, keyword) {
    var kw = String(keyword || '').trim().toLowerCase();
    if (!kw) return true;
    var terms = kw.split(/\s+/).filter(Boolean);
    var haystack = [post.itemName, post.location, post.description, post.contactName]
      .join(' ').toLowerCase();
    return terms.every(function (t) { return haystack.indexOf(t) !== -1; });
  }

  /**
   * 列表筛选 + 排序（白盒测试重点函数）。
   * @param {Array} posts 信息列表
   * @param {Object} cond { keyword, type, category, location, status }
   * 排序规则：进行中优先于已结束；同状态下新发布在前。
   */
  function filterPosts(posts, cond) {
    cond = cond || {};
    var result = (posts || []).slice();

    if (cond.type && cond.type !== 'all') {
      result = result.filter(function (p) { return p.type === cond.type; });
    }
    if (cond.category && cond.category !== 'all') {
      result = result.filter(function (p) { return p.category === cond.category; });
    }
    if (cond.status && cond.status !== 'all') {
      result = result.filter(function (p) { return p.status === cond.status; });
    }
    if (cond.location && String(cond.location).trim()) {
      var loc = String(cond.location).trim().toLowerCase();
      result = result.filter(function (p) {
        return String(p.location || '').toLowerCase().indexOf(loc) !== -1;
      });
    }
    if (cond.keyword && String(cond.keyword).trim()) {
      result = result.filter(function (p) { return matchKeyword(p, cond.keyword); });
    }

    result.sort(function (a, b) {
      if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
    return result;
  }

  /** 相对时间：刚刚 / x分钟前 / x小时前 / x天前 / YYYY-MM-DD */
  function timeAgo(input, now) {
    var ts = input instanceof Date ? input.getTime() : Number(input);
    if (isNaN(ts)) return '';
    var base = now == null ? Date.now() : (now instanceof Date ? now.getTime() : Number(now));
    var diff = base - ts;
    if (diff < 0) diff = 0;
    var MIN = 60 * 1000, HOUR = 60 * MIN, DAY = 24 * HOUR;
    if (diff < MIN) return '刚刚';
    if (diff < HOUR) return Math.floor(diff / MIN) + ' 分钟前';
    if (diff < DAY) return Math.floor(diff / HOUR) + ' 小时前';
    if (diff < 7 * DAY) return Math.floor(diff / DAY) + ' 天前';
    return formatDate(new Date(ts));
  }

  /** 状态文案：寻物已结束 => 已找到；招领已结束 => 已归还 */
  function statusLabel(post) {
    if (!post) return '';
    if (post.status === 'resolved') return post.type === 'lost' ? '已找到' : '已归还';
    return '进行中';
  }

  function typeLabel(type) {
    return TYPES[type] || type;
  }

  function categoryLabel(category) {
    return CATEGORIES[category] || category;
  }

  /**
   * 搜索关键词高亮（先转义再包裹 <mark>，保证 XSS 安全）。
   */
  function highlight(text, keyword) {
    var safe = escapeHtml(text);
    var kw = String(keyword || '').trim();
    if (!kw) return safe;
    var terms = kw.split(/\s+/).filter(Boolean).map(escapeHtml);
    terms.forEach(function (t) {
      if (!t) return;
      safe = safe.replace(new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'),
        '<mark>$1</mark>');
    });
    return safe;
  }

  /** 统计各状态 / 类型数量，用于首页概览卡片 */
  function summarize(posts) {
    var s = { total: 0, lost: 0, found: 0, active: 0, resolved: 0 };
    (posts || []).forEach(function (p) {
      s.total++;
      if (p.type === 'lost') s.lost++;
      if (p.type === 'found') s.found++;
      if (p.status === 'resolved') s.resolved++; else s.active++;
    });
    return s;
  }

  return {
    CATEGORIES: CATEGORIES,
    TYPES: TYPES,
    STATUS: STATUS,
    pad2: pad2,
    formatDate: formatDate,
    todayStr: todayStr,
    generateId: generateId,
    escapeHtml: escapeHtml,
    truncate: truncate,
    isValidContact: isValidContact,
    validatePost: validatePost,
    matchKeyword: matchKeyword,
    filterPosts: filterPosts,
    timeAgo: timeAgo,
    statusLabel: statusLabel,
    typeLabel: typeLabel,
    categoryLabel: categoryLabel,
    highlight: highlight,
    summarize: summarize
  };
});
