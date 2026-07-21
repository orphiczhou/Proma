/**
 * Agent 会话管理 MCP 工具（Nanju 平台增强）
 *
 * 通过 SDK MCP Server 暴露 Proma 的会话管理能力，让 Agent 可以：
 * - 列出渠道、工作区、会话
 * - 查询会话详情、上下文用量、消息历史
 * - 创建新会话、Fork 会话、向会话发送消息
 *
 * 这些工具服务于 Agent 内部的会话间协作，不经过渲染进程 IPC。
 *
 * 设计参考：automation-agent-tools.ts（v0.15.x 内置 MCP 标准结构）
 * 注入点：builtin-mcp/registry.ts（通过 injectSessionMcpServer 注册）
 * 启用控制：builtin-mcp/settings.ts（'session' 项，默认开启）
 */

import {
  createAgentSession,
  forkAgentSession,
  listAgentSessions,
  getAgentSessionMeta,
  updateAgentSessionMeta,
  getAgentSessionSDKMessages,
} from './agent-session-manager'
import { runAgentHeadless } from './agent-service'
import { listChannels, getChannelById } from './channel-manager'
import { listAgentWorkspaces, getAgentWorkspace } from './agent-workspace-manager'

interface SessionAgentToolContext {
  sessionId: string
  workspaceSlug?: string
  channelId?: string
  modelId?: string
}

interface SessionToolResult extends Record<string, unknown> {
  content: Array<{ type: 'text'; text: string }>
}

type ZodModule = typeof import('zod')

function jsonResult(data: unknown): SessionToolResult {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
}

/**
 * 把 ctx 中的 channelId/modelId/workspaceSlug 注入到 args 上，方便各工具读取。
 * 同时把 args 的可选字段统一 trim，方便判空。
 */
function resolveChannelAndModel(
  args: { channel_id?: string; model_id?: string; workspace_id?: string },
  fallback: { channelId?: string; modelId?: string },
): { channelId?: string; modelId?: string; workspaceId?: string } {
  return {
    channelId: args.channel_id?.trim() || fallback.channelId,
    modelId: args.model_id?.trim() || fallback.modelId,
    workspaceId: args.workspace_id?.trim(),
  }
}

/**
 * 主入口：由 builtin-mcp/registry.ts 调用，遵循 v0.15.x 的注入风格。
 */
