import { canEditBoard, getAccessRole } from '@/lib/board-access'

type SharePermission = 'VIEW' | 'EDIT'

export function presentBoard<
  T extends {
    userId: string
    accessGroup?: { members?: Array<{ permission: SharePermission }> } | null
  },
>(
  board: T,
  currentUserId: string
) {
  const accessRole = getAccessRole(board.userId, currentUserId, board.accessGroup?.members?.[0]?.permission)

  return {
    ...board,
    accessRole,
    canEdit: canEditBoard(accessRole),
    isOwner: accessRole === 'owner',
  }
}
