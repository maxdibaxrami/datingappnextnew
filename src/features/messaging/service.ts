import 'server-only';

import { z } from 'zod';

import { requireUsableAccount } from '@/lib/auth/guards';
import { ApiError } from '@/lib/errors/api-error';
import { decodeOpaqueCursor, encodeOpaqueCursor } from '@/lib/pagination/cursor';

import { throwMessagingRpcError } from './errors';
import { callMessagingRpc } from './rpc';
import {
  type ConversationNotificationSettingsInput,
  type CursorQuery,
  type MarkConversationReadInput,
  type NotificationQuery,
  type SendConversationMessageInput,
} from './schemas';

const activityCursorSchema = z.object({
  activityAt: z.iso.datetime({ offset: true }),
  id: z.uuid(),
  version: z.literal(1),
}).strict();

const messageCursorSchema = z.object({
  id: z.uuid(),
  sentAt: z.iso.datetime({ offset: true }),
  version: z.literal(1),
}).strict();

const notificationCursorSchema = z.object({
  createdAt: z.iso.datetime({ offset: true }),
  id: z.uuid(),
  version: z.literal(1),
}).strict();

interface ConversationRow {
  conversation_id: string;
  match_id: string;
  other_user_id: string;
  last_activity_at: string;
  last_message_at: string | null;
  last_message_id: string | null;
  last_message_preview: string | null;
  last_message_sender_user_id: string | null;
  unread_count: number;
  notifications_muted_until: string | null;
  display_name: string;
  age_years: number;
  country_code: string;
  city_name: string;
  primary_photo_url: string | null;
  primary_photo_blur_hash: string | null;
  primary_photo_width: number | null;
  primary_photo_height: number | null;
}

interface MessageRow {
  message_id: string;
  sender_user_id: string;
  message_type: string;
  body: string;
  sequence: number;
  reply_to_message_id: string | null;
  sent_at: string;
  edited_at: string | null;
}

interface SentMessageRow extends MessageRow {
  conversation_id: string;
  notification_id: string | null;
  already_created: boolean;
}

interface ReadStateRow {
  conversation_id: string;
  last_read_message_id: string | null;
  last_read_sequence: number;
  unread_count: number;
  read_at: string;
}

interface NotificationSettingsRow {
  conversation_id: string;
  notifications_muted_until: string | null;
}

interface NotificationRow {
  notification_id: string;
  notification_type: string;
  title: string;
  body: string | null;
  entity_type: string | null;
  entity_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
  seen_at: string | null;
  read_at: string | null;
  expires_at: string | null;
}

function requireRow<T>(row: T | undefined, message: string): T {
  if (!row) throw new ApiError(500, 'INTERNAL_ERROR', message);
  return row;
}

function mapMessage(row: MessageRow) {
  return {
    id: row.message_id,
    senderUserId: row.sender_user_id,
    type: row.message_type,
    body: row.body,
    sequence: row.sequence,
    replyToMessageId: row.reply_to_message_id,
    sentAt: row.sent_at,
    editedAt: row.edited_at,
  };
}

function mapNotification(row: NotificationRow) {
  return {
    id: row.notification_id,
    type: row.notification_type,
    title: row.title,
    body: row.body,
    entityType: row.entity_type,
    entityId: row.entity_id,
    payload: row.payload,
    createdAt: row.created_at,
    seenAt: row.seen_at,
    readAt: row.read_at,
    expiresAt: row.expires_at,
  };
}

export async function listConversations(userId: string, query: CursorQuery) {
  await requireUsableAccount(userId, { completedProfile: true });
  const cursor = query.cursor ? decodeOpaqueCursor(query.cursor, activityCursorSchema) : null;
  const { data, error } = await callMessagingRpc<ConversationRow>('get_user_conversations', {
    p_actor_user_id: userId,
    p_limit: query.limit + 1,
    p_cursor_activity_at: cursor?.activityAt ?? null,
    p_cursor_conversation_id: cursor?.id ?? null,
  });
  if (error) throwMessagingRpcError(error, 'Conversations could not be loaded');
  const rows = data ?? [];
  const pageRows = rows.slice(0, query.limit);
  const last = pageRows.at(-1);
  return {
    items: pageRows.map((row) => ({
      id: row.conversation_id,
      matchId: row.match_id,
      lastActivityAt: row.last_activity_at,
      lastMessageAt: row.last_message_at,
      lastMessage: row.last_message_id
        ? {
          id: row.last_message_id,
          preview: row.last_message_preview,
          senderUserId: row.last_message_sender_user_id,
        }
        : null,
      unreadCount: row.unread_count,
      notificationsMutedUntil: row.notifications_muted_until,
      profile: {
        userId: row.other_user_id,
        displayName: row.display_name,
        ageYears: row.age_years,
        countryCode: row.country_code,
        cityName: row.city_name,
        primaryPhoto: row.primary_photo_url
          ? {
            url: row.primary_photo_url,
            blurHash: row.primary_photo_blur_hash,
            width: row.primary_photo_width,
            height: row.primary_photo_height,
          }
          : null,
      },
    })),
    nextCursor: rows.length > query.limit && last
      ? encodeOpaqueCursor({ activityAt: last.last_activity_at, id: last.conversation_id, version: 1 })
      : null,
  };
}

