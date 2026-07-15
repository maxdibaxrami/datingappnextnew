import 'server-only';

import { z } from 'zod';

import { requireUsableAccount, requireVideoAccount } from '@/lib/auth/guards';
import { ApiError } from '@/lib/errors/api-error';
import { decodeOpaqueCursor, encodeOpaqueCursor } from '@/lib/pagination/cursor';

import { throwVideoRpcError } from './errors';
import { callVideoRpc } from './rpc';
import {
  type EndVideoSessionInput,
  type JoinVideoQueueInput,
  type SignalQuery,
  type VideoSignalInput,
} from './schemas';

const signalCursorSchema = z.object({
  createdAt: z.iso.datetime({ offset: true }),
  id: z.uuid(),
  version: z.literal(1),
}).strict();

interface QueueRow {
  queue_entry_id: string | null;
  queue_status: string;
  video_session_id: string | null;
  video_session_status: string | null;
  expires_at: string | null;
  matched_at: string | null;
  matched: boolean;
}

interface SessionRow {
  video_session_id: string;
  video_session_status: string;
  mode: string;
  connection_expires_at: string | null;
  connected_at: string | null;
  self_state: string;
  other_state: string;
  is_initiator: boolean;
  other_user_id: string;
  other_display_name: string;
  other_age_years: number;
  other_country_code: string;
  other_city_name: string;
  other_primary_photo_url: string | null;
  other_primary_photo_blur_hash: string | null;
}

interface ReadyRow {
  video_session_id: string;
  video_session_status: string;
  self_state: string;
  other_state: string;
  is_initiator: boolean;
  connection_expires_at: string | null;
}

interface ConnectedRow {
  video_session_id: string;
  video_session_status: string;
  connected_at: string | null;
  self_state: string;
  other_state: string;
}

interface HeartbeatRow {
  video_session_id: string;
  video_session_status: string;
  last_seen_at: string;
}

interface SignalRow {
  signal_id: string;
  sender_user_id: string;
  signal_type: string;
  payload: Record<string, unknown>;
  created_at: string;
}

function requireRow<T>(row: T | undefined, message: string): T {
  if (!row) throw new ApiError(500, 'INTERNAL_ERROR', message);
  return row;
}

function mapQueue(row: QueueRow) {
  return {
    queueEntryId: row.queue_entry_id,
    status: row.queue_status,
    session: row.video_session_id
      ? {
        id: row.video_session_id,
        status: row.video_session_status,
        matchedAt: row.matched_at,
      }
      : null,
    expiresAt: row.expires_at,
    matched: row.matched,
  };
}

export async function joinVideoQueue(userId: string, input: JoinVideoQueueInput) {
  await requireVideoAccount(userId);
  const { data, error } = await callVideoRpc<QueueRow>('join_video_queue', {
    p_actor_user_id: userId,
    p_mode: input.mode,
  });
  if (error) throwVideoRpcError(error, 'The video queue could not be joined');
  return mapQueue(requireRow(data?.[0], 'The video queue returned no result'));
}

export async function getVideoQueueState(userId: string) {
  await requireVideoAccount(userId);
  const { data, error } = await callVideoRpc<Omit<QueueRow, 'matched'>>('get_video_queue_state', {
    p_actor_user_id: userId,
  });
  if (error) throwVideoRpcError(error, 'The video queue could not be loaded');
  const row = data?.[0];
  return row ? mapQueue({ ...row, matched: row.queue_status === 'matched' }) : null;
}

export async function cancelVideoQueue(userId: string) {
  await requireVideoAccount(userId);
  const { data, error } = await callVideoRpc<{ queue_entry_id: string | null; cancelled: boolean }>('cancel_video_queue', {
    p_actor_user_id: userId,
  });
  if (error) throwVideoRpcError(error, 'The video queue could not be cancelled');
  const row = requireRow(data?.[0], 'The video queue cancellation returned no result');
  return { queueEntryId: row.queue_entry_id, cancelled: row.cancelled };
}

export async function getVideoSession(userId: string, videoSessionId: string) {
  await requireVideoAccount(userId);
  const { data, error } = await callVideoRpc<SessionRow>('get_video_session_state', {
    p_actor_user_id: userId,
    p_video_session_id: videoSessionId,
  });
  if (error) throwVideoRpcError(error, 'The video session could not be loaded');
  const row = requireRow(data?.[0], 'The video session returned no result');
  return {
    id: row.video_session_id,
    status: row.video_session_status,
    mode: row.mode,
    connectionExpiresAt: row.connection_expires_at,
    connectedAt: row.connected_at,
    selfState: row.self_state,
    otherState: row.other_state,
    isInitiator: row.is_initiator,
    transport: 'webrtc_p2p' as const,
    signaling: { pollAfterMs: 1_500, maxPayloadBytes: 49_152 },
    profile: {
      userId: row.other_user_id,
      displayName: row.other_display_name,
      ageYears: row.other_age_years,
      countryCode: row.other_country_code,
      cityName: row.other_city_name,
      primaryPhoto: row.other_primary_photo_url
        ? { url: row.other_primary_photo_url, blurHash: row.other_primary_photo_blur_hash }
        : null,
    },
  };
}

