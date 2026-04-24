import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { getBoardAccess } from '@/lib/board-access'

function normalizePermission(value: unknown) {
  return value === 'EDIT' ? 'EDIT' : 'VIEW'
}

function getBoardIdFromUrl(request: Request) {
  return new URL(request.url).searchParams.get('boardId')
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

async function requireOwnerAccess(request: Request) {
  const session = await auth()

  if (!session?.user?.id) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const boardId = getBoardIdFromUrl(request)
  if (!boardId) {
    return {
      error: NextResponse.json({ error: 'Board id is required' }, { status: 400 }),
    }
  }

  const access = await getBoardAccess(boardId, session.user.id)
  if (!access) {
    return {
      error: NextResponse.json({ error: 'Board not found' }, { status: 404 }),
    }
  }

  if (!access.isOwner) {
    return {
      error: NextResponse.json({ error: 'Only the board owner can manage sharing' }, { status: 403 }),
    }
  }

  return {
    session,
    boardId,
  }
}

export async function GET(request: Request) {
  const result = await requireOwnerAccess(request)
  if ('error' in result) return result.error

  const group = await prisma.boardAccessGroup.findUnique({
    where: { boardId: result.boardId },
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

  return NextResponse.json({
    shares: (group?.members ?? []).map((member) => ({
      userId: member.userId,
      name: member.user.name,
      email: member.user.email,
      permission: member.permission,
    })),
  })
}

export async function POST(request: Request) {
  const result = await requireOwnerAccess(request)
  if ('error' in result) return result.error

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

  if (targetUser.id === result.session.user.id) {
    return NextResponse.json({ error: 'You already own this board' }, { status: 400 })
  }

  const group = await ensureBoardAccessGroup(result.boardId)

  const member = await prisma.boardAccessMember.upsert({
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
      userId: member.userId,
      name: member.user.name,
      email: member.user.email,
      permission: member.permission,
    },
  })
}

export async function PATCH(request: Request) {
  const result = await requireOwnerAccess(request)
  if ('error' in result) return result.error

  const { userId, permission } = await request.json()

  if (typeof userId !== 'string' || !userId) {
    return NextResponse.json({ error: 'User id is required' }, { status: 400 })
  }

  const group = await prisma.boardAccessGroup.findUnique({
    where: { boardId: result.boardId },
    select: { id: true },
  })

  if (!group) {
    return NextResponse.json({ error: 'Yetki grubu bulunamadi' }, { status: 404 })
  }

  const member = await prisma.boardAccessMember.update({
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
      userId: member.userId,
      name: member.user.name,
      email: member.user.email,
      permission: member.permission,
    },
  })
}

export async function DELETE(request: Request) {
  const result = await requireOwnerAccess(request)
  if ('error' in result) return result.error

  const { userId } = await request.json()

  if (typeof userId !== 'string' || !userId) {
    return NextResponse.json({ error: 'User id is required' }, { status: 400 })
  }

  const group = await prisma.boardAccessGroup.findUnique({
    where: { boardId: result.boardId },
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
