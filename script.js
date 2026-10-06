const sbReady =
  SUPABASE_URL &&
  SUPABASE_ANON_KEY &&
  !SUPABASE_URL.includes("PASTE_") &&
  !SUPABASE_ANON_KEY.includes("PASTE_");

const sb = sbReady ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const $ = (id) => document.getElementById(id);

$("partnerOne").textContent = weddingConfig.partnerOne;
$("partnerTwo").textContent = weddingConfig.partnerTwo;
$("weddingDate").textContent = weddingConfig.weddingDate;
$("weddingTime").textContent = weddingConfig.weddingTime;
$("venueName").textContent = weddingConfig.venueName;
$("venueAddress").textContent = weddingConfig.venueAddress;
$("mapLink").href = weddingConfig.mapUrl;
$("footerCouple").textContent = `${weddingConfig.partnerOne} & ${weddingConfig.partnerTwo}`;

const params = new URLSearchParams(location.search);
const token = (params.get("invite") || "").trim();

let guest = {
  id: null,
  name: "Our Dear Guest",
  message: "We would be honored to celebrate this beautiful day with you.",
  reservation_number: "R-001",
  table_number: 1,
  seat_number: 1
};

async function loadGuest() {
  if (!token) {
    setGuestUI();
    $("uploadStatus").textContent = "This preview has no invitation token. Add ?invite=YOUR_TOKEN to the URL.";
    return;
  }

  if (!sbReady) {
    // Preview mode before Supabase is connected.
    guest.name = "Preview Guest";
    guest.message = "This is how a personalized guest invitation will look.";
    guest.reservation_number = "R-017";
    guest.table_number = 2;
    guest.seat_number = 7;
    setGuestUI();
    $("uploadStatus").textContent = "Connect Supabase in config.js to enable private photos.";
    return;
  }

  const { data, error } = await sb
    .from("guests")
    .select("id,name,message,reservation_number,table_number,seat_number")
    .eq("invite_token", token)
    .eq("active", true)
    .maybeSingle();

  if (error || !data) {
    document.body.innerHTML = `
      <main class="section">
        <div class="card" style="max-width:680px;margin:auto;text-align:center">
          <h1 style="font-family:'Cormorant Garamond',serif;font-size:50px">Invitation not found</h1>
          <p>This invitation link is invalid or no longer active.</p>
        </div>
      </main>`;
    return;
  }

  guest = data;
  setGuestUI();
  await loadMyPhotos();
}

function setGuestUI() {
  $("guestName").textContent = guest.name;
  $("guestDisplay").textContent = guest.name;
  $("overlayGuestName").textContent = guest.name;
  $("guestMessage").textContent = guest.message || "We would be honored to celebrate this beautiful day with you.";
  $("reservationNumber").textContent = guest.reservation_number || "R-001";
  $("tableNumber").textContent = guest.table_number || 1;
  $("seatNumber").textContent = guest.seat_number || 1;
  renderSeatingPlan(Number(guest.table_number || 1), Number(guest.seat_number || 1));
}

let stream = null;
let photoBlob = null;
let currentStyle = "accept";
let currentDecor = "flowers";

const filterDefinitions = {
  accept: { small:"With love,", main:"Yes, I do accept the invitation!", decor:"flowers" },
  honored: { small:"So happy for you both,", main:"Honored to be there for your big day!", decor:"sprigs" },
  celebrate: { small:"Celebrating love,", main:"See you at the wedding!", decor:"petals" },
  forever: { small:"A little love note,", main:"Cheers to your forever!", decor:"hearts" },
  garden: { small:"Blooming with joy,", main:"Love is in full bloom!", decor:"garden" },
  lovebirds: { small:"Two hearts, one forever,", main:"Celebrating your love story!", decor:"birds" },
  floralarch: { small:"Under a garden of love,", main:"A beautiful beginning!", decor:"arch" },
  rings: { small:"With all my love,", main:"To forever and always!", decor:"rings" }
};

function applyFilter(style){
  const def = filterDefinitions[style] || filterDefinitions.accept;
  currentStyle = style;
  currentDecor = def.decor;
  $("filterSmall").textContent = def.small;
  $("filterMain").textContent = def.main;
  $("liveOverlay").className = `live-overlay filter-${style}`;
  renderLiveDecor(currentDecor);

  const select = $("filterSelect");
  if (select && select.value !== style) select.value = style;

  document.querySelectorAll(".filter").forEach(btn =>
    btn.classList.toggle("active", btn.dataset.style === style)
  );
}

