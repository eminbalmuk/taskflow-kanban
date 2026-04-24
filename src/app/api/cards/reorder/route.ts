import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { boardEditableWhere } from '@/lib/board-access'

export async function PUT(request: Request) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const items = await request.json()
    const ids = Array.isArray(items) ? items.map((item) => item.id) : []
    const targetColumnIds = Array.isArray(items) ? Array.from(new Set(items.map((item) => item.columnId))) : []

    const cards = await prisma.card.findMany({
      where: {
        id: { in: ids },
        column: {
          board: {
            ...boardEditableWhere(session.user.id),
          },
        },
      },
      select: { id: true },
    })

    if (cards.length !== ids.length) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const targetColumns = await prisma.column.findMany({
      where: {
        id: { in: targetColumnIds },
        board: {
          ...boardEditableWhere(session.user.id),
        },
      },
      select: { id: true },
    })

    if (targetColumns.length !== targetColumnIds.length) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.$transaction(
      items.map((item: { id: string; order: number; columnId: string }) =>
        prisma.card.update({
          where: { id: item.id },
          data: {
            order: item.order,
            columnId: item.columnId,
          },
        })
      )
    )

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to reorder cards' }, { status: 500 })
  }
}
