import type {
	MessageContent,
	MessageRole,
} from '../../conversation/chat-message'

export interface MessageNode {
	id: string
	parentId: string | null
	childrenIds: string[]
	role: MessageRole
	content: MessageContent
	createdAt: number
	metadata?: Record<string, unknown>
}

export class MessageTree {
	private nodes = new Map<string, MessageNode>()
	private currentLeafId: string | null = null

	constructor(initialNodes?: MessageNode[], leafId?: string) {
		if (initialNodes) {
			for (const node of initialNodes) {
				this.nodes.set(node.id, node)
			}
		}
		this.currentLeafId = leafId ?? null
	}

	/** 获取当前激活路径上的完整消息链 */
	getActivePath(): MessageNode[] {
		const path: MessageNode[] = []
		const visited = new Set<string>()
		let curr = this.currentLeafId ? this.nodes.get(this.currentLeafId) : null

		while (curr) {
			if (visited.has(curr.id)) {
				throw new Error(`Cycle detected in message tree at node: ${curr.id}`)
			}

			visited.add(curr.id)
			path.unshift(curr)
			curr = curr.parentId ? this.nodes.get(curr.parentId) : null
		}
		return path
	}

	/** 追加新节点 */
	addNode(
		role: MessageRole,
		content: MessageContent,
		parentId?: string,
	): MessageNode {
		const targetParentId =
			parentId !== undefined ? parentId : this.currentLeafId
		if (targetParentId !== null && !this.nodes.has(targetParentId)) {
			throw new Error(`Parent message node not found: ${targetParentId}`)
		}

		const id = crypto.randomUUID()

		const node: MessageNode = {
			id,
			parentId: targetParentId,
			childrenIds: [],
			role,
			content,
			createdAt: Date.now(),
		}

		this.nodes.set(id, node)

		if (targetParentId && this.nodes.has(targetParentId)) {
			this.nodes.get(targetParentId)?.childrenIds.push(id)
		}

		this.currentLeafId = id
		return node
	}

	/** 切换同级分支 */
	switchToSibling(siblingId: string): boolean {
		const targetNode = this.nodes.get(siblingId)
		if (!targetNode) return false

		const currentPath = this.getActivePath()
		const isSiblingValid = currentPath.some(
			(node) => node.parentId === targetNode.parentId,
		)

		if (!isSiblingValid) {
			return false
		}

		return this.switchToNode(siblingId)
	}

	/** 切换分支 */
	switchToNode(nodeId: string): boolean {
		let curr = this.nodes.get(nodeId)
		if (!curr) return false

		while (curr.childrenIds.length > 0) {
			const firstChildId = curr.childrenIds[0]
			const childNode = this.nodes.get(firstChildId)
			if (!childNode) break
			curr = childNode
		}
		this.currentLeafId = curr.id
		return true
	}

	toArray(): MessageNode[] {
		return Array.from(this.nodes.values())
	}
}
