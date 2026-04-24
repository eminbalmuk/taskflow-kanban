import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { getBoardAccess } from '@/lib/board-access'

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
