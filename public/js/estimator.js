// Instant price estimator: asks the server for a price range as the visitor changes options.
(function () {
  "use strict";
  var form = document.getElementById("estimator");
  if (!form) return;
  // form.elements.length is the field count, not the "length" input, so look fields up by name.
  function field(name) { return form.querySelector('[name="' + name + '"]'); }
  var style = field("style");
  var material = field("material");
  var qty = field("quantity");
  var perBox = document.getElementById("est-per-box");
  var total = document.getElementById("est-total");
  var error = document.getElementById("est-error");
  var quoteLink = document.getElementById("est-quote");
  var baseQuoteUrl = quoteLink.getAttribute("href");
  var tracked = false;
  var timer = null;
  var allMaterials = Array.prototype.slice.call(material.options).map(function (o) {
    return { value: o.value, label: o.textContent };
  });

  function syncMaterials() {
    var opt = style.options[style.selectedIndex];
    var allowed = opt.dataset.materials.split(",");
    var current = material.value;
    material.innerHTML = "";
    allMaterials.forEach(function (m) {
      if (allowed.indexOf(m.value) === -1) return;
      var o = document.createElement("option");
      o.value = m.value;
      o.textContent = m.label;
      material.appendChild(o);
    });
    if (allowed.indexOf(current) !== -1) material.value = current;
    qty.min = opt.dataset.min;
    if (Number(qty.value) < Number(opt.dataset.min)) qty.value = opt.dataset.min;
  }

  function payload() {
    var data = {};
    ["style", "length", "width", "height", "material", "sides", "quantity"].forEach(function (k) {
      data[k] = field(k).value;
    });
    return data;
  }

  function update() {
    var data = payload();
    fetch(form.dataset.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (!res.ok) {
          perBox.textContent = "—";
          total.textContent = "—";
          error.textContent = res.error;
          error.hidden = false;
          return;
        }
        error.hidden = true;
        perBox.textContent = res.per_box;
        total.textContent = res.total + " for " + res.qty.toLocaleString();
        var params = new URLSearchParams({
          style: data.style, length: data.length, width: data.width, height: data.height,
          quantity: data.quantity, material: data.material, print_sides: data.sides
        });
        quoteLink.setAttribute("href", baseQuoteUrl + "?" + params.toString());
        if (!tracked && window.track) { window.track("estimator_used", { style: data.style }); tracked = true; }
      })
      .catch(function () {
        error.textContent = "Couldn't get an estimate right now. Please request a quote instead.";
        error.hidden = false;
      });
  }

  function schedule() { clearTimeout(timer); timer = setTimeout(update, 250); }

  style.addEventListener("change", function () { syncMaterials(); schedule(); });
  form.addEventListener("input", schedule);
  form.addEventListener("change", schedule);
  form.addEventListener("submit", function (e) { e.preventDefault(); update(); });
  syncMaterials();
  update();
})();
