(function () {
  var t = document.getElementById("fadeTop");
  var b = document.getElementById("fadeBot");
  if (!t || !b) return;

  function u() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    t.style.opacity = window.scrollY > 10 ? 1 : 0;
    b.style.opacity = window.scrollY < max - 10 ? 1 : 0;
  }

  window.addEventListener("scroll", u);
  window.addEventListener("resize", u);
  u();
})();
