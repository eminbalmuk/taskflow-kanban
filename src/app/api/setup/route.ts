import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

export async function GET() {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    let board = await prisma.board.findFirst({
      where: { userId: session.user.id },
      include: { 
        columns: { 
          orderBy: { order: 'asc' },
          include: { 
            cards: { orderBy: { order: 'asc' } } 
          } 
        } 
      }
    })

    if (!board) {
      board = await prisma.board.create({
        data: {
          title: 'Yeni Projem',
          userId: session.user.id,
          columns: {
            create: [
              { title: 'Yapılacaklar', order: 0, color: '#f3f0ff' },
              { title: 'Devam Edenler', order: 1, color: '#e0f2fe' },
              { title: 'Tamamlananlar', order: 2, color: '#dcfce7' }
            ]
          }
        },
        include: { 
          columns: { 
            include: { cards: true } 
          } 
        }
      })
    }

    return NextResponse.json(board)
  } catch (error) {
    return NextResponse.json({ error: 'Setup failed' }, { status: 500 })
  }
}
