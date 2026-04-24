import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { getBoardAccess } from '@/lib/board-access'

function normalizePermission(value: unknown) {
  return value === 'EDIT' ? 'EDIT' : 'VIEW'
}

async function ensureBoardAccessGroup(boardId: string) {
  const existingGroup = await prisma.boardAccessGroup.findUnique({
    where: { boardId },
    select: { id: true },
  })

  if (existingGroup) {
    return existingGroup
  }

  return prisma.boardAccessGroup.create({
    data: { boardId },
    select: { id: true },
  })
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ boardId: string }> }
) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { boardId } = await params
  const access = await getBoardAccess(boardId, session.user.id)

  if (!access) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 })
  }

  if (!access.isOwner) {
    return NextResponse.json({ error: 'Only the board owner can manage sharing' }, { status: 403 })
  }

  const group = await prisma.boardAccessGroup.findUnique({
    where: { boardId },
    include: {
      members: {
        orderBy: { createdAt: 'asc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  })

  const shares = group?.members ?? []

  return NextResponse.json({
    shares: shares.map((share) => ({
      userId: share.userId,
      name: share.user.name,
      email: share.user.email,
      permission: share.permission,
    })),
  })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ boardId: string }> }
) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { boardId } = await params
  const access = await getBoardAccess(boardId, session.user.id)

  if (!access) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 })
  }

  if (!access.isOwner) {
    return NextResponse.json({ error: 'Only the board owner can manage sharing' }, { status: 403 })
  }

  const { email, permission } = await request.json()

  if (typeof email !== 'string' || !email.trim()) {
    return NextResponse.json({ error: 'A valid email is required' }, { status: 400 })
  }

  const targetUser = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: {
      id: true,
      name: true,
      email: true,
    },
  })

  if (!targetUser) {
    return NextResponse.json(
      { error: 'Davet etmek icin kullanicinin once kayit olmus olmasi gerekiyor.' },
      { status: 400 }
    )
  }

  if (targetUser.id === session.user.id) {
    return NextResponse.json({ error: 'You already own this board' }, { status: 400 })
  }

  const group = await ensureBoardAccessGroup(boardId)

  const share = await prisma.boardAccessMember.upsert({
    where: {
      groupId_userId: {
        groupId: group.id,
        userId: targetUser.id,
      },
    },
    update: {
      permission: normalizePermission(permission),
    },
    create: {
      groupId: group.id,
      userId: targetUser.id,
      permission: normalizePermission(permission),
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })

  return NextResponse.json({
    share: {
      userId: share.userId,
      name: share.user.name,
      email: share.user.email,
      permission: share.permission,
    },
  })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ boardId: string }> }
) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { boardId } = await params
  const access = await getBoardAccess(boardId, session.user.id)

  if (!access) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 })
  }

  if (!access.isOwner) {
    return NextResponse.json({ error: 'Only the board owner can manage sharing' }, { status: 403 })
  }

  const { userId, permission } = await request.json()

  if (typeof userId !== 'string' || !userId) {
    return NextResponse.json({ error: 'User id is required' }, { status: 400 })
  }

  const group = await prisma.boardAccessGroup.findUnique({
    where: { boardId },
    select: { id: true },
  })

  if (!group) {
    return NextResponse.json({ error: 'Yetki grubu bulunamadi' }, { status: 404 })
  }

  const share = await prisma.boardAccessMember.update({
    where: {
      groupId_userId: {
        groupId: group.id,
        userId,
      },
    },
    data: {
      permission: normalizePermission(permission),
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })

  return NextResponse.json({
    share: {
      userId: share.userId,
      name: share.user.name,
      email: share.user.email,
      permission: share.permission,
    },
  })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ boardId: string }> }
) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { boardId } = await params
  const access = await getBoardAccess(boardId, session.user.id)

  if (!access) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 })
  }

  if (!access.isOwner) {
    return NextResponse.json({ error: 'Only the board owner can manage sharing' }, { status: 403 })
  }

  const { userId } = await request.json()

  if (typeof userId !== 'string' || !userId) {
    return NextResponse.json({ error: 'User id is required' }, { status: 400 })
  }

  const group = await prisma.boardAccessGroup.findUnique({
    where: { boardId },
    select: { id: true },
  })

  if (!group) {
    return NextResponse.json({ success: true })
  }

  await prisma.boardAccessMember.delete({
    where: {
      groupId_userId: {
        groupId: group.id,
        userId,
      },
    },
  })

  return NextResponse.json({ success: true })
}