export async function listConversationMessages(userId: string, conversationId: string, query: CursorQuery) {
  await requireUsableAccount(userId, { completedProfile: true });
  const cursor = query.cursor ? decodeOpaqueCursor(query.cursor, messageCursorSchema) : null;
  const { data, error } = await callMessagingRpc<MessageRow>('get_conversation_messages', {
    p_actor_user_id: userId,
    p_conversation_id: conversationId,
    p_limit: query.limit + 1,
    p_cursor_sent_at: cursor?.sentAt ?? null,
    p_cursor_message_id: cursor?.id ?? null,
  });
  if (error) throwMessagingRpcError(error, 'Messages could not be loaded');
  const rows = data ?? [];
  const pageRows = rows.slice(0, query.limit);
  const last = pageRows.at(-1);
  return {
    items: pageRows.map(mapMessage),
    nextCursor: rows.length > query.limit && last
      ? encodeOpaqueCursor({ sentAt: last.sent_at, id: last.message_id, version: 1 })
      : null,
  };
}

export async function sendConversationMessage(
  userId: string,
  conversationId: string,
  input: SendConversationMessageInput,
) {
  await requireUsableAccount(userId, { completedProfile: true });
  const { data, error } = await callMessagingRpc<SentMessageRow>('send_conversation_message', {
    p_actor_user_id: userId,
    p_conversation_id: conversationId,
    p_body: input.body,
    p_client_message_id: input.clientMessageId,
    p_reply_to_message_id: input.replyToMessageId ?? null,
  });
  if (error) throwMessagingRpcError(error, 'The message could not be sent');
  const row = requireRow(data?.[0], 'The message operation returned no result');
  return {
    ...mapMessage(row),
    conversationId: row.conversation_id,
    notificationId: row.notification_id,
    alreadyCreated: row.already_created,
  };
}

export async function markConversationRead(
  userId: string,
  conversationId: string,
  input: MarkConversationReadInput,
) {
  await requireUsableAccount(userId, { completedProfile: true });
  const { data, error } = await callMessagingRpc<ReadStateRow>('mark_conversation_read', {
    p_actor_user_id: userId,
    p_conversation_id: conversationId,
    p_through_message_id: input.throughMessageId ?? null,
  });
  if (error) throwMessagingRpcError(error, 'The conversation could not be marked as read');
  const row = requireRow(data?.[0], 'The read operation returned no result');
  return {
    conversationId: row.conversation_id,
    lastReadMessageId: row.last_read_message_id,
    lastReadSequence: row.last_read_sequence,
    unreadCount: row.unread_count,
    readAt: row.read_at,
  };
}

export async function setConversationNotificationSettings(
  userId: string,
  conversationId: string,
  input: ConversationNotificationSettingsInput,
) {
  await requireUsableAccount(userId, { completedProfile: true });
  const { data, error } = await callMessagingRpc<NotificationSettingsRow>('set_conversation_notification_settings', {
    p_actor_user_id: userId,
    p_conversation_id: conversationId,
    p_muted_until: input.mutedUntil,
  });
  if (error) throwMessagingRpcError(error, 'Conversation notification settings could not be saved');
  const row = requireRow(data?.[0], 'The notification settings operation returned no result');
  return {
    conversationId: row.conversation_id,
    mutedUntil: row.notifications_muted_until,
  };
}

export async function listNotifications(userId: string, query: NotificationQuery) {
  await requireUsableAccount(userId, { completedProfile: true });
  const cursor = query.cursor ? decodeOpaqueCursor(query.cursor, notificationCursorSchema) : null;
  const { data, error } = await callMessagingRpc<NotificationRow>('get_user_notifications', {
    p_actor_user_id: userId,
    p_limit: query.limit + 1,
    p_cursor_created_at: cursor?.createdAt ?? null,
    p_cursor_notification_id: cursor?.id ?? null,
    p_unread_only: query.unreadOnly,
  });
  if (error) throwMessagingRpcError(error, 'Notifications could not be loaded');
  const rows = data ?? [];
  const pageRows = rows.slice(0, query.limit);
  const last = pageRows.at(-1);
  return {
    items: pageRows.map(mapNotification),
    nextCursor: rows.length > query.limit && last
      ? encodeOpaqueCursor({ createdAt: last.created_at, id: last.notification_id, version: 1 })
      : null,
  };
}

export async function markNotificationRead(userId: string, notificationId: string) {
  await requireUsableAccount(userId, { completedProfile: true });
  const { data, error } = await callMessagingRpc<{
    notification_id: string;
    read_at: string;
    already_read: boolean;
  }>('mark_user_notification_read', {
    p_actor_user_id: userId,
    p_notification_id: notificationId,
  });
  if (error) throwMessagingRpcError(error, 'The notification could not be marked as read');
  const row = requireRow(data?.[0], 'The notification operation returned no result');
  return { id: row.notification_id, readAt: row.read_at, alreadyRead: row.already_read };
}

export async function markAllNotificationsRead(userId: string) {
  await requireUsableAccount(userId, { completedProfile: true });
  const { data, error } = await callMessagingRpc<{ marked_count: number; read_at: string }>(
    'mark_all_user_notifications_read',
    { p_actor_user_id: userId },
  );
  if (error) throwMessagingRpcError(error, 'Notifications could not be marked as read');
  const row = requireRow(data?.[0], 'The notification operation returned no result');
  return { markedCount: row.marked_count, readAt: row.read_at };
}
