import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(request: Request) {
  try {
    const items = await request.json()
    
    // Kartların yeni sıralarını ve olası sütun değişimlerini veritabanına işle
    await prisma.$transaction(
      items.map((item: { id: string, order: number, columnId: string }) =>
        prisma.card.update({
          where: { id: item.id },
          data: { 
            order: item.order,
            columnId: item.columnId
          },
        })
      )
    )
    
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to reorder cards' }, { status: 500 })
  }
}
