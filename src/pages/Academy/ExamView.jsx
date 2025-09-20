import {
  Button,
  Dialog,
  Typography,
} from "@material-tailwind/react";
import { BookOpenCheck } from "lucide-react";
import Exams from "@/components/Exams";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { processCourseData, processEnrollmentData } from "./helpers";
import { useSharePoint } from "@/hooks/useSharePoint";
import { useTranslation } from 'react-i18next'; // Add this import

export function ExamView({ exam }) {
    const { t } = useTranslation();
    const { courseId } = useParams();
    const { userProfile } = useAuth();

    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(!location.state?.courseData);
    const [error, setError] = useState(null);

    const { getCourseById, getCourseLessons, getCourseEnrollment } = useSharePoint();

    const [courseData, setCourseData] = useState(() => {
    const passedCourse = location.state?.courseData;
        if (passedCourse) {
            return passedCourse;
        }
        return null;
    });

    const [examQuestions] = useState(exam?.Questions || []);
    const [enrollment, setEnrollment] = useState({});

    const onDone = useCallback(() => {
      navigate(`/home/academy/`);
    }, [navigate]);

    useEffect(() => {
      getCourseEnrollment(courseId)
        .then(data => {
          const proc = processEnrollmentData(data);
          setEnrollment(proc);
        });
    }, [getCourseEnrollment, courseId]);

  useEffect(() => {
    const fetchCourseDetails = async () => {
      if (!courseId) {
        setError("Course ID is missing");
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
          setCourseData(processCourseData(courseData));
        }
  }, [courseId, getCourseById, getCourseLessons, courseData, getCourseEnrollment]);

  if (error) {
    return (
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
    );
  }

    if (loading) {
      return (
        <div className="min-h-screen">
          <div className="container mx-auto p-4">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden max-w-7xl mx-auto p-6">
              <h2 className="text-xl">
                {t('courses.messages.loadingCourse')}
              </h2>
            </div>
          </div>
        </div>
      );
    }

    return (
      <Dialog size="screen">
        <Dialog.Trigger
          className="bg-primary text-white gap-2 flex items-center"
          as={Button}
        >
          <BookOpenCheck
            size={20}
            strokeWidth={1.25}
            className="flex-shrink-0"
          />
          {t('courses.actions.takeExam')}
        </Dialog.Trigger>
        <Dialog.Overlay>
          <Dialog.Content>
            <div className="min-h-[60vh] p-10 ">
              <Exams
                user={userProfile}
                exam={exam}
                steps={examQuestions || []}
                course={courseData}
                enrollment={enrollment}
                onDone={onDone}
              />
            </div>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog>
    )
}
