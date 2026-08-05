-- Run this AFTER creating your first user in Supabase Dashboard →
-- Authentication → Users → "Add user". Use the email
--   admin@accounts.pasific.app
-- (must match src/utils/authEmail.ts's domain for the username "admin"),
-- pick any password, and copy the generated "User UID".
--
-- Then replace PASTE_USER_UID_HERE below and run this file in the SQL Editor.

insert into profiles (id, role, username, display_name, status)
values ('PASTE_USER_UID_HERE', 'super_admin', 'admin', 'Admin', 'active');
