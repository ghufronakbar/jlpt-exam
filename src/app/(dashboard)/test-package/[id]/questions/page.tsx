import { notFound } from "next/navigation";
import { getTestPackageQuestions } from "@/features/test-package/actions";
import { JapaneseText } from "@/components/japanese-text";
import { JapanesePassage } from "@/components/japanese-passage";
import { MONDAI_TYPE_LABELS } from "@/constants/jlpt";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default async function TestPackageQuestionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const testPackageId = Number(id);

  if (!Number.isInteger(testPackageId)) {
    notFound();
  }

  const testPackage = await getTestPackageQuestions(testPackageId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-muted-foreground">{testPackage.jlptLevel}</p>
        <h1 className="text-xl font-semibold">{testPackage.name}</h1>
        <p className="text-sm text-muted-foreground">
          Mode baca — semua soal beserta kunci jawaban dan penjelasan ditampilkan.
        </p>
      </div>

      {testPackage.testPackageItems.map((item) => {
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
              {item.questions.length === 0 && (
                <p className="text-sm text-muted-foreground">Belum ada soal.</p>
              )}

              {item.questions.map((question) => {
                const showContext =
                  question.questionContext && question.questionContext.id !== lastContextId;
                lastContextId = question.questionContext?.id ?? lastContextId;

                return (
                  <div key={question.id} className="flex flex-col gap-3 border-t pt-4 first:border-t-0 first:pt-0">
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

                    <div className="flex gap-2 text-sm">
                      <span className="font-medium text-muted-foreground">
                        {question.order}.
                      </span>
                      <div className="flex flex-col gap-2">
                        {question.questionText && (
                          <JapaneseText
                            text={question.questionText}
                            hideFuriganaInUnderline={item.mondaiType === "MOJI_GOI_READ_KANJI"}
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

                        <ul className="flex flex-col gap-1">
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
                      </div>
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