if ($("filterSelect")) {
  $("filterSelect").addEventListener("change", () => applyFilter($("filterSelect").value));
}

$("startBtn").addEventListener("click", async () => {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 1080 }, height: { ideal: 1350 } },
      audio: false
    });
    $("camera").srcObject = stream;
    $("placeholder").classList.add("hidden");
    $("captureBtn").disabled = false;
    $("startBtn").disabled = true;
    $("startBtn").textContent = "Camera Ready";
  } catch (e) {
    $("uploadStatus").textContent = "Camera access was blocked. Use HTTPS and allow camera permission.";
  }
});

document.querySelectorAll(".filter").forEach(btn => {
  btn.addEventListener("click", () => applyFilter(btn.dataset.style));
});

$("captureBtn").addEventListener("click", async () => {
  const video = $("camera");
  if (!video.videoWidth) return;

  const canvas = $("snapshotCanvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;

  ctx.save();
  ctx.translate(w, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, w, h);
  ctx.restore();

  // Wedding decoration selected by the guest.
  drawCanvasDecor(ctx, currentDecor, w, h);

  // Caption background
  const bg = {
    accept:"rgba(238,243,235,.91)",
    honored:"rgba(215,225,231,.91)",
    celebrate:"rgba(226,234,220,.92)",
    forever:"rgba(244,238,226,.93)"
  }[currentStyle];

  const x=w*.07,y=h*.75,bw=w*.86,bh=h*.19;
  roundRect(ctx,x,y,bw,bh,Math.max(22,w*.025));
  ctx.fillStyle=bg; ctx.fill();

  ctx.fillStyle="#273129";
  ctx.textAlign="center";
  ctx.font=`italic ${Math.max(28,w*.034)}px Georgia`;
  ctx.fillText($("filterSmall").textContent,w/2,y+bh*.27);

  ctx.font=`600 ${Math.max(22,w*.025)}px Arial`;
  wrapText(ctx,$("filterMain").textContent,w/2,y+bh*.51,bw*.82,Math.max(29,h*.029));

  // Automatic guest name on the actual saved image
  ctx.font=`700 ${Math.max(34,w*.043)}px Georgia`;
  ctx.fillText(guest.name,w/2,y+bh*.82);

  $("camera").style.display="none";
  $("snapshotCanvas").style.display="block";
  $("liveOverlay").style.display="none";
  $("captureBtn").classList.add("hidden");
  $("retakeBtn").classList.remove("hidden");
  $("postBtn").classList.remove("hidden");
  $("downloadBtn").classList.remove("hidden");
  $("downloadBtn").href=canvas.toDataURL("image/png");

  photoBlob = await new Promise(resolve => canvas.toBlob(resolve,"image/png",.94));
});

$("retakeBtn").addEventListener("click", () => {
  $("snapshotCanvas").style.display="none";
  $("camera").style.display="block";
  $("liveOverlay").style.display="flex";
  $("captureBtn").classList.remove("hidden");
  $("retakeBtn").classList.add("hidden");
  $("postBtn").classList.add("hidden");
  $("downloadBtn").classList.add("hidden");
  photoBlob=null;
});

$("postBtn").addEventListener("click", uploadPhoto);

async function uploadPhoto() {
  if (!sbReady) {
    $("uploadStatus").textContent="Connect Supabase first.";
    return;
  }

  if (!guest.id || !token || !photoBlob) return;

  const { count, error: countError } = await sb
    .from("guest_photos")
    .select("*", { count: "exact", head: true })
    .eq("guest_id", guest.id);

  if (countError) {
    $("uploadStatus").textContent = "Could not check photo limit: " + countError.message;
    return;
  }

  if ((count || 0) >= MAX_GUEST_PHOTOS) {
    updatePhotoCounter(count || 0);
    $("uploadStatus").textContent = "You have already used all 3 photo slots.";
    return;
  }

  $("postBtn").disabled=true;
  $("uploadStatus").textContent="Posting your photo...";

  const id = crypto.randomUUID();
  const path = `${guest.id}/${id}.png`;

  const { error: storageError } = await sb.storage
    .from("wedding-photos")
    .upload(path, photoBlob, { contentType:"image/png", upsert:false });

  if (storageError) {
    $("uploadStatus").textContent="Upload failed: "+storageError.message;
    $("postBtn").disabled=false;
    return;
  }

  const { error: dbError } = await sb.from("guest_photos").insert({
    id,
    guest_id: guest.id,
    invite_token: token,
    storage_path: path,
    filter_name: currentStyle
  });

  if (dbError) {
    $("uploadStatus").textContent="Photo uploaded, but gallery entry failed: "+dbError.message;
    $("postBtn").disabled=false;
    return;
  }

  $("uploadStatus").textContent="Posted to your private invitation gallery.";
  $("postBtn").disabled=false;
  await loadMyPhotos();
}


function updatePhotoCounter(count) {
  const counter = document.getElementById("photoCounter");
  const postBtn = document.getElementById("postBtn");

  if (!counter) return;

  const remaining = Math.max(0, MAX_GUEST_PHOTOS - count);
  counter.textContent = `${count} / ${MAX_GUEST_PHOTOS} photos uploaded`;

  if (count >= MAX_GUEST_PHOTOS) {
    counter.textContent += " · Gallery complete";
    if (postBtn) {
      postBtn.disabled = true;
      postBtn.textContent = "3 Photo Limit Reached";
    }
  } else {
    counter.textContent += ` · ${remaining} remaining`;
    if (postBtn) {
      postBtn.disabled = false;
      postBtn.textContent = "Post to My Invitation";
    }
  }
}

async function loadMyPhotos() {
  if (!sbReady || !guest.id || !token) return;

  const { data, error } = await sb
    .from("guest_photos")
    .select("id,storage_path,created_at,filter_name")
    .eq("guest_id", guest.id)
    .eq("invite_token", token)
    .order("created_at",{ascending:false});

  if (error) return;

  const gallery=$("myPhotos");
  gallery.innerHTML="";

  updatePhotoCounter(data?.length || 0);

  if (!data?.length) {
    gallery.innerHTML='<p class="empty">No photos posted yet.</p>';
    return;
  }

  for (const item of data) {
    const { data:signed } = await sb.storage
      .from("wedding-photos")
      .createSignedUrl(item.storage_path, 60*60);

    const fig=document.createElement("figure");
    fig.innerHTML=`<img src="${signed?.signedUrl || ""}" alt="Wedding selfie">
      <figcaption>${new Date(item.created_at).toLocaleString()}</figcaption>`;
    gallery.appendChild(fig);
  }
}


function renderLiveDecor(type){
  const overlay = $("liveOverlay");
  let layer = overlay.querySelector(".decor-layer");
  if(!layer){
    layer = document.createElement("div");
    layer.className = "decor-layer";
    overlay.appendChild(layer);
  }

  const layouts = {
    flowers: [
      ["🌿", "5%", "5%", "30px"], ["🌸", "14%", "4%", "28px"],
      ["🌿", "88%", "5%", "30px"], ["🌷", "80%", "5%", "27px"]
    ],
    sprigs: [
      ["🌿", "6%", "7%", "32px"], ["🤍", "84%", "8%", "25px"]
    ],
    petals: [
      ["🌸", "7%", "7%", "28px"], ["🌸", "84%", "10%", "24px"],
      ["🌼", "12%", "24%", "22px"]
    ],
    hearts: [
      ["🤍", "8%", "8%", "26px"], ["♡", "84%", "9%", "32px"]
    ],
    garden: [
      ["🌸", "3%", "5%", "32px"], ["🌷", "13%", "4%", "30px"],
      ["🌿", "23%", "5%", "29px"], ["🌼", "78%", "5%", "29px"],
      ["🌿", "88%", "6%", "31px"]
    ],
    birds: [
      ["🕊️", "31%", "7%", "38px"], ["❤", "48%", "9%", "22px"],
      ["🕊️", "57%", "7%", "38px"]
    ],
    arch: [
      ["🌿", "3%", "4%", "36px"], ["🌸", "12%", "3%", "30px"],
      ["🌿", "22%", "2%", "34px"], ["🌸", "74%", "3%", "30px"],
      ["🌿", "85%", "4%", "36px"]
    ],
    rings: [
      ["🌹", "7%", "6%", "31px"], ["💍", "44%", "6%", "34px"],
      ["🌹", "84%", "6%", "31px"]
    ]
  };

  layer.innerHTML = "";
  (layouts[type] || layouts.flowers).forEach(([char,left,top,size],i)=>{
    const span = document.createElement("span");
    span.className = "decor-item";
    span.textContent = char;
    span.style.left = left;
    span.style.top = top;
    span.style.fontSize = size;
    if(type === "birds" && i === 2){
      span.style.transform = "scaleX(-1)";
    }
    layer.appendChild(span);
  });
}

function drawCanvasDecor(ctx,type,w,h){
  const size = Math.max(35,w*.05);
  ctx.save();
  ctx.textBaseline = "middle";
  ctx.font = `${size}px "Segoe UI Emoji","Apple Color Emoji",sans-serif`;

  const draw = (char,x,y,align="center",flip=false)=>{
    ctx.save();
    ctx.textAlign = align;
    if(flip){
      ctx.translate(x,y);
      ctx.scale(-1,1);
      ctx.fillText(char,0,0);
    }else{
      ctx.fillText(char,x,y);
    }
    ctx.restore();
  };

  if(type === "birds"){
    draw("🕊️",w*.40,h*.09);
    draw("❤",w*.50,h*.095);
    draw("🕊️",w*.60,h*.09,"center",true);
  }else if(type === "garden"){
    draw("🌸",w*.08,h*.08); draw("🌷",w*.17,h*.07);
    draw("🌿",w*.27,h*.08); draw("🌼",w*.83,h*.08);
    draw("🌿",w*.92,h*.08);
  }else if(type === "arch"){
    draw("🌿",w*.07,h*.08); draw("🌸",w*.17,h*.06);
    draw("🌿",w*.28,h*.055); draw("🌿",w*.72,h*.055);
    draw("🌸",w*.83,h*.06); draw("🌿",w*.93,h*.08);
  }else if(type === "rings"){
    draw("🌹",w*.10,h*.08); draw("💍",w*.50,h*.075);
    draw("🌹",w*.90,h*.08);
  }else if(type === "hearts"){
    draw("🤍",w*.10,h*.08); draw("♡",w*.90,h*.08);
  }else if(type === "petals"){
    draw("🌸",w*.10,h*.08); draw("🌸",w*.90,h*.10);
    draw("🌼",w*.15,h*.22);
  }else if(type === "sprigs"){
    draw("🌿",w*.10,h*.08); draw("🤍",w*.90,h*.08);
  }else{
    draw("🌿",w*.08,h*.08); draw("🌸",w*.16,h*.065);
    draw("🌿",w*.92,h*.08); draw("🌷",w*.84,h*.065);
  }
  ctx.restore();
}

renderLiveDecor(currentDecor);

function renderSeatingPlan(activeTable, activeSeat){
  const wrap = $("seatingPlan");
  if (!wrap) return;

  wrap.innerHTML = "";

  for (let table = 1; table <= 5; table++) {
    const card = document.createElement("section");
    card.className = "seat-table";
    card.innerHTML = `<div class="seat-table-title"><span>Table</span><strong>${table}</strong></div>`;

    const seats = document.createElement("div");
    seats.className = "seat-grid";

    for (let seat = 1; seat <= 10; seat++) {
      const globalNumber = ((table - 1) * 10) + seat;
      const chip = document.createElement("div");
      chip.className = "seat-chip" + (table === activeTable && seat === activeSeat ? " my-seat" : "");
      chip.innerHTML = `<span>${globalNumber}</span><small>S${seat}</small>`;
      seats.appendChild(chip);
    }

    card.appendChild(seats);
    wrap.appendChild(card);
  }
}

function roundRect(ctx,x,y,w,h,r){
  r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();
}
function wrapText(ctx,text,x,y,maxWidth,lineHeight){
  const words=text.split(" ");let line="",lines=[];
  words.forEach(word=>{const test=line?`${line} ${word}`:word;
    if(ctx.measureText(test).width>maxWidth&&line){lines.push(line);line=word}else line=test;});
  if(line)lines.push(line);lines.slice(0,2).forEach((l,i)=>ctx.fillText(l,x,y+i*lineHeight));
}

loadGuest();