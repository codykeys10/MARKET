// Supabase Configuration
const SUPABASE_URL = "https://variiftmgdniudaeepe.supabase.co"; 
const SUPABASE_ANON_KEY = "sb_publishable_dpVWrZU-PQ1p6VUJcbMEZQ_t1KvJoTs"; 

const INITIAL_MOCK_DATA = [
  {
    id: "mock-1",
    name: "Baraka Tech",
    college: "UDSM Mlimani",
    location: "Msewe Gate A",
    category: "Tech & Repair",
    title: "Windows 11, Antivirus & Format ya Laptop",
    starting_price: 3000,
    phone: "255712345678",
    verified: true,
    isSpam: false,
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
    product_images: [
      "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=500",
      "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=500"
    ],
    tags: ["Windows", "Format", "Software"],
    views: 15,
    likes: 4,
    whatsapp_clicks: 2
  },
  {
    id: "mock-2",
    name: "Amina Braids",
    college: "IFM Main",
    location: "Block C Hostel",
    category: "Beauty & Style",
    title: "Kusuka Yebo Yebo & Kutengeneza Kucha",
    starting_price: 5000,
    phone: "255787654321",
    verified: true,
    isSpam: false,
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
    product_images: [
      "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=500"
    ],
    tags: ["Kusuka", "Kucha", "Makeup"],
    views: 28,
    likes: 9,
    whatsapp_clicks: 5
  }
];

let state = {
  hustlers: [],
  filtered: [],
  favorites: JSON.parse(localStorage.getItem("gh_favorites") || "[]"),
  likedItems: JSON.parse(localStorage.getItem("gh_liked_items") || "[]"),
  selectedPresetAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
  sessionViewed: new Set(),
  activeSellerPhone: null,
  isOfflineMode: false
};

function formatPhoneNumber(phone) {
  if (!phone) return "";
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = "255" + cleaned.substring(1);
  }
  return cleaned;
}

