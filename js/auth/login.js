/* Protocol Data · Login */
(function(){
  const PAGE_EVENT='sazzu:page:load';

  function root(){return document.querySelector('main.protocolLoginMain');}
  function q(selector){const r=root();return r ? r.querySelector(selector) : null;}

  function nextUrl(){
    const params=new URLSearchParams(window.location.search);
    const auth=window.ProtocolAuth;
    return auth ? auth.safeNext(params.get('next')) : '/panel/logistica/logistica.html';
  }

  function setMessage(type,message){
    const box=q('#protocolLoginMessage');
    if(!box) return;
    box.className='protocolLoginMessage is-visible is-' + type;
    box.textContent=message;
  }

  function clearMessage(){
    const box=q('#protocolLoginMessage');
    if(!box) return;
    box.className='protocolLoginMessage';
    box.textContent='';
  }

  async function redirectIfSession(){
    if(!window.ProtocolAuth) return;
    try{
      const session=await window.ProtocolAuth.getSession();
      if(session){
        setMessage('success','Sesión activa. Redirigiendo al panel...');
        window.setTimeout(function(){window.location.href=nextUrl();},350);
      }
    }catch(error){
      console.warn('[Protocol Login] Sesión no disponible:',error);
    }
  }

  async function handleSubmit(event){
    event.preventDefault();
    clearMessage();

    const email=(q('#protocolLoginEmail')?.value || '').trim();
    const password=q('#protocolLoginPassword')?.value || '';
    const submit=q('#protocolLoginSubmit');

    if(!email || !password){
      setMessage('error','Ingresá email y contraseña para continuar.');
      return;
    }

    if(!window.ProtocolAuth){
      setMessage('error','No se pudo cargar el cliente de autenticación.');
      return;
    }

    if(submit){submit.disabled=true;submit.textContent='Ingresando...';}

    try{
      await window.ProtocolAuth.signIn(email,password);
      setMessage('success','Ingreso correcto. Redirigiendo al panel...');
      window.setTimeout(function(){window.location.href=nextUrl();},450);
    }catch(error){
      console.warn('[Protocol Login]',error);
      setMessage('error','No se pudo iniciar sesión. Revisá email, contraseña o usuarios habilitados en Supabase Auth.');
    }finally{
      if(submit){submit.disabled=false;submit.textContent='Ingresar al sistema';}
    }
  }

  function bind(){
    const main=root();
    if(!main || main.dataset.loginBound==='1') return;
    main.dataset.loginBound='1';
    q('#protocolLoginForm')?.addEventListener('submit',handleSubmit);
  }

  function boot(){
    bind();
    redirectIfSession();
  }

  document.addEventListener('DOMContentLoaded',boot);
  document.addEventListener(PAGE_EVENT,boot);
  if(document.readyState !== 'loading') boot();
})();
