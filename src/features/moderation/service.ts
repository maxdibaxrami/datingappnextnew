import 'server-only';

import { z } from 'zod';

import { requireModerator, requireUsableAccount } from '@/lib/auth/guards';
import { ApiError } from '@/lib/errors/api-error';
import { decodeOpaqueCursor, encodeOpaqueCursor } from '@/lib/pagination/cursor';

import { throwModerationRpcError } from './errors';
import { callModerationRpc } from './rpc';
import {
  type AssignModerationCaseInput,
  type CreateBlockInput,
  type CreateReportInput,
  type CursorQuery,
  type DecideModerationCaseInput,
  type ModerationQueueQuery,
} from './schemas';

const blockCursorSchema = z.object({
  createdAt: z.iso.datetime({ offset: true }),
  id: z.uuid(),
  version: z.literal(1),
}).strict();

const reportCursorSchema = z.object({
  createdAt: z.iso.datetime({ offset: true }),
  id: z.uuid(),
  version: z.literal(1),
}).strict();

const queueCursorSchema = z.object({
  createdAt: z.iso.datetime({ offset: true }),
  id: z.uuid(),
  version: z.literal(1),
}).strict();

interface BlockRow {
  blocked_user_id: string;
  created_at: string;
  reason: string | null;
}

interface ReportRow {
  report_id: string;
  target_type: string;
  target_id: string;
  reason: string;
  status: string;
  created_at: string;
  decided_at: string | null;
  public_message: string | null;
}

interface ModerationQueueRow {
  moderation_queue_id: string;
  report_id: string | null;
  target_type: string;
  target_id: string | null;
  reporter_user_id: string | null;
  reported_user_id: string | null;
  reason: string | null;
  details: string | null;
  priority: number;
  status: string;
  assigned_to_user_id: string | null;
  assigned_at: string | null;
  opened_at: string;
  created_at: string;
  updated_at: string;
}

function requireRow<T>(row: T | undefined, message: string): T {
  if (!row) {
    throw new ApiError(500, 'INTERNAL_ERROR', message);
  }
  return row;
}

export async function createBlock(userId: string, input: CreateBlockInput) {
  await requireUsableAccount(userId);
  const { data, error } = await callModerationRpc<{
    blocker_user_id: string;
    blocked_user_id: string;
    created_at: string;
    created: boolean;
  }>('set_user_block', {
    p_actor_user_id: userId,
    p_blocked_user_id: input.blockedUserId,
    p_reason: input.reason ?? null,
  });
  if (error) {
    throwModerationRpcError(error, 'The user could not be blocked');
  }
  const row = requireRow(data?.[0], 'The block operation returned no result');
  return {
    blockerUserId: row.blocker_user_id,
    blockedUserId: row.blocked_user_id,
    createdAt: row.created_at,
    created: row.created,
  };
}

export async function removeBlock(userId: string, blockedUserId: string) {
  await requireUsableAccount(userId);
  const { data, error } = await callModerationRpc<{ blocked_user_id: string; removed: boolean }>(
    'remove_user_block',
    { p_actor_user_id: userId, p_blocked_user_id: blockedUserId },
  );
  if (error) {
    throwModerationRpcError(error, 'The block could not be removed');
  }
  const row = requireRow(data?.[0], 'The unblock operation returned no result');
  return { blockedUserId: row.blocked_user_id, removed: row.removed };
}

export async function listBlocks(userId: string, query: CursorQuery) {
  await requireUsableAccount(userId);
  const cursor = query.cursor ? decodeOpaqueCursor(query.cursor, blockCursorSchema) : null;
  const { data, error } = await callModerationRpc<BlockRow>('get_user_blocks', {
    p_actor_user_id: userId,
    p_limit: query.limit + 1,
    p_cursor_created_at: cursor?.createdAt ?? null,
    p_cursor_user_id: cursor?.id ?? null,
  });
  if (error) {
    throwModerationRpcError(error, 'Blocked users could not be loaded');
  }
  const rows = data ?? [];
  const pageRows = rows.slice(0, query.limit);
  const last = pageRows.at(-1);
  return {
    items: pageRows.map((row) => ({
      blockedUserId: row.blocked_user_id,
      createdAt: row.created_at,
      reason: row.reason,
    })),
    nextCursor: rows.length > query.limit && last
      ? encodeOpaqueCursor({ createdAt: last.created_at, id: last.blocked_user_id, version: 1 })
      : null,
  };
}

export async function createReport(userId: string, input: CreateReportInput) {
  await requireUsableAccount(userId);
  const { data, error } = await callModerationRpc<{
    report_id: string;
    moderation_queue_id: string;
    report_status: string;
    queue_status: string;
    created_at: string;
  }>('create_moderation_report', {
    p_reporter_user_id: userId,
    p_target_type: input.targetType,
    p_target_id: input.targetId,
    p_reason: input.reason,
    p_details: input.details ?? null,
    p_reported_user_id: input.reportedUserId ?? null,
    p_priority: 3,
  });
  if (error) {
    throwModerationRpcError(error, 'The report could not be created');
  }
  const row = requireRow(data?.[0], 'The report operation returned no result');
  return {
    id: row.report_id,
    moderationQueueId: row.moderation_queue_id,
    status: row.report_status,
    queueStatus: row.queue_status,
    createdAt: row.created_at,
  };
}

