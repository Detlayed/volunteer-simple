// Этот файл больше не инициализирует карту автоматически.
// Он экспортирует функцию initVolunteerMap(containerId) для использования на странице волонтёра.
// Данные организаций вынесены в файл places.json (если есть).
// Удалены вымышленные записи. Добавляйте реальные организации в файл `places.json` в папке сайта.
// Пример структуры (оставлен как шаблон):
/*
const places = [
  {
    name: "Название организации",
    description: "Короткое описание и какие нужны вещи",
    coords: [51.1694, 71.4491],
    donate: "https://pay.kaspi.kz/pay/77XXXXXXXXX" // реальная ссылка Kaspi
  }
];
*/

let places = [];
let volunteerMap = null;
let volunteerMarkers = [];

// Попытка подгрузить places.json — если файл есть, используем его
fetch('places.json')
  .then(r => r.ok ? r.json() : [])
  .then(data => { places = Array.isArray(data) ? data : []; })
  .catch(() => { places = []; });

// Маркеры и фильтрация
let markers = [];
let currentFilter = 'all';
let currentSearch = '';

function clearMarkersOn(mapInstance, markerList) {
  markerList.forEach(m => mapInstance.removeLayer(m));
  markerList.length = 0;
}

function matchesFilter(place) {
  if (currentFilter === 'all') return true;
  return place.category === currentFilter;
}

function matchesSearch(place) {
  if (!currentSearch) return true;
  const q = currentSearch.toLowerCase();
  return (place.name && place.name.toLowerCase().includes(q)) ||
         (place.description && place.description.toLowerCase().includes(q));
}

// Добавление маркеров с учётом фильтра и поиска
function renderPlacesOn(mapInstance, markerList) {
  clearMarkersOn(mapInstance, markerList);
  if (!places || places.length === 0) {
    mapInstance.setView([51.1694, 71.4491], 6);
    return;
  }
  const visible = places.filter(p => matchesFilter(p) && matchesSearch(p));
  visible.forEach(place => {
    const marker = L.marker(place.coords).addTo(mapInstance);
    marker.bindPopup(buildPopupHtml(place));
    markerList.push(marker);
  });
  if (markerList.length > 0) {
    const group = L.featureGroup(markerList);
    mapInstance.fitBounds(group.getBounds().pad(0.2));
  } else {
    mapInstance.setView([51.1694, 71.4491], 11);
  }
}

function buildPopupHtml(place){
  let donateHtml = '';
  if (place.donate) {
    donateHtml = `<a href="${place.donate}" target="_blank" class="kaspi-btn">Пожертвовать (Kaspi)</a>`;
  } else if (place.kaspi_phone) {
    donateHtml = `<div>Пожертвования по Kaspi: <strong>${place.kaspi_phone}</strong> <button class="kaspi-btn" data-phone="${place.kaspi_phone}" onclick="copyKaspi(event)">Копировать</button></div>`;
  } else if (place.website) {
    donateHtml = `<a href="${place.website}" target="_blank" class="kaspi-btn">Сайт организации</a> <div style="font-size:0.9rem;color:#666;margin-top:6px;">Реквизиты для Kaspi не найдены — проверьте сайт или обновите запись.</div>`;
  } else {
    donateHtml = `<div style="font-size:0.95rem;color:#666;">Реквизиты для пожертвований не указаны. Свяжитесь с организацией для получения реквизитов.</div>`;
  }
  return `<h3>${place.name}</h3><p>${place.description}</p>${donateHtml}`;
}

// Подключаем контролы поиска/фильтра
// Expose init function for volunteer page
function initVolunteerMap(containerId){
  if(window.L===undefined) throw new Error('Leaflet not loaded');
  const mapEl = document.getElementById(containerId);
  if(!mapEl) throw new Error('Container not found: '+containerId);
  volunteerMap = L.map(mapEl).setView([51.1694,71.4491], 10);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(volunteerMap);
  renderPlacesOn(volunteerMap, volunteerMarkers);
  return volunteerMap;
}

// Allow updating marker view from external code
function refreshVolunteerMarkers(){ if(volunteerMap) renderPlacesOn(volunteerMap, volunteerMarkers); }

// Hook up search/filter if present on the page
document.addEventListener('DOMContentLoaded', () => {
  const search = document.getElementById('search');
  const filter = document.getElementById('filter');
  if (search) {
    search.addEventListener('input', (e) => {
      currentSearch = e.target.value.trim();
      if(volunteerMap) renderPlacesOn(volunteerMap, volunteerMarkers);
    });
  }
  if (filter) {
    filter.addEventListener('change', (e) => {
      currentFilter = e.target.value;
      if(volunteerMap) renderPlacesOn(volunteerMap, volunteerMarkers);
    });
  }
});

// Геолокация пользователя
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(pos => {
    const { latitude, longitude } = pos.coords;
    L.marker([latitude, longitude]).addTo(map)
      .bindPopup("Вы здесь").openPopup();
    map.setView([latitude, longitude], 10);
  });
}

// 2GIS iframe panel logic
function openIn2GIS(evt) {
  evt = evt || window.event;
  // get website from button dataset or attribute
  const btn = evt.currentTarget || evt.target;
  const url = btn.getAttribute('data-gis') || btn.dataset.gis;
  if (!url) return alert('Нет ссылки на 2GIS');
  const panel = document.getElementById('gis-panel');
  const iframe = document.getElementById('gis-iframe');
  const native = document.getElementById('gis-open-native');
  if (!panel || !iframe) return window.open(url, '_blank');
  // try to transform 2GIS link into embeddable URL (2gis supports map links with /search or /widget)
  let src = url;
  // If url contains /geo/..., try the place embed pattern
  try {
    const m = url.match(/2gis\.kz\/[^\/]+\/geo\/(\d+)/i);
    if (m) {
      const id = m[1];
      // embed via 2gis widget (public): https://2gis.kz/widget?type=geo&... but pattern may vary
      src = `https://2gis.kz/embed?type=geo&id=${id}`;
    }
  } catch (e) {
    // keep original
  }
  iframe.src = src;
  native.href = url;
  panel.classList.remove('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
  const close = document.getElementById('gis-close');
  if (close) close.addEventListener('click', () => {
    const panel = document.getElementById('gis-panel');
    const iframe = document.getElementById('gis-iframe');
    if (iframe) iframe.src = '';
    if (panel) panel.classList.add('hidden');
  });
});

function copyKaspi(evt) {
  const btn = evt.currentTarget || evt.target;
  const phone = btn.getAttribute('data-phone');
  if (!phone) return;
  navigator.clipboard && navigator.clipboard.writeText(phone).then(()=>{
    btn.textContent = 'Скопировано';
    setTimeout(()=> btn.textContent = 'Копировать', 1500);
  }).catch(()=> alert('Не удалось скопировать.'));
}

// Export helpers for other scripts
window.volunteerMapAPI = {
  init: initVolunteerMap,
  refreshMarkers: refreshVolunteerMarkers,
  getPlaces: ()=>places,
  getMarkers: ()=>volunteerMarkers
};