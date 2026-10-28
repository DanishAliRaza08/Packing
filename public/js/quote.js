// Turns the quote form into three steps. Without JavaScript, all steps show as one long form.
(function () {
  "use strict";
  var form = document.querySelector("[data-steps]");
  if (!form) return;
  var steps = Array.prototype.slice.call(form.querySelectorAll(".form-step"));
  var indicators = form.querySelectorAll(".step-indicator li");
  var current = 0;

  function show(i, focus) {
    current = i;
    steps.forEach(function (s, n) { s.hidden = n !== i; });
    indicators.forEach(function (li, n) {
      li.classList.toggle("active", n === i);
      li.classList.toggle("done", n < i);
    });
    if (focus) {
      var legend = steps[i].querySelector("legend");
      legend.setAttribute("tabindex", "-1");
      legend.focus();
      form.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function valid(step) {
    var fields = step.querySelectorAll("input, select, textarea");
    for (var i = 0; i < fields.length; i++) {
      if (!fields[i].checkValidity()) {
        fields[i].reportValidity();
        return false;
      }
    }
    var file = step.querySelector('input[type="file"]');
    if (file && file.files[0] && file.files[0].size > 25 * 1024 * 1024) {
      file.setCustomValidity("Please choose a file under 25 MB.");
      file.reportValidity();
      file.setCustomValidity("");
      return false;
    }
    return true;
  }

  form.addEventListener("click", function (e) {
    if (e.target.matches("[data-next]")) {
      if (valid(steps[current])) show(current + 1, true);
    } else if (e.target.matches("[data-prev]")) {
      show(current - 1, true);
    }
  });

  form.addEventListener("submit", function (e) {
    for (var i = 0; i < steps.length; i++) {
      if (!valid(steps[i])) { e.preventDefault(); show(i, false); valid(steps[i]); return; }
    }
    var btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = "Sending…";
  });

  // After a server-side error, open the first step that has a problem.
  var firstError = form.querySelector('[aria-invalid="true"]');
  var start = 0;
  if (firstError) start = steps.indexOf(firstError.closest(".form-step"));
  show(Math.max(start, 0), false);
})();
