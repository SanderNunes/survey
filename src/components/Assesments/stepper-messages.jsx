import React from "react";
import { Button } from "@material-tailwind/react";
import { Check, X, Loader2 } from "lucide-react";

export const WelcomeMessage = ({ courseTitle, onStartAssessment }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <h2 className="text-2xl font-bold mb-4">Welcome to {courseTitle}</h2>
      <p className="mb-8 text-gray-700">
        Before you start the course, we'd like you to take a brief assessment to
        gauge your current knowledge level. This will help personalize your
        learning experience.
      </p>
      <Button
        onClick={onStartAssessment}
        className="rounded-lg bg-primary-500 text-white px-6 py-3 hover:bg-accent"
      >
        Start Assessment
      </Button>
    </div>
  );
};

export const CompletionMessage = ({
  courseTitle,
  onStartCourse,
  enrollmentStatus,
}) => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <h2 className="text-2xl font-bold mb-4">Assessment Complete!</h2>

      <p className="mb-8 text-gray-700">
        Thank you for completing the assessment for{" "}
        <strong>{courseTitle}</strong>. You're now ready to start the course!
      </p>

      {enrollmentStatus.loading ? (
        <Button
          disabled
          className="rounded-lg bg-gray-200 text-gray-600 px-6 py-3 flex items-center gap-2"
        >
          <Loader2 size={20} className="animate-spin" />
          Enrolling...
        </Button>
      ) : enrollmentStatus.success ? (
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2 text-green-600 mb-4">
            <Check size={24} />
            <span>{enrollmentStatus.message}</span>
          </div>
          <p className="text-sm text-gray-600">Redirecting to course...</p>
        </div>
      ) : enrollmentStatus.message ? (
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2 text-red-600 mb-4">
            <X size={24} />
            <span>{enrollmentStatus.message}</span>
          </div>
          <Button
            onClick={onStartCourse}
            className="rounded-lg bg-primary-500 text-white px-6 py-3 hover:bg-accent"
          >
            Try Again
          </Button>
        </div>
      ) : (
        <Button
          onClick={onStartCourse}
          className="rounded-lg bg-primary-500 text-white px-6 py-3 hover:bg-accent"
        >
          Start Course
        </Button>
      )}
    </div>
  );
};
