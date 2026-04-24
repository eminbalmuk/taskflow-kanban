import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { getBoardAccess, getColumnAccess } from '@/lib/board-access'

export async function PATCH(request: Request) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { columnId, order, color, title } = body

  const access = await getColumnAccess(columnId, session.user.id)
  if (!access) {
    return NextResponse.json({ error: 'Column not found' }, { status: 404 })
  }

  if (!access.canEdit) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const updatedColumn = await prisma.column.update({
      where: { id: columnId },
      data: {
        ...(order !== undefined && { order }),
        ...(color !== undefined && { color }),
        ...(title !== undefined && { title }),
      },
    })

    return NextResponse.json(updatedColumn)
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { title, boardId, order } = body
  const access = await getBoardAccess(boardId, session.user.id)

  if (!access) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 })
  }

  if (!access.canEdit) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const newColumn = await prisma.column.create({
      data: { title, boardId, order, color: '#f3f0ff' },
    })

    return NextResponse.json(newColumn)
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  const access = await getColumnAccess(id, session.user.id)
  if (!access) {
    return NextResponse.json({ error: 'Column not found' }, { status: 404 })
  }

  if (!access.canEdit) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    await prisma.column.delete({
      where: { id },
    })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
}
