/**
 * common.js —— 各页面共用的 UI 辅助方法
 * 依赖：utils.js
 */
(function () {
  'use strict';

  /* --------------------------------- Toast --------------------------------- */
  var toastTimer = null;
  window.toast = function (msg, type) {
    var el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.className = 'show' + (type ? ' toast-' + type : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.className = ''; }, 2200);
  };

  /* ------------------------------ 导航高亮 ------------------------------ */
  window.highlightNav = function () {
    var page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    document.querySelectorAll('.nav-links a').forEach(function (a) {
      var href = (a.getAttribute('href') || '').toLowerCase();
      if (href === page || (page === '' && href === 'index.html')) {
        a.classList.add('active');
      }
    });
  };

  /* ---------------------------- 一键复制文本 ---------------------------- */
  window.copyText = function (text, okMsg) {
    function done() { window.toast(okMsg || '已复制到剪贴板', 'success'); }
    function fail() { window.toast('复制失败，请手动选择文本复制', 'error'); }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(function () {
        fallbackCopy(text) ? done() : fail();
      });
    } else {
      fallbackCopy(text) ? done() : fail();
    }
  };

  function fallbackCopy(text) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (e) { return false; }
  }

  /* --------------------- 图片压缩（FileReader + Canvas） --------------------- */
  /**
   * 将图片文件压缩为 JPEG DataURL，避免 localStorage 超限。
   * @param {File} file 图片文件
   * @param {Object} opt { maxSize: 800, quality: 0.72 }
   * @returns {Promise<string>} dataURL
   */
  window.compressImage = function (file, opt) {
    opt = opt || {};
    var maxSize = opt.maxSize || 800;
    var quality = opt.quality || 0.72;

    return new Promise(function (resolve, reject) {
      if (!file || !/^image\//.test(file.type)) {
        reject(new Error('请选择图片文件'));
        return;
      }
      if (file.size > 8 * 1024 * 1024) {
        reject(new Error('图片不能超过 8MB'));
        return;
      }
      var reader = new FileReader();
      reader.onload = function (e) {
        var img = new Image();
        img.onload = function () {
          var w = img.width, h = img.height;
          if (w > maxSize || h > maxSize) {
            if (w >= h) { h = Math.round(h * maxSize / w); w = maxSize; }
            else { w = Math.round(w * maxSize / h); h = maxSize; }
          }
          var canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          var ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = function () { reject(new Error('图片读取失败')); };
        img.src = e.target.result;
      };
      reader.onerror = function () { reject(new Error('图片读取失败')); };
      reader.readAsDataURL(file);
    });
  };

  /* -------------- 类别对应的大图标（无图片时的卡片占位图） -------------- */
  window.CATEGORY_ICON = {
    card: '🪪',
    electronics: '🎧',
    books: '📚',
    keys: '🔑',
    clothing: '🎒',
    other: '📦'
  };

  document.addEventListener('DOMContentLoaded', window.highlightNav);
})();
