import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(request: Request) {
  try {
    const items = await request.json()
    
    // Tüm sütun sıralamalarını tek bir işlemde güncelle
    await prisma.$transaction(
      items.map((item: { id: string, order: number }) =>
        prisma.column.update({
          where: { id: item.id },
          data: { order: item.order },
        })
      )
    )
    
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to reorder columns' }, { status: 500 })
  }
}
