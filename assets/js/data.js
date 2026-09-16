/* LoadMatch — data.js
   Now that the frontend talks to the real backend (see api-client.js), this
   file no longer seeds localStorage demo data or runs its own matching
   engine — the backend (matching.js) is the source of truth for that.
   Kept here: the city list, used by pages.js if it needs to build select
   options dynamically (the HTML forms currently hardcode them, so this is
   just available for reuse). */
(function(){
  "use strict";
  var LM = window.LM = window.LM || {};

  LM.CITIES = ["Accra","Kumasi","Tema","Takoradi","Tamale","Ho","Cape Coast","Sunyani"];
})();
