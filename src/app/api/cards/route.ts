import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { normalizeAssignees } from '@/lib/assignees'
import { boardEditableWhere, getBoardAccess, getCardAccess } from '@/lib/board-access'

function normalizeDueDate(value: unknown) {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  if (typeof value !== 'string') return null

  const normalized = value.length <= 10 ? `${value}T00:00:00.000Z` : value
  return new Date(normalized)
}

function resolveAssignees(value: unknown, legacyValue?: unknown) {
  if (value === undefined && legacyValue === undefined) {
    return undefined
  }

  return normalizeAssignees(value ?? legacyValue)
}

export async function PATCH(request: Request) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { cardId, columnId, order, color, title, assignees, assignee, dueDate } = body
  const normalizedDueDate = normalizeDueDate(dueDate)
  const normalizedAssignees = resolveAssignees(assignees, assignee)

  const access = await getCardAccess(cardId, session.user.id)
  if (!access) {
    return NextResponse.json({ error: 'Card not found' }, { status: 404 })
  }

  if (!access.canEdit) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (columnId !== undefined) {
    const targetColumn = await prisma.column.findFirst({
      where: {
        id: columnId,
        board: {
          ...boardEditableWhere(session.user.id),
        },
      },
      select: { id: true },
    })

    if (!targetColumn) {
      return NextResponse.json({ error: 'Target column not found' }, { status: 404 })
    }
  }

  try {
    const updatedCard = await prisma.card.update({
      where: { id: cardId },
      data: {
        ...(columnId !== undefined && { columnId }),
        ...(order !== undefined && { order }),
        ...(color !== undefined && { color }),
        ...(title !== undefined && { title }),
        ...(normalizedAssignees !== undefined && { assignees: normalizedAssignees }),
        ...(normalizedDueDate !== undefined && { dueDate: normalizedDueDate }),
      },
    })

    return NextResponse.json(updatedCard)
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
  const { title, columnId, order, assignees, assignee, dueDate } = body
  const normalizedDueDate = normalizeDueDate(dueDate)
  const normalizedAssignees = resolveAssignees(assignees, assignee) ?? []

  const column = await prisma.column.findUnique({
    where: { id: columnId },
    select: { boardId: true },
  })

  if (!column) {
    return NextResponse.json({ error: 'Column not found' }, { status: 404 })
  }

  const access = await getBoardAccess(column.boardId, session.user.id)
  if (!access) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 })
  }

  if (!access.canEdit) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const newCard = await prisma.card.create({
      data: {
        title,
        columnId,
        order,
        assignees: normalizedAssignees,
        dueDate: normalizedDueDate ?? null,
        color: '#ffffff',
      },
    })

    return NextResponse.json(newCard)
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

  if (!id) {
    return NextResponse.json({ error: 'ID required' }, { status: 400 })
  }

  const access = await getCardAccess(id, session.user.id)
  if (!access) {
    return NextResponse.json({ error: 'Card not found' }, { status: 404 })
  }

  if (!access.canEdit) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    await prisma.card.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
}
