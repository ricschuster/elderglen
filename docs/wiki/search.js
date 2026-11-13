(function () {
  var box = document.getElementById("q"),
    out = document.getElementById("results"),
    base = document.documentElement.dataset.base;
  if (box) {
    box.addEventListener("input", function () {
      var q = box.value.trim().toLowerCase();
      if (!q) {
        out.hidden = true;
        return;
      }
      var hits = (window.WIKI_INDEX || [])
        .filter(function (e) {
          return (e.name + " " + e.kw).toLowerCase().indexOf(q) >= 0;
        })
        .slice(0, 12);
      out.innerHTML =
        hits
          .map(function (e) {
            return (
              '<li><a href="' +
              base +
              e.path +
              '">' +
              e.name.replace(/&/g, "&amp;").replace(/</g, "&lt;") +
              " <small>" +
              e.cat +
              "</small></a></li>"
            );
          })
          .join("") || "<li><small>Nothing found</small></li>";
      out.hidden = false;
    });
  }
  document.querySelectorAll("table.sortable").forEach(function (t) {
    t.querySelectorAll("th").forEach(function (th, i) {
      th.dataset.sort = i;
      th.addEventListener("click", function () {
        var rows = [].slice.call(t.tBodies[0].rows),
          dir = th.dataset.dir === "a" ? -1 : 1;
        th.dataset.dir = dir === 1 ? "a" : "d";
        rows.sort(function (a, b) {
          var x = a.cells[i].textContent,
            y = b.cells[i].textContent,
            nx = parseFloat(x),
            ny = parseFloat(y);
          return (isNaN(nx) || isNaN(ny) ? x.localeCompare(y) : nx - ny) * dir;
        });
        rows.forEach(function (r) {
          t.tBodies[0].appendChild(r);
        });
      });
    });
  });
})();
