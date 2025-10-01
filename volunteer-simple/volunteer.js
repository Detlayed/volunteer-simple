// Simple client-side volunteer auth (prototype)
function getUsers(){
  return JSON.parse(localStorage.getItem('volunteer_users')||'{}');
}
function saveUsers(u){ localStorage.setItem('volunteer_users', JSON.stringify(u)); }

document.addEventListener('DOMContentLoaded', ()=>{
  const emailIn=document.getElementById('email');
  const passIn=document.getElementById('password');
  const loginBtn=document.getElementById('login');
  const regBtn=document.getElementById('register');
  const panel=document.getElementById('volunteer-panel');
  const authBox=document.getElementById('auth-box');
  const title=document.getElementById('auth-title');
  const emailSpan=document.getElementById('volunteer-email');

  function showPanel(email){
    authBox.style.display='none';
    panel.style.display='block';
    emailSpan.textContent=email;
      // initialize map for volunteers (only once)
      try {
        if(window.volunteerMapAPI && !window._volunteer_map_inited){
          const map = window.volunteerMapAPI.init('volunteer-map');
          window._volunteer_map_inited = true;
        }
        // render apps as markers on the map (use stored coords if available)
        renderApps();
        // add markers for apps that have coords onto the map via volunteerMapAPI
        if(window._volunteer_map_inited && window.volunteerMapAPI){
          const apps = loadApps();
          // ensure map markers are refreshed
          // first refresh organization markers
          window.volunteerMapAPI.refreshMarkers && window.volunteerMapAPI.refreshMarkers();
          // then add app markers
          apps.forEach((a, idx)=>{
            const coords = a.coords;
            if(coords && Array.isArray(coords) && coords.length===2){
              const m = L.marker(coords).addTo(window.volunteerMapAPI.init('volunteer-map'));
              m.bindPopup(`<strong>${escapeHtml(a.name)}</strong><br/>${escapeHtml(a.desc)}<br/><em>${escapeHtml(a.address||'')}</em><br/><small>Статус: ${escapeHtml(a.status)}</small>`);
            }
          });
        }
      } catch(e){ console.warn('Map init failed', e); }
  }

  // Check logged in
  const current = localStorage.getItem('volunteer_current');
  if(current){ showPanel(current); }

  regBtn.addEventListener('click', ()=>{
    const e=emailIn.value.trim(); const p=passIn.value;
    if(!e||!p){ alert('Введите email и пароль'); return }
    const users=getUsers();
    if(users[e]){ alert('Пользователь уже существует'); return }
    // collect profile fields if provided
    const fullName = (document.getElementById('full-name') && document.getElementById('full-name').value.trim()) || '';
    const iin = (document.getElementById('iin') && document.getElementById('iin').value.trim()) || '';
    const phone = (document.getElementById('vol-phone') && document.getElementById('vol-phone').value.trim()) || '';
    const city = (document.getElementById('vol-city') && document.getElementById('vol-city').value.trim()) || '';
    users[e]= { password: p, profile: { fullName, iin, phone, city } };
    saveUsers(users);
    localStorage.setItem('volunteer_current', e);
    showPanel(e);
  });

  loginBtn.addEventListener('click', ()=>{
    const e=emailIn.value.trim(); const p=passIn.value;
    const users=getUsers();
    if(users[e] && users[e].password===p){
      localStorage.setItem('volunteer_current', e);
      showPanel(e);
    } else alert('Неверный логин или пароль');
  });

  document.getElementById('logout') && document.getElementById('logout').addEventListener('click', ()=>{
    localStorage.removeItem('volunteer_current');
    location.reload();
  });

  // Apps management
  function loadApps(){
    return JSON.parse(localStorage.getItem('volunteer_apps')||'[]');
  }

  function saveApps(apps){ localStorage.setItem('volunteer_apps', JSON.stringify(apps)); }

  function renderApps(){
    const tbody=document.querySelector('#apps-table tbody');
    if(!tbody) return;
    const filter=document.getElementById('filter-status').value;
    const apps=loadApps().filter(a=> filter==='all' ? true : a.status===filter);
    tbody.innerHTML='';
    apps.forEach((a, idx)=>{
      const tr=document.createElement('tr');
      tr.innerHTML = `<td>${escapeHtml(a.name)}</td><td>${escapeHtml(a.city||'')}</td><td>${escapeHtml(a.address||'')}</td><td>${escapeHtml(a.contact)}</td><td>${escapeHtml(a.desc)}</td><td>${escapeHtml(a.status)}</td><td>
        <button data-idx="${idx}" class="set-in">Взять</button>
        <button data-idx="${idx}" class="set-done">Готово</button>
        <button data-idx="${idx}" class="del">Удалить</button>
      </td>`;
      tbody.appendChild(tr);
    });
    tbody.querySelectorAll('.set-in').forEach(b=> b.addEventListener('click', (e)=>{
      const i=parseInt(e.currentTarget.getAttribute('data-idx'));
      const appsAll=loadApps(); if(!appsAll[i]) return; appsAll[i].status='in_progress'; saveApps(appsAll); renderApps();
    }));
    tbody.querySelectorAll('.set-done').forEach(b=> b.addEventListener('click', (e)=>{
      const i=parseInt(e.currentTarget.getAttribute('data-idx'));
      const appsAll=loadApps(); if(!appsAll[i]) return; appsAll[i].status='done'; saveApps(appsAll); renderApps();
    }));
    tbody.querySelectorAll('.del').forEach(b=> b.addEventListener('click', (e)=>{
      const i=parseInt(e.currentTarget.getAttribute('data-idx'));
      const appsAll=loadApps(); if(!appsAll[i]) return; appsAll.splice(i,1); saveApps(appsAll); renderApps();
    }));
  }

  function escapeHtml(s){ return (s||'').toString().replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]); }

  document.getElementById('refresh-apps') && document.getElementById('refresh-apps').addEventListener('click', ()=> renderApps());
  document.getElementById('filter-status') && document.getElementById('filter-status').addEventListener('change', ()=> renderApps());
  document.getElementById('export-csv') && document.getElementById('export-csv').addEventListener('click', ()=>{
    const apps=loadApps(); if(!apps.length){ alert('Заявок нет'); return }
    const rows=[['name','city','address','contact','desc','status','created']];
    apps.forEach(a=> rows.push([a.name||'',a.city||'',a.address||'',a.contact||'',a.desc||'',a.status||'',a.created||'']));
    const csv = rows.map(r=> r.map(c=> '"'+(String(c||'').replace(/"/g,'""'))+'"').join(',')).join('\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='volunteer_apps.csv'; a.click(); URL.revokeObjectURL(url);
  });

  // initial render if logged
  if(localStorage.getItem('volunteer_current')){
    renderApps();
    // show brief profile in panel
    try{
      const cur = localStorage.getItem('volunteer_current');
      const users = getUsers();
      const p = users[cur] && users[cur].profile;
      if(p){
        const el = document.getElementById('volunteer-profile');
        if(el) el.textContent = `Профиль: ${p.fullName||''} ${p.phone?('• '+p.phone):''} ${p.city?('• '+p.city):''}`;
      }
    }catch(e){}
  }
});