document.addEventListener("DOMContentLoaded", () => {
  if (window.lucide) lucide.createIcons();

  const container = document.getElementById("hustlersContainer");
  const resultsCount = document.getElementById("resultsCount");
  const searchInput = document.getElementById("searchInput");
  const collegeFilter = document.getElementById("collegeFilter");
  const categoryFilter = document.getElementById("categoryFilter");
  const sortFilter = document.getElementById("sortFilter");

  const registerModal = document.getElementById("registerModal");
  const openModalBtn = document.getElementById("openModalBtn");
  const closeModalBtn = document.getElementById("closeModalBtn");
  const addHustlerForm = document.getElementById("addHustlerForm");
  const submitBtn = document.getElementById("submitBtn");

  const dashboardModal = document.getElementById("dashboardModal");
  const openDashboardBtn = document.getElementById("openDashboardBtn");
  const closeDashboardBtn = document.getElementById("closeDashboardBtn");
  const loadSellerStatsBtn = document.getElementById("loadSellerStatsBtn");

  // Avatar Presets Selection Logic
  const avatarOptions = document.querySelectorAll(".avatar-option");
  avatarOptions.forEach(img => {
    img.addEventListener("click", () => {
      avatarOptions.forEach(opt => opt.classList.remove("selected"));
      img.classList.add("selected");
      state.selectedPresetAvatar = img.dataset.url;
      const avatarFileInput = document.getElementById("formAvatarFile");
      if (avatarFileInput) avatarFileInput.value = "";
    });
  });

  // Limit check on product images input
  const productImagesInput = document.getElementById("formProductImages");
  productImagesInput?.addEventListener("change", (e) => {
    if (e.target.files.length > 5) {
      alert("Samahani! Unaweza kuchagua hadi picha 5 pekee.");
      e.target.value = "";
    }
  });

  openModalBtn?.addEventListener("click", () => registerModal.classList.remove("hidden"));
  closeModalBtn?.addEventListener("click", () => registerModal.classList.add("hidden"));
  openDashboardBtn?.addEventListener("click", () => dashboardModal.classList.remove("hidden"));
  closeDashboardBtn?.addEventListener("click", () => dashboardModal.classList.add("hidden"));

  async function fetchHustlers() {
    try {
      const url = `${SUPABASE_URL}/rest/v1/hustlers?select=*&order=created_at.desc&apikey=${SUPABASE_ANON_KEY}`;
      const response = await fetch(url);

      if (!response.ok) throw new Error("Supabase Offline");

      const data = await response.json();
      state.hustlers = data.map(item => ({
        ...item,
        phone: formatPhoneNumber(item.phone),
        product_images: Array.isArray(item.product_images) ? item.product_images : [],
        views: Number(item.views || 0),
        likes: Number(item.likes || 0),
        whatsapp_clicks: Number(item.whatsapp_clicks || 0)
      }));
      state.isOfflineMode = false;
    } catch (err) {
      console.warn("Using Local Storage Mode.");
      const savedLocal = localStorage.getItem("ghetto_hub_local_data");
      state.hustlers = savedLocal ? JSON.parse(savedLocal) : INITIAL_MOCK_DATA;
      state.isOfflineMode = true;
    }

    filterAndRender();
  }

  function saveStateLocally() {
    localStorage.setItem("ghetto_hub_local_data", JSON.stringify(state.hustlers));
  }

  function render(data) {
    resultsCount.textContent = `Zimepatikana huduma ${data.length}`;

    if (!data || data.length === 0) {
      container.innerHTML = `
        <div class="text-center py-12 text-slate-500 space-y-1">
          <p class="text-sm font-semibold text-slate-400">Hakuna huduma au bidhaa iliyopatikana</p>
          <p class="text-xs">Jaribu kubadilisha filter au uwe wa kwanza kusajili!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = data.map((hustler, index) => {
      if (!state.sessionViewed.has(hustler.id)) {
        hustler.views = (hustler.views || 0) + 1;
        state.sessionViewed.add(hustler.id);
        saveStateLocally();
      }

      const isFav = state.favorites.includes(hustler.id);
      const isLiked = state.likedItems.includes(hustler.id);

      // --- LOGIC YA IG BLUE TICK NA SPAM BADGE ---
      let badgeHTML = '';
      if (hustler.verified) {
        badgeHTML = `<svg width="18" height="18" viewBox="0 0 24 24" class="inline-block shrink-0"><path fill="#0095F6" d="M12 2l2.4 1.8 3-0.6 0.6 3 3 1.8-1.2 2.8 1.2 2.8-3 1.8-0.6 3-3-0.6L12 22l-2.4-1.8-3 0.6-0.6-3-3-1.8 1.2-2.8-1.2-2.8 3-1.8 0.6-3 3 0.6L12 2z"/><path fill="#FFFFFF" d="M9.8 14.2l-2.5-2.5-1.4 1.4 3.9 3.9 8-8-1.4-1.4z"/></svg>`;
      } else if (hustler.isSpam) {
        badgeHTML = `<span class="bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">⚠️ SPAM</span>`;
      }

      const msg = encodeURIComponent(
        `Habari ${hustler.name}, nimeona huduma yako ya "${hustler.title}" kwenye Ghetto Skills Hub. Naomba kujua kama ipo free...`
      );
      const whatsappUrl = `https://wa.me/${hustler.phone}?text=${msg}`;
      const tagsArray = Array.isArray(hustler.tags) ? hustler.tags : [];
      const productImages = Array.isArray(hustler.product_images) ? hustler.product_images : [];

      return `
        <div class="hustler-card bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3 relative animate-card-entry" style="animation-delay: ${index * 0.05}s;">
          
          <button onclick="window.toggleFavorite('${hustler.id}', event)" class="absolute top-3 right-3 text-slate-500 hover:text-rose-500 transition-transform active:scale-125 z-10">
            <i data-lucide="heart" class="w-5 h-5 ${isFav ? 'fill-rose-500 text-rose-500 animate-pop-icon' : ''}"></i>
          </button>

          <div class="flex items-start gap-3">
            <img src="${hustler.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}" alt="${hustler.name}" class="w-12 h-12 rounded-xl object-cover border border-slate-700 flex-shrink-0 transition-transform hover:scale-105">
            <div class="flex-1 min-w-0 pr-6">
              <div class="flex items-center gap-1.5">
                <h3 class="font-bold text-sm text-slate-100 truncate">${hustler.name}</h3>
                ${badgeHTML}
              </div>
              <p class="text-xs text-slate-400 mt-0.5">${hustler.college} • <span class="text-slate-500">${hustler.location}</span></p>
            </div>
          </div>

          <div>
            <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">${hustler.category}</span>
            <p class="text-sm font-semibold text-slate-200 mt-1.5 leading-snug">${hustler.title}</p>
          </div>

          ${productImages.length > 0 ? `
            <div class="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 rounded-xl">
              ${productImages.map(img => `
                <img src="${img}" class="w-28 h-28 rounded-xl object-cover border border-slate-800 flex-shrink-0 bg-slate-950 transition-all duration-300 hover:scale-105 cursor-pointer">
              `).join('')}
            </div>
          ` : ''}

          <div class="flex flex-wrap gap-1">
            ${tagsArray.map(t => `<span class="bg-slate-950 text-slate-400 text-[10px] px-2 py-0.5 rounded-md border border-slate-800">${t.trim()}</span>`).join('')}
          </div>

          <div class="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
            <div class="flex items-center gap-3">
              <span class="flex items-center gap-1"><i data-lucide="eye" class="w-3.5 h-3.5 text-slate-500"></i> ${hustler.views || 0} views</span>
              <span class="flex items-center gap-1 text-emerald-400"><i data-lucide="message-square" class="w-3.5 h-3.5"></i> ${hustler.whatsapp_clicks || 0} chats</span>
            </div>

            <button onclick="window.toggleLike('${hustler.id}', event)" class="flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-all active:scale-95 ${isLiked ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 font-bold' : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:text-slate-200'}">
              <i data-lucide="thumbs-up" class="w-3.5 h-3.5 ${isLiked ? 'fill-emerald-400 animate-pop-icon' : ''}"></i>
              <span>${hustler.likes || 0}</span>
            </button>
          </div>

          <div class="pt-2 border-t border-slate-800/80 flex items-center justify-between">
            <div>
              <span class="text-[10px] text-slate-500 block">Bei / Kuanzia</span>
              <span class="text-sm font-bold text-slate-100">TSh ${Number(hustler.starting_price).toLocaleString()}</span>
            </div>

            <a href="${whatsappUrl}" target="_blank" onclick="window.trackWhatsAppTap('${hustler.id}')" class="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all active:scale-95 hover:shadow-lg hover:shadow-emerald-500/20">
              <i data-lucide="message-circle" class="w-4 h-4"></i>
              <span>Mcheki WhatsApp</span>
            </a>
          </div>
        </div>
      `;
    }).join("");

    if (window.lucide) lucide.createIcons();
    if (state.activeSellerPhone) renderSellerStats(state.activeSellerPhone);
  }

  function filterAndRender() {
    const q = searchInput.value.toLowerCase();
    const college = collegeFilter.value;
    const category = categoryFilter.value;
    const sort = sortFilter.value;

    let result = state.hustlers.filter(h => {
      const matchQuery = h.name.toLowerCase().includes(q) || 
                         h.title.toLowerCase().includes(q) || 
                         (h.tags && h.tags.some(t => t.toLowerCase().includes(q)));
      const matchCollege = college === "ALL" || h.college === college;
      const matchCategory = category === "ALL" || h.category === category;

      if (sort === "favorites") {
        return state.favorites.includes(h.id) && matchQuery && matchCollege && matchCategory;
      }

      return matchQuery && matchCollege && matchCategory;
    });

    if (sort === "price_asc") result.sort((a, b) => a.starting_price - b.starting_price);
    if (sort === "price_desc") result.sort((a, b) => b.starting_price - a.starting_price);
    if (sort === "popular") result.sort((a, b) => ((b.views || 0) + (b.likes || 0)) - ((a.views || 0) + (a.likes || 0)));

    render(result);
  }

  window.toggleFavorite = function(id, event) {
    if (event) event.stopPropagation();
    if (state.favorites.includes(id)) {
      state.favorites = state.favorites.filter(favId => favId !== id);
    } else {
      state.favorites.push(id);
    }
    localStorage.setItem("gh_favorites", JSON.stringify(state.favorites));
    filterAndRender();
  };

  window.toggleLike = function(id, event) {
    if (event) event.stopPropagation();
    const item = state.hustlers.find(h => h.id === id);
    if (!item) return;

    const likedIndex = state.likedItems.indexOf(id);
    if (likedIndex > -1) {
      state.likedItems.splice(likedIndex, 1);
      item.likes = Math.max(0, (item.likes || 0) - 1);
    } else {
      state.likedItems.push(id);
      item.likes = (item.likes || 0) + 1;
    }

    localStorage.setItem("gh_liked_items", JSON.stringify(state.likedItems));
    saveStateLocally();
    filterAndRender();
  };

  window.trackWhatsAppTap = function(id) {
    const item = state.hustlers.find(h => h.id === id);
    if (item) {
      item.whatsapp_clicks = (item.whatsapp_clicks || 0) + 1;
      saveStateLocally();
      if (state.activeSellerPhone) renderSellerStats(state.activeSellerPhone);
    }
  };

  function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  }

  // --- FOMU YA KUSAJILI BIDHAA IMERAKEBISHWA KUJUMUISHA SUPABASE ---
  addHustlerForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>Inasajili Mtandaoni...</span>`;

    const rawPhone = document.getElementById("formPhone").value;
    const formattedPhone = formatPhoneNumber(rawPhone);
    const tagsInput = document.getElementById("formTags").value;
    const tagsArray = tagsInput ? tagsInput.split(",").map(t => t.trim()) : [];
    
    const productFiles = Array.from(document.getElementById("formProductImages")?.files || []);
    if (productFiles.length > 5) {
      alert("Tafadhali chagua picha za bidhaa zisizozidi 5!");
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<span>Sajili Sasa</span>`;
      return;
    }

    let productImagesArray = [];
    if (productFiles.length > 0) {
      try {
        productImagesArray = await Promise.all(
          productFiles.slice(0, 5).map(file => readFileAsBase64(file))
        );
      } catch (err) {
        console.error("Error reading product images:", err);
      }
    }

    const avatarFile = document.getElementById("formAvatarFile")?.files[0];
    let finalAvatarUrl = state.selectedPresetAvatar;

    if (avatarFile) {
      try {
        finalAvatarUrl = await readFileAsBase64(avatarFile);
      } catch (err) {
        console.error("Error reading profile photo:", err);
      }
    }

    const newHustler = {
      id: "item-" + Date.now(),
      name: document.getElementById("formName").value,
      college: document.getElementById("formCollege").value,
      location: document.getElementById("formLocation").value,
      category: document.getElementById("formCategory").value,
      starting_price: Number(document.getElementById("formPrice").value),
      title: document.getElementById("formTitle").value,
      phone: formattedPhone,
      tags: tagsArray,
      verified: false,
      isSpam: false,
      avatar: finalAvatarUrl,
      product_images: productImagesArray,
      views: 1,
      likes: 0,
      whatsapp_clicks: 0
    };

    try {
      // Tuma data moja kwa moja kwenda Supabase (Cloud)
      const response = await fetch(`${SUPABASE_URL}/rest/v1/hustlers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(newHustler)
      });

      if (!response.ok) throw new Error("Imeshindikana kutuma Supabase");
    } catch (err) {
      console.warn("Imetumika LocalStorage backup:", err);
      saveStateLocally();
    }

    // Safisha na upakie upya data kutoka mtandaoni
    addHustlerForm.reset();
    registerModal.classList.add("hidden");
    submitBtn.disabled = false;
    submitBtn.innerHTML = `<span>Sajili Sasa</span>`;
    alert("Hongera! Bidhaa yako imetumwa na sasa kila mtu anaweza kuiona mtandaoni.");

    // Vuta data mpya kutoka Supabase ili ionekane papo hapo
    fetchHustlers();
  });

  function renderSellerStats(phone) {
    state.activeSellerPhone = phone;
    const myItems = state.hustlers.filter(h => h.phone === phone);

    const loginSection = document.getElementById("sellerLoginSection");
    const statsView = document.getElementById("sellerStatsView");
    const itemsList = document.getElementById("sellerItemsList");

    const totalViews = myItems.reduce((acc, curr) => acc + (curr.views || 0), 0);
    const totalLikes = myItems.reduce((acc, curr) => acc + (curr.likes || 0), 0);
    const totalClicks = myItems.reduce((acc, curr) => acc + (curr.whatsapp_clicks || 0), 0);

    document.getElementById("statTotalViews").textContent = totalViews;
    document.getElementById("statTotalLikes").textContent = totalLikes;
    document.getElementById("statTotalClicks").textContent = totalClicks;

    if (myItems.length === 0) {
      itemsList.innerHTML = `<p class="text-slate-500 text-center py-4">Hakuna bidhaa zilizosajiliwa na namba hii (${phone}).</p>`;
    } else {
      itemsList.innerHTML = myItems.map(item => `
        <div class="bg-slate-800 p-3 rounded-xl border border-slate-700/60 space-y-1.5">
          <div class="flex items-center justify-between">
            <p class="font-bold text-slate-200 truncate pr-2">${item.title}</p>
            <span class="text-emerald-400 font-bold">TSh ${Number(item.starting_price).toLocaleString()}</span>
          </div>
          <div class="flex items-center justify-between text-[11px] text-slate-400 bg-slate-900/60 p-2 rounded-lg">
            <span>👁 Views: <b>${item.views || 0}</b></span>
            <span>👍 Likes: <b>${item.likes || 0}</b></span>
            <span class="text-sky-400">💬 WA Taps: <b>${item.whatsapp_clicks || 0}</b></span>
          </div>
        </div>
      `).join("");
    }

    loginSection.classList.add("hidden");
    statsView.classList.remove("hidden");
  }

  loadSellerStatsBtn?.addEventListener("click", () => {
    const rawInput = document.getElementById("sellerPhoneInput").value;
    if (!rawInput) return alert("Weka namba yako ya simu!");
    const formatted = formatPhoneNumber(rawInput);
    renderSellerStats(formatted);
  });

  searchInput?.addEventListener("input", filterAndRender);
  collegeFilter?.addEventListener("change", filterAndRender);
  categoryFilter?.addEventListener("change", filterAndRender);
  sortFilter?.addEventListener("change", filterAndRender);

  fetchHustlers();
});
