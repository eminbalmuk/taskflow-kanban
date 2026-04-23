import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { normalizeAssignees } from '@/lib/assignees'

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
  const body = await request.json()
  const { cardId, columnId, order, color, title, assignees, assignee, dueDate } = body
  const normalizedDueDate = normalizeDueDate(dueDate)
  const normalizedAssignees = resolveAssignees(assignees, assignee)

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
  const body = await request.json()
  const { title, columnId, order, assignees, assignee, dueDate } = body
  const normalizedDueDate = normalizeDueDate(dueDate)
  const normalizedAssignees = resolveAssignees(assignees, assignee) ?? []

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
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'ID required' }, { status: 400 })
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
