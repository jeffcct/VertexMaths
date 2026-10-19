/* ============================================================
   progress.js — loads the signed-in student's real per-topic status
   from Supabase and applies it over VM.data's topics in place.

   js/data.js's own `status` field on each topic is sample/placeholder
   data (it predates student accounts entirely, see the "Sample
   layout · progress shown is placeholder data" footer it was written
   for) — never a real student's progress. This resets every topic to
   "not-started" first, then overlays whatever real topic_status rows
   exist for the signed-in user, so a brand-new account always starts
   from zero rather than inheriting the placeholder's "mastered"
   values.

   Public API: VM.Progress.applyTopicStatuses(strand) -> Promise
   ============================================================ */
window.VM = window.VM || {};

VM.Progress = (function(){
  var client = VM.supabaseClient;

  function applyTopicStatuses(strand){
    return VM.Auth.getSession().then(function(session){
      if(!session) return;

      VM.data.topics.forEach(function(t){ t.status = 'not-started'; });

      return client
        .from('topic_status')
        .select('topic_id, status')
        .eq('user_id', session.user.id)
        .eq('strand', strand)
        .then(function(res){
          (res.data || []).forEach(function(row){
            var topic = VM.data.findTopic(row.topic_id);
            if(topic) topic.status = row.status;
          });
        });
    });
  }

  return { applyTopicStatuses: applyTopicStatuses };
})();
