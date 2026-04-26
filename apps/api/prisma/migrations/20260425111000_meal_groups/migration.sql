-- CreateTable
CREATE TABLE "MealGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "MealGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealGroupMember" (
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MealGroupMember_pkey" PRIMARY KEY ("groupId","userId")
);

-- CreateTable
CREATE TABLE "MealGroupInvite" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MealGroupInvite_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "User" ADD COLUMN "currentGroupId" TEXT;
ALTER TABLE "MenuItem" ADD COLUMN "groupId" TEXT;
ALTER TABLE "Tag" ADD COLUMN "groupId" TEXT;
ALTER TABLE "MealHistory" ADD COLUMN "groupId" TEXT;

-- Backfill one default meal group per existing user.
INSERT INTO "MealGroup" ("id", "name", "createdAt", "updatedAt", "createdById")
SELECT 'group_' || md5("id"), '我的饭团', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, "id"
FROM "User";

INSERT INTO "MealGroupMember" ("groupId", "userId", "role", "joinedAt")
SELECT 'group_' || md5("id"), "id", 'member', CURRENT_TIMESTAMP
FROM "User";

UPDATE "User"
SET "currentGroupId" = 'group_' || md5("id");

UPDATE "MenuItem"
SET "groupId" = 'group_' || md5("createdById")
WHERE "createdById" IS NOT NULL;

UPDATE "MealHistory"
SET "groupId" = "MenuItem"."groupId"
FROM "MenuItem"
WHERE "MealHistory"."menuItemId" = "MenuItem"."id";

-- CreateIndex
CREATE INDEX "MealGroupMember_userId_idx" ON "MealGroupMember"("userId");
CREATE UNIQUE INDEX "MealGroupInvite_code_key" ON "MealGroupInvite"("code");
CREATE INDEX "MealGroupInvite_groupId_idx" ON "MealGroupInvite"("groupId");
DROP INDEX "Tag_name_key";
CREATE UNIQUE INDEX "Tag_groupId_name_key" ON "Tag"("groupId","name");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_currentGroupId_fkey" FOREIGN KEY ("currentGroupId") REFERENCES "MealGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MealGroup" ADD CONSTRAINT "MealGroup_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MealGroupMember" ADD CONSTRAINT "MealGroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "MealGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MealGroupMember" ADD CONSTRAINT "MealGroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MealGroupInvite" ADD CONSTRAINT "MealGroupInvite_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "MealGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MealGroupInvite" ADD CONSTRAINT "MealGroupInvite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "MealGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "MealGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MealHistory" ADD CONSTRAINT "MealHistory_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "MealGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
