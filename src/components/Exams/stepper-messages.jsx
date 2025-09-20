import React, { useCallback, useEffect, useState } from "react";
import { Button } from "@material-tailwind/react";
import { useTranslation } from "react-i18next";
import CourseRating from "@/pages/Academy/CourseRating";
import { useSharePoint } from "@/hooks/useSharePoint";

export const WelcomeMessage = ({ courseTitle, onStart }) => {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <h2 className="text-2xl font-bold mb-4">
        {t('courses.exams.messages.welcome')}{" "}{courseTitle}
      </h2>
      <p className="mb-8 text-gray-700">
        {t('courses.exams.messages.getStarted')}!
      </p>
      <Button
        onClick={onStart}
        className="rounded-lg bg-primary-500 text-white px-6 py-3 hover:bg-accent"
      >
        {t('courses.exams.messages.startExam')}
      </Button>
    </div>
  );
};

export const CompletionMessage = ({
  examTitle,
  course,
  scoreDetails,
  onDone = () => {}
}) => {
  const { t } = useTranslation()
  const [isDone, setIsDone] = useState(false)
  const { getUserRating } = useSharePoint();
  const [userRating, setUserRating] = useState(0);
  const [loading, setLoading] = useState(false);

  const {
    score,
    correctAnswers,
    totalQuestions,
    passingScore
  } = scoreDetails;

  const handleRating = useCallback(async () => {
    setIsDone(true)
  }, []);

  useEffect(() => {
    if (!course?.Id) return;
    setLoading(true)

    !userRating && getUserRating(course?.Id)
      .then(entry => {
        setUserRating(entry?.Rating ?? 0)
        setIsDone(true)
      })

    setLoading(false)
  }, [course, userRating, getUserRating]);

  console.log({userRating})

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <h2 className="text-2xl font-bold mb-4">
        {examTitle} {t('courses.exams.messages.complete')}!
      </h2>

      <div className="bg-gray-50 p-6 rounded-lg shadow-sm mb-6 w-full max-w-md">
        <h3 className="text-xl font-medium mb-4">
          {t('courses.exams.messages.yourResults')}:
        </h3>
        <div className="flex justify-between items-center mb-2">
          <span>
            {t('courses.exams.messages.yourScore')}:
          </span>
          <span className="font-bold">{score}%</span>
        </div>
        <div className="flex justify-between items-center">
          <span>
            {t('courses.exams.messages.questions')}:
          </span>
          <span>
            {correctAnswers} {t('courses.exams.messages.correct')} {totalQuestions}
          </span>
        </div>
      </div>

      <p className="my-2">
        {t('courses.exams.messages.passingScore', { score: passingScore })}
      </p>

      <p className="mb-8 text-gray-700">
        {t('courses.exams.messages.thankYou')}{" "}
        <strong>{course?.Title}</strong>
      </p>

      {/* COURSE RATING */}
      <div className="my-4">
        <p className="my-4">{t('courses.rateCourse')}</p>
        <CourseRating
          key={userRating}
          courseId={course?.Id}
          initialRating={userRating}
          onRating={handleRating}
          loading={loading}
        />
      </div>

      {/* DONE WITH EXAM FLOW */}
      {isDone && <Button
        onClick={() => {
          onDone?.();
        }}
        className="rounded-lg bg-primary-500 text-white px-6 py-3 my-6 hover:bg-accent"
      >
        {t('courses.exams.messages.examComplete')}
      </Button>}
    </div>
  );
};
