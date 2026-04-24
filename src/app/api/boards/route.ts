import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { presentBoard } from '@/lib/board-presenter'
import { currentUserMembershipSelect } from '@/lib/board-access'

export async function POST(request: Request) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { title } = await request.json()

    const board = await prisma.board.create({
      data: {
        title: title || 'Yeni Pano',
        userId: session.user.id,
        accessGroup: {
          create: {},
        },
        columns: {
          create: [
            { title: 'Yapilacaklar', order: 0, color: '#f3f0ff' },
            { title: 'Devam Edenler', order: 1, color: '#e0f2fe' },
            { title: 'Tamamlananlar', order: 2, color: '#dcfce7' },
          ],
        },
      },
      include: {
        columns: {
          include: { cards: true },
        },
        ...currentUserMembershipSelect(session.user.id),
      },
    })

    return NextResponse.json(presentBoard(board, session.user.id))
  } catch {
    return NextResponse.json({ error: 'Failed to create board' }, { status: 500 })
  }
}
