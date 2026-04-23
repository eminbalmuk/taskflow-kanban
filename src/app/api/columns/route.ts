import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(request: Request) {
  const body = await request.json()
  const { columnId, order, color, title } = body

  try {
    const updatedColumn = await prisma.column.update({
      where: { id: columnId },
      data: { 
        ...(order !== undefined && { order }),
        ...(color && { color }),
        ...(title && { title })
      },
    })

    return NextResponse.json(updatedColumn)
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const body = await request.json()
  const { title, boardId, order } = body

  try {
    const newColumn = await prisma.column.create({
      data: { title, boardId, order, color: '#f3f0ff' },
    })

    return NextResponse.json(newColumn)
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  try {
    await prisma.column.delete({
      where: { id }
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
}