export async function injectSessionMcpServer(
  sdk: typeof import('@anthropic-ai/claude-agent-sdk'),
  mcpServers: Record<string, Record<string, unknown>>,
  ctx: SessionAgentToolContext,
): Promise<void> {
  const { z } = await import('zod')
  const { sessionId: sourceSessionId } = ctx

  const server = sdk.createSdkMcpServer({
    name: 'session',
    version: '1.0.0',
    tools: [

      sdk.tool(
        'get_my_session_id',
        'Get YOUR CURRENT session ID. Use this whenever you need to reference yourself — checking your own context usage, listing your own messages, or passing your ID to other sessions for async callbacks.',
        {},
        async () => {
          return jsonResult({
            session_id: sourceSessionId,
            hint: 'This is your own session ID. Use it with get_session_context, list_messages, etc.',
          })
        },
        { annotations: { readOnlyHint: true } },
      ),

      sdk.tool(
        'list_channels',
        'List all configured AI channels and their available agent models. Use this FIRST before creating a session to find valid channel_id and model_id values.',
        {},
        async () => {
          const channels = listChannels()
          return jsonResult({
            channels: channels.map((c) => ({
              id: c.id,
              name: c.name,
              provider: c.provider,
              enabled: !!c.enabled,
              agent_models: (c.models || [])
                .filter((m) => m.enabled !== false)
                .map((m) => ({ id: m.id, name: m.name })),
            })),
          })
        },
        { annotations: { readOnlyHint: true } },
      ),

      sdk.tool(
        'list_workspaces',
        'List all agent workspaces. Use this to find workspace IDs for create_session / fork_session / list_sessions filtering.',
        {},
        async () => {
          const workspaces = listAgentWorkspaces()
          return jsonResult({
            workspaces: workspaces.map((w) => ({
              id: w.id,
              name: w.name,
              slug: w.slug,
              created_at: w.createdAt,
              updated_at: w.updatedAt,
            })),
          })
        },
        { annotations: { readOnlyHint: true } },
      ),

      sdk.tool(
        'list_sessions',
        'List all agent sessions with their metadata (title, channel, model, workspace name/ID, archived status).',
        {
          include_archived: z.boolean().optional().describe('Include archived sessions (default: false)'),
          workspace_id: z.string().optional().describe('Filter by workspace ID (from list_workspaces). Omit to see all workspaces.'),
          limit: z.number().min(1).max(200).optional().describe('Max results to return (default: 50)'),
        },
        async (args) => {
          let all = listAgentSessions()
          all = args.include_archived ? all : all.filter((s) => !s.archived)
          if (args.workspace_id) all = all.filter((s) => s.workspaceId === args.workspace_id)
          const limited = all.slice(0, args.limit ?? 50)

          const wsNames: Record<string, string> = {}
          try {
            const wss = listAgentWorkspaces()
            for (const w of wss) wsNames[w.id] = w.name
          } catch (_) { /* best-effort */ }

          return jsonResult({
            count: limited.length,
            total: all.length,
            sessions: limited.map((s) => ({
              id: s.id,
              title: s.title,
              channel_id: s.channelId,
              model_id: s.modelId,
              workspace_id: s.workspaceId,
              workspace_name: wsNames[s.workspaceId ?? ''] || null,
              pinned: !!s.pinned,
              archived: !!s.archived,
              permission_mode: s.permissionMode,
              created_at: s.createdAt,
              updated_at: s.updatedAt,
            })),
          })
        },
        { annotations: { readOnlyHint: true } },
      ),

      sdk.tool(
        'get_session_info',
        'Get detailed information about a specific agent session, including its channel name, provider, and workspace.',
        {
          session_id: z.string().describe('The session ID to look up'),
        },
        async (args) => {
          const meta = getAgentSessionMeta(args.session_id)
          if (!meta) return jsonResult({ error: `Session not found: ${args.session_id}` })

          let channelInfo = null
          if (meta.channelId) {
            const ch = getChannelById(meta.channelId)
            if (ch) channelInfo = { id: ch.id, name: ch.name, provider: ch.provider }
          }

          let workspaceInfo = null
          if (meta.workspaceId) {
            const ws = getAgentWorkspace(meta.workspaceId)
            if (ws) workspaceInfo = { id: ws.id, name: ws.name, slug: ws.slug }
          }

          return jsonResult({
            id: meta.id,
            title: meta.title,
            channel_id: meta.channelId,
            model_id: meta.modelId,
            channel: channelInfo,
            workspace: workspaceInfo,
            pinned: !!meta.pinned,
            archived: !!meta.archived,
            permission_mode: meta.permissionMode,
            attached_directories: meta.attachedDirectories || [],
            attached_files: meta.attachedFiles || [],
            created_at: meta.createdAt,
            updated_at: meta.updatedAt,
          })
        },
        { annotations: { readOnlyHint: true } },
      ),

      sdk.tool(
        'get_session_context',
        'Get the CURRENT context/token usage of an agent session. Returns input tokens, output tokens, total tokens, and context window size from the latest message.',
        {
          session_id: z.string().describe('The session ID to check context usage for.'),
        },
        async (args) => {
          const meta = getAgentSessionMeta(args.session_id)
          if (!meta) return jsonResult({ error: `Session not found: ${args.session_id}` })

          let usage: Record<string, number> | null = null
          let lastModel: string | null = null
          let contextWindow: number | null = null
          let fallbackMsg: string | null = null

          try {
            const msgs = getAgentSessionSDKMessages(args.session_id)
            if (msgs && msgs.length > 0) {
              for (let i = msgs.length - 1; i >= 0; i--) {
                const m = msgs[i] as Record<string, unknown>
                if (m.type === 'result') {
                  usage = (m.usage || null) as Record<string, number> | null
                  const mu = m.modelUsage as Record<string, { contextWindow?: number }> | undefined
                  if (mu) {
                    const firstKey = Object.keys(mu)[0]
                    if (firstKey) {
                      lastModel = firstKey
                      contextWindow = mu[firstKey]?.contextWindow ?? null
                    }
                  }
                  break
                }
                if ((m._errorCode as string) === 'billing_error' && !fallbackMsg) {
                  fallbackMsg = 'Last turn failed: billing error.'
                }
              }
            }
          } catch (_) { /* best-effort */ }

          if (!lastModel) lastModel = meta.modelId ?? null
          if (!usage) {
            return jsonResult({
              session_id: args.session_id,
              title: meta.title,
              model: lastModel,
              context_window: contextWindow,
              message: fallbackMsg || 'No usage data yet. Send a message and wait for it to complete.',
            })
          }

          const input = (usage.input_tokens || 0) as number
          const output = (usage.output_tokens || 0) as number
          const cache = ((usage.cache_read_input_tokens || 0) + (usage.cache_creation_input_tokens || 0)) as number
          const pct = contextWindow ? ((input + output + cache) / contextWindow * 100).toFixed(1) + '%' : null

          return jsonResult({
            session_id: args.session_id,
            title: meta.title,
            model: lastModel,
            context_window: contextWindow,
            usage: {
              input_tokens: input,
              output_tokens: output,
              cache_tokens: cache,
              total: input + output + cache,
              usage_pct: pct,
            },
          })
        },
        { annotations: { readOnlyHint: true } },
      ),

      sdk.tool(
        'list_messages',
        'List messages (conversation history) for an agent session. Each message includes its UUID (use with fork_session), role, timestamp, and text content.',
        {
          session_id: z.string().describe('The session ID to list messages for.'),
          limit: z.number().min(1).max(200).optional().describe('Max messages to return (default: 50)'),
          offset: z.number().min(0).optional().describe('Skip first N messages for pagination (default: 0)'),
        },
        async (args) => {
          const meta = getAgentSessionMeta(args.session_id)
          if (!meta) return jsonResult({ error: `Session not found: ${args.session_id}` })

          try {
            const msgs = getAgentSessionSDKMessages(args.session_id)
            if (!msgs || msgs.length === 0) {
              return jsonResult({ session_id: args.session_id, messages: [], count: 0, total: 0 })
            }

            const offset = args.offset ?? 0
            const limit = Math.min(args.limit ?? 50, 200)
            const slice = msgs.slice(offset, offset + limit)

            const result = slice.map((rawM, i) => {
              const m = rawM as Record<string, unknown>
              const entry: Record<string, unknown> = {
                index: offset + i,
                type: m.type,
                uuid: m.uuid || null,
                timestamp: m._createdAt || m.timestamp || null,
                role: (m.message && (m.message as Record<string, unknown>).role)
                  ? (m.message as Record<string, unknown>).role
                  : m.type === 'user' ? 'user' : m.type === 'assistant' ? 'assistant' : null,
              }
              if (m.type === 'result') {
                entry.subtype = m.subtype || null
                entry.duration_ms = m.duration_ms || null
                const ru = m.usage as Record<string, number> | undefined
                if (ru) {
                  entry.usage = {
                    input_tokens: ru.input_tokens || 0,
                    output_tokens: ru.output_tokens || 0,
                    cache_tokens: (ru.cache_read_input_tokens || 0) + (ru.cache_creation_input_tokens || 0),
                  }
                }
                if (m.result) entry.result_text = String(m.result).slice(0, 500)
              }
              const msg = m.message as { content?: Array<{ type: string; text?: string }> } | undefined
              if (msg?.content) {
                const realTexts = msg.content.filter((c) => c.type === 'text' && c.text).map((c) => c.text!)
                if (realTexts.length > 0) {
                  entry.text = realTexts.join('\n').slice(0, 500)
                  entry.text_full_length = realTexts.join('\n').length
                }
              }
              if (m._errorCode) entry.error_code = m._errorCode
              if (m._errorTitle) entry.error_title = m._errorTitle
              return entry
            })

            return jsonResult({
              session_id: args.session_id,
              count: result.length,
              total: msgs.length,
              offset,
              messages: result,
            })
          } catch (err) {
            return jsonResult({ error: `Read failed: ${err instanceof Error ? err.message : String(err)}` })
          }
        },
        { annotations: { readOnlyHint: true } },
      ),

      sdk.tool(
        'create_session',
        'Create a NEW agent session with specified channel and model. The session will appear in the Proma sidebar after manual refresh. Use list_channels first to get valid channel/model IDs.',
        {
          channel_id: z.string().describe('Channel ID (from list_channels). Determines which AI provider/API to use.'),
          model_id: z.string().optional().describe('Model ID within the channel. If omitted, the first enabled agent model is used.'),
          title: z.string().optional().describe('Session display title. Auto-generated if omitted.'),
          workspace_id: z.string().optional().describe('Workspace ID to associate. Uses current workspace if omitted.'),
        },
        async (args) => {
          const channel = getChannelById(args.channel_id)
          if (!channel) {
            return jsonResult({ error: `Channel not found: "${args.channel_id}". Use list_channels to see available channels.` })
          }

          let modelId = args.model_id
          if (!modelId) {
            const first = (channel.models || []).find((m) => m.enabled !== false)
            if (first) modelId = first.id
            if (!modelId) {
              return jsonResult({ error: `No enabled models found for channel "${channel.name}". Check channel configuration.` })
            }
          }

          try {
            const meta = createAgentSession(args.title, args.channel_id, args.workspace_id, modelId)
            return jsonResult({
              session: {
                id: meta.id,
                title: meta.title,
                channel_id: meta.channelId,
                model_id: meta.modelId,
                workspace_id: meta.workspaceId,
                created_at: meta.createdAt,
              },
              message: `Session created: ${meta.title} (${meta.id.slice(0, 8)}). Open the Proma sidebar (manual refresh) to see and switch to this session.`,
            })
          } catch (err) {
            return jsonResult({ error: `Failed to create session: ${err instanceof Error ? err.message : String(err)}` })
          }
        },
      ),

      sdk.tool(
        'fork_session',
        'FORK (clone) an existing agent session, preserving all conversation context up to the specified point. Use list_sessions first to find the source session ID.',
        {
          source_session_id: z.string().describe('ID of the source session to fork (from list_sessions).'),
          up_to_message_uuid: z.string().optional().describe('SDK message UUID to fork at (inclusive). Omit to fork at the latest message (full copy).'),
          title: z.string().optional().describe("Custom title for the forked session. Default: '<original title> (fork)'"),
          new_channel_id: z.string().optional().describe('Override: use a different channel for the forked session.'),
          new_model_id: z.string().optional().describe('Override: use a different model for the forked session.'),
          new_workspace_id: z.string().optional().describe('Override: use a different workspace for the forked session.'),
        },
        async (args) => {
          const source = getAgentSessionMeta(args.source_session_id)
          if (!source) {
            return jsonResult({ error: `Source session not found: "${args.source_session_id}". Use list_sessions to find valid session IDs.` })
          }
          if (!source.sdkSessionId) {
            return jsonResult({ error: `Cannot fork: source session "${source.title}" has no SDK session yet. Send at least one message in the session first.` })
          }

          try {
            const forked = await forkAgentSession({
              sessionId: args.source_session_id,
              upToMessageUuid: args.up_to_message_uuid,
            })

            const updates: Record<string, unknown> = {}
            if (args.title) updates.title = args.title
            if (args.new_channel_id) updates.channelId = args.new_channel_id
            if (args.new_model_id) updates.modelId = args.new_model_id
            if (args.new_workspace_id) updates.workspaceId = args.new_workspace_id
            if (Object.keys(updates).length > 0) {
              updateAgentSessionMeta(forked.id, updates)
              Object.assign(forked, updates)
            }

            return jsonResult({
              session: {
                id: forked.id,
                title: forked.title,
                channel_id: forked.channelId,
                model_id: forked.modelId,
                workspace_id: forked.workspaceId,
                source_session_id: args.source_session_id,
                fork_source_sdk_session_id: forked.forkSourceSdkSessionId,
                created_at: forked.createdAt,
              },
              message: `Session forked: ${forked.title} (${forked.id.slice(0, 8)}) from "${source.title}". Open the Proma sidebar to see and switch to the forked session.`,
            })
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            if (msg.includes('没有 SDK session') || msg.includes('session not found')) {
              return jsonResult({ error: `Fork failed: the source session may not have been started. Send a message in "${source.title}" first, then retry.` })
            }
            return jsonResult({ error: `Fork failed: ${msg}` })
          }
        },
      ),

      sdk.tool(
        'send_message',
        'Send a user message to an EXISTING agent session for autonomous processing. Returns when target completes with the assistant\'s final reply text. (v0.15.x adaptation: runAgentHeadless is now awaitable, so we always wait for completion.)',
        {
          session_id: z.string().describe('Target session ID to send the message to.'),
          message: z.string().describe('The user message / task to send to the session.'),
          model_id: z.string().optional().describe('Model ID override.'),
          channel_id: z.string().optional().describe('Channel ID override.'),
        },
        async (args) => {
          const meta = getAgentSessionMeta(args.session_id)
          if (!meta) {
            return jsonResult({ error: `Target session not found: "${args.session_id}".` })
          }

          const { channelId, modelId } = resolveChannelAndModel(args, { channelId: meta.channelId, modelId: meta.modelId })
          if (!channelId) {
            return jsonResult({ error: 'No channel available for this session.' })
          }

          try {
            // v0.15.x: runAgentHeadless is awaitable, blocks until completion.
            // We use callbacks for onTitleUpdated; onComplete/onError are signal-only.
            await runAgentHeadless(
              {
                sessionId: args.session_id,
                userMessage: args.message,
                channelId,
                modelId,
                workspaceId: meta.workspaceId,
                permissionModeOverride: 'bypassPermissions',
              },
              {
                onError: () => { /* signal-only; final error is captured below */ },
                onComplete: () => { /* signal-only */ },
                onTitleUpdated: (title) => {
                  try { updateAgentSessionMeta(args.session_id, { title }) } catch (_) { /* best-effort */ }
                },
              },
            )

            // Read final reply from SDK messages after completion.
            let replyText: string | null = null
            try {
              const msgs = getAgentSessionSDKMessages(args.session_id)
              if (msgs && msgs.length > 0) {
                for (let i = msgs.length - 1; i >= 0; i--) {
                  const m = msgs[i] as Record<string, unknown>
                  if (m.type === 'assistant' && m.message) {
                    const content = (m.message as { content?: Array<{ type: string; text?: string }> }).content
                    if (content) {
                      const texts = content.filter((c) => c.type === 'text').map((c) => c.text ?? '')
                      if (texts.length > 0) { replyText = texts.join('\n'); break }
                    }
                  }
                  if (m.type === 'result' && m.result) {
                    replyText = String(m.result); break
                  }
                }
              }
            } catch (_) { /* best-effort */ }

            return jsonResult({
              session_id: args.session_id,
              status: 'completed',
              reply: replyText,
              message: replyText
                ? `Target session "${meta.title}" completed. See "reply" field for output.`
                : `Target session "${meta.title}" has finished processing (no text output captured).`,
            })
          } catch (err) {
            return jsonResult({
              session_id: args.session_id,
              status: 'error',
              error: err instanceof Error ? err.message : String(err),
            })
          }
        },
      ),

    ],
  })

  mcpServers['session'] = server as unknown as Record<string, unknown>
}

// Suppress unused warning when this module is imported for type-only checks
void resolveChannelAndModel
void ({} as ZodModule)