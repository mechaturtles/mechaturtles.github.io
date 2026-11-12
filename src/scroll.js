(function () {
  var topShade = document.getElementById("shade-top");
  if (!topShade) return;

  function update() {
    if (window.scrollY > 0) topShade.classList.add("shown");
    else topShade.classList.remove("shown");
  }

  update();
  window.addEventListener("scroll", update, { passive: true });
})();
