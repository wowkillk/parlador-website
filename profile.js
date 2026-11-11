(() => {
  "use strict";
  const $=id=>document.getElementById(id);
  const ui=window.PARLADOR_COMMUNITY_UI;
  const cfg=window.PARLADOR_AUTH_CONFIG||{};
  const valid=/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(cfg.url||"") &&
    typeof cfg.publishableKey==="string" && cfg.publishableKey.length>15;
  const client=valid && window.supabase?.createClient
    ? window.supabase.createClient(cfg.url,cfg.publishableKey,{auth:{detectSessionInUrl:true,persistSession:true,autoRefreshToken:true}})
    : null;
  const id=new URLSearchParams(location.search).get("id");
  const validId=typeof id==="string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  let activeId=null,sequence=0;
  function reset(){
    $("guest").hidden=true;$("missing").hidden=true;$("profile-card").hidden=true;
    $("profile-avatar").replaceChildren("P.");$("profile-verified-holder").replaceChildren();
    $("social-links").replaceChildren();
  }
  async function render(session) {
    const seq=++sequence;
    const user=session?.user;
    activeId=user?.id||null;reset();
    if(!user){$("loading").hidden=true;$("guest").hidden=false;return;}
    if(!validId){$("loading").hidden=true;$("missing").hidden=false;return;}
    $("loading").hidden=false;$("loading").textContent="Загружаем профиль…";
    const {data,error}=await client.from("member_profiles")
      .select("user_id,display_name,nickname,bio,is_listed,avatar_path,member_number,instagram,telegram,soundcloud")
      .eq("user_id",id).maybeSingle();
    if(seq!==sequence||activeId!==user.id)return;
    $("loading").hidden=true;
    if(error||!data||(!data.is_listed&&data.user_id!==user.id)){
      if(error)console.warn("PARLADOR community read",error);
      $("missing").hidden=false;return;
    }
    $("profile-name").textContent=data.display_name;
    $("profile-nickname").textContent=data.nickname?"@"+data.nickname:"";
    $("profile-nickname").hidden=!data.nickname;
    $("profile-bio").textContent=data.bio||"Участник пока ничего не рассказал о себе.";
    $("profile-id").textContent=ui.memberId(data.member_number);
    const links=$("social-links");
    for(const kind of ["instagram","telegram","soundcloud"]){
      const link=ui.link(kind,data[kind]);
      if(link)links.appendChild(link);
    }
    $("no-socials").hidden=Boolean(links.childElementCount);
    $("profile-card").hidden=false;
    const [verified]=await Promise.all([
      ui.verifiedUsers(client,[data.user_id]),
      ui.setAvatar(client,data,$("profile-avatar"),()=>seq===sequence&&activeId===user.id)
    ]);
    if(seq!==sequence||activeId!==user.id)return;
    if(verified.has(data.user_id))$("profile-verified-holder").appendChild(ui.verifiedBadge());
  }
  if(!client){$("loading").textContent="Авторизация сейчас недоступна.";return;}
  client.auth.onAuthStateChange((_event,session)=>{
    setTimeout(()=>render(session).catch(err=>{console.warn(err);$("loading").textContent="Ошибка загрузки профиля."; }),0);
  });
  client.auth.getSession().then(({data,error})=>{
    if(error)throw error;
    return render(data.session);
  }).catch(()=>{$("loading").textContent="Не удалось проверить авторизацию.";});
})();