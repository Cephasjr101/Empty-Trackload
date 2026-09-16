/* LoadMatch — pages.js — page-specific logic, wired to the real backend
   via LoadMatchAPI (see api-client.js). Each section is guarded by
   element presence so this one file works across every page. */
(function(){
  "use strict";
  var API = window.LoadMatchAPI;
  if (!API) { console.error("LoadMatchAPI missing — check that api-client.js loaded before pages.js"); return; }

  var $ = function(s, r){ return (r||document).querySelector(s); };
  var $$ = function(s, r){ return Array.prototype.slice.call((r||document).querySelectorAll(s)); };
  var esc = function(s){ return (s==null?"":String(s)).replace(/[&<>"']/g, function(c){
    return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); };
  var fmt = function(n){ return "GH₵ " + Number(n||0).toLocaleString("en-GH"); };
  var verifiedBadge = function(status){ return status === "verified"
    ? '<span class="badge badge-verified">Verified</span>'
    : '<span class="badge badge-pending">Verification pending</span>'; };
  /* Try several possible key names on an object — used because the exact
     JSON casing returned by the backend wasn't visible while writing this.
     Check the Network tab if a field renders blank and adjust the key list. */
  function pick(obj, keys, fallback){
    for (var i=0;i<keys.length;i++){ if (obj && obj[keys[i]] != null && obj[keys[i]] !== "") return obj[keys[i]]; }
    return fallback;
  }
  function showError(container, err){
    if (!container) return;
    container.innerHTML = '<div class="empty-state">Something went wrong talking to the server: '+esc(err && err.message ? err.message : String(err))+'</div>';
  }

  /* ================= MARKETPLACE ================= */
  var truckList = $("#truck-list"), loadList = $("#load-list");
  if (truckList || loadList) {
    function truckCard(t){
      var from = pick(t, ["from_city","fromCity","from"]), to = pick(t, ["to_city","toCity","to"]);
      var owner = pick(t, ["owner_name","ownerName","company"], "Carrier");
      return '<article class="card"><div class="route"><span>'+esc(from)+'</span><span class="arrow" aria-hidden="true">→</span><span>'+esc(to)+'</span></div>'+
        '<p class="route-meta">'+esc(pick(t,["truck_type","truckType"]))+' · '+Number(pick(t,["capacity_kg","capacityKg"],0)).toLocaleString()+' kg · '+esc(pick(t,["volume_m3","volumeM3"]))+' m³ · '+esc(pick(t,["plate_no","plateNo"]))+'</p>'+
        '<p><strong>'+esc(owner)+'</strong> '+verifiedBadge(pick(t,["status"]))+'</p>'+
        '<p class="price-tag">'+esc(pick(t,["rate_per_km_ghs","ratePerKmGhs"]))+' GH₵/km · '+esc(pick(t,["available_from","availableFrom"]))+' → '+esc(pick(t,["available_to","availableTo"]))+'</p>'+
        '<a class="btn btn-primary btn-sm" href="dashboard.html">Book backhaul</a></article>';
    }
    function loadCard(l){
      var from = pick(l, ["from_city","fromCity","from"]), to = pick(l, ["to_city","toCity","to"]);
      var shipper = pick(l, ["shipper_name","shipper","company"], "Shipper");
      return '<article class="card"><div class="route"><span>'+esc(from)+'</span><span class="arrow" aria-hidden="true">→</span><span>'+esc(to)+'</span></div>'+
        '<p class="route-meta">'+esc(pick(l,["description","cargo"]))+' · '+Number(pick(l,["weight_kg","weightKg"],0)).toLocaleString()+' kg · '+esc(pick(l,["volume_m3","volumeM3"]))+' m³</p>'+
        '<p><strong>'+esc(shipper)+'</strong> '+verifiedBadge(pick(l,["status"])==="matched"?"verified":pick(l,["status"]))+'</p>'+
        '<p class="price-tag">Budget '+fmt(pick(l,["budget_ghs","budgetGhs"]))+' · pickup '+esc(pick(l,["pickup_date","pickupDate"]))+'</p>'+
        '<a class="btn btn-ghost btn-sm" href="dashboard.html">Find truck</a></article>';
    }
    async function render(){
      try {
        if (truckList) {
          truckList.innerHTML = '<div class="empty-state">Loading trucks…</div>';
          var trucks = await API.listTrucks();
          truckList.innerHTML = (trucks && trucks.length) ? trucks.map(truckCard).join("") : '<div class="empty-state">No trucks listed yet — be the first.</div>';
        }
        if (loadList) {
          loadList.innerHTML = '<div class="empty-state">Loading loads…</div>';
          var loads = await API.listLoads();
          loadList.innerHTML = (loads && loads.length) ? loads.map(loadCard).join("") : '<div class="empty-state">No loads posted yet — be the first.</div>';
        }
      } catch (err) {
        showError(truckList, err); showError(loadList, err);
      }
    }
    var matchBtn = $("#run-match"), banner = $("#match-banner");
    if (matchBtn) matchBtn.addEventListener("click", async function(){
      if (!banner) return;
      banner.className = "match-banner show"; banner.textContent = "Running matching engine…";
      try {
        var results = await API.runMatching();
        if (results && results.length) {
          var top = results[0];
          var t = top.truck, l = top.load;
          banner.className = "match-banner show ok";
          banner.innerHTML = '<strong>Top match found — score '+esc(top.score)+'.</strong> Truck ('+esc(pick(t,["from_city","fromCity"]))+' → '+esc(pick(t,["to_city","toCity"]))+') can carry the load ('+esc(pick(l,["from_city","fromCity"]))+' → '+esc(pick(l,["to_city","toCity"]))+') on the return leg. Estimated price '+fmt(top.estimatedPriceGhs || top.estimated_price_ghs)+'.';
        } else {
          banner.className = "match-banner show warn";
          banner.innerHTML = "<strong>No matches right now.</strong> Try adjusting dates, capacity, or budget — new trucks and loads join daily.";
        }
      } catch (err) {
        banner.className = "match-banner show warn";
        banner.textContent = "Couldn't reach the matching engine: " + (err.message || err);
      }
    });
    render();
  }

  /* ================= FORMS (post-truck / post-load) ================= */
  var form = $("#lm-form");
  if (form) {
    var isTruck = form.getAttribute("data-kind") === "truck";
    var loadedAt = Date.now();
    var hp = $(".hp-field input", form);
    var a = Math.floor(Math.random()*8)+2, b = Math.floor(Math.random()*8)+1;
    var capQ = $("#captcha-q"); if (capQ) capQ.textContent = "Spam check: what is " + a + " + " + b + "?";
    var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    var phoneRe = /^[+0-9 ()-]{7,20}$/;

    function setErr(input, msg){
      var err = document.getElementById(input.id + "-error");
      input.setAttribute("aria-invalid", msg ? "true" : "false");
      if (err) err.textContent = msg || "";
      return !msg;
    }
    function validate(){
      var ok = true;
      $$("input[required], select[required]", form).forEach(function(inp){
        var v = inp.value.trim(), msg = "";
        if (!v) msg = "This field is required.";
        else if (inp.type === "email" && !emailRe.test(v)) msg = "Enter a valid email address.";
        else if (inp.dataset.validate === "phone" && !phoneRe.test(v)) msg = "Enter a valid phone number.";
        else if (inp.type === "number" && !(Number(v) > 0)) msg = "Enter a number greater than 0.";
        else if (inp.dataset.validate === "date" && isNaN(Date.parse(v))) msg = "Enter a valid date.";
        if (!setErr(inp, msg)) ok = false;
      });
      var cap = $("#captcha-a");
      if (cap && Number(cap.value) !== a + b) { setErr(cap, "Incorrect answer."); ok = false; }
      else if (cap) setErr(cap, "");
      var pw = $("#pwd"), pw2 = $("#pwd2");
      if (pw && pw2) {
        if (pw.value.length < 8) { setErr(pw, "Minimum 8 characters."); ok = false; }
        else setErr(pw, "");
        if (pw2.value !== pw.value) { setErr(pw2, "Passwords do not match."); ok = false; }
        else setErr(pw2, "");
      }
      return ok;
    }

    form.addEventListener("submit", async function(e){
      e.preventDefault();
      if (hp && hp.value) return; /* honeypot tripped: silently drop */
      if (Date.now() - loadedAt < 2500) { alert("Please take a moment to complete the form."); return; }
      if (!validate()) { var bad = $("[aria-invalid='true']", form); if (bad) bad.focus(); return; }

      var submitBtn = $("button[type='submit']", form);
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Submitting…"; }

      var fd = new FormData(form);
      var raw = {}; fd.forEach(function(v,k){ raw[k] = v; });

      try {
        /* The account is created (or logged into, if it already exists)
           from this same form, since there's no separate signup page. */
        if (!API.isLoggedIn()) {
          try {
            await API.register({
              role: isTruck ? "carrier" : "shipper",
              ownerName: raw.owner,
              company: raw.plateNo && !isTruck ? raw.plateNo : undefined, /* post-load's "company" field shares the plateNo input id */
              email: raw.email,
              phone: raw.phone,
              password: raw.password,
            });
          } catch (regErr) {
            /* Most likely this email already has an account — try logging in instead. */
            await API.login(raw.email, raw.password);
          }
        }

        if (isTruck) {
          await API.postTruck({
            plateNo: raw.plateNo,
            truckType: raw.truckType,
            fromCity: raw.from,
            toCity: raw.to,
            capacityKg: Number(raw.capacityKg),
            volumeM3: Number(raw.volumeM3),
            ratePerKmGhs: Number(raw.ratePerKm),
            availableFrom: raw.availableFrom,
            availableTo: raw.availableTo,
          });
        } else {
          await API.postLoad({
            description: raw.cargo,
            fromCity: raw.from,
            toCity: raw.to,
            weightKg: Number(raw.weightKg),
            volumeM3: Number(raw.volumeM3),
            budgetGhs: Number(raw.budgetGhs),
            pickupDate: raw.pickupDate,
            deliveryDate: raw.deliveryDate,
          });
        }

        form.reset();
        var box = $("#form-success");
        if (box) { box.classList.add("form-success"); box.removeAttribute("hidden");
          box.innerHTML = "<strong>Listing submitted.</strong> Our team will verify the details within 24 hours. <a href='marketplace.html'>View the marketplace →</a>"; box.focus(); }
      } catch (err) {
        alert("Couldn't submit: " + (err.message || err));
      } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = isTruck ? "Submit for verification" : "Post my load"; }
      }
    });
  }

  /* ================= DASHBOARD ================= */
  var dash = $("#dashboard");
  if (dash) {
    var container = $(".container", dash) || dash;

    if (!API.isLoggedIn()) {
      renderLoginGate();
    } else {
      initDashboard();
    }

    function renderLoginGate(){
      var gate = document.createElement("div");
      gate.className = "card form-card";
      gate.style.maxWidth = "420px";
      gate.innerHTML =
        '<h2 style="margin-top:0">Log in to view the dashboard</h2>' +
        '<p class="route-meta">Demo logins (password <code>demo1234</code>): <br>' +
        'carrier — kwame@asantehaulage.example<br>shipper — ama@owusufurniture.example</p>' +
        '<label for="dash-email">Email</label><input id="dash-email" type="email" autocomplete="email">' +
        '<label for="dash-pwd">Password</label><input id="dash-pwd" type="password" autocomplete="current-password">' +
        '<button class="btn btn-primary" id="dash-login-btn" style="margin-top:1rem">Log in</button>' +
        '<p class="field-error" id="dash-login-error"></p>';
      /* Hide the KPI/tab UI until logged in, then show the login card instead. */
      $$(".kpi-row, .tabs, .panel", dash).forEach(function(el){ el.style.display = "none"; });
      container.insertBefore(gate, container.firstChild.nextSibling);

      $("#dash-login-btn", gate).addEventListener("click", async function(){
        var email = $("#dash-email", gate).value.trim();
        var pwd = $("#dash-pwd", gate).value;
        var err = $("#dash-login-error", gate);
        err.textContent = "";
        try {
          await API.login(email, pwd);
          gate.remove();
          $$(".kpi-row, .tabs, .panel", dash).forEach(function(el){ el.style.display = ""; });
          initDashboard();
        } catch (e) {
          err.textContent = e.message || "Login failed.";
        }
      });
    }

    function initDashboard(){
      var matches = [], selected = null;

      $$(".tab").forEach(function(tab){
        tab.addEventListener("click", function(){
          $$(".tab").forEach(function(t){ t.setAttribute("aria-selected","false"); });
          tab.setAttribute("aria-selected","true");
          $$(".panel").forEach(function(p){ p.classList.remove("active"); });
          $("#panel-" + tab.getAttribute("data-tab")).classList.add("active");
        });
      });

      function findMatch(id){ return matches.filter(function(m){ return pick(m,["id"]) == id; })[0] || null; }

      var tbody = $("#matches-body");
      function renderMatches(){
        if (!tbody) return;
        if (!matches.length) {
          tbody.innerHTML = "<tr><td colspan='7'>No matches yet. Use the Marketplace's \"Run matching\" to find a pair, then propose it.</td></tr>";
          return;
        }
        tbody.innerHTML = matches.map(function(m){
          var price = pick(m, ["estimated_price_ghs","estimatedPriceGhs","priceGhs"], 0);
          var pct = pick(m, ["commission_pct","commissionPct"], 5);
          return "<tr><td><strong>"+esc(pick(m,["id"]))+"</strong></td>"+
            "<td>Truck #"+esc(pick(m,["truck_id","truckId"]))+"</td>"+
            "<td>Load #"+esc(pick(m,["load_id","loadId"]))+"</td>"+
            "<td class='price-tag'>"+fmt(price)+"</td>"+
            "<td>"+esc(pct)+"%</td>"+
            "<td><span class='badge badge-match'>"+esc(pick(m,["status"]))+"</span></td>"+
            "<td><button class='btn btn-ghost btn-sm' data-select='"+esc(pick(m,["id"]))+"'>Manage</button></td></tr>";
        }).join("");
        $$("[data-select]", tbody).forEach(function(btn){
          btn.addEventListener("click", function(){ selected = btn.getAttribute("data-select"); renderAll(); });
        });
      }

      async function renderTracking(){
        var box = $("#tracking-body"); if (!box) return;
        var m = findMatch(selected);
        if (!m) { box.innerHTML = '<div class="empty-state">Select a match to track.</div>'; return; }
        try {
          var events = await API.getTracking(pick(m,["id"]));
          box.innerHTML = '<div class="card"><strong>GPS breadcrumbs</strong><ul class="timeline" style="margin-top:.6rem">' +
            (events && events.length ? events.map(function(ev){
              return "<li class='done'>"+esc(ev.note || "Checkpoint")+" — "+esc(ev.lat)+", "+esc(ev.lng)+"</li>";
            }).join("") : "<li>No tracking events yet.</li>") + "</ul></div>";
        } catch (err) { showError(box, err); }
        var btn = $("#btn-in-transit");
        if (btn) btn.onclick = async function(){
          try { await API.postTrackingPoint(pick(m,["id"]), 5.6, -0.2, "Checkpoint logged"); renderAll(); }
          catch (err) { alert(err.message || err); }
        };
      }

      async function renderContract(){
        var box = $("#contract-body"); if (!box) return;
        var m = findMatch(selected);
        if (!m) { box.innerHTML = '<div class="empty-state">Select a match to view the contract.</div>'; return; }
        box.innerHTML = '<div class="card"><h3>Digital Contract — '+esc(pick(m,["id"]))+'</h3>' +
          '<button class="btn btn-primary" id="btn-gen-contract">Generate contract</button>' +
          '<div id="contract-text" style="margin-top:1rem"></div>' +
          '<label for="sig-name" style="margin-top:1rem">Type your full name to sign</label><input id="sig-name" type="text" autocomplete="name">' +
          '<button class="btn btn-primary" id="btn-sign" style="margin-top:1rem">Sign contract</button></div>';
        $("#btn-gen-contract", box).addEventListener("click", async function(){
          try { var c = await API.generateContract(pick(m,["id"])); $("#contract-text", box).textContent = c.terms_text || c.termsText || JSON.stringify(c); }
          catch (err) { alert(err.message || err); }
        });
        $("#btn-sign", box).addEventListener("click", async function(){
          var name = $("#sig-name", box).value.trim();
          if (name.length < 3) { alert("Please type your full name."); return; }
          try { await API.signContract(pick(m,["id"]), name); renderAll(); }
          catch (err) { alert(err.message || err); }
        });
      }

      async function renderPayment(){
        var box = $("#payment-body"); if (!box) return;
        var m = findMatch(selected);
        if (!m) { box.innerHTML = '<div class="empty-state">Select a match to view payment.</div>'; return; }
        box.innerHTML = '<div class="card"><h3>Payment — '+esc(pick(m,["id"]))+'</h3>' +
          '<button class="btn btn-primary" id="btn-pay">Shipper: fund escrow</button>' +
          '<div id="payment-details" style="margin-top:1rem"></div></div>';
        try {
          var pay = await API.getPayment(pick(m,["id"]));
          $("#payment-details", box).innerHTML = "Status: <strong>"+esc(pay.status)+"</strong>";
        } catch (err) { /* no payment yet — fine, ignore until escrow is funded */ }
        $("#btn-pay", box).addEventListener("click", async function(){
          try { await API.fundEscrow(pick(m,["id"])); renderAll(); }
          catch (err) { alert(err.message || err); }
        });
      }

      async function renderPod(){
        var box = $("#pod-body"); if (!box) return;
        var m = findMatch(selected);
        if (!m) { box.innerHTML = '<div class="empty-state">Select a match to confirm delivery.</div>'; return; }
        box.innerHTML = '<div class="card"><h3>Proof of Delivery — '+esc(pick(m,["id"]))+'</h3>' +
          '<button class="btn btn-ghost btn-sm" id="btn-req-otp">Request delivery code</button>' +
          '<label for="pod-otp" style="margin-top:1rem">Recipient enters the 6-digit delivery code</label>' +
          '<input id="pod-otp" inputmode="numeric" maxlength="6">' +
          '<button class="btn btn-primary" id="btn-pod" style="margin-top:1rem">Confirm delivery</button></div>';
        $("#btn-req-otp", box).addEventListener("click", async function(){
          try { var r = await API.requestPodOtp(pick(m,["id"])); alert("Demo OTP: " + (r.devOnlyOtp || "(check backend response)")); }
          catch (err) { alert(err.message || err); }
        });
        $("#btn-pod", box).addEventListener("click", async function(){
          var v = $("#pod-otp", box).value.trim();
          try { await API.verifyPodOtp(pick(m,["id"]), v); renderAll(); }
          catch (err) { alert(err.message || err); }
        });
      }

      async function loadMatches(){
        try {
          matches = await API.listMyMatches();
          if (matches && matches.length && !selected) selected = pick(matches[0], ["id"]);
          $("#kpi-matches").textContent = matches.length;
        } catch (err) {
          showError(tbody, err);
        }
      }

      async function renderAll(){
        renderMatches();
        await renderTracking();
        await renderContract();
        await renderPayment();
        await renderPod();
      }

      (async function(){
        await loadMatches();
        await renderAll();
      })();
    }
  }
})();
