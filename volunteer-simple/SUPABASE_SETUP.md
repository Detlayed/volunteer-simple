SUPABASE SETUP — шаги для быстрой интеграции

Цель
- Быстро настроить Supabase проект для хранения волонтёров и заявок, подключить безопасность и RLS.

1) Создание проекта
- Зарегистрируйтесь на https://app.supabase.com
- Создайте новый проект (region можно оставить по умолчанию)
- Сохраните `API URL` и `anon public key` (они понадобятся в `window.SUPABASE_CONFIG`)

2) SQL: таблицы
- Внизу в SQL редакторе выполните следующие запросы (пример):

-- Таблица волонтёров (публичный профиль, не храните секреты тут)
create table public.volunteers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  full_name text,
  iin text,
  phone text,
  city text,
  created_at timestamptz default now()
);

-- Таблица заявок
create table public.requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  address text,
  contact text,
  descr text,
  coords double precision[],
  status text default 'new',
  created timestamptz default now()
);

3) Политики безопасности (RLS)
- Для простоты: включите row level security (RLS) на таблицах и настройте политики позже.
- Пример открытой политики для теста (НЕ ПРОДАКШН):

alter table public.volunteers enable row level security;
create policy "public read" on public.volunteers for select using (true);
create policy "public insert" on public.volunteers for insert using (true);

alter table public.requests enable row level security;
create policy "public insert" on public.requests for insert using (true);
create policy "public select" on public.requests for select using (true);

4) Подключение в клиенте
- В `volunteer.html` можно временно задать `window.SUPABASE_CONFIG` в консоли браузера или добавить в скрипт:

  window.SUPABASE_CONFIG = { url: 'https://your-project.supabase.co', anonKey: 'public-anon-key' };

- После этого `supabase.js` и `volunteer.js` начнут использовать Supabase.

5) Production notes
- Не храните ИИН в обычных таблицах без шифрования/согласия.
- Настройте политики RLS так, чтобы только авторизованные пользователи могли читать/изменять нужные строки.
- Подумайте про дополнительные поля: verified, role (volunteer/admin), phone verification.
- Для массового геокодирования используйте платные сервисы или кэшируйте результаты.

6) Примеры запросов (JS)
- В `supabase.js` уже есть helper-обёртки для signupVolunteer, signinVolunteer, createRequest, listRequests.


Если хотите, могу подготовить автоматический конфиг (например, добавление `window.SUPABASE_CONFIG` прямо в `volunteer.html`), но это требует публичного anon-key — будьте осторожны. Также могу помочь написать серверный endpoint для безопасного приёма заявок и удаления PII по запросу.

## RLS (Row Level Security) и рекомендации по защите данных

Ниже даны практические примеры RLS-политик и рекомендации по защите персональных данных (ИИН, телефоны) и предотвращению утечки секретов из клиента.

Важные примечания перед применением политик
- Никогда не размещайте `service_role` ключ в клиентском JS или в публичном репозитории. Этот ключ даёт полный доступ к базе.
- `anon` ключ используется в браузере и должен работать вместе с корректно настроенными RLS-политиками.
- Тестируйте политики в staging перед применением в production.

1) Включение RLS на таблицах

-- enable RLS
alter table public.requests enable row level security;
alter table public.volunteers enable row level security;

2) Простейшие политики для аутентифицированных пользователей (быстрый старт)

-- позволить аутентифицированным пользователям вставлять заявки
create policy "requests_insert_authenticated" on public.requests for insert
  using (auth.role() = 'authenticated');

-- позволить аутентифицированным пользователям читать заявки (не для продакшна без донастройки)
create policy "requests_select_authenticated" on public.requests for select
  using (auth.role() = 'authenticated');

3) Ролевой доступ (рекомендуется)

Создавайте кастомный claim `role` в JWT (например, `volunteer`, `admin`) и используйте его в политиках.

-- разрешить читать заявки только пользователям с role='volunteer'
create policy "requests_select_volunteer" on public.requests for select
  using (
    auth.role() = 'authenticated' AND
    current_setting('jwt.claims.role', true) = 'volunteer'
  );

4) Защита ИИН и другой чувствительной информации

- Не отдавайте ИИН на фронтенд в открытом виде. Варианты защиты:
  - хранить IIN зашифрованным (pgcrypto) или в отдельной таблице с доступом только для админов;
  - создать публичное view, которое не содержит IIN (например `volunteers_public`) и выдавать его для чтения.

Пример создания view без IIN:

create view public.volunteers_public as
  select id, email, full_name, phone, city, created_at from public.volunteers;

grant select on public.volunteers_public to anon;

5) Политика: волонтёры могут обновлять только свой профиль

-- Пример: храните auth.uid() в профиле при регистрации и проверяйте его в политике
alter table public.volunteers add column auth_uid uuid;

create policy "volunteers_update_own" on public.volunteers for update
  using (auth.role() = 'authenticated' AND auth.uid() = auth_uid);

При регистрации записывайте `auth.user().id` (uuid) в поле `auth_uid` — это даст надёжное соответствие между авторизацией и профилем.

6) Аудит и логирование

- Ведите аудит важных операций (изменение профиля, удаление PII). Логи можно хранить в отдельной таблице и писать туда через серверные процедуры (service_role key).

7) Жизненный цикл данных и удаление PII

- Реализуйте процедуры удаления/анонимизации PII по запросу пользователя.
- Рассмотрите политику хранения (retention) — например, анонимизировать старые заявки через год.

8) Верификация телефонов и защита от спама

- Подключите верификацию телефонов (SMS) для волонтёров.
- Ограничьте частоту отправки заявок (rate limiting) или добавьте reCAPTCHA, чтобы предотвратить спам.

9) Серверная обвязка (рекомендуется)

- Для админских операций (экспорт, массовое геокодирование, удаление PII) используйте серверный endpoint, который держит `service_role` ключ и выполняет привилегированные действия.

10) Чек-лист перед production
- Убедитесь, что `service_role` ключ нигде не попал в браузер.
- Протестируйте RLS с anon и auth ключами.
- Минимизируйте хранение IIN в открытом виде; шифруйте или не храните вовсе.
- Добавьте phone verification, мониторинг и лимитирование.

Если хотите, я подготовлю конкретные SQL-политики под ваш сценарий (например: волонтёры видят заявки только в их городе), напишу серверный endpoint для безопасного экспорта/удаления PII или помогу настроить SMS-подтверждение.