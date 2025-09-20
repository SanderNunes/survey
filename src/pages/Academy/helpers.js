
export const processCourseData = (course) => {
  const processedCourse = course; // mutate original data

  // Process LearningOutcomes if it's a string
  if (typeof processedCourse.LearningOutcomes === "string") {
    try {
      processedCourse.LearningOutcomes = JSON.parse(processedCourse.LearningOutcomes);
    } catch {
      processedCourse.LearningOutcomes = processedCourse.LearningOutcomes.split(
        "\n"
      ).filter((item) => item.trim());
    }
  }

  // Process Curriculum if it's a string
  if (typeof processedCourse.Curriculum === "string") {
    try {
      processedCourse.Curriculum = JSON.parse(processedCourse.Curriculum);
    } catch {
      processedCourse.Curriculum = processedCourse.Curriculum.split("\n").filter(
        (item) => item.trim()
      );
    }
  }

  // Process Assessment if it's a string
  if (typeof processedCourse.Assessment === "string") {
    try {
      processedCourse.Assessment = JSON.parse(processedCourse.Assessment);
    } catch {
      processedCourse.Assessment = processedCourse.Assessment.split("\n").filter(
        (item) => item.trim()
      );
    }
  }

  return processedCourse;
};

export const processEnrollmentData = (data) => {
  const processed = data; // mutate original data

  if (typeof processed.CompletedLessons === "string") {
    try {
      processed.CompletedLessons = JSON.parse(processed.CompletedLessons);
    } catch {
      processed.CompletedLessons = processed.CompletedLessons.split(
        "\n"
      ).filter((item) => item.trim());
    }
  }

  if (processed.CompletedLessons === null) {
    processed.CompletedLessons = [];
  }

  return processed;
};

export const processCourseExam = (data) => {
  const processed = data; // mutate original data

  if (typeof processed.Questions === "string") {
    try {
      processed.Questions = JSON.parse(processed.Questions);
    } catch {
      processed.Questions = processed.Questions.split(
        "\n"
      ).filter((item) => item.trim());
    }
  }

  if (processed.Questions === null) {
    processed.Questions = [];
  }

  return processed;
};

export const processCourseLesson = (data) => {
  const processed = data; // mutate original data

  if (typeof processed.Chapters === "string") {
    try {
      processed.Chapters = JSON.parse(processed.Chapters);
    } catch {
      processed.Chapters = processed.Chapters.split(
        "\n"
      ).filter((item) => item.trim());
    }
  }

  if (processed.Chapters === null) {
    processed.Chapters = [];
  }

  return processed;
};

export function orderBy(field, list) {
  return [...list].sort((a, b) => {
    const numA = Number(a[field]);
    const numB = Number(b[field]);

    if (isNaN(numA) || isNaN(numB)) return 0;

    if (numA < numB) return -1;
    if (numA > numB) return 1;
    return 0;
  });
}

export function shuffleList(array) {
  const result = [...array]; // dont mutate original data
  // everytime you call this fn, this loop with Math random will garantee a different order of items
  // by swapping the current index and a random index around
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    // swap, baby
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function formatString(input) {
  return input
    .normalize("NFD")                  // Decompose accents: é → e + ́
    .replace(/[\u0300-\u036f]/g, "")   // Remove diacritics
    .toLowerCase()                    // Convert to lowercase
    .trim()                           // Trim leading/trailing spaces
    .replace(/[^a-z0-9\s-]/g, "")     // Remove special characters except space and dash
    .replace(/\s+/g, "-")             // Replace spaces with dashes
    .replace(/-+/g, "-");             // Collapse multiple dashes
}
