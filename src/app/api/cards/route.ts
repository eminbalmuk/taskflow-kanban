import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(request: Request) {
  const body = await request.json()
  const { cardId, columnId, order, color, title } = body

  try {
    const updatedCard = await prisma.card.update({
      where: { id: cardId },
      data: { 
        ...(columnId && { columnId }),
        ...(order !== undefined && { order }),
        ...(color && { color }),
        ...(title && { title })
      },
    })

    return NextResponse.json(updatedCard)
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const body = await request.json()
  const { title, columnId, order } = body

  try {
    const newCard = await prisma.card.create({
      data: { title, columnId, order, color: '#ffffff' },
    })

    return NextResponse.json(newCard)
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  try {
    await prisma.card.delete({
      where: { id }
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
}
