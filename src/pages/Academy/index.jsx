import React, { useCallback, useEffect, useState } from "react";
import { useSharePoint } from "@/hooks/useSharePoint";
import AcademyLayout from "@/layouts/Academy";
import { useNavigate } from "react-router-dom";
import { CourseMediaManager } from "./CourseMediaManager";
import { formatString } from "./helpers";
import { Button } from "@material-tailwind/react";
import { useTranslation } from "react-i18next";
import CourseRating from "./CourseRating";

const CoursesList = () => {
  const { t } = useTranslation()
  const navigate = useNavigate();
  const { getCourses } = useSharePoint();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const handleMediaCover = useCallback((course) => {
    const res = CourseMediaManager(formatString(course?.Title));
    return res?.cover || course?.Image?.Url || "/placeholder.jpg";
  }, []);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        const items = await getCourses(); // assuming getCourses uses "CoursesList" internally
        setCourses(items);
      } catch (err) {
        console.error("Failed to fetch courses:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [getCourses]);

  const handleCourseClick = (course) => {
    navigate(`course/${course.Id || course.CourseID}`, {
      state: {
        courseData: course,
        timestamp: Date.now(),
        source: "courses-list",
      },
    });
  };

  return (
    <AcademyLayout>
      <div className="courses-container min-h-screen p-6">
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {!loading && !error && courses.map((course) => (
            <div
              key={course.Id || course.CourseID}
              onClick={() => handleCourseClick(course)}
              className="cursor-pointer overflow-hidden transition delay-150 duration-300 ease-in-out hover:-translate-y-1 hover:scale-110"
            >
              <img
                src={handleMediaCover(course)}
                alt={course.Title}
                className="h-48 w-full object-cover rounded-xl"
              />
              <div className="pt-4">
                <h5 className="text-md mb-2">{course.Title}</h5>
                <p className="text-xs font-thin text-gray-500 mb-1">
                  <strong>
                    {t('courses.metadata.duration')}:
                  </strong>
                  {course.Duration || "N/A"} /{" "}
                  <strong>
                    {t('courses.metadata.format')}:{" "}
                  </strong>
                  {course.Format}
                </p>
                <div className="mt-2">
                  <CourseRating
                    courseId={course?.Id}
                    initialRating={0}
                    size={12}
                    readOnly
                  />
                </div>
              </div>
            </div>
          ))}

          {loading && error && <div className="my-24 mx-auto max-w-full">
            <div className="text-center">
              {t('courses.messages.errorLoading')}: {error}

              <Button
                onClick={() => navigate(`dashboard`)}
                className="bg-transparent flex border border-primary items-center text-primary mt-4"
              >
                {t('courses.messages.addCourses')}
              </Button>
            </div>
          </div>}

          {loading && !error && [1,2,3,4,5].map((_, index) => <div key={`COURSES-SKELETON-${index}`} className="space-y-2">
            <div class="max-w-xs rounded-lg overflow-hidden shadow-md bg-[#d6d6d6] h-40"></div>
            <div class="text-sm font-semibold bg-[#e2e2e2] h-4 rounded-lg animate-pulse"></div>
            <p class="mt-2 text-xs bg-[#e5e5e5] h-4 rounded-lg animate-pulse"></p>
          </div>)}

        </div>
      </div>
    </AcademyLayout>
  );
};

export default CoursesList;
