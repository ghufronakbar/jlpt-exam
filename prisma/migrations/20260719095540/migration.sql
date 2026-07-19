-- DropForeignKey
ALTER TABLE "Attempt" DROP CONSTRAINT "Attempt_testPackageId_fkey";

-- DropForeignKey
ALTER TABLE "Attempt" DROP CONSTRAINT "Attempt_userId_fkey";

-- DropForeignKey
ALTER TABLE "AttemptAnswer" DROP CONSTRAINT "AttemptAnswer_questionId_fkey";

-- DropForeignKey
ALTER TABLE "Question" DROP CONSTRAINT "Question_questionContextId_fkey";

-- DropForeignKey
ALTER TABLE "QuestionComment" DROP CONSTRAINT "QuestionComment_userId_fkey";

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_questionContextId_fkey" FOREIGN KEY ("questionContextId") REFERENCES "QuestionContext"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionComment" ADD CONSTRAINT "QuestionComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_testPackageId_fkey" FOREIGN KEY ("testPackageId") REFERENCES "TestPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttemptAnswer" ADD CONSTRAINT "AttemptAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
