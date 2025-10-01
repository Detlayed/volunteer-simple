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