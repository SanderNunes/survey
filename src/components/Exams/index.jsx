import React, { useCallback, useEffect, useState } from "react";
import { WelcomeMessage, CompletionMessage } from "./stepper-messages";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@material-tailwind/react";
import { useSharePoint } from "@/hooks/useSharePoint";
import { shuffleList } from "@/pages/Academy/helpers";
import { useTranslation } from "react-i18next";

function compareStrings(a, b, options = { locale: 'en', sensitivity: 'base' }) {
  return a.localeCompare(b, options.locale, options) === 0;
}

const Stepper = ({ steps, user, course, enrollment, exam, onDone }) => {
  const { t } = useTranslation()
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showWelcomeScreen, setShowWelcomeScreen] = useState(true);
  const [showCompletionMessage, setShowCompletionMessage] = useState(false);
  const [results, setResults] = useState(null);
  const [stepOptions, setStepOptions] = useState([])

  const { updateEnrollment } = useSharePoint()

  useEffect(() => {
    if (steps[step]?.options && Array.isArray(steps[step]?.options)) {
      setStepOptions(shuffleList(steps[step].options))
    }
  }, [steps, step])

  const handleStart = () => {
    setShowWelcomeScreen(false);
  };

  const handleAnswer = (questionId, selected) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: selected,
    }));
  };

  const isStepComplete = (stepIndex) => {
    return answers[steps[stepIndex]?.id] !== undefined;
  };

  const handlePrevious = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleNext = () => {
    if (step < steps.length - 1 && isStepComplete(step)) {
      setStep(step + 1);
    } else if (step === steps.length - 1 && isStepComplete(step)) {
      // Save the results and show completion message
      saveResults();
      setShowCompletionMessage(true);
    }
  };

  // Save results
  const saveResults = () => {
    const results = {
      answers: answers,
      scoreDetails: calculateScore(),
      completedAt: new Date().toISOString(),
    };

    // Store results in state and localStorage for persistence
    setResults(results);
    localStorage.setItem(
      `exam_${course?.Id}_${user?.id}`,
      JSON.stringify(results)
    );

    return results;
  };

  // Calculate the score
  const calculateScore = () => {
    let correctAnswers = 0;
    let totalQuestions = exam?.TotalQuestions || steps.length;

    let correctScore = 0;
    const totalScore = steps.reduce((acc, step) => acc + Number(step.score || 1), 0);
    const passingScore = exam?.PassingScore || 0;

    steps.forEach((question) => {
      if (compareStrings(answers[question.id], question.correctAnswer)) {
        correctAnswers++;
        correctScore += Number(question.score || 1);
      }
    });

    return {
      score: Math.round((correctScore / totalScore) * 100),
      passingScore: Math.round((passingScore / totalScore) * 100),
      correctAnswers,
      totalQuestions
    };
  };

  const handleDone = useCallback(async () => {
    // Prepare data to update enrollment with
    const meta = {
      ExamGrades: results?.scoreDetails.score || 0,
      CompletionDate: `${Date.now()}`,
      Done: true
    };
    // update enrollment
    try {
      updateEnrollment(enrollment?.Id, meta, course?.Id);
      onDone?.();
    } catch {
      console.error('Failed saving exam grade');
    }
  }, [course, enrollment, updateEnrollment, onDone, results]);

  // If showing welcome screen, render only that
  if (showWelcomeScreen) {
    return (
      <div className="text-black flex flex-col min-h-[60vh]">
        <WelcomeMessage
          courseTitle={course?.Title}
          onStart={handleStart}
        />
      </div>
    );
  }

  // If showing completion message, render that instead of the stepper
  if (showCompletionMessage) {
    const scoreDetails = results
      ? results.scoreDetails
      : calculateScore();

    return (
      <div className="text-black flex flex-col min-h-[60vh]">
        <CompletionMessage
          examTitle={exam?.Title}
          course={course}
          scoreDetails={scoreDetails}
          onDone={handleDone}
        />
      </div>
    );
  }

  return (
    <div className="text-black flex flex-col min-h-[60vh] relative pb-20">
      <div className="flex-grow">
        {/* Current Step Content */}
        <div className="p-4 space-y-8 rounded-lg">
          <h2 className="text-2xl font-bold mb-6">
            <span className="mr-4">{step + 1}.</span>
            {steps[step]?.question}
          </h2>

          <div className="mt-8">
            <ol className="mt-20 flex flex-col gap-5 list-[lower-alpha] w-full">
              {stepOptions.map((option) => (
                <li key={option} className="min-w-full">
                  <button
                    onClick={() =>
                      handleAnswer(steps[step]?.id, option)
                    }
                    className={`text-start px-4 py-2 w-full transition ${
                      answers[steps[step]?.id] === option
                        ? "border-accent border-b text-primary"
                        : "hover:border-accent hover:border-b"
                    }`}
                  >
                  {option}
                </button>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="mt-6 flex justify-between p-4 rounded-md">
        <Button
          className={`rounded-lg bg-primary-500 text-white gap-2 flex items-center ${
            step === 0
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-primary-500 text-white hover:bg-accent"
          }`}
          disabled={step === 0}
          onClick={handlePrevious}
        >
          <ChevronLeft size={20} strokeWidth={1.25} />
          {t('courses.exams.actions.previous')}
        </Button>

        {step === (steps?.length || 1) - 1 ? (
          <Button
            className={`rounded-lg bg-primary-500 text-white gap-2 flex items-center ${
              !isStepComplete(step)
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-primary-500 text-white hover:bg-accent"
            }`}
            disabled={!isStepComplete(step)}
            onClick={handleNext}
          >
            {t('courses.exams.actions.complete')}
          </Button>
        ) : (
          <Button
            className={`rounded-lg bg-primary-500 text-white gap-2 flex items-center ${
              !isStepComplete(step)
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-primary-500 text-white hover:bg-accent"
            }`}
            disabled={!isStepComplete(step)}
            onClick={handleNext}
          >
            {t('courses.exams.actions.next')}
            <ChevronRight size={20} strokeWidth={1.25} />
          </Button>
        )}
      </div>
    </div>
  );
};

export default Stepper;
