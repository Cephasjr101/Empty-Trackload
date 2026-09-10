
/* LoadMatch MVP — pages.js — page-specific logic, each guarded by element presence. */
(function(){
  "use strict";
  var LM = window.LM, ME = LM.matchEngine;
  if (!ME) return;
  var $ = function(s, r){ return (r||document).querySelector(s); };
  var $$ = function(s, r){ return Array.prototype.slice.call((r||document).querySelectorAll(s)); };
  var esc = function(s){ return (s==null?"":String(s)).replace(/[&<>"']/g, function(c){
    return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); };
  var fmt = function(n){ return "GH₵ " + Number(n).toLocaleString("en-GH"); };
  var verifiedBadge = function(v){ return v
    ? '<span class="badge badge-verified">Verified</span>'
    : '<span class="badge badge-pending">Verification pending</span>'; };

  /* ================= MARKETPLACE ================= */
  var truckList = $("#truck-list"), loadList = $("#load-list");
  if (truckList || loadList) {
    var trucks = LM.read("lm_trucks", []), loads = LM.read("lm_loads", []);
    function truckCard(t){
      return '<article class="card"><div class="route"><span>'+esc(t.from)+'</span><span class="arrow" aria-hidden="true">→</span><span>'+esc(t.to)+'</span></div>'+
        '<p class="route-meta">'+esc(t.truckType)+' · '+Number(t.capacityKg).toLocaleString()+' kg · '+esc(t.volumeM3)+' m³ · '+esc(t.plateNo)+'</p>'+
        '<p><strong>'+esc(t.owner)+'</strong> '+verifiedBadge(t.verified)+'</p>'+
        '<p class="price-tag">'+fmt(ME.priceFor(t, {from:t.from,to:t.to}))+' est. · '+esc(t.availableFrom)+' → '+esc(t.availableTo)+'</p>'+
        '<a class="btn btn-primary btn-sm" href="dashboard.html">Book backhaul</a></article>';
    }
    function loadCard(l){
      return '<article class="card"><div class="route"><span>'+esc(l.from)+'</span><span class="arrow" aria-hidden="true">→</span><span>'+esc(l.to)+'</span></div>'+
        '<p class="route-meta">'+esc(l.cargo)+' · '+Number(l.weightKg).toLocaleString()+' kg · '+esc(l.volumeM3)+' m³</p>'+
        '<p><strong>'+esc(l.shipper)+'</strong> '+verifiedBadge(l.verified)+'</p>'+
        '<p class="price-tag">Budget '+fmt(l.budgetGhs)+' · pickup '+esc(l.pickupDate)+'</p>'+
        '<a class="btn btn-ghost btn-sm" href="dashboard.html">Find truck</a></article>';
    }
    function render(){
      if (truckList) truckList.innerHTML = trucks.length ? trucks.map(truckCard).join("") : '<div class="empty-state">No trucks listed yet — be the first.</div>';
      if (loadList)  loadList.innerHTML  = loads.length  ? loads.map(loadCard).join("")  : '<div class="empty-state">No loads posted yet — be the first.</div>';
    }
    var matchBtn = $("#run-match"), banner = $("#match-banner");
    if (matchBtn) matchBtn.addEventListener("click", function(){
      var results = ME.findMatches(trucks, loads);
      if (!banner) return;
      if (results.length) {
        var top = results[0];
        banner.className = "match-banner show ok";
        banner.innerHTML = '<strong>Top match found — score '+top.score+'/150.</strong> '+esc(top.truck.owner)+' ('+esc(top.truck.from)+' → '+esc(top.truck.to)+') can carry '+esc(top.load.shipper)+'’s cargo ('+esc(top.load.from)+' → '+esc(top.load.to)+') on the return leg. Estimated price '+fmt(ME.priceFor(top.truck, top.load))+'.';
      } else {
        banner.className = "match-banner show warn";
        banner.innerHTML = "<strong>No matches right now.</strong> Try adjusting dates, capacity, or budget — new trucks and loads join daily.";
      }
    });
    render();
  }

  /* ================= FORMS (post-truck / post-load) ================= */
  var form = $("#lm-form");
  if (form) {
    var isTruck = form.getAttribute("data-kind") === "truck";
    var loadedAt = Date.now();
    /* honeypot: real users never fill this */
    var hp = $(".hp-field input", form);
    /* captcha */
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
    form.addEventListener("submit", function(e){
      e.preventDefault();
      if (hp && hp.value) return; /* honeypot tripped: silently drop */
      if (Date.now() - loadedAt < 2500) { alert("Please take a moment to complete the form."); return; } /* time-trap */
      if (!validate()) { var bad = $("[aria-invalid='true']", form); if (bad) bad.focus(); return; }
      var fd = new FormData(form), rec = { id: (isTruck?"T-":"L-") + Math.floor(1000 + Math.random()*9000), verified:false, status: isTruck ? "returning-empty" : "open" };
      fd.forEach(function(v,k){ if (k !== "website" && k !== "captcha_answer" && k !== "password2") rec[k] = v; });
      ["capacityKg","volumeM3","weightKg","budgetGhs","ratePerKm"].forEach(function(k){ if (rec[k]!=null) rec[k] = Number(rec[k]); });
      var key = isTruck ? "lm_trucks" : "lm_loads";
      var arr = LM.read(key, []); arr.push(rec); LM.store(key, arr);
      form.reset();
      var box = $("#form-success");
      if (box) { box.classList.add("form-success"); box.removeAttribute("hidden");
        box.innerHTML = "<strong>Listing submitted.</strong> Our team will verify the details within 24 hours. <a href='marketplace.html'>View the marketplace →</a>"; box.focus(); }
    });
    $$("input, select", form).forEach(function(inp){
      inp.addEventListener("blur", function(){
        if (inp.hasAttribute("required") || inp.value) {
          var ev = new Event("input", {bubbles:true}); inp.dispatchEvent(ev);
          var tmp = document.createElement("input"); /* noop keeps linter calm */
        }
      });
    });
  }

  /* ================= DASHBOARD ================= */
  var dash = $("#dashboard");
  if (dash) {
    var trucks = LM.read("lm_trucks", []), loads = LM.read("lm_loads", []), matches = LM.read("lm_matches", []);
    var selected = matches.length ? matches[0].id : null;

    /* KPIs */
    var open = loads.filter(function(l){ return l.status === "open"; }).length;
    $("#kpi-trucks").textContent = trucks.length;
    $("#kpi-loads").textContent = open;
    $("#kpi-matches").textContent = matches.length;
    var rev = matches.reduce(function(s,m){ return s + ME.commission(m.priceGhs, m.commissionPct); }, 0);
    $("#kpi-revenue").textContent = fmt(rev);

    /* Tabs */
    $$(".tab").forEach(function(tab){
      tab.addEventListener("click", function(){
        $$(".tab").forEach(function(t){ t.setAttribute("aria-selected","false"); });
        tab.setAttribute("aria-selected","true");
        $$(".panel").forEach(function(p){ p.classList.remove("active"); });
        $("#panel-" + tab.getAttribute("data-tab")).classList.add("active");
      });
    });

    function findMatch(id){ return matches.filter(function(m){ return m.id === id; })[0] || null; }
    function truckOf(m){ return trucks.filter(function(t){ return t.id === m.truckId; })[0]; }
    function loadOf(m){ return loads.filter(function(l){ return l.id === m.loadId; })[0]; }

    /* Matches table */
    var tbody = $("#matches-body");
    function renderMatches(){
      if (!tbody) return;
      tbody.innerHTML = matches.map(function(m){
        var t = truckOf(m), l = loadOf(m);
        if (!t || !l) return "";
        return "<tr><td><strong>"+esc(m.id)+"</strong></td>"+
          "<td>"+esc(t.owner)+"<br><small>"+esc(t.from)+" → "+esc(t.to)+"</small></td>"+
          "<td>"+esc(l.shipper)+"<br><small>"+esc(l.from)+" → "+esc(l.to)+"</small></td>"+
          "<td class='price-tag'>"+fmt(m.priceGhs)+"</td>"+
          "<td>"+esc(m.commissionPct)+"%</td>"+
          "<td><span class='badge "+(m.status==="delivered"?"badge-verified":"badge-match")+"'>"+esc(m.status)+"</span></td>"+
          "<td><button class='btn btn-ghost btn-sm' data-select='"+esc(m.id)+"'>Manage</button></td></tr>";
      }).join("") || "<tr><td colspan='7'>No matches yet.</td></tr>";
      $$("[data-select]", tbody).forEach(function(btn){
        btn.addEventListener("click", function(){ selected = btn.getAttribute("data-select"); renderAll(); });
      });
    }

    /* Tracking */
    var CITY_POS = { Accra:[120,330], Tema:[150,318], Kumasi:[430,190], Takoradi:[110,120], Tamale:[560,60], Ho:[300,330], "Cape Coast":[190,235], Sunyani:[330,150] };
    function renderTracking(){
      var box = $("#tracking-body"); if (!box) return;
      var m = findMatch(selected);
      if (!m) { box.innerHTML = '<div class="empty-state">Select a match to track.</div>'; return; }
      var t = truckOf(m), l = loadOf(m);
      var from = l ? l.from : t.from, to = l ? l.to : t.to;
      var p1 = CITY_POS[from] || [200,200], p2 = CITY_POS[to] || [600,200];
      var prog = m.status === "delivered" ? 100 : m.status === "in-transit" ? 55 : 12;
      var x = p1[0] + (p2[0]-p1[0]) * prog/100, y = p1[1] + (p2[1]-p1[1]) * prog/100;
      var stops = Object.keys(CITY_POS).map(function(c){
        return '<circle cx="'+CITY_POS[c][0]+'" cy="'+CITY_POS[c][1]+'" r="5" fill="#0B3B2E"/><text x="'+CITY_POS[c][0]+'" y="'+(CITY_POS[c][1]-10)+'" font-size="12" fill="#374151" text-anchor="middle">'+c+'</text>';
      }).join("");
      box.innerHTML =
        '<p class="route-meta">Shipment '+esc(m.id)+' · '+esc(from)+' → '+esc(to)+' · Status: <strong>'+esc(m.status)+'</strong> · '+prog+'% of route</p>'+
        '<svg viewBox="0 0 700 400" role="img" aria-label="Map showing route from '+esc(from)+' to '+esc(to)+'" style="width:100%;background:#F0FAF5;border-radius:12px;border:1px solid var(--line)">'+
        stops +
        '<line x1="'+p1[0]+'" y1="'+p1[1]+'" x2="'+p2[0]+'" y2="'+p2[1]+'" stroke="#157A5B" stroke-width="3" stroke-dasharray="8 6"/>'+
        '<circle cx="'+x+'" cy="'+y+'" r="9" fill="#B45309" stroke="#fff" stroke-width="3"><animate attributeName="r" values="9;12;9" dur="1.6s" repeatCount="indefinite"/></circle>'+
        "</svg>"+
        '<div class="card" style="margin-top:1rem"><strong>GPS breadcrumbs (last 3)</strong><ul class="timeline" style="margin-top:.6rem">'+
        '<li class="done">Departed '+esc(from)+' — '+esc(m.createdAt.slice(0,10))+' <small>08:12</small></li>'+
        '<li class="'+(prog>=55?"done":"")+'">Checkpoint: mid-route weigh station <small>11:47</small></li>'+
        '<li class="'+(prog>=100?"done":"")+'">Arrived '+esc(to)+' <small>'+(prog>=100?"14:03":"ETA 16:30")+'</small></li></ul></div>';
      var btn = $("#btn-in-transit");
      if (btn) btn.onclick = function(){ m.status = "in-transit"; LM.store("lm_matches", matches); renderAll(); };
    }

    /* Contract */
    function renderContract(){
      var box = $("#contract-body"); if (!box) return;
      var m = findMatch(selected);
      if (!m) { box.innerHTML = '<div class="empty-state">Select a match to view the contract.</div>'; return; }
      var t = truckOf(m), l = loadOf(m);
      var fee = ME.commission(m.priceGhs, m.commissionPct);
      box.innerHTML =
        '<div class="card"><h3>Digital Contract — '+esc(m.id)+'</h3>'+
        '<p><strong>Carrier:</strong> '+esc(t.owner)+' ('+esc(t.plateNo)+')<br><strong>Shipper:</strong> '+esc(l.shipper)+'<br>'+
        '<strong>Route:</strong> '+esc(l.from)+' → '+esc(l.to)+'<br><strong>Cargo:</strong> '+esc(l.cargo)+' ('+Number(l.weightKg).toLocaleString()+' kg)<br>'+
        '<strong>Agreed price:</strong> '+fmt(m.priceGhs)+' &nbsp; <strong>Platform commission ('+esc(m.commissionPct)+'%):</strong> '+fmt(fee)+' &nbsp; <strong>Carrier payout:</strong> '+fmt(m.priceGhs - fee)+'</p>'+
        '<p class="consent-note">Payment is held in escrow by LoadMatch and released to the carrier upon verified proof of delivery.</p>'+
        (m.contractSigned
          ? '<p><span class="badge badge-verified">Signed</span> Signed digitally on '+esc(m.signedAt||"")+' by both parties.</p>'
          : '<label for="sig-name">Type your full name to sign</label><input id="sig-name" type="text" autocomplete="name" placeholder="e.g. Kwame A.">'+
            '<label style="font-weight:600;display:flex;gap:.5rem;align-items:flex-start;margin-top:.8rem"><input type="checkbox" id="sig-agree" style="width:auto;margin-top:.3rem"> I agree to the <a href="terms.html">Terms &amp; Conditions</a> and <a href="privacy.html">Privacy Policy</a>.</label>'+
            '<button class="btn btn-primary" id="btn-sign" style="margin-top:1rem">Sign contract</button>')+
        "</div>";
      var btn = $("#btn-sign");
      if (btn) btn.addEventListener("click", function(){
        var name = $("#sig-name").value.trim(), agree = $("#sig-agree").checked;
        if (name.length < 3) { alert("Please type your full name."); return; }
        if (!agree) { alert("Please accept the terms."); return; }
        m.contractSigned = true; m.signedAt = new Date().toISOString().slice(0,10); m.status = "in-transit";
        LM.store("lm_matches", matches); renderAll();
      });
    }

    /* Payment */
    function renderPayment(){
      var box = $("#payment-body"); if (!box) return;
      var m = findMatch(selected);
      if (!m) { box.innerHTML = '<div class="empty-state">Select a match to view payment.</div>'; return; }
      var paid = m.status === "delivered" || m.status === "paid";
      var fee = ME.commission(m.priceGhs, m.commissionPct);
      box.innerHTML =
        '<div class="card"><h3>Payment — '+esc(m.id)+'</h3>'+
        '<p class="route-meta">Commission rate is set per deal within the 3–10% platform band.</p>'+
        '<label for="pct">Commission: <strong id="pct-out">'+esc(m.commissionPct)+'%</strong></label>'+
        '<input type="range" id="pct" min="'+LM.CONFIG.COMMISSION_MIN+'" max="'+LM.CONFIG.COMMISSION_MAX+'" step="0.5" value="'+esc(m.commissionPct)+'" '+(paid?"disabled":"")+' style="padding:0">'+
        '<table style="margin-top:1rem"><tr><th>Item</th><th>Amount</th></tr>'+
        '<tr><td>Shipper pays (escrow)</td><td class="price-tag">'+fmt(m.priceGhs)+'</td></tr>'+
        '<tr><td>LoadMatch commission (<span id="pct-cell">'+esc(m.commissionPct)+'%)</span></td><td>'+fmt(fee)+'</td></tr>'+
        '<tr><td>Carrier receives on delivery</td><td><strong>'+fmt(m.priceGhs - fee)+'</strong></td></tr></table>'+
        (paid ? '<p style="margin-top:1rem"><span class="badge badge-verified">Escrow released</span> Funds settled.</p>'
              : '<button class="btn btn-primary" id="btn-pay" style="margin-top:1rem">Shipper: pay '+fmt(m.priceGhs)+' into escrow</button>')+
        "</div>";
      var slider = $("#pct");
      if (slider && !paid) slider.addEventListener("input", function(){
        m.commissionPct = Number(slider.value); LM.store("lm_matches", matches);
        $("#pct-out").textContent = m.commissionPct + "%";
        renderPayment(); renderKpi();
      });
      var payBtn = $("#btn-pay");
      if (payBtn) payBtn.addEventListener("click", function(){
        m.status = "in-transit"; LM.store("lm_matches", matches); renderAll();
        alert("GH₵" + m.priceGhs.toLocaleString() + " held in escrow. Released to carrier on proof of delivery.");
      });
    }

    /* Proof of delivery */
    function renderPod(){
      var box = $("#pod-body"); if (!box) return;
      var m = findMatch(selected);
      if (!m) { box.innerHTML = '<div class="empty-state">Select a match to confirm delivery.</div>'; return; }
      var delivered = m.podStatus === "delivered";
      box.innerHTML =
        '<div class="card"><h3>Proof of Delivery — '+esc(m.id)+'</h3>'+
        (delivered
          ? '<p><span class="badge badge-verified">Delivered</span> POD confirmed with OTP. Payment released to carrier.</p>'
          : '<p class="route-meta">Demo mode — OTP shown to both parties: <strong style="font-size:1.2rem;letter-spacing:.15em">'+esc(m.otp)+'</strong></p>'+
            '<label for="pod-otp">Recipient enters the 6-digit delivery code</label>'+
            '<input id="pod-otp" inputmode="numeric" maxlength="6" placeholder="6-digit code">'+
            '<button class="btn btn-primary" id="btn-pod" style="margin-top:1rem">Confirm delivery</button>')+
        "</div>";
      var btn = $("#btn-pod");
      if (btn) btn.addEventListener("click", function(){
        var v = $("#pod-otp").value.trim();
        if (v !== m.otp) { alert("Incorrect code."); return; }
        m.podStatus = "delivered"; m.status = "delivered";
        LM.store("lm_matches", matches); renderAll();
      });
    }

    function renderKpi(){
      var rev = matches.reduce(function(s,m){ return s + ME.commission(m.priceGhs, m.commissionPct); }, 0);
      var el = $("#kpi-revenue"); if (el) el.textContent = fmt(rev);
    }
    function renderAll(){ renderMatches(); renderTracking(); renderContract(); renderPayment(); renderPod(); }
    renderAll();
  }
})();
