# Схема БД (раздел 16 ТЗ)

Документ описывает таблицы и связи, реализованные в `supabase/migrations/20260209161000_init.sql`, и сопоставляет их с разделом 16 ТЗ (структура данных). Ниже выделены ключевые сущности, требуемые ТЗ: profiles, workspaces/workspace_members/workspace_branding, subscriptions, methodics/lessons, assignments/events, class_sessions, words/student_word_progress, conversations/messages, invites.

## 1. Пользователи и профили (profiles)

**`profiles`** — расширение пользователей Supabase (auth.users).  
Ключевые поля: `id` (FK -> auth.users), `role` (teacher/student/admin), `full_name`, `phone`, `created_at`.

**Связи**
- `profiles.id` используется как внешний ключ почти во всех бизнес-таблицах (владелец, учитель, студент, отправитель и т.д.).

## 2. Рабочие пространства (workspaces, workspace_members, workspace_branding)

**`workspaces`** — рабочее пространство школы/учителя.  
Ключевые поля: `owner_user_id` (FK -> profiles), `slug`, `title`.

**`workspace_members`** — участники рабочего пространства.  
Составной PK: (`workspace_id`, `user_id`). Роль участника: owner/admin/member.

**`workspace_branding`** — брендирование пространства (название, лого, цвета, домен).

**Связи**
- `workspaces.owner_user_id -> profiles.id`.
- `workspace_members.workspace_id -> workspaces.id`.
- `workspace_members.user_id -> profiles.id`.
- `workspace_branding.workspace_id -> workspaces.id` (1:1).

## 3. Подписки (subscriptions)

**`subscriptions`** — подписки на тариф.  
Ключевые поля: `owner_type` (workspace/teacher_personal), `owner_id`, `plan`, `status`, `current_period_end`.

**Связи**
- Прямая внешняя связь не задана: `owner_id` ссылается на `workspaces.id` или `profiles.id` (при `owner_type = teacher_personal`).

## 4. Методики и уроки (methodics, lessons)

**`methodics`** — методики обучения (наборы уроков).  
Ключевые поля: `slug`, `title`, `description`.

**`lessons`** — уроки внутри методики.  
Ключевые поля: `methodic_id` (FK -> methodics), `slug`, `title`, `order_index`, `teacher_content_md`.

**Связи**
- `lessons.methodic_id -> methodics.id` (1:N).

Дополнительно:  
`lesson_assets`, `lesson_homework_templates`, `lesson_overrides` — материалы, шаблоны ДЗ и персональные правки учителя, все связаны с `lessons.id` (и/или `profiles.id`).

## 5. Назначения и события (assignments, assignment_events)

**`assignments`** — назначение уроков ученику или группе.  
Ключевые поля: `lesson_id`, `teacher_id`, `student_id`, `group_id`, `status`, `due_at`.

**`assignment_events`** — события выполнения (просмотры, ответы и т.п.).  
Ключевые поля: `assignment_id`, `student_id`, `event_type`, `payload`.

**Связи**
- `assignments.lesson_id -> lessons.id`.
- `assignments.teacher_id -> profiles.id`.
- `assignments.student_id -> profiles.id` (nullable).
- `assignments.group_id -> groups.id` (nullable).
- `assignment_events.assignment_id -> assignments.id`.
- `assignment_events.student_id -> profiles.id`.

Дополнительно:  
`assignment_student_overrides` и `assignment_text_answers` также привязаны к `assignments` и `profiles` для индивидуальных настроек и текстовых ответов.

## 6. Занятия (class_sessions)

**`class_sessions`** — расписание занятий/встреч.  
Ключевые поля: `workspace_id`, `teacher_id`, `lesson_id`, `starts_at`, `duration_min`, `target_type` (student/group), `target_id`, `meeting_provider`, `meeting_room_key`, `status`.

**Связи**
- `class_sessions.workspace_id -> workspaces.id`.
- `class_sessions.teacher_id -> profiles.id`.
- `class_sessions.lesson_id -> lessons.id` (nullable).
- `target_id` ссылается на `profiles.id` (student) или `groups.id` (group) в зависимости от `target_type`.

## 7. Словарь и прогресс (words, student_word_progress)

**`words`** — словарь.  
Ключевые поля: `text`, `translation`, `audio_path`.

**`student_word_progress`** — прогресс ученика по словам.  
Составной PK: (`student_id`, `word_id`). Хранит `status`, `correct_count`, `wrong_count`, `last_seen_at`.

**Связи**
- `student_word_progress.student_id -> profiles.id`.
- `student_word_progress.word_id -> words.id`.

Дополнительно:  
`lesson_words` связывает `lessons` и `words` (many-to-many).

## 8. Диалоги и сообщения (conversations, messages)

**`conversations`** — диалоги между учителем и учеником.  
Ключевые поля: `workspace_id`, `teacher_id`, `student_id`.

**`messages`** — сообщения внутри диалога.  
Ключевые поля: `conversation_id`, `sender_id`, `body`.

**Связи**
- `conversations.workspace_id -> workspaces.id` (nullable).
- `conversations.teacher_id -> profiles.id`.
- `conversations.student_id -> profiles.id`.
- `messages.conversation_id -> conversations.id`.
- `messages.sender_id -> profiles.id`.

## 9. Приглашения (invites)

**`invites`** — инвайты для ученика/учителя/учителя в workspace.  
Ключевые поля: `token`, `invite_type` (student/teacher/workspace_teacher), `workspace_id`, `teacher_id`, `student_email`, `student_phone`, `expires_at`, `accepted_at`.

**Связи**
- `invites.workspace_id -> workspaces.id` (nullable).
- `invites.teacher_id -> profiles.id` (nullable).

---

## Сопоставление с разделом 16 ТЗ

Раздел 16 ТЗ описывает модель данных платформы: пользователи, рабочие пространства, подписки, методики и уроки, назначения и события, расписание занятий, словарь и прогресс, коммуникации и приглашения. Текущая схема БД напрямую реализует эти сущности через таблицы, перечисленные выше, и их внешние ключи обеспечивают согласованность между модулями (например, `assignments -> lessons -> methodics`, `class_sessions -> lessons/teachers`, `conversations/messages -> profiles`). Эта структура покрывает требования раздела 16 ТЗ по основным бизнес-доменам и их связям.
