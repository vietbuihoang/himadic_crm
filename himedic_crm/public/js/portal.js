
window.HM = window.HM || {};
HM.api = function(path, args) {
  return fetch("/api/method/" + path, {
    method: "POST",
    headers: { "Content-Type":"application/json","X-Frappe-CSRF-Token": frappe?.csrf_token || "" },
    body: JSON.stringify(args || {}),
  }).then(r => r.json()).then(j => j.message);
};
