/* ============================================================
   api-client.js — the shared client for the self-hosted backend
   (see backend/), used by every page that needs auth or student
   data. Replaces the old supabase-client.js.

   Holds the signed-in user's bearer token in localStorage (so it
   survives reloads and new tabs, the same way the earlier
   supabase-js client persisted its session) and wraps fetch with
   JSON body handling and error surfacing.

   Public API: VM.api.getToken(), VM.api.setToken(token),
   VM.api.request(path, {method, body})
   ============================================================ */
window.VM = window.VM || {};

VM.api = (function(){
  var TOKEN_KEY = 'vm_token';

  function getToken(){
    try { return localStorage.getItem(TOKEN_KEY); } catch(e){ return null; }
  }

  function setToken(token){
    try {
      if(token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch(e){}
  }

  function request(path, options){
    options = options || {};
    var headers = { 'Content-Type': 'application/json' };
    var token = getToken();
    if(token) headers['Authorization'] = 'Bearer ' + token;

    return fetch(VM.config.API_BASE_URL + path, {
      method: options.method || 'GET',
      headers: headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    }).then(function(res){
      return res.json().catch(function(){ return {}; }).then(function(data){
        if(!res.ok){
          var err = new Error((data && data.error) || 'Something went wrong. Try again.');
          err.status = res.status;
          throw err;
        }
        return data;
      });
    });
  }

  return { getToken: getToken, setToken: setToken, request: request };
})();
