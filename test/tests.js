/**
 * tests.js —— 校园失物招领 单元测试用例
 * 浏览器：打开 test/tests.html（Mocha + Chai，本地 lib，无需联网）
 * Node  ：node test/node-runner.js（零依赖，便于命令行 / 每日构建自动执行）
 *
 * 被测函数：
 *   AppUtils.generateId / formatDate / escapeHtml / truncate / timeAgo /
 *   statusLabel / isValidContact / validatePost / matchKeyword /
 *   filterPosts / highlight / summarize
 *   Store.add / getById / updateStatus / getMine / canManage / seed / clear
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory;
  } else {
    factory(root.describe, root.it, root.chai.assert, root.AppUtils, root.Store);
  }
})(typeof self !== 'undefined' ? self : this, function (describe, it, assert, AppUtils, StoreMod) {
  'use strict';

  /** 构造一条合法表单数据（白盒测试基线数据） */
  function validPost(over) {
    var base = {
      type: 'lost',
      itemName: '校园卡',
      category: 'card',
      location: '图书馆三楼',
      eventDate: AppUtils.todayStr(),
      description: '卡面贴有哆啦A梦贴纸的校园卡，测试用描述。',
      image: '',
      contactName: '张同学',
      contact: '13800138000'
    };
    Object.keys(over || {}).forEach(function (k) { base[k] = over[k]; });
    return base;
  }

  /* ============================ 1. 编号与格式化 ============================ */
  describe('【1】编号生成与日期格式化', function () {
    it('generateId 应以 LF 开头且全局唯一', function () {
      var ids = {};
      for (var i = 0; i < 100; i++) {
        var id = AppUtils.generateId();
        assert.equal(id.slice(0, 2), 'LF');
        assert.ok(id.length >= 18, '编号长度应包含时间戳与随机串');
        assert.ok(!ids[id], '编号不应重复：' + id);
        ids[id] = 1;
      }
    });

    it('formatDate 应输出 YYYY-MM-DD，并对非法输入返回空串', function () {
      assert.equal(AppUtils.formatDate(new Date(2026, 9, 9)), '2026-10-09');
      assert.equal(AppUtils.formatDate('not-a-date'), '');
    });
  });

  /* ============================== 2. 安全与截断 ============================== */
  describe('【2】HTML 转义与文本截断（XSS 防护）', function () {
    it('escapeHtml 应转义 & < > " \' 五类危险字符', function () {
      var s = AppUtils.escapeHtml('<script>alert("xss")</script>&\'');
      assert.ok(s.indexOf('<script>') === -1);
      assert.ok(s.indexOf('&lt;script&gt;') !== -1);
      assert.ok(s.indexOf('&quot;') !== -1);
      assert.ok(s.indexOf('&#39;') !== -1);
      assert.ok(s.indexOf('&amp;') !== -1);
    });

    it('truncate 超长才截断并补省略号', function () {
      assert.equal(AppUtils.truncate('abcdef', 10), 'abcdef');
      assert.equal(AppUtils.truncate('abcdef', 4), 'abcd…');
    });

    it('highlight 应先转义再包裹 mark，不能产生可执行标签', function () {
      var html = AppUtils.highlight('<b>校园卡</b>', '校园卡');
      assert.ok(html.indexOf('<b>') === -1, '原始 HTML 必须被转义');
      assert.ok(html.indexOf('<mark>校园卡</mark>') !== -1);
    });
  });

  /* ============================== 3. 相对时间 ============================== */
  describe('【3】timeAgo 相对时间', function () {
    var now = new Date('2026-10-09T12:00:00+08:00').getTime();
    it('1 分钟内显示“刚刚”', function () {
      assert.equal(AppUtils.timeAgo(now - 20 * 1000, now), '刚刚');
    });
    it('分钟 / 小时 / 天粒度正确', function () {
      assert.equal(AppUtils.timeAgo(now - 5 * 60 * 1000, now), '5 分钟前');
      assert.equal(AppUtils.timeAgo(now - 3 * 3600 * 1000, now), '3 小时前');
      assert.equal(AppUtils.timeAgo(now - 2 * 86400 * 1000, now), '2 天前');
    });
    it('超过 7 天回退为日期', function () {
      assert.equal(AppUtils.timeAgo(now - 10 * 86400 * 1000, now),
        AppUtils.formatDate(now - 10 * 86400 * 1000));
    });
    it('未来时间按 0 处理为“刚刚”，不出现负数', function () {
      assert.equal(AppUtils.timeAgo(now + 9999, now), '刚刚');
    });
  });

  /* ============================== 4. 状态文案 ============================== */
  describe('【4】statusLabel 状态文案随类型变化', function () {
    it('寻物结束=已找到，招领结束=已归还', function () {
      assert.equal(AppUtils.statusLabel({ type: 'lost', status: 'resolved' }), '已找到');
      assert.equal(AppUtils.statusLabel({ type: 'found', status: 'resolved' }), '已归还');
    });
    it('进行中统一显示“进行中”', function () {
      assert.equal(AppUtils.statusLabel({ type: 'lost', status: 'active' }), '进行中');
      assert.equal(AppUtils.statusLabel({ type: 'found', status: 'active' }), '进行中');
    });
  });

  /* ============================= 5. 联系方式校验 ============================= */
  describe('【5】isValidContact 联系方式格式校验', function () {
    it('合法的手机号 / QQ / 微信 / 邮箱 / 带标签写法均通过', function () {
      ['13800138000', '2783109456', 'zhang_san2026', 'test@example.com',
        '微信：linlin2026', 'QQ: 12345678']
        .forEach(function (c) {
          assert.ok(AppUtils.isValidContact(c), '应通过：' + c);
        });
    });
    it('非法联系方式被拒绝', function () {
      ['', '   ', '123', 'abc', '手机', '12345678901234567890123456789012345678901234567890x',
        '哈哈哈@@@', null, undefined]
        .forEach(function (c) {
          assert.equal(AppUtils.isValidContact(c), false, '应拒绝：' + c);
        });
    });
  });

  /* ============================== 6. 发布校验 ============================== */
  describe('【6】validatePost 发布信息整体校验', function () {
    it('完整合法数据校验通过', function () {
      var r = AppUtils.validatePost(validPost());
      assert.equal(r.valid, true);
      assert.equal(r.errors.length, 0);
    });

    it('缺少必填字段时逐条报错', function () {
      var r = AppUtils.validatePost({});
      assert.equal(r.valid, false);
      ['信息类型', '物品名称', '物品类别', '地点', '日期', '详细描述', '联系人称呼', '联系方式']
        .forEach(function (kw) {
          assert.ok(r.errors.some(function (e) { return e.indexOf(kw) !== -1; }),
            '应包含“' + kw + '”相关错误');
        });
    });

    it('物品名称、地点、联系人、描述存在长度边界', function () {
      var longName = { itemName: new Array(32).join('名') };          // 31 字
      var r1 = AppUtils.validatePost(validPost(longName));
      assert.equal(r1.valid, false);
      assert.ok(r1.errors.some(function (e) { return e.indexOf('物品名称') !== -1; }));

      var r2 = AppUtils.validatePost(validPost({ description: '12字' })); // 3 字
      assert.ok(r2.errors.some(function (e) { return e.indexOf('详细描述') !== -1; }));

      var r3 = AppUtils.validatePost(validPost({ contactName: new Array(12).join('人') }));
      assert.ok(r3.errors.some(function (e) { return e.indexOf('联系人称呼') !== -1; }));
    });

    it('日期不能晚于今天、格式必须合法', function () {
      var r1 = AppUtils.validatePost(validPost({ eventDate: '2099-01-01' }));
      assert.ok(r1.errors.some(function (e) { return e.indexOf('晚于今天') !== -1; }));
      var r2 = AppUtils.validatePost(validPost({ eventDate: '10/09/2026' }));
      assert.ok(r2.errors.some(function (e) { return e.indexOf('日期格式') !== -1; }));
    });

    it('非法联系方式给出明确错误，合法带标签方式通过', function () {
      var r1 = AppUtils.validatePost(validPost({ contact: 'abc' }));
      assert.equal(r1.valid, false);
      var r2 = AppUtils.validatePost(validPost({ contact: '微信：myname2026' }));
      assert.equal(r2.valid, true);
    });

    it('类型与类别必须在枚举范围内（防篡改）', function () {
      var r = AppUtils.validatePost(validPost({ type: 'hacked', category: 'weapon' }));
      assert.equal(r.valid, false);
      assert.equal(r.errors.length, 2);
    });
  });

  /* ============================== 7. 搜索筛选 ============================== */
  describe('【7】搜索与筛选 filterPosts / matchKeyword', function () {
    var posts = [
      { id: '1', type: 'lost', category: 'card', location: '图书馆三楼', itemName: '校园卡',
        description: '哆啦A梦贴纸', contactName: '张三', status: 'active', createdAt: 1000 },
      { id: '2', type: 'found', category: 'other', location: '第二食堂', itemName: '黑色雨伞',
        description: '折叠伞', contactName: '李四', status: 'active', createdAt: 2000 },
      { id: '3', type: 'lost', category: 'electronics', location: '东区篮球场', itemName: 'AirPods充电盒',
        description: '白色', contactName: '王五', status: 'resolved', createdAt: 3000 },
      { id: '4', type: 'found', category: 'books', location: '教2-304', itemName: '高等数学教材',
        description: '夹着四级准考证', contactName: '赵六', status: 'active', createdAt: 4000 }
    ];

    it('关键词命中名称 / 描述 / 地点，且多关键词为 AND 语义', function () {
      assert.ok(AppUtils.matchKeyword(posts[0], '校园卡'));
      assert.ok(AppUtils.matchKeyword(posts[0], '校园卡 图书馆'));
      assert.equal(AppUtils.matchKeyword(posts[0], '校园卡 食堂'), false);
      assert.ok(AppUtils.matchKeyword(posts[3], '准考证'));
      assert.ok(AppUtils.matchKeyword(posts[0], ''), '空关键词视为全部命中');
    });

    it('按类型 / 类别 / 状态筛选数量正确', function () {
      assert.equal(AppUtils.filterPosts(posts, { type: 'lost' }).length, 2);
      assert.equal(AppUtils.filterPosts(posts, { type: 'found' }).length, 2);
      assert.equal(AppUtils.filterPosts(posts, { category: 'card' }).length, 1);
      assert.equal(AppUtils.filterPosts(posts, { status: 'resolved' }).length, 1);
      assert.equal(AppUtils.filterPosts(posts, { type: 'lost', status: 'active' }).length, 1);
    });

    it('地点支持模糊包含匹配', function () {
      assert.equal(AppUtils.filterPosts(posts, { location: '图书馆' }).length, 1);
      assert.equal(AppUtils.filterPosts(posts, { location: '教' }).length, 1);
    });

    it('组合条件：招领 + 关键词“教材”', function () {
      var r = AppUtils.filterPosts(posts, { type: 'found', keyword: '教材' });
      assert.equal(r.length, 1);
      assert.equal(r[0].id, '4');
    });

    it('无结果返回空数组（页面据此显示空状态）', function () {
      var r = AppUtils.filterPosts(posts, { keyword: '不存在的物品xyz' });
      assert.ok(Array.isArray(r));
      assert.equal(r.length, 0);
    });

    it('排序：进行中在前，同状态下新发布在前', function () {
      var r = AppUtils.filterPosts(posts, {});
      assert.equal(r[0].id, '4', '进行中且最新');
      assert.equal(r[r.length - 1].id, '3', '已结束沉底');
    });
  });

  /* ============================== 8. 统计 ============================== */
  describe('【8】summarize 概览统计', function () {
    it('总数 / 寻物 / 招领 / 进行中 / 已结束计数正确', function () {
      var posts = [
        { type: 'lost', status: 'active' }, { type: 'lost', status: 'resolved' },
        { type: 'found', status: 'active' }, { type: 'found', status: 'active' }
      ];
      var s = AppUtils.summarize(posts);
      assert.equal(s.total, 4);
      assert.equal(s.lost, 2);
      assert.equal(s.found, 2);
      assert.equal(s.active, 3);
      assert.equal(s.resolved, 1);
    });
  });

  /* ============================== 9. 数据层 ============================== */
  describe('【9】Store 数据访问层（内存存储）', function () {
    var mem = StoreMod.memoryStorage();
    var store = StoreMod.createStore(mem, { postsKey: 'test_posts', userKey: 'test_user' });

    it('add 合法信息成功，自动补全编号、状态与发布者', function () {
      var before = store.getAll().length;
      var r = store.add(validPost());
      assert.equal(r.ok, true);
      assert.ok(r.post.id.slice(0, 2) === 'LF');
      assert.equal(r.post.status, 'active');
      assert.equal(r.post.resolvedAt, null);
      assert.ok(r.post.publisherId.length > 0);
      assert.equal(store.getAll().length, before + 1);
    });

    it('add 非法信息被拒绝，且不写入存储', function () {
      var before = store.getAll().length;
      var r = store.add({});
      assert.equal(r.ok, false);
      assert.ok(r.errors.length >= 5);
      assert.equal(store.getAll().length, before);
    });

    it('getById 命中与未命中', function () {
      var r = store.add(validPost({ itemName: '待查找的钥匙串' }));
      assert.equal(store.getById(r.post.id).itemName, '待查找的钥匙串');
      assert.equal(store.getById('NOT-EXIST'), null);
    });

    it('发布者本人可标记结束并重新开放，时间戳同步更新', function () {
      var r = store.add(validPost({ type: 'found', itemName: '待归还的水杯' }));
      var id = r.post.id;
      var end = store.updateStatus(id, 'resolved');
      assert.equal(end.ok, true);
      assert.equal(store.getById(id).status, 'resolved');
      assert.ok(store.getById(id).resolvedAt > 0);

      var reopen = store.updateStatus(id, 'active');
      assert.equal(reopen.ok, true);
      assert.equal(store.getById(id).status, 'active');
      assert.equal(store.getById(id).resolvedAt, null);
    });

    it('非发布者无权修改状态（换一个用户标识）', function () {
      var r = store.add(validPost({ itemName: '别人的校园卡' }));
      var other = StoreMod.createStore(mem, { postsKey: 'test_posts', userKey: 'test_user_other' });
      var res = other.updateStatus(r.post.id, 'resolved');
      assert.equal(res.ok, false);
      assert.ok(res.error.indexOf('发布者') !== -1);
      assert.equal(store.getById(r.post.id).status, 'active', '原状态不应被改变');
    });

    it('修改不存在的编号或传入非法状态均失败', function () {
      assert.equal(store.updateStatus('NOPE', 'resolved').ok, false);
      var r = store.add(validPost({ itemName: '状态测试物' }));
      assert.equal(store.updateStatus(r.post.id, 'deleted').ok, false);
    });

    it('getMine 只返回当前用户发布的内容，canManage 鉴权一致', function () {
      var mine = store.getMine();
      assert.ok(mine.length >= 4);
      mine.forEach(function (p) { assert.equal(store.canManage(p), true); });
      var other = StoreMod.createStore(mem, { postsKey: 'test_posts', userKey: 'test_user_other' });
      assert.equal(other.canManage(mine[0]), false);
      assert.equal(other.getMine().length, 0);
    });

    it('remove 发布者本人可删除，删除后查不到且列表减一', function () {
      var r = store.add(validPost({ itemName: '待删除的水杯' }));
      var id = r.post.id;
      var before = store.getAll().length;
      var del = store.remove(id);
      assert.equal(del.ok, true);
      assert.equal(store.getById(id), null);
      assert.equal(store.getAll().length, before - 1);
    });

    it('remove 非发布者无权删除，数据保持不变', function () {
      var r = store.add(validPost({ itemName: '别人的雨伞' }));
      var before = store.getAll().length;
      var other = StoreMod.createStore(mem, { postsKey: 'test_posts', userKey: 'test_user_other' });
      var del = other.remove(r.post.id);
      assert.equal(del.ok, false);
      assert.ok(del.error.indexOf('发布者') !== -1);
      assert.equal(store.getAll().length, before, '删除应被拒绝，数量不变');
      assert.ok(store.getById(r.post.id) !== null, '数据应仍然存在');
    });

    it('remove 删除不存在的编号返回失败', function () {
      var before = store.getAll().length;
      var del = store.remove('NOT-EXIST-ID');
      assert.equal(del.ok, false);
      assert.equal(store.getAll().length, before);
    });
  });

  /* ============================= 10. 演示数据 ============================= */
  describe('【10】seed 演示数据与空库初始化', function () {
    it('空库 seedIfEmpty 注入演示数据，再次调用不覆盖', function () {
      var mem = StoreMod.memoryStorage();
      var s = StoreMod.createStore(mem, { postsKey: 'p', userKey: 'u' });
      var seeded = s.seedIfEmpty();
      assert.ok(seeded.length >= 6, '应注入至少 6 条演示数据');
      var n = s.add(validPost());
      var again = s.seedIfEmpty();
      assert.equal(again.length, seeded.length + 1, '已有数据时不允许覆盖用户数据');
      assert.ok(s.getById(n.post.id), '用户新发布的数据必须保留');
    });

    it('演示数据同时包含寻物、招领以及已结束样例', function () {
      var mem = StoreMod.memoryStorage();
      var s = StoreMod.createStore(mem, { postsKey: 'p2', userKey: 'u2' });
      var all = s.seedIfEmpty();
      assert.ok(all.some(function (p) { return p.type === 'lost'; }));
      assert.ok(all.some(function (p) { return p.type === 'found'; }));
      assert.ok(all.some(function (p) { return p.status === 'resolved'; }));
    });
  });
});
