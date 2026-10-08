/**
 * storage.js —— 数据访问层
 * 使用浏览器 localStorage 持久化；为便于单元测试，createStore 支持注入存储实现。
 *
 * 单条信息数据模型：
 * {
 *   id: 'LF2026...',            // 信息编号
 *   type: 'lost'|'found',       // 寻物启事 / 失物招领
 *   itemName: '校园卡',          // 物品名称
 *   category: 'card',           // 类别（见 utils.CATEGORIES）
 *   location: '图书馆三楼',      // 遗失/拾取地点
 *   eventDate: '2026-10-08',    // 遗失/拾取日期
 *   description: '...',         // 详细描述
 *   image: 'data:image/...',    // 可选，单张图片（压缩后的 DataURL）
 *   contactName: '张同学',       // 联系人称呼
 *   contact: '微信：zs2026',     // 联系方式
 *   status: 'active'|'resolved',// 进行中 / 已结束
 *   createdAt: 1728...,         // 发布时间戳
 *   resolvedAt: null|1728...,   // 结束时间戳
 *   publisherId: 'U...'         // 发布者标识（本浏览器自动生成，用于“我的发布”鉴权）
 * }
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./utils'));
  } else {
    root.Store = factory(root.AppUtils);
  }
})(typeof self !== 'undefined' ? self : this, function (AppUtils) {
  'use strict';

  var POSTS_KEY = 'campus_lost_found_posts_v1';
  var USER_KEY = 'campus_lost_found_user_v1';

  /** Node 测试环境用的内存存储 */
  function memoryStorage() {
    var m = {};
    return {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(m, k) ? m[k] : null; },
      setItem: function (k, v) { m[k] = String(v); },
      removeItem: function (k) { delete m[k]; }
    };
  }

  function createStore(storageImpl, opts) {
    var storage = storageImpl ||
      (typeof localStorage !== 'undefined' ? localStorage : memoryStorage());
    opts = opts || {};
    var postsKey = opts.postsKey || POSTS_KEY;
    var userKey = opts.userKey || USER_KEY;

    /* ---------------- 用户标识（模拟登录，仅用于区分“我的发布”） ---------------- */

    function getUserId() {
      var uid = storage.getItem(userKey);
      if (!uid) {
        uid = 'U' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
        storage.setItem(userKey, uid);
      }
      return uid;
    }

    /* ---------------------------------- CRUD ---------------------------------- */

    function getAll() {
      try {
        var raw = storage.getItem(postsKey);
        var arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? arr : [];
      } catch (e) {
        return [];
      }
    }

    function saveAll(posts) {
      storage.setItem(postsKey, JSON.stringify(posts));
    }

    function getById(id) {
      return getAll().filter(function (p) { return p.id === id; })[0] || null;
    }

    /**
     * 新增一条信息。
     * @param {Object} input 表单数据（type/itemName/...）
     * @returns {{ok:boolean, post?:Object, errors?:string[]}}
     */
    function add(input) {
      var result = AppUtils.validatePost(input);
      if (!result.valid) return { ok: false, errors: result.errors };

      var posts = getAll();
      var post = {
        id: AppUtils.generateId(),
        type: input.type,
        itemName: String(input.itemName).trim(),
        category: input.category,
        location: String(input.location).trim(),
        eventDate: input.eventDate,
        description: String(input.description).trim(),
        image: input.image || '',
        contactName: String(input.contactName).trim(),
        contact: String(input.contact).trim(),
        status: 'active',
        createdAt: Date.now(),
        resolvedAt: null,
        publisherId: getUserId()
      };
      posts.unshift(post);
      saveAll(posts);
      return { ok: true, post: post };
    }

    /**
     * 更新状态（仅发布者本人可操作）。
     * @param {string} id 信息编号
     * @param {string} status active | resolved
     */
    function updateStatus(id, status) {
      if (['active', 'resolved'].indexOf(status) === -1) {
        return { ok: false, error: '状态值不合法' };
      }
      var posts = getAll();
      var target = posts.filter(function (p) { return p.id === id; })[0];
      if (!target) return { ok: false, error: '信息不存在' };
      if (target.publisherId !== getUserId()) {
        return { ok: false, error: '只有发布者可以修改状态' };
      }
      target.status = status;
      target.resolvedAt = status === 'resolved' ? Date.now() : null;
      saveAll(posts);
      return { ok: true, post: target };
    }

    /** 当前浏览器用户发布的信息（新发布在前） */
    function getMine() {
      var uid = getUserId();
      return getAll()
        .filter(function (p) { return p.publisherId === uid; })
        .sort(function (a, b) { return b.createdAt - a.createdAt; });
    }

    function canManage(post) {
      return !!post && post.publisherId === getUserId();
    }

    /** 测试辅助：清空 */
    function clear() {
      storage.removeItem(postsKey);
    }

    /* -------------------------------- 演示数据 -------------------------------- */

    function seed() {
      var uid = getUserId();
      var HOUR = 3600 * 1000;
      var now = Date.now();
      var demo = [
        {
          type: 'lost', itemName: '校园卡（卡号尾号 2330）', category: 'card',
          location: '图书馆三楼自习区', eventDate: AppUtils.formatDate(now - 2 * HOUR),
          description: '今天下午在图书馆三楼靠窗座位自习，离开时发现校园卡不见，卡面贴有哆啦A梦贴纸，拾到者请联系，万分感谢！',
          image: '', contactName: '林同学', contact: '微信：linlin2026',
          status: 'active', hoursAgo: 2, mine: false
        },
        {
          type: 'found', itemName: '黑色雨伞一把', category: 'other',
          location: '第二食堂一楼入口', eventDate: AppUtils.formatDate(now - 5 * HOUR),
          description: '中午在第二食堂一楼入口伞桶旁捡到一把黑色折叠伞，伞柄有挂绳，暂时放在食堂服务台，也可直接联系我认领。',
          image: '', contactName: '王同学', contact: 'QQ：2783109456',
          status: 'active', hoursAgo: 5, mine: false
        },
        {
          type: 'lost', itemName: 'AirPods 充电盒', category: 'electronics',
          location: '东区篮球场', eventDate: AppUtils.formatDate(now - 26 * HOUR),
          description: '昨晚在东区篮球场打球后丢失白色 AirPods 充电盒，盒身有轻微划痕，耳机不在盒内。如有同学捡到请喝奶茶！',
          image: '', contactName: '陈同学', contact: '13800138000',
          status: 'active', hoursAgo: 26, mine: true
        },
        {
          type: 'found', itemName: '《高等数学（上册）》教材', category: 'books',
          location: '教学楼 教2-304', eventDate: AppUtils.formatDate(now - 50 * HOUR),
          description: '在教2-304 倒数第二排桌洞里捡到一本《高等数学（上册）》，书内夹有英语四级准考证，请失主尽快联系。',
          image: '', contactName: '赵同学', contact: '微信：zhaozhao_99',
          status: 'active', hoursAgo: 50, mine: false
        },
        {
          type: 'lost', itemName: '一串宿舍钥匙（带小熊挂件）', category: 'keys',
          location: '学生活动中心门口', eventDate: AppUtils.formatDate(now - 75 * HOUR),
          description: '钥匙串上有三把钥匙和一个棕色小熊挂件，对我很重要，捡到请联系，可当面酬谢！',
          image: '', contactName: '吴同学', contact: '微信：wuxiong2026',
          status: 'resolved', hoursAgo: 75, resolvedHoursAgo: 20, mine: true
        },
        {
          type: 'found', itemName: '蓝白拼色双肩包', category: 'clothing',
          location: '校医院门口共享单车车筐', eventDate: AppUtils.formatDate(now - 100 * HOUR),
          description: '在校医院门口共享单车车筐里发现一个蓝白拼色双肩包，内有水杯和笔记本，已交给校医院值班处。',
          image: '', contactName: '孙同学', contact: '邮箱：sunfound@example.com',
          status: 'active', hoursAgo: 100, mine: false
        }
      ];

      var posts = demo.map(function (d, i) {
        return {
          id: 'LFSEED' + AppUtils.pad2(i + 1) + d.type.toUpperCase(),
          type: d.type,
          itemName: d.itemName,
          category: d.category,
          location: d.location,
          eventDate: d.eventDate,
          description: d.description,
          image: d.image,
          contactName: d.contactName,
          contact: d.contact,
          status: d.status,
          createdAt: now - d.hoursAgo * HOUR,
          resolvedAt: d.resolvedHoursAgo ? now - d.resolvedHoursAgo * HOUR : null,
          publisherId: d.mine ? uid : 'U-demo-other-user'
        };
      });
      // 新发布在前
      posts.sort(function (a, b) { return b.createdAt - a.createdAt; });
      saveAll(posts);
      return posts;
    }

    /** 首次访问且无数据时注入演示数据 */
    function seedIfEmpty() {
      if (getAll().length === 0) return seed();
      return getAll();
    }

    return {
      getUserId: getUserId,
      getAll: getAll,
      getById: getById,
      add: add,
      updateStatus: updateStatus,
      getMine: getMine,
      canManage: canManage,
      seed: seed,
      seedIfEmpty: seedIfEmpty,
      clear: clear
    };
  }

  // 浏览器默认单例（直接使用 localStorage）
  var defaultStore = null;
  function getDefaultStore() {
    if (!defaultStore) defaultStore = createStore();
    return defaultStore;
  }

  return {
    createStore: createStore,
    memoryStorage: memoryStorage,
    getDefaultStore: getDefaultStore
  };
});
