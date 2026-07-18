import Link from "next/link";
import { notFound } from "next/navigation";
import { getAttemptDetail } from "@/features/result/actions";
import { QuestionCommentForm } from "@/features/result/components/question-comment-form";
import { CommentItem } from "@/features/result/components/comment-item";
import { CopyQuestionButton } from "@/features/result/components/copy-question-button";
import { DetailSidebarNav, type NavMondaiItem } from "@/features/result/components/detail-nav";
import { DetailMobileNav } from "@/features/result/components/detail-mobile-nav";
import { JapaneseText } from "@/components/japanese-text";
import { JapanesePassage } from "@/components/japanese-passage";
import { ImageWithLightbox } from "@/components/image-with-lightbox";
import { MONDAI_TYPE_LABELS } from "@/constants/jlpt";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function ResultDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ attemptId: string }>;
  searchParams: Promise<{ mondai?: string }>;
}) {
  const { attemptId } = await params;
  const { mondai } = await searchParams;
  const attemptIdNum = Number(attemptId);

  if (!Number.isInteger(attemptIdNum)) {
    notFound();
  }

  const { attempt, testPackageItems } = await getAttemptDetail(attemptIdNum);

  if (testPackageItems.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">{attempt.testPackage.jlptLevel}</p>
        <h1 className="text-xl font-semibold">{attempt.testPackage.name} — Review</h1>
        <p className="text-sm text-muted-foreground">Belum ada soal untuk attempt ini.</p>
      </div>
    );
  }

  const navItems: NavMondaiItem[] = testPackageItems.map((item) => ({
    id: item.id,
    mondaiType: item.mondaiType,
    section: item.section,
    correctCount: item.questions.filter((q) => q.attemptAnswers[0]?.isCorrect).length,
    totalCount: item.questions.length,
  }));

  const requestedId = Number(mondai);
  const selectedItem =
    testPackageItems.find((item) => item.id === requestedId) ?? testPackageItems[0];
  const currentIndex = testPackageItems.findIndex((item) => item.id === selectedItem.id);
  const prevItem = currentIndex > 0 ? testPackageItems[currentIndex - 1] : null;
  const nextItem = currentIndex < testPackageItems.length - 1 ? testPackageItems[currentIndex + 1] : null;

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
        <p className="text-sm text-muted-foreground">{attempt.testPackage.jlptLevel}</p>
        <h1 className="text-xl font-semibold">{attempt.testPackage.name} — Review</h1>
      </div>

      <DetailMobileNav items={navItems} activeId={selectedItem.id} attemptId={attempt.id} />

      <div className="flex items-start gap-4">
        <DetailSidebarNav items={navItems} activeId={selectedItem.id} attemptId={attempt.id} />

        <div className="min-w-0 flex-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                Sesi {selectedItem.session} · {MONDAI_TYPE_LABELS[selectedItem.mondaiType]}
              </CardTitle>
              {selectedItem.instruction && (
                <CardDescription>
                  <JapaneseText text={selectedItem.instruction} />
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              {questionRows.map(({ question, showContext }) => {
                const userAnswer = question.attemptAnswers[0] ?? null;
                const hideFurigana = selectedItem.mondaiType === "MOJI_GOI_READ_KANJI";

                return (
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
                          <ImageWithLightbox
                            src={question.questionContext.storyImage}
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
                            <JapaneseText
                              text={question.questionText}
                              hideFuriganaInUnderline={hideFurigana}
                            />
                          )}
                          {question.questionImage && (
                            <ImageWithLightbox
                              src={question.questionImage}
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
                        {userAnswer && (
                          <Badge variant={userAnswer.isCorrect ? "default" : "destructive"}>
                            {userAnswer.isCorrect
                              ? "Benar"
                              : userAnswer.selectedAnswer === null
                                ? "Tidak Dijawab"
                                : "Salah"}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <ul className="flex flex-col gap-1 text-sm">
                      {question.questionChoices.map((choice) => {
                        const isCorrectChoice = choice.codeAnswer === question.questionAnswer;
                        const isUserChoice = choice.codeAnswer === userAnswer?.selectedAnswer;

                        return (
                          <li
                            key={choice.id}
                            className={cn(
                              "flex items-start gap-2 rounded-md px-2 py-1",
                              isCorrectChoice && "bg-primary/10 font-medium text-primary",
                              isUserChoice && !isCorrectChoice && "bg-destructive/10 text-destructive",
                            )}
                          >
                            <span>{choice.codeAnswer}.</span>
                            <span className="flex flex-col gap-1">
                              {choice.answerText && <JapaneseText text={choice.answerText} />}
                              {choice.answerImage && (
                                <ImageWithLightbox
                                  src={choice.answerImage}
                                  className="max-w-40 rounded-md"
                                />
                              )}
                            </span>
                            {isUserChoice && (
                              <span className="ml-auto text-xs text-muted-foreground">
                                jawabanmu
                              </span>
                            )}
                          </li>
                        );
                      })}
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
                );
              })}
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            {prevItem ? (
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link href={`/result/${attempt.id}/detail?mondai=${prevItem.id}`} />}
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
                render={<Link href={`/result/${attempt.id}/detail?mondai=${nextItem.id}`} />}
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
