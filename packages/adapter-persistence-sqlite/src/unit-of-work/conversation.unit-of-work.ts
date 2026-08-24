import type {
  Conversation,
  ConversationMessage,
} from '@kirika-js/domain/conversation'
import { and, eq, inArray, isNull } from 'drizzle-orm'
import type { SqliteDatabase } from '~/database'
import { ConversationMapper } from '~/mappers/conversation.mapper'
import {
  conversationMessages,
  conversations,
} from '~/schema/conversation.schema'

export class ConversationGenerationConflictError extends Error {
  constructor(readonly conversationId: string) {
    super('会话已有生成任务或生成状态已被其他操作修改')
    this.name = 'ConversationGenerationConflictError'
  }
}

export class SqliteConversationUnitOfWork {
  constructor(private readonly db: SqliteDatabase) {}

  async appendMessage(
    conversation: Conversation,
    message: ConversationMessage,
  ): Promise<void> {
    const c = ConversationMapper.toPersistence(conversation).conversation
    const m = ConversationMapper.messageToPersistence(message)
    await this.db.transaction(async (tx) => {
      await tx.insert(conversationMessages).values(m)
      const result = await tx
        .update(conversations)
        .set({
          activeLeafMessageId: c.activeLeafMessageId,
          updatedAt: c.updatedAt,
        })
        .where(eq(conversations.id, c.id))
      if (result.rowsAffected !== 1) throw new Error('会话不存在')
    })
  }

  async startGeneration(
    conversation: Conversation,
    message: ConversationMessage,
  ): Promise<void> {
    const c = ConversationMapper.toPersistence(conversation).conversation
    const m = ConversationMapper.messageToPersistence(message)
    if (
      c.activeGenerationMessageId !== m.id ||
      c.activeLeafMessageId !== m.id ||
      !message.isInProgress
    )
      throw new Error('生成开始状态无效')
    await this.db.transaction(async (tx) => {
      await tx.insert(conversationMessages).values(m)
      const result = await tx
        .update(conversations)
        .set({
          activeLeafMessageId: m.id,
          activeGenerationMessageId: m.id,
          updatedAt: c.updatedAt,
        })
        .where(
          and(
            eq(conversations.id, c.id),
            isNull(conversations.activeGenerationMessageId),
          ),
        )
      if (result.rowsAffected !== 1)
        throw new ConversationGenerationConflictError(c.id)
    })
  }

  async checkpointGeneration(message: ConversationMessage): Promise<boolean> {
    if (!message.isInProgress) throw new Error('只能 checkpoint 生成中的消息')
    const m = ConversationMapper.messageToPersistence(message)
    const result = await this.db
      .update(conversationMessages)
      .set({ status: m.status, content: m.content, updatedAt: m.updatedAt })
      .where(
        and(
          eq(conversationMessages.id, m.id),
          eq(conversationMessages.conversationId, m.conversationId),
          inArray(conversationMessages.status, ['pending', 'streaming']),
        ),
      )
    return result.rowsAffected === 1
  }

  async finishGeneration(
    conversation: Conversation,
    message: ConversationMessage,
  ): Promise<void> {
    if (!message.isTerminal || conversation.activeGenerationMessageId !== null)
      throw new Error('生成终态无效')
    const c = ConversationMapper.toPersistence(conversation).conversation
    const m = ConversationMapper.messageToPersistence(message)
    await this.db.transaction(async (tx) => {
      const messageResult = await tx
        .update(conversationMessages)
        .set({
          status: m.status,
          content: m.content,
          finishReason: m.finishReason,
          tokenUsage: m.tokenUsage,
          errorReason: m.errorReason,
          updatedAt: m.updatedAt,
        })
        .where(
          and(
            eq(conversationMessages.id, m.id),
            inArray(conversationMessages.status, ['pending', 'streaming']),
          ),
        )
      if (messageResult.rowsAffected !== 1)
        throw new ConversationGenerationConflictError(c.id)
      const conversationResult = await tx
        .update(conversations)
        .set({
          activeLeafMessageId: m.id,
          activeGenerationMessageId: null,
          updatedAt: c.updatedAt,
        })
        .where(
          and(
            eq(conversations.id, c.id),
            eq(conversations.activeGenerationMessageId, m.id),
          ),
        )
      if (conversationResult.rowsAffected !== 1)
        throw new ConversationGenerationConflictError(c.id)
    })
  }

  async recoverInterruptedGenerations(
    reason = '应用在生成期间意外退出',
  ): Promise<number> {
    const rows = await this.db
      .select()
      .from(conversationMessages)
      .where(inArray(conversationMessages.status, ['pending', 'streaming']))
    let recovered = 0
    for (const row of rows) {
      await this.db.transaction(async (tx) => {
        const messageResult = await tx
          .update(conversationMessages)
          .set({
            status: 'failed',
            finishReason: 'error',
            tokenUsage: null,
            errorReason: reason,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(conversationMessages.id, row.id),
              inArray(conversationMessages.status, ['pending', 'streaming']),
            ),
          )
        if (messageResult.rowsAffected === 0) return
        await tx
          .update(conversations)
          .set({
            activeGenerationMessageId: null,
            activeLeafMessageId: row.id,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(conversations.id, row.conversationId),
              eq(conversations.activeGenerationMessageId, row.id),
            ),
          )
        recovered += 1
      })
    }
    return recovered
  }
}
