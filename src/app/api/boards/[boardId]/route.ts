import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { currentUserMembershipSelect, getBoardAccess } from '@/lib/board-access'
import { presentBoard } from '@/lib/board-presenter'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ boardId: string }> }
) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { boardId } = await params
    const access = await getBoardAccess(boardId, session.user.id)

    if (!access) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 })
    }

    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: {
        columns: {
          orderBy: { order: 'asc' },
          include: {
            cards: {
              orderBy: { order: 'asc' },
            },
          },
        },
        ...currentUserMembershipSelect(session.user.id),
      },
    })

    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 })
    }

    return NextResponse.json(presentBoard(board, session.user.id))
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ boardId: string }> }
) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { boardId } = await params
    const access = await getBoardAccess(boardId, session.user.id)

    if (!access) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 })
    }

    if (!access.canEdit) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { title } = await request.json()

    const board = await prisma.board.update({
      where: { id: boardId },
      data: { title },
      include: {
        ...currentUserMembershipSelect(session.user.id),
      },
    })

    return NextResponse.json(presentBoard({ ...board, columns: [] }, session.user.id))
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ boardId: string }> }
) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { boardId } = await params
    const access = await getBoardAccess(boardId, session.user.id)

    if (!access) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 })
    }

    if (!access.isOwner) {
      return NextResponse.json({ error: 'Only the board owner can delete this board' }, { status: 403 })
    }

    await prisma.board.delete({
      where: { id: boardId },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete board' }, { status: 500 })
  }
}