export async function markVideoSessionReady(userId: string, videoSessionId: string) {
  await requireVideoAccount(userId);
  const { data, error } = await callVideoRpc<ReadyRow>('mark_video_session_ready', {
    p_actor_user_id: userId,
    p_video_session_id: videoSessionId,
  });
  if (error) throwVideoRpcError(error, 'The video session could not be prepared');
  const row = requireRow(data?.[0], 'The video readiness operation returned no result');
  return {
    id: row.video_session_id,
    status: row.video_session_status,
    selfState: row.self_state,
    otherState: row.other_state,
    isInitiator: row.is_initiator,
    connectionExpiresAt: row.connection_expires_at,
  };
}

export async function markVideoSessionConnected(userId: string, videoSessionId: string) {
  await requireVideoAccount(userId);
  const { data, error } = await callVideoRpc<ConnectedRow>('mark_video_session_connected', {
    p_actor_user_id: userId,
    p_video_session_id: videoSessionId,
  });
  if (error) throwVideoRpcError(error, 'The video connection could not be recorded');
  const row = requireRow(data?.[0], 'The video connection operation returned no result');
  return {
    id: row.video_session_id,
    status: row.video_session_status,
    connectedAt: row.connected_at,
    selfState: row.self_state,
    otherState: row.other_state,
  };
}

export async function heartbeatVideoSession(userId: string, videoSessionId: string) {
  await requireVideoAccount(userId);
  const { data, error } = await callVideoRpc<HeartbeatRow>('heartbeat_video_session', {
    p_actor_user_id: userId,
    p_video_session_id: videoSessionId,
  });
  if (error) throwVideoRpcError(error, 'The video heartbeat could not be recorded');
  const row = requireRow(data?.[0], 'The video heartbeat returned no result');
  return { id: row.video_session_id, status: row.video_session_status, lastSeenAt: row.last_seen_at };
}

export async function sendVideoSignal(userId: string, videoSessionId: string, input: VideoSignalInput) {
  await requireVideoAccount(userId);
  const { data, error } = await callVideoRpc<{
    signal_id: string; created_at: string; already_created: boolean;
  }>('send_video_session_signal', {
    p_actor_user_id: userId,
    p_client_signal_id: input.clientSignalId,
    p_payload: input.payload,
    p_signal_type: input.type,
    p_video_session_id: videoSessionId,
  });
  if (error) throwVideoRpcError(error, 'The video signal could not be sent');
  const row = requireRow(data?.[0], 'The video signal operation returned no result');
  return { id: row.signal_id, createdAt: row.created_at, alreadyCreated: row.already_created };
}

export async function listVideoSignals(userId: string, videoSessionId: string, query: SignalQuery) {
  await requireVideoAccount(userId);
  const cursor = query.cursor ? decodeOpaqueCursor(query.cursor, signalCursorSchema) : null;
  const { data, error } = await callVideoRpc<SignalRow>('get_video_session_signals', {
    p_actor_user_id: userId,
    p_cursor_created_at: cursor?.createdAt ?? null,
    p_cursor_signal_id: cursor?.id ?? null,
    p_limit: query.limit + 1,
    p_video_session_id: videoSessionId,
  });
  if (error) throwVideoRpcError(error, 'Video signals could not be loaded');
  const rows = data ?? [];
  const pageRows = rows.slice(0, query.limit);
  const last = pageRows.at(-1);
  return {
    items: pageRows.map((row) => ({
      id: row.signal_id,
      senderUserId: row.sender_user_id,
      type: row.signal_type,
      payload: row.payload,
      createdAt: row.created_at,
    })),
    nextCursor: rows.length > query.limit && last
      ? encodeOpaqueCursor({ createdAt: last.created_at, id: last.signal_id, version: 1 })
      : null,
  };
}

export async function endVideoSession(userId: string, videoSessionId: string, input: EndVideoSessionInput) {
  // A no-video restriction should not prevent a currently authenticated user
  // from closing an existing session. The database still requires membership.
  await requireUsableAccount(userId);
  const { data, error } = await callVideoRpc<{
    video_session_id: string; video_session_status: string; ended_at: string; already_ended: boolean;
  }>('end_video_session', {
    p_actor_user_id: userId,
    p_end_reason: input.reason,
    p_video_session_id: videoSessionId,
  });
  if (error) throwVideoRpcError(error, 'The video session could not be ended');
  const row = requireRow(data?.[0], 'The video session end operation returned no result');
  return { id: row.video_session_id, status: row.video_session_status, endedAt: row.ended_at, alreadyEnded: row.already_ended };
}
