import Link from "next/link";
import { notFound } from "next/navigation";
import { getTestPackageQuestions } from "@/features/test-package/actions";
import { QuestionCommentForm } from "@/features/question-comment/components/question-comment-form";
import { CommentItem } from "@/features/question-comment/components/comment-item";
import { CopyQuestionButton } from "@/components/copy-question-button";
import { QuestionNavSidebar, type NavMondaiItem } from "@/components/question-nav";
import { QuestionNavMobile } from "@/components/question-nav-mobile";
import { JapaneseText } from "@/components/japanese-text";
import { JapanesePassage } from "@/components/japanese-passage";
import { FuriganaScope } from "@/components/furigana-scope";
import { mondaiTypeFullLabel } from "@/constants/jlpt";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function TestPackageQuestionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mondai?: string }>;
}) {
  const { id } = await params;
  const { mondai } = await searchParams;
  const testPackageId = Number(id);

  if (!Number.isInteger(testPackageId)) {
    notFound();
  }

  const testPackage = await getTestPackageQuestions(testPackageId);

  if (testPackage.testPackageItems.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">{testPackage.jlptLevel}</p>
        <h1 className="text-xl font-semibold">{testPackage.name}</h1>
        <p className="text-sm text-muted-foreground">Belum ada soal untuk paket ini.</p>
      </div>
    );
  }

  const navItems: NavMondaiItem[] = testPackage.testPackageItems.map((item) => ({
    id: item.id,
    mondaiType: item.mondaiType,
    section: item.section,
    totalCount: item.questions.length,
  }));

  const requestedId = Number(mondai);
  const selectedItem =
    testPackage.testPackageItems.find((item) => item.id === requestedId) ??
    testPackage.testPackageItems[0];
  const currentIndex = testPackage.testPackageItems.findIndex(
    (item) => item.id === selectedItem.id,
  );
  const prevItem = currentIndex > 0 ? testPackage.testPackageItems[currentIndex - 1] : null;
  const nextItem =
    currentIndex < testPackage.testPackageItems.length - 1
      ? testPackage.testPackageItems[currentIndex + 1]
      : null;

  // Precomputed (not mutated during render) so a shared QuestionContext only
  // shows once for a contiguous run of questions that reference it.
  const questionRows = selectedItem.questions.reduce<{
    rows: { question: (typeof selectedItem.questions)[number]; showContext: boolean }[];
    lastContextId: number | null;
  }>(
    (acc, question) => {
      const showContext = Boolean(
        question.questionContext && question.questionContext.id !== acc.lastContextId,
      );
      return {
        rows: [...acc.rows, { question, showContext }],
        lastContextId: question.questionContext?.id ?? acc.lastContextId,
      };
    },
    { rows: [], lastContextId: null },
  ).rows;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm text-muted-foreground">{testPackage.jlptLevel}</p>
        <h1 className="text-xl font-semibold">{testPackage.name}</h1>
        <p className="text-sm text-muted-foreground">
          Mode baca — kunci jawaban dan penjelasan ditampilkan.
        </p>
      </div>

      <QuestionNavMobile
        items={navItems}
        activeId={selectedItem.id}
        buildHref={(itemId) => `/test-package/${testPackage.id}/questions?mondai=${itemId}`}
      />

      <div className="flex items-start gap-4">
        <QuestionNavSidebar
          items={navItems}
          activeId={selectedItem.id}
          buildHref={(itemId) => `/test-package/${testPackage.id}/questions?mondai=${itemId}`}
        />

        <div className="min-w-0 flex-1 space-y-4">
          <FuriganaScope>
            <Card>
              <CardHeader>
                <CardTitle>
                  Sesi {selectedItem.session} · {mondaiTypeFullLabel(selectedItem.mondaiType)}
                </CardTitle>
                {selectedItem.instruction && (
                  <CardDescription>
                    <JapaneseText text={selectedItem.instruction} />
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="flex flex-col gap-6">
                {questionRows.length === 0 && (
                  <p className="text-sm text-muted-foreground">Belum ada soal.</p>
                )}

                {questionRows.map(({ question, showContext }) => (
                  <div
                    key={question.id}
                    className="flex flex-col gap-3 border-t pt-4 first:border-t-0 first:pt-0"
                  >
                    {showContext && question.questionContext && (
                      <div className="rounded-lg bg-muted/50 p-3 text-sm">
                        {question.questionContext.storyText && (
                          <JapanesePassage text={question.questionContext.storyText} />
                        )}
                        {question.questionContext.storyImage && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={question.questionContext.storyImage}
                            alt=""
                            className="mt-2 max-w-full rounded-md"
                          />
                        )}
                        {question.questionContext.storyAudio && (
                          <audio
                            controls
                            src={question.questionContext.storyAudio}
                            className="mt-2 w-full"
                          />
                        )}
                      </div>
                    )}

                    <div className="flex items-start justify-between gap-2">
                      <div className="flex gap-2 text-sm">
                        <span className="font-medium text-muted-foreground">
                          {question.order}.
                        </span>
                        <div className="flex flex-col gap-2">
                          {question.questionText && (
                            <JapaneseText text={question.questionText} />
                          )}
                          {question.questionImage && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={question.questionImage}
                              alt=""
                              className="max-w-full rounded-md"
                            />
                          )}
                          {question.questionAudio && (
                            <audio controls src={question.questionAudio} className="w-full" />
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <CopyQuestionButton
                          contextText={question.questionContext?.storyText}
                          questionOrder={question.order}
                          questionText={question.questionText}
                          choices={question.questionChoices}
                        />
                      </div>
                    </div>

                    <ul className="flex flex-col gap-1 text-sm">
                      {question.questionChoices.map((choice) => (
                        <li
                          key={choice.id}
                          className={cn(
                            "flex items-start gap-2 rounded-md px-2 py-1",
                            choice.codeAnswer === question.questionAnswer &&
                              "bg-primary/10 font-medium text-primary",
                          )}
                        >
                          <span>{choice.codeAnswer}.</span>
                          <span className="flex flex-col gap-1">
                            {choice.answerText && <JapaneseText text={choice.answerText} />}
                            {choice.answerImage && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={choice.answerImage}
                                alt=""
                                className="max-w-40 rounded-md"
                              />
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>

                    {question.explanation && (
                      <p className="rounded-md bg-muted/50 p-2 text-sm text-muted-foreground">
                        <JapaneseText text={question.explanation} />
                      </p>
                    )}

                    <div className="flex flex-col gap-3">
                      {question.questionComments.length > 0 && (
                        <div className="flex flex-col gap-3">
                          <span className="text-xs font-medium text-muted-foreground">
                            Catatan Belajar
                          </span>
                          {question.questionComments.map((comment) => (
                            <CommentItem key={comment.id} comment={comment} />
                          ))}
                        </div>
                      )}
                      <QuestionCommentForm questionId={question.id} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </FuriganaScope>

          <div className="flex items-center justify-between">
            {prevItem ? (
              <Button
                variant="outline"
                nativeButton={false}
                render={
                  <Link href={`/test-package/${testPackage.id}/questions?mondai=${prevItem.id}`} />
                }
              >
                ← Mondai Sebelumnya
              </Button>
            ) : (
              <Button variant="outline" disabled>
                ← Mondai Sebelumnya
              </Button>
            )}
            {nextItem ? (
              <Button
                variant="outline"
                nativeButton={false}
                render={
                  <Link href={`/test-package/${testPackage.id}/questions?mondai=${nextItem.id}`} />
                }
              >
                Mondai Selanjutnya →
              </Button>
            ) : (
              <Button variant="outline" disabled>
                Mondai Selanjutnya →
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
