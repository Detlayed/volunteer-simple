// Lightweight Supabase helper. If SUPABASE_CONFIG is provided on the window with {url, anonKey}, this
// module initializes a client and exposes helper functions. If not configured, functions are no-op
// and code should gracefully fallback to localStorage.

(function(window){
  const cfg = window.SUPABASE_CONFIG || {};
  let supabase = null;
  if(cfg.url && cfg.anonKey && window.supabase){
    try{
      supabase = window.supabase.createClient(cfg.url, cfg.anonKey);
      console.log('Supabase initialized');
    }catch(e){ console.warn('Supabase init failed', e); supabase = null; }
  }

  async function signupVolunteer(email, password, profile){
    if(!supabase) return { ok:false, reason:'no-supabase' };
    const { data, error } = await supabase.auth.signUp({ email, password }, { data: profile });
    if(error) return { ok:false, reason: error.message };
    // Ensure profile row exists in volunteers table
    try{
      const profileRow = { email: email, full_name: profile.fullName || '', iin: profile.iin || '', phone: profile.phone || '', city: profile.city || '' };
      const { error: errUp } = await supabase.from('volunteers').upsert(profileRow, { onConflict: 'email' });
      if(errUp) console.warn('volunteer upsert error', errUp);
    }catch(e){ console.warn('profile write failed', e); }
    return { ok:true, data };
  }

  async function signinVolunteer(email, password){
    if(!supabase) return { ok:false, reason:'no-supabase' };
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if(error) return { ok:false, reason: error.message };
    return { ok:true, data };
  }

  async function signout(){ if(!supabase) return; try{ await supabase.auth.signOut(); }catch(e){} }

  async function createRequest(req){
    if(!supabase) return { ok:false, reason:'no-supabase' };
    try{
      const { data, error } = await supabase.from('requests').insert([req]);
      if(error) return { ok:false, reason:error.message };
      return { ok:true, data };
    }catch(e){ return { ok:false, reason: String(e) }; }
  }

  async function listRequests(){
    if(!supabase) return { ok:false, reason:'no-supabase' };
    try{
      const { data, error } = await supabase.from('requests').select('*').order('created', { ascending: false });
      if(error) return { ok:false, reason:error.message };
      return { ok:true, data };
    }catch(e){ return { ok:false, reason:String(e) }; }
  }

  window._supabase_helper = {
    client: supabase,
    signupVolunteer,
    signinVolunteer,
    signout,
    createRequest,
    listRequests
  };
})(window);
