export function getInitials(name) {
  if (!name) return "";
  const names = name?.split(" ");
  const initials = names?.map((n) => n[0]?.toUpperCase());
  return initials?.slice(0, 2)?.join("");
}

export function generateUUIDv4() {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
    (
      c ^
      (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
    ).toString(16)
  );
}

export function getFileExtension(filename) {
  const lastDotIndex = filename.lastIndexOf(".");
  return lastDotIndex !== -1 ? filename.substring(lastDotIndex + 1) : "";
}

export function createSlug(text) {
  return text
    .toString() // Convert to string
    .normalize("NFD") // Normalize accented characters
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .toLowerCase() // Convert to lowercase
    .trim() // Remove leading/trailing spaces
    .replace(/[^a-z0-9\s-]/g, "") // Remove non-alphanumeric characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-"); // Collapse multiple hyphens
}

// Helper functions
export function generateUniqueFileName(originalName) {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const sanitizedName = originalName.replace(/[^a-zA-Z0-9.]/g, "_");
  const extension = sanitizedName.split(".").pop();
  const nameWithoutExt = sanitizedName.replace(`.${extension}`, "");

  return `${timestamp}-${randomString}-${nameWithoutExt}.${extension}`;
}

export function fileToArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export const calculateTop4Trending = (articles) => {
  // Primary filter: articles with required data
  let validArticles = articles.filter(
    (article) =>
      article.ArticleViews !== null &&
      article.ArticleViews !== undefined &&
      article.ArticleRating !== null &&
      article.ArticleRating !== undefined &&
      (article.LastViewDate || article.LastModifiedContentDate || article.Modified)
  );

  // If we don't have enough articles, relax the filtering requirements
  if (validArticles.length < 4) {
    // Secondary filter: allow articles with missing views or ratings but with dates
    const additionalArticles = articles.filter(
      (article) =>
        !validArticles.some(valid => valid.Id === article.Id) && // Not already included
        (article.LastViewDate || article.LastModifiedContentDate || article.Modified)
    );

    validArticles = [...validArticles, ...additionalArticles];
  }

  // If still not enough, include all articles with at least one date field
  if (validArticles.length < 4) {
    const remainingArticles = articles.filter(
      (article) =>
        !validArticles.some(valid => valid.Id === article.Id) && // Not already included
        (article.LastViewDate || article.LastModifiedContentDate || article.Modified || article.Created)
    );

    validArticles = [...validArticles, ...remainingArticles];
  }

  // Check if we should use fallback date logic
  const articlesWithHash = validArticles.filter(article => article.hash);
  const articlesWithViewDate = validArticles.filter(article => article.LastViewDate);

  const shouldUseFallback = articlesWithHash.length === 1 || articlesWithViewDate.length === 0;

  // Calculate trending score for each article
  const articlesWithScore = validArticles.map((article) => {
    const score = calculateTrendingScore(article, shouldUseFallback);
    const isMarkedAsTrending = shouldUseFallback && !article.LastViewDate;

    return {
      ...article,
      trendingScore: score,
      isMarkedAsTrending: isMarkedAsTrending,
      trendingReason: isMarkedAsTrending ? 'Modified' : 'LastViewDate'
    };
  });

  // Sort by trending score (highest first) and ensure we return at least 4 articles
  const sortedArticles = articlesWithScore.sort((a, b) => b.trendingScore - a.trendingScore);

  // Return minimum 4 articles, or all if less than 4 exist
  return sortedArticles.slice(0, Math.max(4, sortedArticles.length));
};

// Calculate trending score based on views, ratings, and date
const calculateTrendingScore = (article, useFallbackDate = false) => {
  const views = article.ArticleViews || 0;
  const rating = article.ArticleRating || 0;

  // Use Modified field as fallback when only 1 hash is calculated or no articles have LastViewDate
  let dateToUse;
  if (useFallbackDate && !article.LastViewDate) {
    dateToUse = article.LastModifiedContentDate || article.Modified;
  } else {
    dateToUse = article.LastViewDate;
  }

  // Final fallback to Created date if no other date available
  if (!dateToUse) {
    dateToUse = article.Created;
  }

  if (!dateToUse) return 0; // Return 0 if absolutely no date available

  const targetDate = new Date(dateToUse);
  const now = new Date();

  // Calculate days since the target date
  const daysSinceDate = Math.floor(
    (now - targetDate) / (1000 * 60 * 60 * 24)
  );

  // Recency factor (more recent = higher score)
  // Articles within last 30 days get full recency boost
  const recencyFactor = Math.max(0, Math.min(1, (30 - daysSinceDate) / 30));

  // Weighted scoring formula
  const viewsWeight = 0.5; // 50% weight for views
  const ratingWeight = 0.3; // 30% weight for rating
  const recencyWeight = 0.2; // 20% weight for recency

  // Normalize rating (assuming 1-5 scale)
  const normalizedRating = Math.min(rating / 5, 1);

  // Calculate final score
  const score =
    views * viewsWeight +
    normalizedRating * 100 * ratingWeight +
    recencyFactor * 100 * recencyWeight;

  return score;
};
