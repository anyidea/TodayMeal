-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('viewer', 'editor', 'owner');

-- CreateEnum
CREATE TYPE "MenuItemType" AS ENUM ('recipe', 'takeout', 'inspiration');

-- CreateEnum
CREATE TYPE "MealPeriod" AS ENUM ('breakfast', 'lunch', 'dinner', 'lateNight');

-- CreateEnum
CREATE TYPE "TagType" AS ENUM ('system', 'custom');

-- CreateEnum
CREATE TYPE "MenuItemStatus" AS ENUM ('active', 'archived');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "openid" TEXT NOT NULL,
    "nickname" TEXT,
    "avatarUrl" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'viewer',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItem" (
    "id" TEXT NOT NULL,
    "type" "MenuItemType" NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT,
    "coverImageUrl" TEXT,
    "mealPeriods" "MealPeriod"[],
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "status" "MenuItemStatus" NOT NULL DEFAULT 'active',
    "ingredients" TEXT[],
    "steps" TEXT[],
    "cookTimeMinutes" INTEGER,
    "difficulty" TEXT,
    "notes" TEXT,
    "restaurantName" TEXT,
    "platform" TEXT,
    "externalUrl" TEXT,
    "priceRange" TEXT,
    "deliveryNotes" TEXT,
    "linkPreview" JSONB,
    "sourceName" TEXT,
    "sourceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "TagType" NOT NULL DEFAULT 'custom',
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItemTag" (
    "menuItemId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "MenuItemTag_pkey" PRIMARY KEY ("menuItemId","tagId")
);

-- CreateTable
CREATE TABLE "MealHistory" (
    "id" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "eatenAt" TIMESTAMP(3) NOT NULL,
    "rating" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "MealHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileAsset" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedById" TEXT,

    CONSTRAINT "FileAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_openid_key" ON "User"("openid");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "FileAsset_storageKey_key" ON "FileAsset"("storageKey");

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemTag" ADD CONSTRAINT "MenuItemTag_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemTag" ADD CONSTRAINT "MenuItemTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealHistory" ADD CONSTRAINT "MealHistory_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealHistory" ADD CONSTRAINT "MealHistory_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileAsset" ADD CONSTRAINT "FileAsset_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
