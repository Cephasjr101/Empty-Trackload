
/* LoadMatch MVP — data.js
   Seed data, storage, matching engine, commission math. */
(function(){
  "use strict";
  var LM = window.LM = window.LM || {};

  var CITIES = ["Accra","Kumasi","Tema","Takoradi","Tamale","Ho","Cape Coast","Sunyani"];

  var SEED_TRUCKS = [
    { id:"T-1001", owner:"Kwame A. (K.A. Logistics)", phone:"+233 24 000 1101", email:"kwame@example.com",
      from:"Accra", to:"Kumasi", truckType:"Box truck", plateNo:"GR 2415-22", capacityKg:8000, volumeM3:32,
      availableFrom:"2026-09-12", availableTo:"2026-09-14", ratePerKm:6.5, verified:true, status:"returning-empty" },
    { id:"T-1002", owner:"Efua M. (Coastal Haulage)", phone:"+233 20 000 2202", email:"efua@example.com",
      from:"Tema", to:"Takoradi", truckType:"Flatbed", plateNo:"GT 8830-19", capacityKg:12000, volumeM3:45,
      availableFrom:"2026-09-13", availableTo:"2026-09-15", ratePerKm:7.2, verified:true, status:"returning-empty" },
    { id:"T-1003", owner:"Yaw O. (Northern Freight)", phone:"+233 27 000 3303", email:"yaw@example.com",
      from:"Accra", to:"Tamale", truckType:"Box truck", plateNo:"GE 5521-21", capacityKg:10000, volumeM3:40,
      availableFrom:"2026-09-15", availableTo:"2026-09-17", ratePerKm:8.0, verified:false, status:"returning-empty" }
  ];

  var SEED_LOADS = [
    { id:"L-2001", shipper:"Amanda's Furniture Depot", phone:"+233 55 000 4404", email:"amanda@example.com",
      from:"Kumasi", to:"Accra", cargo:"Furniture — 40 packaged items", weightKg:4500, volumeM3:20,
      pickupDate:"2026-09-12", deliveryDate:"2026-09-13", budgetGhs:950, verified:true, status:"open" },
    { id:"L-2002", shipper:"Takoradi Cocoa Traders", phone:"+233 31 000 5505", email:"cocoa@example.com",
      from:"Takoradi", to:"Tema", cargo:"Cocoa sacks — 300 bags", weightKg:18000, volumeM3:50,
      pickupDate:"2026-09-14", deliveryDate:"2026-09-15", budgetGhs:2400, verified:true, status:"open" },
    { id:"L-2003", shipper:"Tamale Agro Supplies", phone:"+233 37 000 6606", email:"agro@example.com",
      from:"Tamale", to:"Accra", cargo:"Agro inputs — pallets", weightKg:6000, volumeM3:24,
      pickupDate:"2026-09-16", deliveryDate:"2026-09-17", budgetGhs:1600, verified:false, status:"open" }
  ];

  /* Approximate inter-city distances (km) for price estimation */
  var DIST = {"Accra-Kumasi":270,"Kumasi-Accra":270,"Tema-Takoradi":230,"Takoradi-Tema":230,
              "Accra-Tamale":600,"Tamale-Accra":600,"Accra-Tema":30,"Tema-Accra":30};

  function store(key, val){ try { localStorage.setItem(key, JSON.stringify(val)); } catch(e){} }
  function read(key, fallback){
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch(e){ return fallback; }
  }
  function seed(){
    if (!read("lm_seeded", false)) {
      store("lm_trucks", SEED_TRUCKS);
      store("lm_loads", SEED_LOADS);
      store("lm_seeded", true);
      var m = LM.matchEngine.bestMatch(SEED_TRUCKS[0], SEED_LOADS);
      if (m) {
        store("lm_matches", [{
          id:"M-3001", truckId:m.truck.id, loadId:m.load.id, score:m.score,
          priceGhs: LM.matchEngine.priceFor(m.truck, m.load),
          commissionPct: LM.CONFIG.COMMISSION_DEFAULT,
          status:"matched", createdAt:new Date().toISOString(),
          otp: String(Math.floor(100000 + Math.random()*900000)),
          podStatus:"pending", contractSigned:false
        }]);
      } else { store("lm_matches", []); }
    }
  }

  var norm = function(s){ return (s||"").toString().trim().toLowerCase(); };
  var d = function(s){ return new Date(s + "T00:00:00"); };
  function daysOverlap(a1,a2,b1,b2){
    var s = Math.max(d(a1), d(b1)), e = Math.min(d(a2), d(b2));
    if (isNaN(s) || isNaN(e) || e < s) return 0;
    return Math.round((e - s) / 86400000) + 1;
  }
  function priceFor(truck, load){
    var km = DIST[norm(load.from)+"-"+norm(load.to)] || DIST[norm(truck.from)+"-"+norm(truck.to)] || 250;
    return Math.round(km * truck.ratePerKm);
  }

  var matchEngine = {
    norm:norm,
    priceFor:priceFor,
    distanceKm:function(from,to){ return DIST[norm(from)+"-"+norm(to)] || null; },
    cities:CITIES,
    scoreMatch:function(truck, load){
      if (!truck || !load) return 0;
      var tFrom = norm(truck.from), tTo = norm(truck.to), lFrom = norm(load.from), lTo = norm(load.to);
      var reverse = (tFrom === lTo && tTo === lFrom);
      var sameDir = (tFrom === lFrom && tTo === lTo);
      if (!reverse && !sameDir) return 0;
      if (Number(load.weightKg) > Number(truck.capacityKg)) return 0;
      if (Number(load.volumeM3)  > Number(truck.volumeM3))  return 0;
      var overlap = daysOverlap(truck.availableFrom, truck.availableTo, load.pickupDate, load.deliveryDate);
      if (overlap <= 0) return 0;
      var score = reverse ? 100 : 60;
      score += Math.min(overlap * 10, 30);
      var price = priceFor(truck, load);
      score += (Number(load.budgetGhs) >= price) ? 10 : -10;
      if (truck.verified) score += 5;
      if (load.verified)  score += 5;
      return Math.max(score, 1);
    },
    bestMatch:function(truck, loads){
      var best = null;
      (loads || []).forEach(function(l){
        var s = matchEngine.scoreMatch(truck, l);
        if (s > 0 && (!best || s > best.score)) best = { truck:truck, load:l, score:s };
      });
      return best;
    },
    findMatches:function(trucks, loads){
      var out = [];
      (trucks || []).forEach(function(t){
        (loads || []).forEach(function(l){
          var s = matchEngine.scoreMatch(t, l);
          if (s > 0) out.push({ truck:t, load:l, score:s, reverse: norm(t.from)===norm(l.to) && norm(t.to)===norm(l.from) });
        });
      });
      return out.sort(function(a,b){ return b.score - a.score; });
    },
    commission:function(price, pct){ return Math.round(price * pct / 100); }
  };

  LM.matchEngine = matchEngine;
  LM.store = store; LM.read = read;
  seed();
})();
