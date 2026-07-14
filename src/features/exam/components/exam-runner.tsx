"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { MondaiType } from "@prisma/client";
import { useExam } from "./exam-provider";
import { submitExamSessionAction } from "../actions";
import { JapaneseText } from "@/components/japanese-text";
import { MONDAI_TYPE_LABELS } from "@/constants/jlpt";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { FlagIcon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type ExamQuestion = {
  id: number;
  order: number;
  questionText: string;
  questionImage: string | null;
  questionAudio: string | null;
  mondaiType: MondaiType;
  instruction: string | null;
  questionContext: {
    id: number;
    storyText: string | null;
    storyImage: string | null;
    storyAudio: string | null;
  } | null;
  questionChoices: {
    id: number;
    codeAnswer: number;
    answerText: string;
    answerImage: string | null;
  }[];
};

export function ExamRunner({
  attemptId,
  session,
  testPackageName,
  questions,
}: {
  attemptId: number;
  session: number;
  testPackageName: string;
  questions: ExamQuestion[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hydrated, getAnswer, setAnswer, toggleFlag } = useExam();
  const [isSubmitting, startTransition] = useTransition();

  const totalQuestions = questions.length;
  const answeredMap = useMemo(
    () => Object.fromEntries(questions.map((q) => [q.id, getAnswer(q.id)])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [questions, hydrated],
  );

  const rawQuestionNumber = Number(searchParams.get("questionNumber"));

  const currentIndex = useMemo(() => {
    if (
      Number.isInteger(rawQuestionNumber) &&
      rawQuestionNumber >= 1 &&
      rawQuestionNumber <= totalQuestions
    ) {
      return rawQuestionNumber - 1;
    }
    const firstUnanswered = questions.findIndex(
      (q) => answeredMap[q.id]?.selectedAnswer == null,
    );
    return firstUnanswered !== -1 ? firstUnanswered : 0;
  }, [rawQuestionNumber, totalQuestions, questions, answeredMap]);

  useEffect(() => {
    if (!hydrated) return;
    const validNumber = currentIndex + 1;
    if (rawQuestionNumber !== validNumber) {
      router.replace(`?questionNumber=${validNumber}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, currentIndex, rawQuestionNumber]);

  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!hydrated || totalQuestions === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
        {totalQuestions === 0 ? "Belum ada soal di sesi ini." : "Memuat..."}
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const answerState = getAnswer(currentQuestion.id);
  const hideFurigana = currentQuestion.mondaiType === "MOJI_GOI_READ_KANJI";

  function goToQuestion(index: number) {
    const clamped = Math.min(Math.max(index, 0), totalQuestions - 1);
    router.replace(`?questionNumber=${clamped + 1}`);
  }

  function handleSubmit() {
    startTransition(async () => {
      const payload = questions.map((q) => {
        const state = getAnswer(q.id);
        return {
          questionId: q.id,
          selectedAnswer: state.selectedAnswer,
          flagged: state.flagged,
        };
      });
      await submitExamSessionAction({ attemptId, session, answers: payload });
    });
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {testPackageName} — Sesi {session}
          </p>
          <h1 className="text-lg font-semibold">
            {MONDAI_TYPE_LABELS[currentQuestion.mondaiType]}
          </h1>
        </div>
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogTrigger render={<Button variant="destructive" disabled={isSubmitting} />}>
            Submit Sesi
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Submit sesi ini?</AlertDialogTitle>
              <AlertDialogDescription>
                Setelah disubmit, sesi ini tidak bisa dikerjakan ulang. Soal yang belum dijawab
                akan dihitung salah.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction disabled={isSubmitting} onClick={handleSubmit}>
                {isSubmitting ? "Mengirim..." : "Ya, Submit"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {currentQuestion.instruction && (
        <p className="text-sm text-muted-foreground">
          <JapaneseText text={currentQuestion.instruction} />
        </p>
      )}

      <div className="flex flex-col gap-4 rounded-lg border p-4">
        {currentQuestion.questionContext && (
          <div className="rounded-lg bg-muted/50 p-3 text-sm">
            {currentQuestion.questionContext.storyText && (
              <JapaneseText text={currentQuestion.questionContext.storyText} />
            )}
            {currentQuestion.questionContext.storyImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentQuestion.questionContext.storyImage}
                alt=""
                className="mt-2 max-w-full rounded-md"
              />
            )}
            {currentQuestion.questionContext.storyAudio && (
              <audio
                controls
                src={currentQuestion.questionContext.storyAudio}
                className="mt-2 w-full"
              />
            )}
          </div>
        )}

        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-1 flex-col gap-2 text-sm">
            <span className="font-medium text-muted-foreground">{currentQuestion.order}.</span>
            {currentQuestion.questionText && (
              <JapaneseText text={currentQuestion.questionText} hideFuriganaInUnderline={hideFurigana} />
            )}
            {currentQuestion.questionImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={currentQuestion.questionImage} alt="" className="max-w-full rounded-md" />
            )}
            {currentQuestion.questionAudio && (
              <audio controls src={currentQuestion.questionAudio} className="w-full" />
            )}
          </div>
          <Button
            variant={answerState.flagged ? "default" : "outline"}
            size="icon-sm"
            aria-label="Tandai ragu-ragu"
            onClick={() => toggleFlag(currentQuestion.id)}
          >
            <FlagIcon />
          </Button>
        </div>

        <RadioGroup
          value={answerState.selectedAnswer ? String(answerState.selectedAnswer) : ""}
          onValueChange={(value) => setAnswer(currentQuestion.id, Number(value))}
        >
          {currentQuestion.questionChoices.map((choice) => (
            <label
              key={choice.id}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm",
                answerState.selectedAnswer === choice.codeAnswer && "border-primary bg-primary/5",
              )}
            >
              <RadioGroupItem value={String(choice.codeAnswer)} className="mt-0.5" />
              <span className="flex flex-col gap-1">
                {choice.answerText && <JapaneseText text={choice.answerText} />}
                {choice.answerImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={choice.answerImage} alt="" className="max-w-40 rounded-md" />
                )}
              </span>
            </label>
          ))}
        </RadioGroup>
      </div>

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          disabled={currentIndex === 0}
          onClick={() => goToQuestion(currentIndex - 1)}
        >
          Sebelumnya
        </Button>
        <Button
          variant="outline"
          disabled={currentIndex === totalQuestions - 1}
          onClick={() => goToQuestion(currentIndex + 1)}
        >
          Selanjutnya
        </Button>
      </div>

      <div className="grid grid-cols-8 gap-2 sm:grid-cols-10">
        {questions.map((q, index) => {
          const state = getAnswer(q.id);
          return (
            <button
              key={q.id}
              type="button"
              onClick={() => goToQuestion(index)}
              className={cn(
                "relative flex h-8 items-center justify-center rounded-md border text-xs font-medium",
                index === currentIndex && "ring-2 ring-ring",
                state.selectedAnswer != null
                  ? "bg-primary/10 text-primary"
                  : "bg-background text-muted-foreground",
              )}
            >
              {q.order}
              {state.flagged && (
                <FlagIcon className="absolute -top-1.5 -right-1.5 size-3 fill-destructive text-destructive" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
