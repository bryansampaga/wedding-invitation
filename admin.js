const savedUrl = localStorage.getItem("wedding_supabase_url") || "";
const savedKey = localStorage.getItem("wedding_supabase_anon_key") || "";

const urlInput = document.getElementById("supabaseUrlInput");
const keyInput = document.getElementById("supabaseKeyInput");
const configStatus = document.getElementById("supabaseConfigStatus");

urlInput.value = savedUrl || (typeof DEFAULT_SUPABASE_URL !== "undefined" && !DEFAULT_SUPABASE_URL.includes("PASTE_") ? DEFAULT_SUPABASE_URL : "");
keyInput.value = savedKey || (typeof DEFAULT_SUPABASE_ANON_KEY !== "undefined" && !DEFAULT_SUPABASE_ANON_KEY.includes("PASTE_") ? DEFAULT_SUPABASE_ANON_KEY : "");

document.getElementById("saveSupabaseBtn").addEventListener("click",()=>{
  const url=urlInput.value.trim();
  const key=keyInput.value.trim();

  if(!url || !key){
    configStatus.textContent="Enter both the Project URL and anon/public key.";
    return;
  }

  localStorage.setItem("wedding_supabase_url",url);
  localStorage.setItem("wedding_supabase_anon_key",key);
  configStatus.textContent="Supabase configuration saved. Reloading admin...";
  setTimeout(()=>location.reload(),500);
});

document.getElementById("clearSupabaseBtn").addEventListener("click",()=>{
  localStorage.removeItem("wedding_supabase_url");
  localStorage.removeItem("wedding_supabase_anon_key");
  configStatus.textContent="Saved Supabase configuration cleared.";
  setTimeout(()=>location.reload(),500);
});

const ready =
  typeof SUPABASE_URL !== "undefined" &&
  typeof SUPABASE_ANON_KEY !== "undefined" &&
  !SUPABASE_URL.includes("PASTE_") &&
  !SUPABASE_ANON_KEY.includes("PASTE_") &&
  SUPABASE_URL.trim() !== "" &&
  SUPABASE_ANON_KEY.trim() !== "";

const status=document.getElementById("adminStatus");

let sb=null;

if(!ready){
  status.textContent="Configure Supabase above before adding guests or viewing uploaded photos.";
}else{
  sb=supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
  loadGuests();
  loadPhotos();
}

document.getElementById("addGuestBtn").addEventListener("click",async()=>{
  if(!sb){
    status.textContent="Save your Supabase configuration first.";
    return;
  }

  const name=document.getElementById("guestInput").value.trim();
  const reservation=document.getElementById("reservationInput").value.trim();
  const tableNumber=Number(document.getElementById("tableInput").value);
  const seatNumber=Number(document.getElementById("seatInput").value);
  if(!name)return;

  const token=crypto.randomUUID().replaceAll("-","").slice(0,20);

  const {error}=await sb.from("guests").insert({
    name,
    invite_token:token,
    reservation_number: reservation || null,
    table_number: tableNumber || null,
    seat_number: seatNumber || null
  });

  status.textContent=error?error.message:"Guest created.";

  if(!error){
    document.getElementById("guestInput").value="";
    await loadGuests();
  }
});

async function loadGuests(){
  if(!sb)return;

  const {data,error}=await sb
    .from("guests")
    .select("id,name,invite_token,active,reservation_number,table_number,seat_number")
    .order("name");

  if(error){
    status.textContent=error.message;
    return;
  }

  const box=document.getElementById("guestList");
  box.innerHTML="";

  data.forEach(g=>{
    const url=`${location.origin}${location.pathname.replace("admin.html","index.html")}?invite=${g.invite_token}`;

    const row=document.createElement("div");
    row.style.cssText="padding:14px 0;border-top:1px solid rgba(0,0,0,.08);display:grid;gap:6px";
    row.innerHTML=`
      <strong>${escapeHtml(g.name)}</strong>
      <code style="word-break:break-all">${url}</code>
      <button class="btn secondary copy" data-url="${url}" style="width:max-content">Copy Invitation Link</button>`;

    box.appendChild(row);
  });

  document.querySelectorAll(".copy").forEach(b=>{
    b.onclick=async()=>{
      await navigator.clipboard.writeText(b.dataset.url);
      status.textContent="Invitation link copied.";
    };
  });
}

async function loadPhotos(){
  if(!sb)return;

  const {data,error}=await sb
    .from("guest_photos")
    .select("id,storage_path,created_at,filter_name,guests(name)")
    .order("created_at",{ascending:false});

  if(error){
    status.textContent=error.message;
    return;
  }

  const box=document.getElementById("allPhotos");
  box.innerHTML="";

  if(!data.length){
    box.innerHTML='<p class="empty">No guest photos yet.</p>';
    return;
  }

  for(const p of data){
    const {data:u}=await sb.storage
      .from("wedding-photos")
      .createSignedUrl(p.storage_path,3600);

    const f=document.createElement("figure");
    f.innerHTML=`
      <img src="${u?.signedUrl||""}" alt="">
      <figcaption>
        <strong>${escapeHtml(p.guests?.name||"Guest")}</strong><br>
        ${new Date(p.created_at).toLocaleString()}
      </figcaption>`;

    box.appendChild(f);
  }
}

function escapeHtml(s){
  return s.replace(/[&<>"']/g,m=>({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#039;"
  }[m]));
}
