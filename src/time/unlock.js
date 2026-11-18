(function () {
  var PREFIX = "https://calendar.proton.me/";
  var form = document.getElementById("unlock");
  var input = document.getElementById("code");
  var btn = document.getElementById("unlockBtn");
  var status = document.getElementById("unlockStatus");
  if (!form || !window.crypto || !crypto.subtle) {
    if (status) status.textContent = "this browser can't unlock the booking link.";
    return;
  }

  var blobPromise = fetch("/time/booking-link.json", { cache: "no-cache" }).then(function (r) {
    if (!r.ok) throw new Error("load failed");
    return r.json();
  });
  var failures = 0;
  var lockedUntil = 0;

  function unb64(s) {
    var bin = atob(s), u8 = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return u8;
  }

  function setBusy(busy, msg) {
    btn.disabled = busy;
    input.disabled = busy;
    status.textContent = msg || "";
  }

  async function unlock(code, blob) {
    var base = await crypto.subtle.importKey("raw", new TextEncoder().encode(code), "PBKDF2", false, ["deriveKey"]);
    var key = await crypto.subtle.deriveKey(
      { name: "PBKDF2", hash: "SHA-256", salt: unb64(blob.salt), iterations: blob.iterations },
      base,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"]
    );
    var pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(blob.iv) }, key, unb64(blob.ciphertext));
    return new TextDecoder().decode(pt);
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    var code = input.value.trim();
    if (!/^\d{4}$/.test(code)) {
      status.textContent = "enter the 4-digit code.";
      return;
    }
    var wait = lockedUntil - Date.now();
    if (wait > 0) {
      status.textContent = "too many tries. wait " + Math.ceil(wait / 1000) + "s.";
      return;
    }
    setBusy(true, "unlocking…");
    try {
      var url = await unlock(code, await blobPromise);
      if (url.indexOf(PREFIX) !== 0) throw new Error("bad link");
      status.textContent = "opening calendar…";
      window.location.assign(url);
    } catch (err) {
      failures++;
      if (failures >= 3) lockedUntil = Date.now() + Math.min(60, 5 * Math.pow(2, failures - 3)) * 1000;
      setBusy(false, "wrong code.");
      input.value = "";
      input.focus();
    }
  });
})();
