import React, { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import AcademyLayout from "@/layouts/Academy";
import { Award, ChevronLeft } from "lucide-react";
import { Checkbox, Typography, Tabs } from "@material-tailwind/react";
import { Dialog, Button, IconButton } from "@material-tailwind/react";
import { X } from "lucide-react";
import { useSharePoint } from "@/hooks/useSharePoint";
import { ExamView } from "./ExamView";
import { orderBy, processCourseData, processEnrollmentData, processCourseLesson, processCourseExam } from "./helpers";
import { useTranslation } from 'react-i18next'; // Add this import

const lessonStatus = {
  completed: 'completed',
  initial: 'not-started'
};

function TakeExamDialog({
  disabled = false,
  exam
}) {
  const { t } = useTranslation();

  return (
    <Dialog size={'md'}>
      <Dialog.Trigger
        className="bg-primary-500 text-white gap-2 flex items-center p-2 w-40 text-lg transition delay-150 duration-300 ease-in-out hover:-translate-y-1 hover:scale-100"
        as={Button}
        disabled={disabled}
      >
        {t('courses.actions.takeExam')}
      </Dialog.Trigger>
      <Dialog.Overlay>
        <Dialog.Content>
          <div className="flex items-center justify-between gap-4 ">
            <Typography type="h6">
              {t('courses.messages.lessonsComplete')}
            </Typography>
            <Dialog.DismissTrigger
              as={IconButton}
              size="sm"
              variant="ghost"
              isCircular
              color="secondary"
              className="absolute right-2 top-2"
            >
              <X className="h-5 w-5" />
            </Dialog.DismissTrigger>
          </div>

          <Typography type="p" className="my-6">
            {t('courses.messages.startExam')}
          </Typography>
          <section className="flex items-center justify-end gap-2">
            <ExamView exam={exam} />
          </section>
        </Dialog.Content>
      </Dialog.Overlay>
    </Dialog>
  );
}

const siteBaseUrl = "https://africellcloud.sharepoint.com/sites/KnowledgeBase";

const CourseView = () => {
  const { t } = useTranslation();
  const { courseId } = useParams();
  const navigate = useNavigate();
  const location = useLocation(); // Add this hook
  const { getCourseById, getCourseLessons, getCourseEnrollment, updateEnrollment, getFiles, getCourseExam } = useSharePoint();
  const [loading, setLoading] = useState(!location.state?.courseData);
  const [error, setError] = useState(null);

  const [courseData, setCourseData] = useState(() => {
    const passedCourse = location.state?.courseData;
    if (passedCourse) {
      return passedCourse;
    }
    return null;
  });

  const [, setMedia] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [enrollment, setEnrollment] = useState({
    CurrentLessonId: null,
    CompletedLessons: []
  });

  const [openExamDialog, setOpenExamDialog] = useState(false);
  const [completedLessons, setCompletedLessons] = useState(enrollment.CompletedLessons);
  const [exam, setExam] = useState(null);

  const [content, setContent] = useState(null);
  const [contentLink, setContentLink] = useState(null);

  useEffect(() => {
    if (courseId) {
      getCourseLessons(courseId)
        .then(lessons => {
          const ordered = orderBy('Order', lessons);
          setLessons(ordered);
        })
        .catch(setLessons)
    }
  }, [getCourseLessons, courseId]);

  useEffect(() => {
    if (courseId) {
      getCourseExam(courseId)
        .then(data => {
          if (data) {
            const proc = processCourseExam(data);
            setExam(proc);
          }
        });
    }
  }, [getCourseExam, courseId]);

  useEffect(() => {
    getCourseEnrollment(courseId)
      .then(data => {
        const proc = processEnrollmentData(data);
        setCompletedLessons(proc?.CompletedLessons);
        setEnrollment(proc);
      });
  }, [getCourseEnrollment, courseId]);

  useEffect(() => {
    getFiles(siteBaseUrl, 'CoursesFolder')
      .then(data => {
        setMedia(data);
      });
  }, [getFiles]);

  useEffect(() => {
    const fetchCourseDetails = async () => {
      if (!courseId) {
        setError("Course ID is missing");
        return;
      }

      try {
        setLoading(true);
        const course = await getCourseById(siteBaseUrl, "CoursesList", Number(courseId));

        if (course) {

          const processedCourse = processCourseData(course._original);
          setCourseData(processedCourse);
        } else {
          setError("Course not found");
        }
      } catch (err) {
        console.error("Failed to fetch course details:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (!courseData && courseId) {
      fetchCourseDetails();
    } else if (courseData && typeof courseData.LearningOutcomes === "string") {
      const processedCourse = processCourseData(courseData);
      setCourseData(processedCourse);
    }
  }, [courseId, getCourseById, getCourseLessons, courseData, getCourseEnrollment]);

  const handleLessonTick = useCallback((lesson) => {
    if (lesson._status === lessonStatus.initial) {
      setLessons(
        lessons?.map((item) => {
          if (item.Id === lesson.Id)
            lesson._status = lessonStatus.completed;
          return item;
        })
      );
    }

    const meta = { Id: lesson.Id, Title: lesson.Title };

    // if this lessons isn't already ticked
    if (!enrollment?.CompletedLessons?.find(i => i.Id === lesson.Id)) {
      updateEnrollment(enrollment.Id, {
        CurrentLessonId: lesson.Id,
        CompletedLessons: enrollment?.CompletedLessons && Array.isArray(enrollment.CompletedLessons)
          ? JSON.stringify(enrollment.CompletedLessons.concat([meta]))
          : JSON.stringify([meta])
      }, courseId)
        .then(updated => {
          const proc = processEnrollmentData(updated);
          setCompletedLessons(proc?.CompletedLessons);
          setEnrollment(proc);
        });
    }
  }, [enrollment, lessons, updateEnrollment, courseId]);

  useEffect(() => {
    const completed = completedLessons && completedLessons.length > 0 ?
      ((completedLessons || [])?.length === (lessons || [])?.length) || false
      : false;

    setOpenExamDialog(completed);
  }, [lessons, completedLessons]);

  // Add loading state
  if (loading) {
    return (
      <AcademyLayout>
        <div className="min-h-screen">
          <div className="container mx-auto p-4">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden max-w-7xl mx-auto p-6">
              <h2 className="text-xl">Loading course...</h2>
            </div>
          </div>
        </div>
      </AcademyLayout>
    );
  }

  // Add error state
  if (error) {
    return (
      <AcademyLayout>
        <div className="min-h-screen">
          <div className="container mx-auto p-4">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden max-w-7xl mx-auto p-6">
              <h2 className="text-xl text-red-600">Error: {error}</h2>
              <button
                onClick={() => navigate(-1)}
                className="mt-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                {t('courses.actions.goBack')}
              </button>
            </div>
          </div>
        </div>
      </AcademyLayout>
    );
  }

  if (!courseData) {
    return (
      <AcademyLayout>
        <div className="min-h-screen">
          <div className="container mx-auto p-4">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden max-w-7xl mx-auto p-6">
              <h2 className="text-xl text-red-600">Course not found.</h2>
              <button
                onClick={() => navigate(-1)}
                className="mt-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                {t('courses.actions.goBack')}
              </button>
            </div>
          </div>
        </div>
      </AcademyLayout>
    );
  }

  // Calculate progress percentage
  const totalLessons = lessons?.length || 0;
  const nCompletedLessons = (completedLessons || []).length;

  const progressPercentage = ((nCompletedLessons / totalLessons) || 0) * 100;

  // For the circular progress indicator
  const size = 80;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  const dashoffset = circumference - (progressPercentage / 100) * circumference;

  return (
    <AcademyLayout>
      <div className="flex flex-col md:flex-row min-h-screen mb-12">
        {/* Main Content */}
        <div className="flex-grow">
          <div className="bg-white overflow-hidden max-w-7xl mx-auto py-4">
            {/* Header */}
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-gray-500 hover:text-primary-500"
            >
              <ChevronLeft size={30} strokeWidth={1.25} />
              {t('courses.actions.goBack')}
            </button>
            <div className="flex items-center justify-between mb-4 p-4 border-b">
              <h2 className="text-2xl font-bold">{courseData.Title}</h2>
              {/* Circular Progress Bar */}
              <div className="flex flex-col-2 gap-4 items-center ">
                <div className="relative w-12 h-12">
                  <svg
                    className="w-full h-full"
                    viewBox={`0 0 ${size} ${size}`}
                  >
                    {/* Background circle */}
                    <circle
                      className="text-gray-200"
                      strokeWidth={strokeWidth}
                      stroke="currentColor"
                      fill="transparent"
                      r={radius}
                      cx={size / 2}
                      cy={size / 2}
                    />
                    {/* Progress circle */}
                    <circle
                      className="text-accent rounded-xl"
                      strokeWidth={strokeWidth}
                      strokeDasharray={circumference}
                      strokeDashoffset={dashoffset}
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="transparent"
                      r={radius}
                      cx={size / 2}
                      cy={size / 2}
                      transform={`rotate(-90 ${size / 2} ${size / 2})`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-accent">
                      <Award size={26} strokeWidth={0.8} />
                    </span>
                  </div>
                </div>
                <div>
                  <span className="font-bold">
                    {progressPercentage.toFixed(0)}%
                  </span>
                  <p className="text-sm text-gray-500">
                    {`${completedLessons?.length || 0}/${totalLessons} ${t('courses.messages.courseProgress')}`}
                  </p>
                </div>
              </div>
            </div>

            {/* Video Player and Lessons */}
            <div className="flex flex-col md:flex-row gap-4 h-[50vh]">
              {/* Video Player */}
              <div className="relative aspect-video bg-black overflow-hidden mt-4 md:w-2/3">
                {contentLink ? <iframe
                  src={contentLink}
                  title={courseData?.Title}
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                ></iframe>
                : <img
                  src={courseData?.ContentLink?.Url + '/cover.jpeg'}
                  title={`${courseData.Title} Preview`}
                  className="w-full h-full"
                />
                }
              </div>

              {/* Lessons Progress */}
              <div className="md:w-1/3 text-left p-4 overflow-y-scroll no-scrollbar">
                <div className="flex flex-col space-y-1">
                  {Array.isArray(lessons) && lessons?.map((item, index) => {
                    const lesson = processCourseLesson(item);
                    const params = new URLSearchParams(window.location.search)
                    const lessonId = Number(params.get('lesson'))

                    return (
                      <div
                        key={lesson.Id + index}
                        data-active={lessonId === lesson.Id}
                        className="flex flex-col justify-between rounded-md hover:bg-[#fceaf8] focus:bg-[#fceaf8] data-[active=true]:bg-[#fceaf8] py-5 px-4"
                      >
                        {/* Lesson Details */}

                        {/* Checkbox */}
                        <div className="flex flex-1 items-center justify-between gap-2">
                          <Typography
                            as="button"
                            htmlFor={`lesson-${lesson.Id}-checkbox`}
                            className="cursor-pointer text-foreground hover:font-semibold focus:font-semibold"
                            onClick={() => {
                              setContent(lesson);
                              setContentLink(lesson?.ContentLink?.Url || '');
                              const params = new URLSearchParams(location.search);
                              params.set('lesson', lesson.Id);
                              history.pushState({}, '', `${location.pathname}?${params.toString()}`);
                            }}
                          >
                            {lesson.Title}
                          </Typography>

                          <Checkbox
                            key={completedLessons?.length}
                            id={lesson.Id}
                            color="blue" // default Material Tailwind color
                            checked={!!completedLessons?.find(i => i.Id === lesson.Id)}
                            disabled={!!completedLessons?.find(i => i.Id === lesson.Id)}
                            onClick={() => handleLessonTick(lesson)}
                            className="h-6 w-6 rounded-md border border-primary text-primary data-[checked]:border-primary data-[checked]:bg-white"
                          >
                            <Checkbox.Indicator>
                              {/* Custom SVG with rounded background and primary checkmark */}
                              <div className="flex items-center justify-center w-full h-full rounded-lg p-1">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-4 w-4 text-primary"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </div>
                            </Checkbox.Indicator>
                          </Checkbox>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-8 p-4 border-t">
              <div>
                <div className="py-4 text-2xl">
                  {content?.Title}
                </div>
                {content?.Duration && <p className="text-sm">
                  {t('courses.metadata.duration')}:{" "}{content?.Duration}
                </p>}
              </div>

              {openExamDialog && exam && <TakeExamDialog
                disabled={!openExamDialog}
                exam={exam}
              />}
            </div>

            {content?.Chapters && !!content?.Chapters?.length && <div className="flex flex-col p-4 border-t">
              <p className="my-2 text-md font-semibold">
                {t('courses.messages.chapters')}
              </p>
              <div className="py-1 text-sm space-y-2">
                {content?.Chapters?.map?.((chapter, index) =>
                  <p key={`CONTENT-CHAPTER-${index}`}>
                  {chapter}
                </p>)}
              </div>
            </div>}
          </div>
        </div>
      </div>
    </AcademyLayout>
  );
};

export default CourseView;
