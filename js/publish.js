/**
 * publish.js —— 发布页：类型切换、图片压缩预览、表单校验与提交
 */
(function () {
  'use strict';
  var U = AppUtils;
  var store = Store.getDefaultStore();

  var form = document.getElementById('publish-form');
  var imageData = ''; // 压缩后的图片 DataURL

  /* ------------------------------ 类型大按钮切换 ------------------------------ */
  var typeSwitch = document.getElementById('type-switch');
  typeSwitch.addEventListener('click', function (e) {
    var opt = e.target.closest('.type-option');
    if (!opt) return;
    var type = opt.getAttribute('data-type');
    document.getElementById('type').value = type;
    typeSwitch.querySelectorAll('.type-option').forEach(function (o) {
      o.classList.remove('selected-lost', 'selected-found');
    });
    opt.classList.add(type === 'lost' ? 'selected-lost' : 'selected-found');
    var submitBtn = document.getElementById('btn-submit');
    submitBtn.className = 'btn ' + (type === 'lost' ? 'btn-orange' : 'btn-cyan');
  });
  document.getElementById('btn-submit').className = 'btn btn-orange';

  /* ------------------------------ 日期范围限制 ------------------------------ */
  var dateInput = document.getElementById('eventDate');
  dateInput.value = U.todayStr();
  dateInput.setAttribute('max', U.todayStr());

  /* ------------------------------ 图片上传压缩 ------------------------------ */
  var fileInput = document.getElementById('image');
  var preview = document.getElementById('image-preview');
  var clearImg = document.getElementById('clear-img');

  fileInput.addEventListener('change', function () {
    var file = fileInput.files && fileInput.files[0];
    if (!file) return;
    compressImage(file).then(function (dataUrl) {
      imageData = dataUrl;
      preview.src = dataUrl;
      preview.classList.add('show');
      clearImg.style.display = 'inline';
      toast('图片已压缩并添加', 'success');
    }).catch(function (err) {
      toast(err.message || '图片处理失败', 'error');
      fileInput.value = '';
    });
  });

  clearImg.addEventListener('click', function (e) {
    e.preventDefault();
    e.stopPropagation();
    imageData = '';
    fileInput.value = '';
    preview.removeAttribute('src');
    preview.classList.remove('show');
    clearImg.style.display = 'none';
  });

  /* ------------------------------ 字段错误展示 ------------------------------ */
  var FIELD_KEYWORDS = [
    ['type', ['信息类型']],
    ['itemName', ['物品名称']],
    ['category', ['物品类别']],
    ['location', ['地点']],
    ['eventDate', ['日期']],
    ['description', ['详细描述']],
    ['contactName', ['联系人称呼']],
    ['contact', ['联系方式']]
  ];

  function showErrors(errors) {
    // 先清空
    FIELD_KEYWORDS.forEach(function (pair) {
      var el = document.getElementById('err-' + pair[0]);
      el.textContent = '';
      el.classList.remove('show');
      var input = document.getElementById(pair[0]);
      if (input) input.classList.remove('invalid');
    });
    // 按关键词把错误挂到对应字段
    errors.forEach(function (msg) {
      for (var i = 0; i < FIELD_KEYWORDS.length; i++) {
        var field = FIELD_KEYWORDS[i][0];
        var kws = FIELD_KEYWORDS[i][1];
        if (kws.some(function (kw) { return msg.indexOf(kw) !== -1; })) {
          var errEl = document.getElementById('err-' + field);
          if (!errEl.classList.contains('show')) {
            errEl.textContent = msg;
            errEl.classList.add('show');
            var inputEl = document.getElementById(field);
            if (inputEl) inputEl.classList.add('invalid');
          }
          return;
        }
      }
    });
  }

  function collectData() {
    return {
      type: document.getElementById('type').value,
      itemName: document.getElementById('itemName').value,
      category: document.getElementById('category').value,
      location: document.getElementById('location').value,
      eventDate: document.getElementById('eventDate').value,
      description: document.getElementById('description').value,
      image: imageData,
      contactName: document.getElementById('contactName').value,
      contact: document.getElementById('contact').value
    };
  }

  /* -------------------------------- 提交发布 -------------------------------- */
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var data = collectData();
    var result = store.add(data);
    if (!result.ok) {
      showErrors(result.errors);
      toast('发布失败，请检查标红的字段（共 ' + result.errors.length + ' 处）', 'error');
      var firstErr = document.querySelector('.field-error.show');
      if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    toast('发布成功！', 'success');
    setTimeout(function () {
      location.href = 'detail.html?id=' + encodeURIComponent(result.post.id) + '&from=publish';
    }, 600);
  });

  /* 输入时清除该字段的错误提示 */
  ['itemName', 'category', 'location', 'eventDate', 'description', 'contactName', 'contact']
    .forEach(function (id) {
      var el = document.getElementById(id);
      el.addEventListener('input', function () {
        document.getElementById('err-' + id).classList.remove('show');
        document.getElementById('err-' + id).textContent = '';
        el.classList.remove('invalid');
      });
      el.addEventListener('change', function () {
        document.getElementById('err-' + id).classList.remove('show');
        document.getElementById('err-' + id).textContent = '';
        el.classList.remove('invalid');
      });
    });

  document.getElementById('btn-clear').addEventListener('click', function () {
    imageData = '';
    preview.classList.remove('show');
    clearImg.style.display = 'none';
    FIELD_KEYWORDS.forEach(function (pair) {
      var el = document.getElementById('err-' + pair[0]);
      el.textContent = ''; el.classList.remove('show');
      var input = document.getElementById(pair[0]);
      if (input) input.classList.remove('invalid');
    });
    setTimeout(function () { dateInput.value = U.todayStr(); }, 0);
  });
})();
