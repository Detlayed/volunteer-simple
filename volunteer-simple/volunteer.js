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
    // initialize map for volunteers
    try {
      if(window.volunteerMapAPI && !window._volunteer_map_inited){
        window.volunteerMapAPI.init('volunteer-map');
        window._volunteer_map_inited = true;
      }
      // render apps as markers on the map (demo placement if no coords)
      const apps = loadApps();
      const mapObj = window.volunteerMapAPI && window.volunteerMapAPI.init && window.volunteerMapAPI;
      if(window._volunteer_map_inited && mapObj){
        // add app markers
        const placesMap = window.volunteerMapAPI.getPlaces() || [];
        // For demo: add sample markers for apps near center if they lack coords
        apps.forEach((a, idx)=>{
          // use app.coords if present, else random nearby
          let coords = a.coords;
          if(!coords){
            coords = [51.1694 + (idx+1)*0.01, 71.4491 + (idx+1)*0.01];
          }
          const m = L.marker(coords).addTo(window.volunteerMapAPI.init('volunteer-map'));
          m.bindPopup(`<strong>${a.name}</strong><br/>${a.desc}<br/><em>${a.address||''}</em><br/><small>Статус: ${a.status}</small>`);
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
    users[e]= { password: p };
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
  }
});
