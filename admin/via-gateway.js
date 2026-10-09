/**
 * 双击本地 html 会走 file://，浏览器拦本机网关。自动跳到 8787。
 */
(function () {
  if (typeof location === 'undefined' || location.protocol !== 'file:') return;
  var parts = String(location.pathname || '').split(/[\\/]/);
  var name = parts[parts.length - 1] || 'cs.html';
  if (!/\.html?$/i.test(name)) name = 'cs.html';
  location.replace(
    'http://127.0.0.1:8787/' + name + (location.search || '') + (location.hash || '')
  );
})();
