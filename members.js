(() => {
  "use strict";
  const cfg = window.PARLADOR_AUTH_CONFIG || {};
  const ui = window.PARLADOR_COMMUNITY_UI;
  const valid = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(cfg.url || "") &&
    typeof cfg.publishableKey === "string" && cfg.publishableKey.length > 15;
  const client = valid && window.supabase?.createClient
    ? window.supabase.createClient(cfg.url, cfg.publishableKey, {
        auth: {detectSessionInUrl:true,persistSession:true,autoRefreshToken:true}
      }) : null;
  const $ = id => document.getElementById(id);
  const feedback = $("feedback");
  let activeId = null;
  let activeUser = null;
  let avatarPath = null;
  let loadToken = 0;
  const myAvatar = $("my-community-avatar");
  function say(text) {feedback.textContent = text;}
  function showGuest() {
    ++loadToken;
    activeId = null;activeUser = null;avatarPath = null;
    $("members-area").hidden=true;$("guest").hidden=false;$("loading").hidden=true;
    $("member-list").replaceChildren();
  }
  function memberName(user) {
    const m = user.user_metadata || {};
    return [m.parlador_display_name,m.full_name,m.name,m.user_name,m.preferred_username,user.email?.split("@")[0]]
      .find(value=>typeof value==="string" && value.trim()) || "PARLADOR MEMBER";
  }
  function idRow(p) {
    const line=document.createElement("p");
    line.className="member-id";
    line.textContent=ui.memberId(p.member_number);
    return line;
  }
  async function showDirectory(uid, token) {
    const {data,error} = await client.from("member_profiles")
      .select("user_id,display_name,nickname,bio,avatar_path,member_number,instagram,telegram,soundcloud")
      .eq("is_listed",true).order("updated_at",{ascending:false}).limit(100);
    if (activeId!==uid || token!==loadToken) return;
    const list=$("member-list");list.replaceChildren();
    if(error){$("list-state").textContent="Не удалось загрузить участников. Проверь SQL-обновление.";console.warn(error);return;}
    const people=data||[];
    $("list-state").textContent=people.length?"Участники PARLADOR, опубликовавшие свои профили":"Пока никто не открыл профиль для сообщества.";
    const verified=await ui.verifiedUsers(client,people.map(p=>p.user_id));
    if(activeId!==uid || token!==loadToken)return;
    for(const p of people){
      const card=document.createElement("article");card.className="person";
      const header=document.createElement("div");header.className="person-header";
      const photo=document.createElement("div");photo.className="community-avatar";
      photo.textContent=(p.display_name || "P").charAt(0).toUpperCase();
      const identity=document.createElement("div");identity.className="person-identity";
      const heading=document.createElement("div");heading.className="identity-heading";
      const name=document.createElement("h3");name.textContent=p.display_name;heading.appendChild(name);
      if(verified.has(p.user_id))heading.appendChild(ui.verifiedBadge());
      identity.appendChild(heading);
      if(p.nickname){const nick=document.createElement("p");nick.className="nick";nick.textContent="@"+p.nickname;identity.appendChild(nick);}
      identity.appendChild(idRow(p));
      header.append(photo,identity);card.appendChild(header);
      if(p.bio){const bio=document.createElement("p");bio.className="bio";bio.textContent=p.bio;card.appendChild(bio);}
      const link=document.createElement("a");link.className="person-link";
      link.href="profile.html?id="+encodeURIComponent(p.user_id);
      link.textContent="ОТКРЫТЬ ПРОФИЛЬ →";
      link.setAttribute("aria-label","Открыть профиль "+p.display_name);
      card.appendChild(link);list.appendChild(card);
      void ui.setAvatar(client,p,photo,()=>activeId===uid && token===loadToken && card.isConnected);
    }
  }
  async function showUser(user) {
    const token=++loadToken;
    activeId=user.id;activeUser=user;
    $("loading").hidden=true;$("guest").hidden=true;$("members-area").hidden=false;
    const {data,error}=await client.from("member_profiles")
      .select("display_name,nickname,bio,is_listed,avatar_path,member_number,instagram,telegram,soundcloud,user_id")
      .eq("user_id",user.id).maybeSingle();
    if(activeId!==user.id || token!==loadToken)return;
    if(error){say("Не удалось загрузить профиль. Примени community-upgrade.sql в Supabase.");console.warn(error);}
    $("display-name").value=data?.display_name || memberName(user).slice(0,60);
    $("nickname").value=data?.nickname ?? user.user_metadata?.parlador_nickname ?? "";
    $("bio").value=data?.bio || "";
    $("listed").checked=Boolean(data?.is_listed);
    $("instagram").value=data?.instagram || "";
    $("telegram").value=data?.telegram || "";
    $("soundcloud").value=data?.soundcloud || "";
    avatarPath=data?.avatar_path||null;
    myAvatar.replaceChildren("P.");
    if(data)void ui.setAvatar(client,data,myAvatar,()=>activeId===user.id && token===loadToken);
    await showDirectory(user.id,token);
  }
  async function uploadPhoto(file){
    if(!activeId || !file)return;
    const ext={"image/jpeg":"jpg","image/png":"png","image/webp":"webp"}[file.type];
    if(!ext || file.size>5*1024*1024 || file.size===0){say("Разрешены JPG, PNG или WEBP до 5 МБ.");return;}
    const uid=activeId;
    const {data:auth,error:authError}=await client.auth.getUser();
    if(authError || auth.user?.id!==uid){say("Сессия изменилась. Войди снова.");return;}
    const path=uid+"/avatar-"+Date.now()+"."+ext;
    say("Загружаем фото для сообщества…");
    const {error}=await client.storage.from("community-avatars")
      .upload(path,file,{contentType:file.type,upsert:false,cacheControl:"3600"});
    if(error){console.warn(error);say("Ошибка загрузки фото. Сначала запусти SQL-обновление.");return;}
    if(activeId!==uid)return;
    avatarPath=path;
    myAvatar.replaceChildren("P.");
    void ui.setAvatar(client,{user_id:uid,avatar_path:path},myAvatar,()=>activeId===uid);
    say("Фото загружено. Нажми «СОХРАНИТЬ ПРОФИЛЬ», чтобы показать его в сообществе.");
  }
  $("community-avatar-file").addEventListener("change",async event=>{
    const file=event.target.files?.[0];
    if(file)await uploadPhoto(file);
    event.target.value="";
  });
  const reuseButton=$("reuse-private-avatar");
  const reuseHint=$("avatar-transfer-status");
  function transferStatus(text){reuseHint.textContent=text;say(text);}
  reuseButton.addEventListener("click",async()=>{
    if(!client||!activeId){transferStatus("Сначала войди в аккаунт PARLADOR.");return;}
    reuseButton.disabled=true;
    const uid=activeId;
    transferStatus("Проверяем фотографию в личном аккаунте…");
    try{
      // Read fresh account metadata, not a potentially stale OAuth session snapshot.
      const {data:auth,error:authError}=await client.auth.getUser();
      if(authError||auth.user?.id!==uid)throw Error("Сессия изменилась. Войди снова.");
      const path=auth.user.user_metadata?.parlador_avatar_path;
      if(typeof path!=="string"||!path.startsWith(uid+"/")){
        transferStatus("В личном аккаунте нет загруженного фото. Загрузи его через MY ACCOUNT или выбери файл ниже.");
        return;
      }
      const extension=path.split(".").pop()?.toLowerCase();
      const formats={jpg:"image/jpeg",jpeg:"image/jpeg",png:"image/png",webp:"image/webp"};
      const mime=formats[extension];
      if(!mime){transferStatus("Формат личного фото не поддерживается. Выбери JPG, PNG или WEBP.");return;}
      if(!window.confirm("Перенести личную фотографию в профиль сообщества? Её увидят авторизованные участники, только когда ты опубликуешь профиль.")){
        transferStatus("Перенос отменён.");return;
      }
      transferStatus("Копируем фото из личного аккаунта…");
      const {data,error}=await client.storage.from("member-avatars").download(path);
      if(error||!data)throw Error("Не удалось прочитать личную аватарку в Storage.");
      if(activeId!==uid)return;
      // Storage downloads can have application/octet-stream; original path supplies MIME.
      const file=new File([data],"community-avatar."+extension,{type:mime});
      await uploadPhoto(file);
      reuseHint.textContent=feedback.textContent;
    }catch(error){
      console.error("PARLADOR avatar transfer",error);
      transferStatus("Не получилось перенести фото: "+(error?.message||"ошибка загрузки")+". Можно выбрать фото вручную.");
    }finally{reuseButton.disabled=false;}
  });
  function validSocials(){
    const instagram=$("instagram").value.trim().replace(/^@/,"");
    const telegram=$("telegram").value.trim().replace(/^@/,"");
    const soundcloud=$("soundcloud").value.trim();
    if(instagram && !/^[A-Za-z0-9_.]{2,50}$/.test(instagram))throw Error("Проверь никнейм Instagram.");
    if(telegram && !/^[A-Za-z0-9_]{5,32}$/.test(telegram))throw Error("Telegram: 5–32 символа, латиница, цифры и _.");
    if(soundcloud && !ui.link("soundcloud",soundcloud))throw Error("Нужна HTTPS-ссылка на soundcloud.com.");
    return {instagram,telegram,soundcloud};
  }
  $("profile-form").addEventListener("submit",async event=>{
    event.preventDefault();
    if(!client||!activeId||!event.currentTarget.reportValidity())return;
    const name=$("display-name").value.trim().replace(/\s+/g," ");
    const nickname=$("nickname").value.trim();
    const bio=$("bio").value.trim();
    if(name.length<2 || name.length>60 || nickname.length>32 || bio.length>280){say("Проверь длину имени, никнейма и описания.");return;}
    let socials;
    try{socials=validSocials();}catch(error){say(error.message);return;}
    const button=$("save-profile");button.disabled=true;say("Сохраняем профиль…");
    const uid=activeId;
    try {
      const {data:auth,error:authError}=await client.auth.getUser();
      if(authError||auth.user?.id!==uid)throw Error("Сессия изменилась");
      const {error}=await client.from("member_profiles").upsert({
        user_id:uid,display_name:name,nickname,bio,is_listed:$("listed").checked,
        avatar_path:avatarPath,updated_at:new Date().toISOString(),...socials
      },{onConflict:"user_id"});
      if(error)throw error;
      say($("listed").checked?"Профиль опубликован!":"Профиль сохранён и скрыт от других.");
      ++loadToken;await showDirectory(uid,loadToken);
    }catch(error){console.warn(error);say("Не удалось сохранить. Примени community-upgrade.sql в Supabase.");}
    finally{button.disabled=false;}
  });
  if(!client){$("loading").textContent="Авторизация недоступна.";return;}
  client.auth.onAuthStateChange((_event,session)=>{
    if(!session?.user)showGuest();
    else if(activeId!==session.user.id)
      setTimeout(()=>showUser(session.user).catch(err=>{console.warn(err);say("Ошибка загрузки");}),0);
  });
  client.auth.getSession().then(({data,error})=>{
    if(error)throw error;
    if(!data.session?.user)showGuest();
    else if(activeId!==data.session.user.id)showUser(data.session.user);
  }).catch(()=>{$("loading").textContent="Не удалось проверить вход.";});
})();