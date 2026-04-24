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

    const columns = await prisma.column.findMany({
      where: {
        id: { in: ids },
        board: {
          ...boardEditableWhere(session.user.id),
        },
      },
      select: { id: true },
    })

    if (columns.length !== ids.length) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.$transaction(
      items.map((item: { id: string; order: number }) =>
        prisma.column.update({
          where: { id: item.id },
          data: { order: item.order },
        })
      )
    )

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to reorder columns' }, { status: 500 })
  }
}
