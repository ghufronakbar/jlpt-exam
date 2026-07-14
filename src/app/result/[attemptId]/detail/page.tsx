import { notFound } from "next/navigation";
import { getAttemptDetail } from "@/features/result/actions";
import { QuestionCommentForm } from "@/features/result/components/question-comment-form";
import { JapaneseText } from "@/components/japanese-text";
import { MONDAI_TYPE_LABELS } from "@/constants/jlpt";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default async function ResultDetailPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  const attemptIdNum = Number(attemptId);

  if (!Number.isInteger(attemptIdNum)) {
    notFound();
  }

  const { attempt, testPackageItems } = await getAttemptDetail(attemptIdNum);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-muted-foreground">{attempt.testPackage.jlptLevel}</p>
        <h1 className="text-xl font-semibold">{attempt.testPackage.name} — Review</h1>
      </div>

      {testPackageItems.map((item) => {
        let lastContextId: number | null = null;

        return (
          <Card key={item.id}>
            <CardHeader>
              <CardTitle>
                Sesi {item.session} · {MONDAI_TYPE_LABELS[item.mondaiType]}
              </CardTitle>
              {item.instruction && (
                <CardDescription>
                  <JapaneseText text={item.instruction} />
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              {item.questions.map((question) => {
                const userAnswer = question.attemptAnswers[0] ?? null;
                const showContext =
                  question.questionContext && question.questionContext.id !== lastContextId;
                lastContextId = question.questionContext?.id ?? lastContextId;
                const hideFurigana = item.mondaiType === "MOJI_GOI_READ_KANJI";

                return (
                  <div
                    key={question.id}
                    className="flex flex-col gap-3 border-t pt-4 first:border-t-0 first:pt-0"
                  >
                    {showContext && question.questionContext && (
                      <div className="rounded-lg bg-muted/50 p-3 text-sm">
                        {question.questionContext.storyText && (
                          <JapaneseText text={question.questionContext.storyText} />
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
                            <JapaneseText
                              text={question.questionText}
                              hideFuriganaInUnderline={hideFurigana}
                            />
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
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={choice.answerImage}
                                  alt=""
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

                    <div className="flex flex-col gap-2">
                      {question.questionComments.length > 0 && (
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-muted-foreground">
                            Catatan Belajar
                          </span>
                          {question.questionComments.map((comment) => (
                            <p key={comment.id} className="text-sm">
                              {comment.commentText}
                            </p>
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
        );
      })}
    </div>
  );
}
