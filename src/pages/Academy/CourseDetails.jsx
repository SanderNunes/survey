import React, { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import AcademyLayout from "@/layouts/Academy";
import { useSharePoint } from "@/hooks/useSharePoint";
import { useAuth } from "@/hooks/useAuth";
import Assessment from "@/components/Assesments";
import { useTranslation } from 'react-i18next'; // Add this import

import {
  Button,
  Dialog,
  IconButton,
  Typography,
} from "@material-tailwind/react";
import {
  BookOpen,
  ChevronLeft,
  Clock,
  PlayCircle,
  Trophy,
  X,
} from "lucide-react";
import ListCard from "@/components/ListCard/Index";
import { processCourseData } from "./helpers";
import { CourseMediaManager } from "./CourseMediaManager";

const CourseDetails = () => {
  const { t } = useTranslation(); // Add this hook
  const navigate = useNavigate();
  const { courseId } = useParams();
  const location = useLocation();
  const { 
    getCourseById, 
    getCourses, 
    getMyEnrollments, 
    enrollments, 
    getCourseAverageRating
  } = useSharePoint();

  const { userProfile } = useAuth();

  useEffect(() => {
    !enrollments && getMyEnrollments();
  }, [getCourses, getMyEnrollments, enrollments]);

  // Initialize courseData from location state if available
  const [courseData, setCourseData] = useState(() => {
    const passedCourse = location.state?.courseData;
    if (passedCourse) {
      return passedCourse;
    }
    return null;
  });

  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [loading, setLoading] = useState(!location.state?.courseData);
  const [error, setError] = useState(null);
  const [enrollmentLoading, setEnrollmentLoading] = useState(false);
  const [courseRating, setCourseRating] = useState(0)

  // Check if current user is enrolled in the selected course
  const checkEnrollmentStatus = useCallback(async () => {
    if (!enrollments || !courseId) {
      setIsEnrolled(false);
      return false;
    }

    setEnrollmentLoading(true);

    try {
      setEnrollmentLoading(true);
      const courseIdNum = parseInt(courseId);
      const courseEnrollment = enrollments.find((enrollment) => {
        const enrollmentCourseId =
          enrollment.CourseId || enrollment.courseId || enrollment.Course_Id;

        const courseMatch =
          enrollmentCourseId === courseIdNum || enrollmentCourseId === courseId;
        return courseMatch;
      });
      const enrolled = !!courseEnrollment;

      setIsDone(courseEnrollment?.Done);
      setIsEnrolled(enrolled);
      setEnrollmentLoading(false);

      return enrolled;
    } catch (error) {
      console.error("Error checking enrollment status:", error);
      setIsEnrolled(false);
      setEnrollmentLoading(false);

      return false;
    } finally {
      setEnrollmentLoading(false);
      setEnrollmentLoading(false);
    }
  }, [courseId, enrollments]);

  // Check enrollment status when enrollments data is available
  useEffect(() => {
    if (enrollments && courseId) {
      checkEnrollmentStatus();
    }
  }, [enrollments, courseId, checkEnrollmentStatus]);

  // If course data wasn't passed via navigation state, fetch it using the ID
  useEffect(() => {
    const fetchCourseDetails = async () => {
      if (!courseId) {
        setError(t('courses.details.missingId'));
        return;
      }

      try {
        setLoading(true);
        const course = await getCourseById(
          "https://africellcloud.sharepoint.com/sites/KnowledgeBase",
          "CoursesList",
          courseId
        );
        if (course) {
          const processedCourse = processCourseData(course);
          setCourseData(processedCourse);
        } else {
          setError(t('courses.details.notFound'));
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
      setCourseData(processCourseData(courseData));
    }
  }, [courseId, getCourseById, courseData, t]);

  useEffect(() => {
    if (!courseId) return;

    if (!courseRating) {
      getCourseAverageRating(courseId)
        .then(setCourseRating);
    }
  }, [courseId, courseRating, getCourseAverageRating]);

  const handleContinueCourse = (courseData) => {
    navigate(`start`, {
      state: {
        courseData: courseData,
        // You can also pass additional data if needed
        timestamp: Date.now(),
        source: "courses-list",
      },
    });
  };

  // Loading and error states with translations
  if (loading) {
    return (
      <AcademyLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Clock className="w-8 h-8 animate-spin mx-auto mb-4 text-primary-500" />
            <Typography variant="h6" className="text-gray-600">
              {t('courses.details.loading')}
            </Typography>
          </div>
        </div>
      </AcademyLayout>
    );
  }

  if (error) {
    return (
      <AcademyLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Typography variant="h6" className="text-red-600 mb-4">
              {t('courses.details.error')}: {error}
            </Typography>
            <Button
              onClick={() => navigate(-1)}
              className="bg-primary-500 text-white"
            >
              {t('courses.actions.goBack')}
            </Button>
          </div>
        </div>
      </AcademyLayout>
    );
  }

  if (!courseData) {
    return (
      <AcademyLayout>
        <div className="flex items-center justify-center py-12">
          <Typography variant="h6" className="text-gray-600">
            {t('courses.details.notFound')}
          </Typography>
        </div>
      </AcademyLayout>
    );
  }

  return (
    <>
      <div className="flex bg-gradient-to-b from-[#E0BBD4] via-[#e7d2e1] to-white min-h-[50vh] py-2 items-center justify-center">
        <div className="grid md:grid-cols-3 gap-10 items-center container">
          {/* Course Details */}
          <div className="col-span-2 w-full py-4 lg:w-[40vw] 2xl:w-[25vw]">
            <h1 className="text-3xl font-bold mb-4">{courseData.Title}</h1>
            <Typography
              type="p"
              className="text-gray-600 mb-6 w-[50vh]"
              dangerouslySetInnerHTML={{
                __html: courseData.Description
              }}
            />

            <div className="grid grid-cols-3 gap-1 mb-6">
              <div className="p-3 rounded flex items-center space-x-2">
                <Clock className="h-5 w-5 text-gray-600" />
                <div>
                  <span className="text-xs text-gray-500 block">
                    {t('courses.metadata.duration')}
                  </span>
                  <span className="block font-medium">{courseData.Duration}</span>
                </div>
              </div>
              <div className="p-3 rounded flex items-center space-x-2">
                <BookOpen className="h-5 w-5 text-gray-600" />
                <div>
                  <span className="text-xs text-gray-500 block">
                    {t('courses.metadata.level')}
                  </span>
                  <span className="block font-medium">{courseData.Level}</span>
                </div>
              </div>
              <div className="p-3 rounded flex items-center space-x-2">
                <Trophy className="h-5 w-5 text-gray-600" />
                <div>
                  <span className="text-xs text-gray-500 block">
                    {t('courses.metadata.rating')}
                  </span>
                  <span className="block font-medium">
                    {t('courses.metadata.ratingOutOf', { rating: courseRating })}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-10">
              <Button
                onClick={() => navigate(-1)}
                className="bg-transparent flex border border-primary-500 items-center text-primary-500"
                aria-label={t('courses.actions.goBack')}
              >
                <ChevronLeft size={20} strokeWidth={1.25} />
                {t('courses.actions.goBack')}
              </Button>

              {enrollmentLoading ? (
                <Button
                  disabled
                  className="bg-accent text-white gap-2 flex items-center cursor-not-allowed"
                >
                  <Clock
                    size={20}
                    strokeWidth={1.25}
                    className="flex-shrink-0 animate-spin"
                  />
                  {t('courses.actions.checkingEnrollment')}
                </Button>
              ) : isEnrolled ? (
                <Button
                  onClick={() => handleContinueCourse(courseData)}
                  className="bg-primary-500 text-white gap-2 flex items-center"
                  aria-label={isDone ? t('courses.actions.reviewCourse') : t('courses.actions.continueCourse')}
                >
                  <PlayCircle
                    size={20}
                    strokeWidth={1.25}
                    className="flex-shrink-0"
                  />
                  {isDone ? t('courses.actions.reviewCourse') : t('courses.actions.continueCourse')}
                </Button>
              ) : (
                <Dialog size="lg">
                  <Dialog.Trigger
                    className="bg-primary-500 text-white gap-2 flex items-center"
                    as={Button}
                    aria-label={t('courses.actions.startCourse')}
                  >
                    <PlayCircle
                      size={20}
                      strokeWidth={1.25}
                      className="flex-shrink-0"
                    />
                    {t('courses.actions.startCourse')}
                  </Dialog.Trigger>
                  <Dialog.Overlay>
                    <Dialog.Content>
                      <div className="flex items-center justify-between gap-4">
                        <Typography type="h6">{t('courses.dialog.assessmentTitle')}</Typography>
                        <Dialog.DismissTrigger
                          as={IconButton}
                          size="sm"
                          variant="ghost"
                          isCircular
                          color="secondary"
                          className="absolute right-2 top-2"
                          aria-label={t('courses.dialog.close')}
                        >
                          <X className="h-5 w-5" />
                        </Dialog.DismissTrigger>
                      </div>
                      <div className="min-h-[60vh] p-10">
                        <Assessment
                          courseTitle={courseData?.Title}
                          user={userProfile}
                          courseAssessment={courseData?.Assessment || []}
                          courseId={courseData?.ID}
                          fullCourseData={courseData || []}
                        />
                      </div>
                    </Dialog.Content>
                  </Dialog.Overlay>
                </Dialog>
              )}
            </div>
          </div>

          {/* Video Preview */}
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden hidden lg:flex">
            <img
              src={courseData?.ContentLink?.Url + '/cover.jpeg'}
              alt={t('courses.sections.preview')}
              title={`${courseData.Title} ${t('courses.sections.preview')}`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
              <PlayCircle className="w-16 h-16 text-white opacity-80" />
            </div>
          </div>
        </div>
      </div>

      <AcademyLayout>
        <div className="mb-20 grid md:grid-cols-2 gap-6">
          <ListCard
            id="outcomes"
            title={t('courses.sections.whatYouLearn')}
            items={courseData?.LearningOutcomes || []}
            icon="check"
            emptyMessage={t('courses.emptyMessages.noOutcomes')}
          />
          <ListCard
            id="curriculum"
            title={t('courses.sections.curriculum')}
            items={courseData?.Curriculum || []}
            icon="play"
            emptyMessage={t('courses.emptyMessages.noCurriculum')}
          />
        </div>
      </AcademyLayout>
    </>
  );
};

export default CourseDetails;
