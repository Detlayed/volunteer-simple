// Создание карты
const map = L.map('map').setView([48.0, 67.0], 5);

// Подключение тайлов
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap'
}).addTo(map);

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

// Попытка подгрузить places.json — если файл есть, используем его
fetch('places.json')
  .then(r => r.ok ? r.json() : [])
  .then(data => { places = Array.isArray(data) ? data : []; renderPlaces(); })
  .catch(() => { places = []; renderPlaces(); });

// Добавление маркеров
function renderPlaces() {
  if (!places || places.length === 0) {
    // Если нет данных, показать подсказку в центре
    map.setView([51.1694, 71.4491], 6);
    return;
  }

  places.forEach(place => {
    const marker = L.marker(place.coords).addTo(map);
    const donateLink = place.donate ? `<a href="${place.donate}" target="_blank" class="kaspi-btn">Пожертвовать</a>` : '';
    marker.bindPopup(`
      <h3>${place.name}</h3>
      <p>${place.description}</p>
      ${donateLink}
    `);
  });
}

// Геолокация пользователя
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(pos => {
    const { latitude, longitude } = pos.coords;
    L.marker([latitude, longitude]).addTo(map)
      .bindPopup("Вы здесь").openPopup();
    map.setView([latitude, longitude], 10);
  });
}