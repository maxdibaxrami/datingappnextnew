import 'server-only';

import { throwDatingRpcError } from '@/features/dating/errors';
import { callDatingRpc, type SwipeRpcRow, type UndoRpcRow } from '@/features/dating/rpc';
import { requireDatingAccount } from '@/lib/auth/guards';
import { ApiError } from '@/lib/errors/api-error';

import { type SwipeInput, type UndoSwipeInput } from './schemas';

function mapMatch(row: SwipeRpcRow) {
  if (!row.match_id || !row.match_status || !row.matched_at) {
    return null;
  }
  return {
    id: row.match_id,
    status: row.match_status,
    matchedAt: row.matched_at,
    otherUserId: row.target_user_id,
    createdNow: row.match_created,
  };
}

export async function recordSwipe(userId: string, input: SwipeInput) {
  await requireDatingAccount(userId);
  const { data, error } = await callDatingRpc('record_swipe_action', {
    p_action_type: input.actionType,
    p_actor_user_id: userId,
    p_idempotency_key: input.idempotencyKey,
    p_source_surface: input.sourceSurface,
    p_target_user_id: input.targetUserId,
  });
  if (error) {
    throwDatingRpcError(error, 'The swipe could not be recorded');
  }
  const row = data?.[0];
  if (!row) {
    throw new ApiError(500, 'INTERNAL_ERROR', 'The swipe result was empty');
  }

  return {
    action: {
      id: row.action_id,
      type: row.action_type,
      targetUserId: row.target_user_id,
      sourceSurface: row.source_surface,
      createdAt: row.action_created_at,
    },
    match: mapMatch(row),
  };
}

function mapUndo(row: UndoRpcRow) {
  return {
    action: {
      id: row.action_id,
      type: row.action_type,
      targetUserId: row.target_user_id,
      sourceSurface: row.source_surface,
      createdAt: row.action_created_at,
    },
    undoneActionId: row.undone_action_id,
  };
}

export async function undoSwipe(userId: string, input: UndoSwipeInput) {
  await requireDatingAccount(userId);
  const { data, error } = await callDatingRpc('undo_latest_swipe', {
    p_actor_user_id: userId,
    p_idempotency_key: input.idempotencyKey,
    p_target_user_id: input.targetUserId ?? null,
    p_window_seconds: 300,
  });
  if (error) {
    throwDatingRpcError(error, 'The swipe could not be undone');
  }
  const row = data?.[0];
  if (!row) {
    throw new ApiError(500, 'INTERNAL_ERROR', 'The undo result was empty');
  }
  return mapUndo(row);
}
