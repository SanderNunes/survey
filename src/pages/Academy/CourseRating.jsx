import React, { useEffect, useState } from 'react';
import { useSharePoint } from "@/hooks/useSharePoint";
import { Star } from 'lucide-react';

const CourseRating = ({
  size = 40,
  courseId,
  initialRating = 0,
  onRating,
  readOnly = false,
  loading = false
}) => {
  const [rating, setRating] = useState(initialRating);
  const [hoverRating, setHoverRating] = useState(null);
  const [isLoading, setIsLoading] = useState(loading);

  const { upsertUserRating, getCourseAverageRating } = useSharePoint();

  const handleRating = async (newRating) => {
    if (readOnly) return;
    setIsLoading(true);
    try {
      await upsertUserRating({
        courseId, 
        rating: newRating
      });

      setRating(newRating);
      onRating?.(newRating);
    } catch (err) {
      console.error('Error updating course rating:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!courseId) return;

    if (readOnly && !rating) {
      setIsLoading(true)

      getCourseAverageRating(courseId)
        .then(setRating);

     setIsLoading(false);
    }
  }, [courseId, readOnly, rating, getCourseAverageRating]);

  return (
    <div className="flex items-center gap-2">
      {[1, 2, 3, 4, 5].map((star) => {
        const isActive = hoverRating ? star <= hoverRating : star <= rating;
        const colorClass = isActive ? 'text-primary' : 'text-secondary';
        const animateClass = isLoading && !readOnly ? 'animate-pulse text-primary' : '';
        const interactive = !readOnly && !isLoading;

        return (
          <button
            key={star}
            disabled={!interactive}
            onMouseEnter={() => interactive && setHoverRating(star)}
            onMouseLeave={() => interactive && setHoverRating(null)}
            onClick={() => handleRating(star)}
            className={`transition-transform ${
              interactive ? 'hover:scale-110' : ''
            } ${colorClass} ${animateClass}`}
          >
            <Star
              size={size}
              fill={isActive ? 'currentColor' : 'none'}
              className="pointer-events-none"
            />
          </button>
        );
      })}
    </div>
  );
};

export default CourseRating;
