CREATE TYPE "BoardSharePermission" AS ENUM ('VIEW', 'EDIT');

CREATE TABLE "BoardShare" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permission" "BoardSharePermission" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoardShare_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BoardShare_boardId_userId_key" ON "BoardShare"("boardId", "userId");

ALTER TABLE "BoardShare" ADD CONSTRAINT "BoardShare_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BoardShare" ADD CONSTRAINT "BoardShare_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
