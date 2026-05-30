/* Protocol Data Auth Client */
(function(){
  const LOGIN_PATH='/panel/login.html';
  const DEFAULT_NEXT='/panel/logistica/logistica.html';

  function config_(){
    return window.SAZZU_SUPABASE_CONFIG || window.PROTOCOL_SUPABASE_CONFIG || null;
  }

  function key_(config){
    return config && (config.publishableKey || config.anonKey || config.key);
  }

  function url_(raw){
    return String(raw || '').trim().replace(/\/rest\/v1\/?$/i,'').replace(/\/+$/g,'');
  }

  function safeNext(next){
    const value=String(next || '').trim();
    if(!value || !value.startsWith('/') || value.startsWith('//')) return DEFAULT_NEXT;
    return value;
  }

  function loginUrl(next){
    const current=window.location.pathname + window.location.search;
    return LOGIN_PATH + '?next=' + encodeURIComponent(safeNext(next || current));
  }

  function getClient(){
    if(window.__protocolSupabaseClient) return window.__protocolSupabaseClient;
    const config=config_();
    const supabaseUrl=url_(config && config.url);
    const publicKey=key_(config);
    if(!window.supabase || !supabaseUrl || !publicKey) return null;
    window.__protocolSupabaseClient=window.supabase.createClient(supabaseUrl,publicKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    return window.__protocolSupabaseClient;
  }

  async function getSession(){
    const client=getClient();
    if(!client) throw new Error('Supabase no configurado');
    const response=await client.auth.getSession();
    if(response.error) throw response.error;
    return response.data ? response.data.session : null;
  }

  async function signIn(email,password){
    const client=getClient();
    if(!client) throw new Error('Supabase no configurado');
    const response=await client.auth.signInWithPassword({email:String(email || '').trim(),password:String(password || '')});
    if(response.error) throw response.error;
    return response.data;
  }

  async function signOut(){
    const client=getClient();
    if(!client) throw new Error('Supabase no configurado');
    const response=await client.auth.signOut();
    if(response.error) throw response.error;
    return true;
  }

  async function requireAuthForWrite(options){
    const opts=options || {};
    const session=await getSession();
    if(session) return {ok:true,session:session};
    return {ok:false,session:null,loginUrl:loginUrl(opts.next)};
  }

  window.ProtocolAuth={DEFAULT_NEXT:DEFAULT_NEXT,getClient:getClient,getSession:getSession,signIn:signIn,signOut:signOut,requireAuthForWrite:requireAuthForWrite,loginUrl:loginUrl,safeNext:safeNext};
})();