export async function listMyReports(userId: string, query: CursorQuery) {
  await requireUsableAccount(userId);
  const cursor = query.cursor ? decodeOpaqueCursor(query.cursor, reportCursorSchema) : null;
  const { data, error } = await callModerationRpc<ReportRow>('get_my_moderation_reports', {
    p_reporter_user_id: userId,
    p_limit: query.limit + 1,
    p_cursor_created_at: cursor?.createdAt ?? null,
    p_cursor_report_id: cursor?.id ?? null,
  });
  if (error) {
    throwModerationRpcError(error, 'Reports could not be loaded');
  }
  const rows = data ?? [];
  const pageRows = rows.slice(0, query.limit);
  const last = pageRows.at(-1);
  return {
    items: pageRows.map((row) => ({
      id: row.report_id,
      target: { type: row.target_type, id: row.target_id },
      reason: row.reason,
      status: row.status,
      createdAt: row.created_at,
      decidedAt: row.decided_at,
      publicMessage: row.public_message,
    })),
    nextCursor: rows.length > query.limit && last
      ? encodeOpaqueCursor({ createdAt: last.created_at, id: last.report_id, version: 1 })
      : null,
  };
}

export async function listModerationQueue(userId: string, query: ModerationQueueQuery) {
  await requireModerator(userId);
  const cursor = query.cursor ? decodeOpaqueCursor(query.cursor, queueCursorSchema) : null;
  const { data, error } = await callModerationRpc<ModerationQueueRow>('get_moderation_queue', {
    p_actor_user_id: userId,
    p_limit: query.limit + 1,
    p_cursor_created_at: cursor?.createdAt ?? null,
    p_cursor_queue_id: cursor?.id ?? null,
    p_statuses: query.statuses.length ? query.statuses : null,
    p_assigned_to_me: query.assignedToMe,
  });
  if (error) {
    throwModerationRpcError(error, 'The moderation queue could not be loaded');
  }
  const rows = data ?? [];
  const pageRows = rows.slice(0, query.limit);
  const last = pageRows.at(-1);
  return {
    items: pageRows.map((row) => ({
      id: row.moderation_queue_id,
      reportId: row.report_id,
      target: { type: row.target_type, id: row.target_id },
      reporterUserId: row.reporter_user_id,
      reportedUserId: row.reported_user_id,
      reason: row.reason,
      details: row.details,
      priority: row.priority,
      status: row.status,
      assignedToUserId: row.assigned_to_user_id,
      assignedAt: row.assigned_at,
      openedAt: row.opened_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
    nextCursor: rows.length > query.limit && last
      ? encodeOpaqueCursor({ createdAt: last.created_at, id: last.moderation_queue_id, version: 1 })
      : null,
  };
}

export async function assignModerationCase(
  userId: string,
  moderationQueueId: string,
  input: AssignModerationCaseInput,
) {
  await requireModerator(userId);
  const { data, error } = await callModerationRpc<{
    moderation_queue_id: string;
    status: string;
    assigned_to_user_id: string;
    assigned_at: string;
  }>('assign_moderation_case', {
    p_actor_user_id: userId,
    p_moderation_queue_id: moderationQueueId,
    p_assignee_user_id: input.assigneeUserId ?? null,
  });
  if (error) {
    throwModerationRpcError(error, 'The moderation case could not be assigned');
  }
  const row = requireRow(data?.[0], 'The assignment operation returned no result');
  return {
    id: row.moderation_queue_id,
    status: row.status,
    assignedToUserId: row.assigned_to_user_id,
    assignedAt: row.assigned_at,
  };
}

export async function decideModerationCase(
  userId: string,
  moderationQueueId: string,
  input: DecideModerationCaseInput,
) {
  await requireModerator(userId);
  const { data, error } = await callModerationRpc<{
    moderation_queue_id: string;
    report_id: string | null;
    queue_status: string;
    report_status: string;
    action_id: string;
  }>('decide_moderation_case', {
    p_actor_user_id: userId,
    p_moderation_queue_id: moderationQueueId,
    p_action_type: input.action,
    p_note: input.note ?? null,
    p_restriction_type: input.restrictionType ?? null,
    p_ends_at: input.endsAt ?? null,
    p_public_message: input.publicMessage ?? null,
  });
  if (error) {
    throwModerationRpcError(error, 'The moderation decision could not be saved');
  }
  const row = requireRow(data?.[0], 'The moderation decision returned no result');
  return {
    id: row.moderation_queue_id,
    reportId: row.report_id,
    queueStatus: row.queue_status,
    reportStatus: row.report_status,
    actionId: row.action_id,
  };
}
