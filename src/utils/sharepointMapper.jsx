/**
 * Maps SharePoint list item fields to more readable field names
 * @param {Object} spItem - Raw SharePoint list item
 * @returns {Object} - Item with mapped field names
 */
export const mapSharePointCourseFields = (spItem) => {

  if (!spItem) return null;

  return {
    ID: spItem.ID || spItem.Id,
    CourseID: spItem.field_0 || "",
    Title: spItem.Title || "",
    Content: spItem.field_2 || "",
    VideoUrl: spItem.field_3 || "",
    Description: spItem.field_4 || "",
    Author: spItem.Author || spItem.AuthorId || "", // If Author is expanded, we'll have the object
    AuthorBio: spItem.field_6 || "",
    Duration: spItem.field_7 || "",
    Format: spItem.field_8 || "",
    Level: spItem.field_9 || "",
    Tags: spItem.field_10 || "",
    Language: spItem.field_11 || "",
    Image: spItem.CourseImage?.Url || "",
    Rating: spItem.field_14 || 0,
    Reviews: spItem.field_15 || 0,
    LearningOutcomes: spItem.field_16 || "",
    Curriculum: spItem.field_17 || "",
    Lessons: spItem.field_18 || "",
    Assesments: spItem.Assesment || "",

    // Include original data for debugging or additional fields
    _original: spItem,
  };
};

/**
 * Parses JSON string fields into JavaScript objects
 * @param {Object} mappedItem - Item with mapped field names
 * @returns {Object} - Item with parsed JSON fields
 */
export const parseJsonFields = (mappedItem) => {
  if (!mappedItem) return null;

  const result = { ...mappedItem };

  // Try to parse Lessons field if it's a JSON string
  if (typeof result.Lessons === "string" && result.Lessons.trim()) {
    try {
      // Replace double double quotes with single double quotes to fix JSON format
      const cleanedJson = result.Lessons.replace(/\"\"/g, '"');
      result.Lessons = JSON.parse(cleanedJson);
    } catch (error) {
      console.error("Failed to parse Lessons JSON", error);
    }
  }
  if (typeof result.Assesments === "string" && result.Assesments.trim()) {
    try {
      let cleanedJson = result.Assesments.replace(/\"\"/g, '"') // Replace double double quotes
        .replace(/,\s*}/g, "}") // Remove trailing commas in objects
        .replace(/,\s*]/g, "]") // Remove trailing commas in arrays
        .replace(/"id:":/g, '"id":'); // Fix typo in key

      result.Assesment = JSON.parse(cleanedJson);
    } catch (error) {
      console.error("Failed to parse Assessment JSON", error);
    }
  }

  // Clean up other fields as needed
  if (result.LearningOutcomes) {
    result.LearningOutcomes = result.LearningOutcomes.replace(/\\n/g, "<br>");
  }

  if (result.Curriculum) {
    result.Curriculum = result.Curriculum.replace(/\\n/g, "<br>");
  }

  return result;
};
