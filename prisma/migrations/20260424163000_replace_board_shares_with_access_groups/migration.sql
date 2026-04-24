CREATE TABLE "BoardAccessGroup" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoardAccessGroup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BoardAccessMember" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permission" "BoardSharePermission" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoardAccessMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BoardAccessGroup_boardId_key" ON "BoardAccessGroup"("boardId");
CREATE UNIQUE INDEX "BoardAccessMember_groupId_userId_key" ON "BoardAccessMember"("groupId", "userId");

ALTER TABLE "BoardAccessGroup"
ADD CONSTRAINT "BoardAccessGroup_boardId_fkey"
FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BoardAccessMember"
ADD CONSTRAINT "BoardAccessMember_groupId_fkey"
FOREIGN KEY ("groupId") REFERENCES "BoardAccessGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BoardAccessMember"
ADD CONSTRAINT "BoardAccessMember_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "BoardAccessGroup" ("id", "boardId", "createdAt", "updatedAt")
SELECT CONCAT('group_', "id"), "id", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Board";

INSERT INTO "BoardAccessMember" ("id", "groupId", "userId", "permission", "createdAt", "updatedAt")
SELECT
    CONCAT('member_', "BoardShare"."id"),
    "BoardAccessGroup"."id",
    "BoardShare"."userId",
    "BoardShare"."permission",
    "BoardShare"."createdAt",
    "BoardShare"."updatedAt"
FROM "BoardShare"
JOIN "BoardAccessGroup" ON "BoardAccessGroup"."boardId" = "BoardShare"."boardId";

DROP TABLE "BoardShare";
