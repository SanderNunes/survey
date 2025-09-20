import React, { useEffect, useState } from 'react';
import { useSharePoint } from "@/hooks/useSharePoint";
import { Star } from 'lucide-react';

const ArticleRating = ({
  size = 40,
  articleId,
  initialRating = 0,
  onRating,
  readOnly = false,
  loading = false
}) => {
  const [rating, setRating] = useState(initialRating);
  const [hoverRating, setHoverRating] = useState(null);
  const [isLoading, setIsLoading] = useState(loading);

  const { upsertUserRating, getCourseAverageRating, updateArticleMetadata } = useSharePoint();

  const handleRating = async (newRating) => {
    if (readOnly) return;
    setIsLoading(true);
    try {
      await upsertUserRating({
        articleId,
        rating: newRating,
        isArticle: true
      });

       getCourseAverageRating(articleId, true)
        .then(async (rating) => {
            await updateArticleMetadata(articleId, {ArticleRating: rating})
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
    if (!articleId) return;

    if (readOnly && !rating) {
      setIsLoading(true)

      getCourseAverageRating(articleId, true)
        .then(setRating);

      setIsLoading(false);
    }
  }, [articleId, readOnly, rating, getCourseAverageRating]);

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

export default ArticleRating;
