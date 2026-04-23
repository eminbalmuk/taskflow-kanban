import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Board var mı diye kontrol
    let board = await prisma.board.findFirst({
      include: { columns: { include: { cards: true } } }
    })

    if (!board) {
      // Default user
      const user = await prisma.user.create({
        data: {
          email: 'demo@taskflow.com',
          password: 'password123',
          name: 'Demo User'
        }
      })

      // Board
      board = await prisma.board.create({
        data: {
          title: 'TaskFlow\'a hoşgeldiniz!',
          userId: user.id,
          columns: {
            create: [
              {
                title: 'To Do',
                order: 0,
                cards: {
                  create: [
                    { title: 'Learn dnd-kit', order: 0 },
                    { title: 'Master Framer Motion', order: 1 },
                  ]
                }
              },
              {
                title: 'In Progress',
                order: 1,
                cards: {
                  create: [
                    { title: 'Building Kanban Board', order: 0 },
                  ]
                }
              },
              {
                title: 'Done',
                order: 2,
                cards: {
                  create: [
                    { title: 'Project Setup', order: 0 },
                  ]
                }
              }
            ]
          }
        },
        include: { columns: { include: { cards: true } } }
      })
    }

    return NextResponse.json(board)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Setup failed' }, { status: 500 })
  }
}
