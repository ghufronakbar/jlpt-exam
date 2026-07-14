-- CreateEnum
CREATE TYPE "JlptLevel" AS ENUM ('N5', 'N4', 'N3', 'N2', 'N1');

-- CreateEnum
CREATE TYPE "JlptSection" AS ENUM ('MOJI_GOI', 'BUNPOU', 'DOKKAI', 'CHOUKAI');

-- CreateEnum
CREATE TYPE "MondaiType" AS ENUM ('MOJI_GOI_READ_KANJI', 'MOJI_GOI_WRITE_KANJI', 'MOJI_GOI_WORD_FORMATION', 'MOJI_GOI_CONTEXT', 'MOJI_GOI_SYNONYM', 'MOJI_GOI_WORD_USAGE', 'BUNPOU_GRAMMAR', 'BUNPOU_SENTENCE_COMPOSITION', 'BUNPOU_TEXT_GRAMMAR', 'DOKKAI_SHORT_TEXT', 'DOKKAI_MEDIUM_TEXT', 'DOKKAI_LONG_TEXT', 'DOKKAI_INTEGRATED', 'DOKKAI_MAIN_IDEA', 'DOKKAI_INFORMATION_RETRIEVAL', 'CHOUKAI_TASK_BASED', 'CHOUKAI_MAIN_POINT', 'CHOUKAI_OUTLINE', 'CHOUKAI_EXPRESSION', 'CHOUKAI_QUICK_RESPONSE', 'CHOUKAI_INTEGRATED');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestPackage" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "jlptLevel" "JlptLevel" NOT NULL,
    "sessionTimeLimits" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestPackageItem" (
    "id" SERIAL NOT NULL,
    "mondaiType" "MondaiType" NOT NULL,
    "section" "JlptSection" NOT NULL,
    "session" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "instruction" TEXT,
    "testPackageId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestPackageItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionContext" (
    "id" SERIAL NOT NULL,
    "testPackageId" INTEGER NOT NULL,
    "storyText" TEXT,
    "storyImage" TEXT,
    "storyAudio" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionContext_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" SERIAL NOT NULL,
    "testPackageItemId" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "questionText" TEXT NOT NULL,
    "questionImage" TEXT,
    "questionAudio" TEXT,
    "questionAnswer" INTEGER NOT NULL,
    "explanation" TEXT,
    "questionContextId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionChoice" (
    "id" SERIAL NOT NULL,
    "codeAnswer" INTEGER NOT NULL,
    "questionId" INTEGER NOT NULL,
    "answerText" TEXT NOT NULL,
    "answerImage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionChoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionComment" (
    "id" SERIAL NOT NULL,
    "questionId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "commentText" TEXT NOT NULL,
    "commentImages" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attempt" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "testPackageId" INTEGER NOT NULL,
    "sectionScope" "JlptSection",
    "status" "AttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttemptAnswer" (
    "id" SERIAL NOT NULL,
    "attemptId" INTEGER NOT NULL,
    "questionId" INTEGER NOT NULL,
    "selectedAnswer" INTEGER,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "timeSpentSec" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttemptAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "TestPackageItem_testPackageId_mondaiType_key" ON "TestPackageItem"("testPackageId", "mondaiType");

-- CreateIndex
CREATE UNIQUE INDEX "Question_testPackageItemId_order_key" ON "Question"("testPackageItemId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionChoice_questionId_codeAnswer_key" ON "QuestionChoice"("questionId", "codeAnswer");

-- CreateIndex
CREATE UNIQUE INDEX "AttemptAnswer_attemptId_questionId_key" ON "AttemptAnswer"("attemptId", "questionId");

-- AddForeignKey
ALTER TABLE "TestPackageItem" ADD CONSTRAINT "TestPackageItem_testPackageId_fkey" FOREIGN KEY ("testPackageId") REFERENCES "TestPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionContext" ADD CONSTRAINT "QuestionContext_testPackageId_fkey" FOREIGN KEY ("testPackageId") REFERENCES "TestPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_testPackageItemId_fkey" FOREIGN KEY ("testPackageItemId") REFERENCES "TestPackageItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_questionContextId_fkey" FOREIGN KEY ("questionContextId") REFERENCES "QuestionContext"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionChoice" ADD CONSTRAINT "QuestionChoice_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionComment" ADD CONSTRAINT "QuestionComment_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionComment" ADD CONSTRAINT "QuestionComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_testPackageId_fkey" FOREIGN KEY ("testPackageId") REFERENCES "TestPackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttemptAnswer" ADD CONSTRAINT "AttemptAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "Attempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttemptAnswer" ADD CONSTRAINT "AttemptAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
