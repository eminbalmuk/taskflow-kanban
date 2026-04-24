import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { presentBoard } from '@/lib/board-presenter'
import { boardAccessWhere, currentUserMembershipSelect } from '@/lib/board-access'

export async function GET() {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const userId = session.user.id

    const accessibleBoards = await prisma.board.findMany({
      where: boardAccessWhere(userId),
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        title: true,
        userId: true,
        createdAt: true,
        ...currentUserMembershipSelect(userId),
      },
    })

    let boards = accessibleBoards
      .map((board) => ({
        ...presentBoard(board, userId),
        columns: [],
      }))
      .sort((left, right) => {
        if (left.isOwner !== right.isOwner) {
          return left.isOwner ? -1 : 1
        }

        return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
      })

    if (boards.length === 0) {
      return NextResponse.json({
        boards: [],
        activeBoard: null,
      })
    }

    const activeBoardId = boards[0].id
    const activeBoard = await prisma.board.findFirst({
      where: {
        id: activeBoardId,
        ...boardAccessWhere(userId),
      },
      include: {
        columns: {
          orderBy: { order: 'asc' },
          include: {
            cards: {
              orderBy: { order: 'asc' },
            },
          },
        },
        ...currentUserMembershipSelect(userId),
      },
    })

    return NextResponse.json({
      boards,
      activeBoard: activeBoard ? presentBoard(activeBoard, userId) : null,
    })
  } catch {
    return NextResponse.json({ error: 'Setup failed' }, { status: 500 })
  }
}
