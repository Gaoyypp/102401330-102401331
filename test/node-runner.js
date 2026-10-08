/**
 * node-runner.js —— 零依赖的 Node 测试运行器
 * 作用：复用 test/tests.js 中同一套用例，在命令行 / 每日构建中自动执行。
 * 运行：node test/node-runner.js   （全部通过时退出码 0，存在失败时退出码 1）
 *
 * 说明：浏览器环境使用 Mocha + Chai 打开 test/tests.html；
 *      此处仅用 Node 内置 assert 实现与 Mocha 兼容的 describe/it 最小接口。
 */
'use strict';
const assert = require('assert');
const AppUtils = require('../js/utils');
const StoreMod = require('../js/storage');
const factory = require('./tests');

let passed = 0;
let failed = 0;
const failures = [];

function describe(name, fn) {
  console.log('\n■ ' + name);
  fn();
}

function it(name, fn) {
  try {
    fn();
    passed += 1;
    console.log('  ✓ ' + name);
  } catch (e) {
    failed += 1;
    failures.push({ name: name, error: e });
    console.log('  ✗ ' + name);
    console.log('      ' + (e && e.message ? e.message : e));
  }
}

factory(describe, it, assert, AppUtils, StoreMod);

console.log('\n========================================');
console.log('测试结果：通过 ' + passed + ' 个，失败 ' + failed + ' 个，共 ' + (passed + failed) + ' 个');
if (failed > 0) {
  console.log('----------------------------------------');
  failures.forEach(function (f) {
    console.log('✗ ' + f.name);
    console.log('  ' + (f.error && f.error.stack ? f.error.stack.split('\n').slice(0, 2).join('\n  ') : f.error));
  });
  process.exit(1);
} else {
  console.log('✅ 全部测试通过');
  process.exit(0);
}
