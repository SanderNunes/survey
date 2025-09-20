import { useEffect, useState } from "react";
import { useSharePoint } from "./useSharePoint";

export function useParsedCourse(courseId, existingData) {
    const { getCourseById } = useSharePoint();
    const [courseData, setCourseData] = useState(existingData);
    const [loading, setLoading] = useState(!existingData);
    const [error, setError] = useState(null);

    useEffect(() => {
    const fetchCourseDetails = async () => {
      // Skip fetching if we already have course data from navigation
      if (courseData) return;

      try {
        setLoading(true);

        // Use the getCourseById method
        const course = await getCourseById(
          "https://africellcloud.sharepoint.com/sites/KnowledgeBase",
          "CoursesList",
          courseId
        );

        if (course) {
            // Parse course relevant course columns to proper type
            if (typeof course.Exam === "string") {
                try {
                    course.Exam = JSON.parse(course.Exam).catch(console.error);
                } catch {
                    // If can't be parsed as JSON, split by newlines
                    course.Exam = course.Exam.split("\n")
                        .filter((item) => item.trim());
                }
            }

            if (typeof course.Curriculum === "string") {
                try {
                    course.Curriculum = JSON.parse(course.Curriculum).catch(console.error);
                } catch {
                    // If can't be parsed as JSON, split by newlines
                    course.Curriculum = course.Curriculum.split("\n")
                        .filter((item) => item.trim());
                }
            }

            if (typeof course.LearningOutcomes === "string") {
                try {
                    course.LearningOutcomes = JSON.parse(course.LearningOutcomes).catch(console.error);
                } catch {
                    // If can't be parsed as JSON, split by newlines
                    course.LearningOutcomes = course.LearningOutcomes.split("\n")
                        .filter((item) => item.trim());
                }
            }

          setCourseData(course);
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

    fetchCourseDetails();
  }, [courseId, getCourseById, courseData, existingData, loading]);

  return {courseData, loading, error};
}
