begin;

-- Cover the three foreign-key paths introduced by the messaging module. These
-- are not speculative product indexes: they protect parent-row updates/deletes
-- and moderation/retention joins as message volume grows.
create index if not exists conversations_user_a_id_idx
  on public.conversations (user_a_id);
create index if not exists conversations_user_b_id_idx
  on public.conversations (user_b_id);
create index if not exists conversation_members_last_read_message_id_idx
  on public.conversation_members (last_read_message_id)
  where last_read_message_id is not null;

commit;
