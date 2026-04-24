import { prisma } from '@/lib/prisma'

export type BoardAccessRole = 'owner' | 'edit' | 'view'
export type BoardPermission = 'VIEW' | 'EDIT'

export function getAccessRole(ownerId: string, currentUserId: string, sharePermission?: BoardPermission) {
  if (ownerId === currentUserId) {
    return 'owner' as const
  }

  return sharePermission === 'EDIT' ? 'edit' : 'view'
}

export function canEditBoard(role: BoardAccessRole) {
  return role === 'owner' || role === 'edit'
}

export function boardAccessWhere(userId: string) {
  return {
    OR: [
      { userId },
      {
        accessGroup: {
          members: {
            some: { userId },
          },
        },
      },
    ],
  }
}

export function boardEditableWhere(userId: string) {
  return {
    OR: [
      { userId },
      {
        accessGroup: {
          members: {
            some: {
              userId,
              permission: 'EDIT' as const,
            },
          },
        },
      },
    ],
  }
}

export function currentUserMembershipSelect(userId: string) {
  return {
    accessGroup: {
      select: {
        members: {
          where: { userId },
          select: { permission: true },
          take: 1,
        },
      },
    },
  }
}

export async function getBoardAccess(boardId: string, userId: string) {
  const board = await prisma.board.findFirst({
    where: {
      id: boardId,
      ...boardAccessWhere(userId),
    },
    select: {
      id: true,
      userId: true,
      accessGroup: {
        select: {
          members: {
            where: { userId },
            select: { permission: true },
            take: 1,
          },
        },
      },
    },
  })

  if (!board) return null

  const role = getAccessRole(board.userId, userId, board.accessGroup?.members[0]?.permission)

  return {
    boardId: board.id,
    ownerId: board.userId,
    accessRole: role,
    isOwner: role === 'owner',
    canEdit: canEditBoard(role),
  }
}

export async function getColumnAccess(columnId: string, userId: string) {
  const column = await prisma.column.findFirst({
    where: {
      id: columnId,
      board: {
        ...boardAccessWhere(userId),
      },
    },
    select: {
      id: true,
      board: {
        select: {
          id: true,
          userId: true,
          accessGroup: {
            select: {
              members: {
                where: { userId },
                select: { permission: true },
                take: 1,
              },
            },
          },
        },
      },
    },
  })

  if (!column) return null

  const role = getAccessRole(column.board.userId, userId, column.board.accessGroup?.members[0]?.permission)

  return {
    columnId: column.id,
    boardId: column.board.id,
    accessRole: role,
    isOwner: role === 'owner',
    canEdit: canEditBoard(role),
  }
}

export async function getCardAccess(cardId: string, userId: string) {
  const card = await prisma.card.findFirst({
    where: {
      id: cardId,
      column: {
        board: {
          ...boardAccessWhere(userId),
        },
      },
    },
    select: {
      id: true,
      column: {
        select: {
          board: {
            select: {
              id: true,
              userId: true,
              accessGroup: {
                select: {
                  members: {
                    where: { userId },
                    select: { permission: true },
                    take: 1,
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  if (!card) return null

  const role = getAccessRole(card.column.board.userId, userId, card.column.board.accessGroup?.members[0]?.permission)

  return {
    cardId: card.id,
    boardId: card.column.board.id,
    accessRole: role,
    isOwner: role === 'owner',
    canEdit: canEditBoard(role),
  }
}
