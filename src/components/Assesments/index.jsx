import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { WelcomeMessage, CompletionMessage } from "./stepper-messages";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@material-tailwind/react";
import { useSharePoint } from "@/hooks/useSharePoint";

const Stepper = ({ courseAssessment, courseTitle, user, courseId }) => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showWelcomeScreen, setShowWelcomeScreen] = useState(true);
  const [showCompletionMessage, setShowCompletionMessage] = useState(false);
  const [assessmentResults, setAssessmentResults] = useState(null);
  const [enrollmentStatus, setEnrollmentStatus] = useState({
    loading: false,
    success: false,
    message: "",
  });

  const navigate = useNavigate();
  const { courseEnrollment } = useSharePoint();

  const handleStartAssessment = () => {
    setShowWelcomeScreen(false);
  };

  const handleAnswer = (questionId, selected) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: selected,
    }));
  };

  const isStepComplete = (stepIndex) => {
    return answers[courseAssessment[stepIndex]?.id] !== undefined;
  };

  const handlePrevious = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleNext = () => {
    if (step < courseAssessment.length - 1 && isStepComplete(step)) {
      setStep(step + 1);
    } else if (step === courseAssessment.length - 1 && isStepComplete(step)) {
      // Save the assessment results and show completion message
      saveAssessmentResults();
      setShowCompletionMessage(true);
    }
  };

  // Save assessment results
  const saveAssessmentResults = () => {
    const results = {
      answers: answers,
      scoreDetails: calculateScore(),
      completedAt: new Date().toISOString(),
    };

    // Store assessment results in state and localStorage for persistence
    setAssessmentResults(results);
    localStorage.setItem(
      `assessment_${courseId}_${user?.id}`,
      JSON.stringify(results)
    );

    return results;
  };

  // Calculate the assessment score
  const calculateScore = () => {
    let correctAnswers = 0;
    let totalQuestions = courseAssessment.length;

    courseAssessment.forEach((question) => {
      if (answers[question.id] === question.correctAnswer) {
        correctAnswers++;
      }
    });

    return {
      score: Math.round((correctAnswers / totalQuestions) * 100),
      correctAnswers,
      totalQuestions,
    };
  };

  const handleStartCourse = async () => {
    setEnrollmentStatus({ loading: true, success: false, message: "" });

    try {
      // Prepare enrollment data
      const enrollmentData = {
        Title: `${user?.displayName} - ${courseTitle}`,
        CourseId: parseInt(courseId), // Use CourseId for lookup field
        Progress: "0", // Starting progress
        CurrentLesson: 1, // Starting with lesson 1
        CompletionDate: null, // Will be set when course is completed
        Notes: `Assessment completed with score: ${
          assessmentResults?.scoreDetails?.score || calculateScore().score
        }%`,
        ExamGrades:
          assessmentResults?.scoreDetails?.score?.toString() ||
          calculateScore().score.toString(),
        Assessment: JSON.stringify(
          assessmentResults || {
            answers: answers,
            scoreDetails: calculateScore(),
            completedAt: new Date().toISOString(),
          }
        ),
        QuizAnswers: JSON.stringify(answers),
      };

      // Call the enrollment function
      await courseEnrollment(enrollmentData);

      setEnrollmentStatus({
        loading: false,
        success: true,
        message: "Successfully enrolled in the course!",
      });

      // Optional: Navigate to course page after a short delay
      setTimeout(() => {
        navigate(`/home/academy/course/${courseId}/start`); // Adjust the route as needed
      }, 2000);
    } catch (error) {
      console.error("Error enrolling in course:", error);
      setEnrollmentStatus({
        loading: false,
        success: false,
        message: "Failed to enroll in the course. Please try again.",
      });
    }
  };
  // If showing welcome screen, render only that
  if (showWelcomeScreen) {
    return (
      <div className="text-black flex flex-col min-h-[60vh]">
        <WelcomeMessage
          courseTitle={courseTitle}
          onStartAssessment={handleStartAssessment}
        />
      </div>
    );
  }

  // If showing completion message, render that instead of the stepper
  if (showCompletionMessage) {
    const scoreDetails = assessmentResults
      ? assessmentResults.scoreDetails
      : calculateScore();

    return (
      <div className="text-black flex flex-col min-h-[60vh]">
        <CompletionMessage
          courseTitle={courseTitle}
          onStartCourse={handleStartCourse}
          score={scoreDetails.score}
          correctAnswers={scoreDetails.correctAnswers}
          totalQuestions={scoreDetails.totalQuestions}
          enrollmentStatus={enrollmentStatus}
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
            {courseAssessment[step]?.question}
          </h2>

          <div className="mt-8">
            <ol className="mt-20 flex flex-col gap-5 list-[lower-alpha] w-full">
              {courseAssessment[step]?.options?.map((option) => (
                <li key={option} className="min-w-full">
                  <button
                    key={option}
                    onClick={() =>
                      handleAnswer(courseAssessment[step]?.id, option)
                    }
                    className={`text-start px-4 py-2 w-full transition ${
                      answers[courseAssessment[step]?.id] === option
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
          className={`rounded-lg bg-primary text-white gap-2 flex items-center ${
            step === 0
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-primary text-white hover:bg-accent"
          }`}
          disabled={step === 0}
          onClick={handlePrevious}
        >
          <ChevronLeft size={20} strokeWidth={1.25} />
          Previous
        </Button>

        {step === (courseAssessment?.length || 1) - 1 ? (
          <Button
            className={`rounded-lg bg-primary text-white gap-2 flex items-center ${
              !isStepComplete(step)
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-primary text-white hover:bg-accent"
            }`}
            disabled={!isStepComplete(step)}
            onClick={handleNext}
          >
            Complete
          </Button>
        ) : (
          <Button
            className={`rounded-lg bg-primary text-white gap-2 flex items-center ${
              !isStepComplete(step)
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-primary text-white hover:bg-accent"
            }`}
            disabled={!isStepComplete(step)}
            onClick={handleNext}
          >
            Next
            <ChevronRight size={20} strokeWidth={1.25} />
          </Button>
        )}
      </div>
    </div>
  );
};

export default Stepper;
