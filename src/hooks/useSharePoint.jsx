// src/hooks/useSharePoint.ts
import { useCallback, useEffect, useState } from "react";
import { useMsal } from "@azure/msal-react";

import {
  getSharePointListItemsService,
  searchSharePointFolderService,
  createSharePointListItemService,
  searchSharePointListService,
} from "@/services/sharepoint.service";
import { loginRequest } from "@/utils/msal-config";
import {
  mapSharePointCourseFields,
  parseJsonFields,
} from "@/utils/sharepointMapper";
import { getSP } from "@/utils/pnpjs-config";
import "@pnp/sp/webs";
import "@pnp/sp/site-users/web";
import { calculateTop4Trending, fileToArrayBuffer, generateUniqueFileName, getFileExtension } from "@/utils/constants";


/**
 * Custom hook for interacting with SharePoint via Microsoft Graph or REST API.
 */
export const useSharePoint = () => {
  const { instance, accounts } = useMsal();
  const isAuthenticated = accounts.length > 0;
  const [sp, setSP] = useState(null);
  const [tokenSP, setTokenSP] = useState(null);
  const [enrollments, setEnrollments] = useState();
  const [courseLessons, setCourseLessons] = useState([]);
  const [courses, setCourses] = useState();
  const [files, setFiles] = useState([]);
  const [article, setArticle] = useState(null);
  const [teams, setTeams] = useState([]);
  const [allArticles, setAllArticles] = useState([]);
  const [trendingArticles, setTrendingArticles] = useState([]);
  const [featuredArticles, setFeaturedArticles] = useState([]);
  const [publishArticles, setPublishArticles] = useState([]);
  const [role, setRole] = useState(null);
  const [isIndexing, setIsIndexing] = useState(false);
  const [processedDocs, setProcessedDocs] = useState([]);
  const [teamMember, setTeamMember] = useState([]);
  const [ragStatus, setRagStatus] = useState({
    totalDocs: 0,
    totalChunks: 0,
    isReady: false,
    fromCache: false,
    lastUpdated: null
  });
  const [allEvents, setAllEvents] = useState([]);
  const [allFeedback, setAllFeedback] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const setupToken = async () => {
      if (!tokenSP) {
        const accessToken = await acquireToken();
        setTokenSP(accessToken);
      }
    };
    setupToken();
  }, [tokenSP]);

  useEffect(() => {
    const setupPnP = async () => {
      if (!sp && tokenSP) {
        const spGet = getSP(tokenSP);
        setSP(spGet);
      }
    };
    setupPnP();
  }, [sp, tokenSP]);



  /**
 * Acquire access token silently or fallback to interactive if needed
 */
  const acquireToken = useCallback(async () => {
    if (!isAuthenticated) return null;
    try {
      const response = await instance.acquireTokenSilent({
        ...loginRequest,
        account: accounts[0],
        scopes: ["https://africellcloud.sharepoint.com/.default"],
      });

      setTokenSP(response.accessToken);
      return response.accessToken;
    } catch (error) {
      console.error("Silent token acquisition failed:", error);
      try {
        const response = await instance.acquireTokenPopup(loginRequest);
        return response.accessToken;
      } catch (popupError) {
        console.error("Interactive token acquisition failed:", popupError);
        return null;
      }
    }
  }, [instance, accounts, isAuthenticated]);

  useEffect(() => {
    const setupToken = async () => {
      if (!tokenSP) {
        const accessToken = await acquireToken();
        setTokenSP(accessToken);
      }
    }
    setupToken()
  }, [tokenSP, acquireToken]);

  useEffect(() => {
    const setupPnP = async () => {
      if (!sp && tokenSP) {
        const spGet = getSP(tokenSP);
        setSP(spGet)
      }
    }
    setupPnP()
  }, [sp, tokenSP]);


  /**
   * Search a specific folder in a SharePoint site
   */
  const searchSharePointFolder = useCallback(
    async (siteUrl, folderPath, searchTerm, options = {}) => {
      if (!siteUrl || !folderPath) {
        console.error("siteUrl and folderPath are required");
      }

      const accessToken = await acquireToken();
      if (!accessToken) {
        console.error("Failed to acquire access token");
      }

      return searchSharePointFolderService(
        accessToken,
        siteUrl,
        folderPath,
        searchTerm,
        options
      );
    },
    [acquireToken]
  );


  const searchSharePointList = useCallback(
    async (siteUrl, listName, searchTerm, options = {}) => {
      if (!siteUrl || !listName) {
        console.error("siteUrl and listName are required");
      }
      const accessToken = await acquireToken();
      if (!accessToken) {
        console.error("Failed to acquire access token");
      }
      return searchSharePointListService(
        accessToken,
        siteUrl,
        listName,
        searchTerm,
        options
      );
    },
    [acquireToken]
  );

  const getUserRole = useCallback(async () => {
    if (sp?.web) {
      try {
        const userGroups = await sp.web.currentUser.groups();

        // Check for admin role first (highest priority)
        if (userGroups.some(group => group.Title === "KnowledgeBase Owners")) {
          setRole('admin')
          return "admin";
        }

        // Check for member role
        if (userGroups.some(group => group.Title === "KnowledgeBase Members")) {
          setRole('admin')
          return "member";
        }

        // Check for visitor role
        if (userGroups.some(group => group.Title === "KnowledgeBase Visitors")) {
          setRole('visitor')
          return "visitor";
        }

        setRole('visitor')
        // Default if no matching groups found
        return "visitor";

      } catch (error) {
        console.error("Error fetching user role:", error);
        return "visitor"; // Default fallback
      }
    }
    return "visitor"; // Return default if sp.web is not available
  }, [sp]);


  useEffect(() => {
    const userRole = async () => {
      await getUserRole()
    }
    userRole()
  }, [sp, getUserRole]);

  /**
   * Get items from a SharePoint list
   * @param {string} siteUrl - The SharePoint site URL
   * @param {string} listId - The GUID or title of the list
   * @param {Object} options - Additional query options
   * @returns {Promise<Array>} Array of list items
   */
  const getSharePointListItems = useCallback(
    async (siteUrl, listId, options = {}) => {
      if (!siteUrl || !listId) {
        console.error("siteUrl and listId are required");
        return [];
      }

      const accessToken = await acquireToken();
      if (!accessToken) {
        console.error("Failed to acquire access token");
        return [];
      }

      return getSharePointListItemsService(
        accessToken,
        siteUrl,
        listId,
        options
      );
    },
    [acquireToken]
  );

  const getCourses = useCallback(async () => {
    if (sp?.web) {
      try {
        const courses = await sp.web.lists.getByTitle("CoursesList").items();
        setCourses(courses); // Update hook's internal state
        return courses; // Return the data for the component
      } catch (error) {
        console.error("Error fetching courses:", error);
        throw error; // Throw error so component can handle it
      }
    }
    return []; // Return empty array if sp.web is not available
  }, [sp]);

  const deleteCourse = useCallback(
    async (courseId) => {
      if (sp?.web && courseId) {
        try {
          await sp.web.lists
            .getByTitle("CoursesList")
            .items.getById(courseId)
            .delete();
          return { success: true, message: "Course deleted successfully" };
        } catch (error) {
          console.error("Error deleting course:", error);
          return { success: false, message: "Failed to delete course", error };
        }
      }
      return { success: false, message: "Invalid parameters" };
    },
    [sp]
  );

  const getCourseById = useCallback(
    async (siteUrl, listId, courseId) => {
      try {
        if (!siteUrl || !listId || !courseId) {
          console.error("siteUrl, listId, and courseId are required");
          return null;
        }


        const items = await getSharePointListItems(siteUrl, listId, {
          filter: `ID eq ${courseId}`,
          top: 1,
        });

        if (!items || items.length === 0) {
          return null;
        }

        const mappedItem = mapSharePointCourseFields(items[0]);
        return parseJsonFields(mappedItem);
      } catch {
        return null
      }
    },
    [getSharePointListItems]
  );

  const createSharePointListItem = useCallback(
    async (siteUrl, listId, itemData) => {
      if (!siteUrl || !listId || !itemData) {
        console.error("siteUrl, listId, and itemData are required");
        return null;
      }

      const accessToken = await acquireToken();
      if (!accessToken) {
        console.error("Failed to acquire access token");
        return null;
      }

      try {
        const createdItem = await createSharePointListItemService(
          accessToken,
          siteUrl,
          listId,
          itemData
        );
        return createdItem;
      } catch (error) {
        console.error("Error creating SharePoint item:", error);
        return null;
      }
    },
    [acquireToken]
  );
  // Course Enrollment
  const courseEnrollment = useCallback(
    async (enrollment) => {
      if (sp?.web) {
        await sp.web.lists.getByTitle("EnrollmentList").items.add({
          Title: enrollment.Title,
          CourseId: enrollment.CourseId,
          Progress: enrollment.Progress,
          CurrentLessonId: enrollment.CurrentLesson,
          CompletionDate: enrollment.CompletionDate,
          CompletedLessons: enrollment.CompletedLessons,
          ContentLink: enrollment.ContentLink,
          Notes: enrollment.Notes,
          ExamGrades: enrollment.ExamGrades,
          Assessment: enrollment.Assessment,
          QuizAnswers: enrollment.QuizAnswers,
        });
      }
    },
    [sp]
  );
  const logAuditEvent = useCallback(
    async (log) => {
      if (sp?.web) {
        await sp.web.lists.getByTitle("AuditLogs").items.add({
          Title: log.title,
          UserEmail: log.userEmail,
          UserName: log.userName,
          ActionType: log.actionType,
          Details: log.details,
        });
      }
    },
    [sp]
  );

  const saveCourse = useCallback(
    async (course) => {



      try {
        // Prepare data based on your exact SharePoint column types
        const courseData = {};

        // Single line of text fields
        if (course.Title) courseData.Title = String(course.Title);
        if (course.CourseID) courseData.CourseID = String(course.CourseID);
        if (course.Level) courseData.Level = String(course.Level);
        if (course.Language) courseData.Language = String(course.Language);
        if (course.Duration) courseData.Duration = String(course.Duration);
        if (course.Format) courseData.Format = String(course.Format);
        if (course.Status) courseData.Status = String(course.Status);
        if (course.Category) courseData.Category = String(course.Category);

        // Tags - Single line of text
        if (course.Tags) {
          courseData.Tags = Array.isArray(course.Tags)
            ? course.Tags.filter((t) => t?.trim()).join(", ")
            : String(course.Tags);
        }

        // Multiple lines of text fields
        if (course.Description)
          courseData.Description = String(course.Description);
        if (course.AuthorBio) courseData.AuthorBio = String(course.AuthorBio);

        if (course.LearningOutcomes) {
          courseData.LearningOutcomes = Array.isArray(course.LearningOutcomes)
            // ? course.LearningOutcomes.filter((lo) => lo?.trim()).join("\n")
            ? JSON.stringify(course.LearningOutcomes)
            : String(course.LearningOutcomes);
        }

        if (course.Curriculum) {
          courseData.Curriculum = Array.isArray(course.Curriculum)
            // ? course.Curriculum.filter((c) => c?.trim()).join("\n")
            ? JSON.stringify(course.Curriculum)
            : String(course.Curriculum);
        }

        // Add Assessment field (Multiple lines of text)
        if (course.Assessment) {
          courseData.Assessment = String(course.Assessment);
        }

        // Hyperlink or Picture field - needs special format
        if (course.Image && course.Image.trim()) {
          // SharePoint Hyperlink fields expect this format
          courseData.Image = {
            Url: course.Image,
            Description: course.Title || "Course Image",
          };
        }

        // Number fields - send as actual numbers
        if (
          course.Rating !== undefined &&
          course.Rating !== null &&
          course.Rating !== ""
        ) {
          courseData.Rating = parseFloat(course.Rating) || 0;
        }

        if (
          course.Reviews !== undefined &&
          course.Reviews !== null &&
          course.Reviews !== ""
        ) {
          courseData.Reviews = parseInt(course.Reviews) || 0;
        }


        const result = await sp.web.lists
          .getByTitle("CoursesList")
          .items.add(courseData);

        return result;
      } catch (error) {
        console.error("SharePoint Error:", error);

        // Enhanced error logging
        if (error.data?.responseBody) {
          console.error("Response body:", error.data.responseBody);
        }
        if (error.message) {
          console.error("Error message:", error.message);
        }

        throw error;
      }
    },
    [sp]
  );

  const updateCourse = useCallback(
    async (courseID, course) => {

      if (!courseID) {
        throw new Error("Course ID is required to update the item.");
      }

      try {
        const courseData = {};

        // Single line of text fields
        if (course.Title) courseData.Title = String(course.Title);
        if (course.CourseID) courseData.CourseID = String(course.CourseID);
        if (course.Level) courseData.Level = String(course.Level);
        if (course.Language) courseData.Language = String(course.Language);
        if (course.Duration) courseData.Duration = String(course.Duration);
        if (course.Format) courseData.Format = String(course.Format);
        if (course.Status) courseData.Status = String(course.Status);
        if (course.Category) courseData.Category = String(course.Category);

        // Tags - Single line of text
        if (course.Tags) {
          courseData.Tags = Array.isArray(course.Tags)
            ? course.Tags.filter((t) => t?.trim()).join(", ")
            : String(course.Tags);
        }

        // Multiple lines of text fields
        if (course.Description) courseData.Description = String(course.Description);
        if (course.AuthorBio) courseData.AuthorBio = String(course.AuthorBio);

        if (course.LearningOutcomes) {
          courseData.LearningOutcomes = Array.isArray(course.LearningOutcomes)
            // ? course.LearningOutcomes.filter((lo) => lo?.trim()).join("\n")
            ? JSON.stringify(course.LearningOutcomes)
            : String(course.LearningOutcomes);
        }

        if (course.Curriculum) {
          courseData.Curriculum = Array.isArray(course.Curriculum)
            // ? course.Curriculum.filter((c) => c?.trim()).join("\n")
            ? JSON.stringify(course.Curriculum)
            : String(course.Curriculum);
        }

        if (course.Assessment) {
          courseData.Assessment = String(course.Assessment);
        }

        if (course.Image && course.Image.trim()) {
          courseData.Image = {
            Url: course.Image,
            Description: course.Title || "Course Image",
          };
        }


        const result = await sp.web.lists
          .getByTitle("CoursesList")
          .items.getById(courseID)
          .update(courseData);

        return result;
      } catch (error) {
        console.error("SharePoint Error:", error);

        if (error.data?.responseBody) {
          console.error("Response body:", error.data.responseBody);
        }
        if (error.message) {
          console.error("Error message:", error.message);
        }

        throw error;
      }
    },
    [sp]
  );

  const updateCourseRating = async (courseId, newRating) => {
    if (!courseId) {
      throw new Error("Course ID is required to update the Course.");
    }

    try {
      await sp.web.lists.getByTitle("CoursesList").items.getById(courseId).update({
        Rating: newRating
      });
    } catch {
      return;
    }
  }

  const getEnrrolment = useCallback(async () => {
    if (!sp?.web) {

      return;
    }

    try {
      // Get current user
      const currentUser = await sp.web.currentUser();
      // const currentUserId = currentUser.Id;

      // Filter items created by current user and select specific fields
      const items = await sp.web.lists
        .getByTitle("EnrollmentList")
        .items.select(
          "Title",
          "CourseId",
          "Progress",
          "CurrentLesson",
          "CompletionDate",
          "Notes",
          "ExamGrades",
          "Assessment",
          "QuizAnswers"
        );


    } catch (error) {
      console.error("Error fetching enrollments:", error);
    }
  }, [sp]);


  const getCourseLessons = useCallback(async (courseId) => {
    if (sp?.web && courseId) {
      try {

        const lessons = await sp.web.lists
          .getByTitle("LessonsList")
          .items.filter(`Course/Id eq ${courseId}`)
          .select(
            '*',
            "Id",
            "Title",
            "Course/Id",
            "Course/Title",
            "ContentLink",
            "Order",
            "HasQuiz",
            "Duration"
          )
          .expand("Course")();

        setCourseLessons(lessons);
        return lessons;
      } catch (error) {
        console.error("Error fetching course lessons:", error);
        return [];
      }
    }
  },
    [sp]
  );

  const getCourseExam = useCallback(
    async (courseId) => {
      if (sp?.web && courseId) {
        try {
          const exams = await sp.web.lists
            .getByTitle("ExamsList")
            .items.filter(`Course/Id eq ${courseId}`)
            .select(
              "Id",
              "Title",
              "Course/Id",
              "Course/Title",
              "Description",
              "TotalQuestions",
              "PassingScore",
              "DurationMinutes",
              "Questions"
            )
            .expand("Course")();

          return exams[0];
        } catch (error) {
          console.error("Error fetching course lessons:", error);
          return null;
        }
      }

      return null;
    },
    [sp]
  );

  const getMyEnrollments = useCallback(async () => {
    if (sp?.web) {
      try {
        // Get current user
        const currentUser = await sp.web.currentUser();
        const currentUserId = currentUser.Id;

        // Filter items created by current user and select specific fields
        const items = await sp.web.lists
          .getByTitle("EnrollmentList")
          .items.select(
            "ID",
            "Title",
            "CourseId",
            "Progress",
            "Done",
            "CurrentLessonId",
            "CompletionDate",
            "CompletedLessons",
            "Notes",
            "ExamGrades",
            "Assessment",
            "QuizAnswers"
          )
          .filter(`AuthorId eq ${currentUserId}`)();

        setEnrollments(items);
        return items;
      } catch (error) {
        console.error("Error fetching enrollments:", error);
        return {};
      }
    }

    return {};
  }, [sp]);


  const getCourseEnrollment = useCallback(async (courseId) => {
    if (sp?.web) {
      try {
        // Get current user
        const currentUser = await sp.web.currentUser();
        const currentUserId = currentUser.Id;

        // Filter items created by current user and select specific fields
        const items = await sp.web.lists
          .getByTitle("EnrollmentList")
          .items.select(
            "ID",
            "Title",
            "CourseId",
            "Progress",
            "Done",
            "CurrentLessonId",
            "CompletionDate",
            "CompletedLessons",
            "Notes",
            "ExamGrades",
            "Assessment",
            "QuizAnswers"
          )
          .filter(`AuthorId eq ${currentUserId} and CourseId eq ${courseId}`)();

        return items?.[0];
      } catch (error) {
        console.error(`Error fetching course "${courseId}" enrollment:`, error);
        return {};
      }
    }

    return {};
  }, [sp]);

  const updateEnrollment = useCallback(
    async (enrollmentId, updateFields, courseId) => {
      if (sp?.web) {
        await sp.web.lists.getByTitle("EnrollmentList").items
          .getById(enrollmentId)
          .update(updateFields);

        const updated = getCourseEnrollment(courseId)

        return updated;
      }

      return null;
    },
    [sp, getCourseEnrollment]
  );

  const addFile = useCallback(
    async ({ file, category }) => {
      if (sp?.web) {
        try {
          const list = sp.web.lists.getByTitle("Documents");
          const fileNamePath = encodeURI(file.name);
          let result = null;

          if (file.size <= 10485760) {
            // small upload
            result = await list.rootFolder.files.addUsingPath(fileNamePath, file, { Overwrite: true });
          } else {
            // large upload
            result = await list.rootFolder.files.addChunked(fileNamePath, file, {
              progress: data => { console.log(`progress`, data); },
              Overwrite: true
            });
          }

          // Alternative method: Find and update the item by filename

          if (result) {
            try {
              // Wait a moment for SharePoint to process the file
              await new Promise(resolve => setTimeout(resolve, 1500));

              // Get the item by filtering on filename
              const items = await list.items
                .select(
                  "*",
                  "File/Name",
                  "File/ServerRelativeUrl",
                  "File/TimeLastModified",
                  "File/TimeCreated",
                  "Author/Title",
                  "Editor/Title"
                )
                .expand("File", "Author", "Editor")
                .filter(`FileLeafRef eq '${result.Name}'`)
                .top(1)()


              if (items.length > 0) {
                await list.items.getById(items[0].Id).update({
                  FileCategoryTestID: category
                });

              } else {
                console.error('Could not find uploaded file to update column');
              }
            } catch (updateError) {
              console.error('Error updating custom column:', updateError);

            }
          }

        } catch (error) {
          console.error('Error uploading file:', error);
        }
      }
    },
    [sp]
  );

  const getFiles = useCallback(
    async (siteUrl = null, libraryName = "Documents", searchQuery = "*", options = {}) => {
      if (!sp?.web) {
        console.error('SharePoint context not initialized');
        return [];
      }

      try {


        // First, let's check if the library exists
        let list;
        try {
          list = sp.web.lists.getByTitle(libraryName);
          // Test if we can access the list
          const listInfo = await list();

        } catch (listError) {
          console.error(`Library "${libraryName}" not found or not accessible:`, listError);

          // Try to get all available lists

          try {
            const allLists = await sp.web.lists.filter("Hidden eq false")();


            // Look for document libraries (BaseType = 1)
            const documentLibraries = allLists.filter(l => l.BaseType === 1);


            // if (documentLibraries.length > 0) {

            // }
          } catch (listsError) {
            console.error('Could not retrieve available lists:', listsError);
          }
          return [];
        }

        // Build the query with proper error handling
        let query = list.items;

        // Add expansions
        query = query.expand("File", "Author", "Editor");

        // Add selections
        const selectFields = [
          "*",
          "Id",
          "Title",
          "File/Name",
          "File/ServerRelativeUrl",
          "File/TimeLastModified",
          "File/TimeCreated",
          "File/Length",
          "Author/Title",
          "Editor/Title",
          "FileLeafRef",
          "FileDirRef",
          "FSObjType"
        ];

        // Add any additional select fields from options
        if (options.select) {
          selectFields.push(...options.select.split(',').map(f => f.trim()));
        }

        query = query.select(...selectFields);

        // Add filter for files only (not folders)
        let filter = "FSObjType eq 0"; // 0 = file, 1 = folder
        if (options.filter) {
          filter = `(${filter}) and (${options.filter})`;
        }
        query = query.filter(filter);

        // Add top limit
        if (options.top) {
          query = query.top(options.top);
        } else {
          query = query.top(100); // Default limit
        }


        const items = await query();




        if (items.length === 0) {





          // Try a simpler query without filters

          try {
            const simpleItems = await list.items.top(5)();

            // if (simpleItems.length > 0) {

            // }
          } catch (simpleError) {
            console.error('Even simple query failed:', simpleError);
          }

          return [];
        }

        // Process the items
        const processedFiles = items?.filter(file => file.FileCategoryTestID != 'RAG_Cache').map(item => {
          const processed = {
            id: item.Id,
            Name: item.File?.Name || item.FileLeafRef || item.Title || 'Unknown',
            ServerRelativeUrl: item.File?.ServerRelativeUrl || '',
            TimeLastModified: item.File?.TimeLastModified || item.Modified,
            TimeCreated: item.File?.TimeCreated || item.Created,
            FileCategory: item.FileCategoryTestID || '',
            Length: item.File?.Length || 0,
            ModifiedBy: item.Editor?.Title || 'Unknown',
            CreatedBy: item.Author?.Title || 'Unknown',
            FileLeafRef: item.FileLeafRef || '',
            FileDirRef: item.FileDirRef || '',
            FSObjType: item.FSObjType,
            Type: getFileExtension(item.File?.Name || item.FileLeafRef || ''),
            // Include all original fields for debugging
            _allFields: Object.keys(item)
          };

          return processed
        });



        setFiles(processedFiles)
        return processedFiles;

      } catch (error) {
        console.error('Error in getFiles:', error);
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });

        // Check if it's a permission error
        if (error.message?.includes('403') || error.message?.includes('Forbidden')) {
          console.error('Permission denied. Check if you have read access to the SharePoint library.');
        }

        // Check if it's a not found error
        if (error.message?.includes('404') || error.message?.includes('Not Found')) {
          console.error('Library not found. Check if the library name is correct.');
        }

        return [];
      }
    },
    [sp]
  );


  const AddArticle = useCallback(
    async (article) => {
      if (sp?.web) {
        await sp.web.lists.getByTitle("ArticlesList").items.add({
          Title: article.title,
          Summary: article.summary,
          CoverImageURL: article.coverImage,
          Category: article.category,
          ArticleType: article.type,
          ArticleLevel: article.level,
          Tags: JSON.stringify(article.tags),
          ArticleSlug: article.slug,
          ReadTime: article.readTime
        });
      }
    },
    [sp]
  );


  const updateArticleContent = useCallback(
    async ({ id, data }) => {
      if (sp?.web) {
        try {
          const list = sp.web.lists.getByTitle("ArticlesList");

          await list.items
            .expand("File", "Author", "Editor")
            .select(
              "*",
              "File/Name",
              "File/ServerRelativeUrl",
              "File/TimeLastModified",
              "File/TimeCreated",
              "Author/Title",
              "Editor/Title"
            )
            .getById(id)
            .update({
              ArticleContent: JSON.stringify(data),
              LastModifiedContentDate: new Date()
            });

        } catch (error) {
          console.error('Error fetching files:', error);
        }
      }
    },
    [sp]
  );

  const updateArticleMetadata = useCallback(
    async (id, data) => {
      if (sp?.web) {
        try {
          const list = sp.web.lists.getByTitle("ArticlesList");

          await list.items
            .expand("File", "Author", "Editor")
            .select(
              "*",
              "File/Name",
              "File/ServerRelativeUrl",
              "File/TimeLastModified",
              "File/TimeCreated",
              "Author/Title",
              "Editor/Title"
            )
            .getById(id)
            .update(data);

        } catch (error) {
          console.error('Error fetching files:', error);
        }
      }
    },
    [sp]
  );

  const uploadImageAsAttachment = useCallback(
    async (articleId, file, fileName = null) => {
      if (!sp?.web) {
        console.error('SharePoint not initialized');
      }

      try {
        // Generate unique filename if not provided
        const finalFileName = fileName || generateUniqueFileName(file.name);

        // Convert file to array buffer
        const arrayBuffer = await fileToArrayBuffer(file);

        // Upload as attachment to the ArticlesList item
        const item = await sp.web.lists
          .getByTitle("ArticlesList")
          .items.filter(`ArticleSlug eq '${articleId}'`)()

        const attachmentInfo = await sp.web.lists
          .getByTitle("ArticlesList")
          .items.getById(item[0]?.Id)
          .attachmentFiles
          .add(finalFileName, arrayBuffer);



        // Get the attachment URL
        const attachmentUrl = attachmentInfo.data.ServerRelativeUrl;

        // Update article metadata to include the new image
        const imageMetadata = {
          fileName: finalFileName,
          originalName: file.name,
          size: file.size,
          type: file.type,
          url: attachmentUrl,
          uploadDate: new Date().toISOString()
        };

        // Get existing article data
        const existingItem = await sp.web.lists
          .getByTitle("ArticlesList")
          .items.getById(item[0]?.Id)
          .select("CoverImageURL")();

        // Parse existing attached images or create new array
        const existingImages = existingItem.AttachedImages
          ? JSON.parse(existingItem.AttachedImages)
          : [];

        // Add new image metadata
        existingImages.push(imageMetadata);

        // Update the article with new image metadata
        await updateArticleMetadata(item[0]?.Id, {
          CoverImageURL: existingImages[0].url
        });

        return {
          url: attachmentUrl,
          fileName: finalFileName,
          fullUrl: `${window.location.origin}${attachmentUrl}`,
          metadata: imageMetadata
        };

      } catch (error) {
        console.error("Error uploading image attachment:", error);
        throw error;
      }
    },
    [sp, updateArticleMetadata]
  );

  // New: Get all attachments for an article
  const getArticleAttachments = useCallback(
    async (articleId) => {
      if (!sp?.web) return [];

      try {
        const itemArticle = await sp.web.lists
          .getByTitle("ArticlesList")
          .items.filter(`ArticleSlug eq '${articleId}'`)()

        const attachments = await sp.web.lists
          .getByTitle("ArticlesList")
          .items.getById(itemArticle[0]?.Id)
          .attachmentFiles();

        // Also get metadata from the article item
        const item = await sp.web.lists
          .getByTitle("ArticlesList")
          .items.getById(itemArticle[0]?.Id)
          .select("CoverImageURL")();

        const imageMetadata = item.AttachedImages
          ? JSON.parse(item.AttachedImages)
          : [];

        // Combine attachment info with metadata
        return attachments.map(attachment => {
          const metadata = imageMetadata.find(m => m.fileName === attachment.FileName);
          return {
            fileName: attachment.FileName,
            url: attachment.ServerRelativeUrl,
            fullUrl: `${window.location.origin}${attachment.ServerRelativeUrl}`,
            ...metadata
          };
        });

      } catch (error) {
        console.error("Error getting article attachments:", error);
        return [];
      }
    },
    [sp]
  );

  // New: Delete attachment from article
  const deleteArticleAttachment = useCallback(
    async (articleId, fileName) => {
      if (!sp?.web) return false;

      try {
        // Delete the attachment file
        await sp.web.lists
          .getByTitle("ArticlesList")
          .items.filter(`ArticleSlug eq '${articleId}'`)
          .attachmentFiles
          .getByName(fileName)
          .delete();

        // Update metadata to remove the deleted image
        const item = await sp.web.lists
          .getByTitle("ArticlesList")
          .items.filter(`ArticleSlug eq '${articleId}'`)
          .select("AttachedImages")();

        const existingImages = item.AttachedImages
          ? JSON.parse(item.AttachedImages)
          : [];

        const updatedImages = existingImages.filter(img => img.fileName !== fileName);

        await updateArticleMetadata(articleId, {
          AttachedImages: JSON.stringify(updatedImages)
        });

        return true;
      } catch (error) {
        console.error("Error deleting attachment:", error);
        return false;
      }
    },
    [sp, updateArticleMetadata]
  );


  const getAllArticles = useCallback(
    async () => {
      if (sp?.web) {
        try {
          const list = sp.web.lists.getByTitle("ArticlesList");

          const items = await list.items
            .expand("File", "Author", "Editor")
            .select(
              "*",
              "File/Name",
              "File/ServerRelativeUrl",
              "File/TimeLastModified",
              "File/TimeCreated",
              "Author/Title",
              "Editor/Title"
            ).orderBy("Modified", false)()

          setAllArticles(items)
        } catch (error) {
          console.error('Error fetching files:', error);
        }
      }
    },
    [sp]
  );

  const getAllPublishArticles = useCallback(
    async (statusArticle) => {
      if (sp?.web) {
        try {
          const list = sp.web.lists.getByTitle("ArticlesList");

          const items = await list.items
            .expand("File", "Author", "Editor")
            .select(
              "*",
              "File/Name",
              "File/ServerRelativeUrl",
              "File/TimeLastModified",
              "File/TimeCreated",
              "Author/Title",
              "Editor/Title"
            ).filter(`ArticleStatus eq '${statusArticle}'`)
            .orderBy("LastModifiedContentDate", false)()

          setPublishArticles(items)
        } catch (error) {
          console.error('Error fetching files:', error);
        }
      }
    },
    [sp]
  );



  const addTeamMember = useCallback(
    async (team) => {
      if (sp?.web) {
      return  await sp.web.lists.getByTitle("PCX_Members").items.add({
          Title: team.name,
          field_7: team.department,
          field_1: team.section || '',
          field_3: team.function,
          field_2: team.team,
          field_4: team.reportTo,
          field_5: team.msisdn,
          field_6: team.email,
          field_8: team.startDate,
          field_9: team.currentType,
          field_10: team.ranking || 0,
          field_11: team.kpi || 0
        });
      }
    },
    [sp]
  );

  const updateTeamMember = useCallback(
    async (id, data) => {
      if (sp?.web) {
        try {
          const list = sp.web.lists.getByTitle("PCX_Members");

          await list.items
            .expand("File",)
            .select(
              "*",
              "File/Name",
              "File/ServerRelativeUrl",
              "File/TimeLastModified",
              "File/TimeCreated",
            )
            .getById(id)
            .update(data);

        } catch (error) {
          console.error('Error fetching files:', error);
        }
      }
    },
    [sp]
  );

   const uploadImageAsAttachmentTeam = useCallback(
    async (id, file, fileName = null) => {
      if (!sp?.web) {
        console.error('SharePoint not initialized');
      }

      try {
        // Generate unique filename if not provided
        const finalFileName = fileName || generateUniqueFileName(file.name);

        // Convert file to array buffer
        const arrayBuffer = await fileToArrayBuffer(file);

        // Upload as attachment to the ArticlesList item
        const item = await sp.web.lists
          .getByTitle("PCX_Members")
          .items.getById(id)()

        const attachmentInfo = await sp.web.lists
          .getByTitle("PCX_Members")
          .items.getById(item.Id)
          .attachmentFiles
          .add(finalFileName, arrayBuffer);



        // Get the attachment URL
        const attachmentUrl = attachmentInfo.data.ServerRelativeUrl;

        // Update article metadata to include the new image
        const imageMetadata = {
          fileName: finalFileName,
          originalName: file.name,
          size: file.size,
          type: file.type,
          url: attachmentUrl,
          uploadDate: new Date().toISOString()
        };

        // Get existing article data
        const existingItem = await sp.web.lists
          .getByTitle("PCX_Members")
          .items.getById(item?.Id)
          .select("img")();

        // Parse existing attached images or create new array
        const existingImages = existingItem.AttachedImages
          ? JSON.parse(existingItem.AttachedImages)
          : [];

        // Add new image metadata
        existingImages.push(imageMetadata);

        // Update the article with new image metadata
        await updateTeamMember(item?.Id, {
          img: existingImages[0].url
        });

        return {
          url: attachmentUrl,
          fileName: finalFileName,
          fullUrl: `${window.location.origin}${attachmentUrl}`,
          metadata: imageMetadata
        };

      } catch (error) {
        console.error("Error uploading image attachment:", error);
        throw error;
      }
    },
    [sp, updateTeamMember]
  );

   const getImageTeamAttachments = useCallback(
    async (id) => {
      if (!sp?.web) return [];

      try {
        const itemTeam = await sp.web.lists
          .getByTitle("PCX_Members")
          .getById(id)()

        const attachments = await sp.web.lists
          .getByTitle("PCX_Members")
          .items.getById(itemTeam[0]?.Id)
          .attachmentFiles();

        // Also get metadata from the article item
        const item = await sp.web.lists
          .getByTitle("PCX_Members")
          .items.getById(itemTeam[0]?.Id)
          .select("imageURL")();

        const imageMetadata = item.AttachedImages
          ? JSON.parse(item.AttachedImages)
          : [];

        // Combine attachment info with metadata
        return attachments.map(attachment => {
          const metadata = imageMetadata.find(m => m.fileName === attachment.FileName);
          return {
            fileName: attachment.FileName,
            url: attachment.ServerRelativeUrl,
            fullUrl: `${window.location.origin}${attachment.ServerRelativeUrl}`,
            ...metadata
          };
        });

      } catch (error) {
        console.error("Error getting article attachments:", error);
        return [];
      }
    },
    [sp]
  );

  const getTeams = useCallback(
    async () => {
      if (sp?.web) {
        try {
          const list = sp.web.lists.getByTitle("PCX_Members");

          const item = await list.items
            .expand("File", "Author", "Editor")
            .select(
              "*", // This gets all fields including custom ones
              "File/Name",
              "File/ServerRelativeUrl",
              "File/TimeLastModified",
              "File/TimeCreated",
              "Author/Title",
              "Editor/Title"
            )()

          setTeams(item)
        } catch (error) {
          console.error('Error fetching files:', error);
        }
      }
    },
    [sp]
  );

  const getTeamMember = useCallback(
    async ({ id }) => {
      if (sp?.web) {
        try {
          const list = sp.web.lists.getByTitle("PCX_Members");

          const item = await list.items
            .expand("File")
            .getById(id)
            .select(
              "*", // This gets all fields including custom ones
              "File/Name",
              "File/ServerRelativeUrl",
              "File/TimeLastModified",
              "File/TimeCreated",
            )()

          setTeamMember(item)
        } catch (error) {
          console.error('Error fetching files:', error);
        }
      }
    },
    [sp]
  );

  const getArticle = useCallback(
    async ({ slug }) => {
      if (sp?.web) {
        try {
          const list = sp.web.lists.getByTitle("ArticlesList");

          const item = await list.items
            .expand("File", "Author", "Editor")
            .select(
              "*", // This gets all fields including custom ones
              "File/Name",
              "File/ServerRelativeUrl",
              "File/TimeLastModified",
              "File/TimeCreated",
              "Author/Title",
              "Editor/Title"
            )
            .filter(`ArticleSlug eq '${slug}'`)()

          setArticle(item[0])
        } catch (error) {
          console.error('Error fetching files:', error);
        }
      }
    },
    [sp]
  );


  // Function to calculate and update trending articles
  const updateTrendingArticles = useCallback(
    async () => {
      if (sp?.web) {
        try {
          const list = sp.web.lists.getByTitle("ArticlesList");

          // Get all articles with required fields
          const items = await list.items
            .expand("File", "Author", "Editor")
            .select(
              "*",
              "File/Name",
              "File/ServerRelativeUrl",
              "File/TimeLastModified",
              "File/TimeCreated",
              "Author/Title",
              "Editor/Title"
            )
            .orderBy("Modified", false)();

          // Calculate trending scores and get top 4
          const trendingArticles = calculateTop4Trending(items);

          // First, set all articles Trending to false
          const updatePromises = items.map(item =>
            updateArticleMetadata(item.Id, { Trending: false })
          );

          await Promise.all(updatePromises);

          // Then set top 4 trending articles to true
          const trendingPromises = trendingArticles.slice(0, 4).map(article =>
            updateArticleMetadata(article.Id, { Trending: true })
          );

          await Promise.all(trendingPromises);

          // console.log('Trending articles updated successfully:', trendingArticles.map(a => a.Title));

        } catch (error) {
          console.error('Error updating trending articles:', error);
        }
      }
    },
    [sp, updateArticleMetadata]
  );


  const getDocumentTextFromFolder = useCallback(
    async (libraryName = "Documents", folderPath = "", options = {}) => {
      if (!sp?.web) {
        console.error('SharePoint context not initialized');
        return [];
      }

      try {
        const list = sp.web.lists.getByTitle(libraryName);

        // Build query to get files from specific folder
        let query = list.items;

        // Add expansions for file information
        query = query.expand("File");

        // Select necessary fields
        query = query.select(
          "Id",
          "Title",
          "File/Name",
          "File/ServerRelativeUrl",
          "File/Length",
          "FileLeafRef",
          "FileDirRef"
        );

        // Filter for files only and specific folder path
        let filter = "FSObjType eq 0"; // Files only
        if (folderPath) {
          // Normalize folder path
          const normalizedPath = folderPath.startsWith('/') ? folderPath : `/${folderPath}`;
          filter += ` and startswith(FileDirRef,'${normalizedPath}')`;
        }

        if (options.filter) {
          filter = `(${filter}) and (${options.filter})`;
        }

        query = query.filter(filter);

        // Add limit
        query = query.top(options.top || 100);

        const items = await query();

        if (items.length === 0) {
          return [];
        }


        // Extract text from each document
        const documentsWithText = await Promise.all(
          items.map(async (item) => {
            try {
              const fileName = item.File?.Name || item.FileLeafRef;
              const fileUrl = item.File?.ServerRelativeUrl;

              if (!fileUrl) {
                console.warn(`No URL found for file: ${fileName}`);
                return {
                  id: item.Id,
                  fileName,
                  text: '',
                  error: 'No file URL available'
                };
              }

              // Get file extension to determine processing method
              const extension = fileName?.split('.').pop()?.toLowerCase();
              let textContent = '';


              // Get file buffer using correct PnPjs syntax
              const fileBuffer = await sp.web.getFileByServerRelativePath(fileUrl).getBuffer();

              switch (extension) {
                case 'txt':
                case 'csv':
                  // Plain text files
                  textContent = new TextDecoder('utf-8').decode(fileBuffer);
                  break;

                case 'docx':
                  // Word documents - requires mammoth library
                  try {
                    // Try to load mammoth from CDN
                    if (!window.mammoth) {
                      const script = document.createElement('script');
                      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.4.2/mammoth.browser.min.js';
                      document.head.appendChild(script);

                      // Wait for script to load
                      await new Promise((resolve, reject) => {
                        script.onload = resolve;
                        script.onerror = reject;
                      });
                    }

                    if (window.mammoth) {
                      const result = await window.mammoth.extractRawText({ arrayBuffer: fileBuffer });
                      textContent = result.value;
                    } else {
                      throw new Error('Mammoth library not available');
                    }
                  } catch (mammothError) {
                    console.warn(`Mammoth DOCX processing failed for ${fileName}:`, mammothError);
                    textContent = '[DOCX content - text extraction library not available]';
                  }
                  break;

                case 'pdf':
                  // PDF files - extract text using PDF.js
                  try {
                    // Load PDF.js if not already loaded
                    if (!window.pdfjsLib) {
                      // Load PDF.js from CDN
                      const script = document.createElement('script');
                      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
                      document.head.appendChild(script);

                      // Wait for script to load
                      await new Promise((resolve, reject) => {
                        script.onload = () => {
                          // Set worker source
                          window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                          resolve();
                        };
                        script.onerror = reject;
                      });
                    }

                    if (window.pdfjsLib) {
                      // Load PDF document
                      const pdf = await window.pdfjsLib.getDocument({ data: fileBuffer }).promise;


                      let fullText = '';

                      // Extract text from each page (limit to first 10 pages for performance)
                      const maxPages = Math.min(pdf.numPages, 10);
                      for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
                        try {

                          const page = await pdf.getPage(pageNum);
                          const textContent = await page.getTextContent();
                          const pageText = textContent.items.map(item => item.str).join(' ');
                          fullText += `\n=== Page ${pageNum} ===\n${pageText}\n`;
                        } catch (pageError) {
                          console.warn(`Error processing page ${pageNum}:`, pageError);
                        }
                      }

                      textContent = fullText.trim() || '[PDF processed but no text content found]';
                    } else {
                      throw new Error('PDF.js library not available');
                    }
                  } catch (pdfError) {
                    console.warn(`PDF text extraction failed for ${fileName}:`, pdfError);
                    textContent = `[PDF content - text extraction failed: ${pdfError.message}]`;
                  }
                  break;

                case 'xlsx':
                case 'xls':
                  // Excel files - extract text using SheetJS
                  try {
                    // Load SheetJS if not already loaded
                    if (!window.XLSX) {


                      const script = document.createElement('script');
                      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
                      document.head.appendChild(script);

                      // Wait for script to load
                      await new Promise((resolve, reject) => {
                        script.onload = resolve;
                        script.onerror = reject;
                      });
                    }

                    if (window.XLSX) {


                      // Parse the workbook
                      const workbook = window.XLSX.read(fileBuffer, { type: 'array' });
                      let allSheetsText = '';

                      // Process each worksheet
                      workbook.SheetNames.forEach(sheetName => {

                        const worksheet = workbook.Sheets[sheetName];
                        const csvText = window.XLSX.utils.sheet_to_csv(worksheet);
                        allSheetsText += `\n=== Sheet: ${sheetName} ===\n${csvText}\n`;
                      });

                      textContent = allSheetsText.trim() || '[Excel file processed but no content found]';
                    } else {
                      throw new Error('SheetJS library not available');
                    }
                  } catch (excelError) {
                    console.warn(`Excel text extraction failed for ${fileName}:`, excelError);
                    textContent = `[Excel content - text extraction failed: ${excelError.message}]`;
                  }
                  break;

                default:
                  // Try to decode as text for other formats
                  try {
                    const decoded = new TextDecoder('utf-8').decode(fileBuffer);
                    // Check if it's likely binary content
                    if (decoded.includes('\0') || decoded.length === 0) {
                      textContent = `[${extension?.toUpperCase() || 'Unknown'} content - binary file, text extraction not supported]`;
                    } else {
                      textContent = decoded;
                    }
                  } catch (decodeError) {
                    textContent = `[${extension?.toUpperCase() || 'Unknown'} content - text extraction failed]`;
                  }
              }

              return {
                id: item.Id,
                fileName,
                fileUrl,
                extension: extension || 'unknown',
                size: item.File?.Length || 0,
                text: textContent,
                textLength: textContent?.length || 0
              };

            } catch (fileError) {
              return {
                id: item.Id,
                fileName: item.File?.Name || item.FileLeafRef,
                text: '',
                error: fileError.message
              };
            }
          })
        );


        // Filter out documents with errors if requested
        if (options.excludeErrors) {
          return documentsWithText.filter(doc => !doc.error);
        }

        return documentsWithText;

      } catch (error) {
        console.error('Error in getDocumentTextFromFolder:', error);
        throw error;
      }
    },
    [sp]
  );


  // Cellito  Functions
  // New functions 12-08-2025 - changing from documents to articles
  const stripHtmlTags = useCallback((htmlContent) => {
    if (!htmlContent || typeof htmlContent !== 'string') return '';

    // Remove HTML tags but keep the text content
    let cleanText = htmlContent
      // Remove script and style elements completely
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      // Remove HTML comments
      .replace(/<!--[\s\S]*?-->/g, '')
      // Replace common HTML entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&hellip;/g, '...')
      // Remove all remaining HTML tags
      .replace(/<[^>]*>/g, ' ')
      // Clean up whitespace
      .replace(/\s+/g, ' ')
      .trim();

    return cleanText;
  }, []);

  const getArticlesMetadata = useCallback(async () => {
    try {
      if (!sp?.web) return { count: 0, lastModified: null, articleIds: [] };

      console.log('📊 Getting articles metadata...');

      // Get all published articles metadata only
      const list = sp.web.lists.getByTitle("ArticlesList");

      const items = await list.items
        .select(
          "Id",
          "Title",
          "ArticleSlug",
          "ArticleStatus",
          "LastModifiedContentDate",
          "Modified",
          "Created"
        )
        .filter("ArticleStatus eq 'Published'") // Only published articles
        .orderBy("LastModifiedContentDate", false)
        .top(1000)();

      console.log(`📊 Found ${items.length} published articles`);

      // Get the most recent modification date
      const lastModified = items.reduce((latest, item) => {
        const articleModified = new Date(
          item.LastModifiedContentDate ||
          item.Modified ||
          item.Created ||
          0
        );
        return articleModified > latest ? articleModified : latest;
      }, new Date(0));

      // Create sorted list of article IDs for comparison
      const articleIds = items
        .map(item => item.Id)
        .sort((a, b) => a - b);

      const metadata = {
        count: items.length,
        lastModified: lastModified.toISOString(),
        articleIds
      };

      console.log('📊 Articles metadata:', {
        count: metadata.count,
        lastModified: metadata.lastModified,
        articleCount: articleIds.length
      });

      return metadata;

    } catch (error) {
      console.error('❌ Error getting articles metadata:', error);
      return { count: 0, lastModified: null, articleIds: [] };
    }
  }, [sp]);

  const isCacheValidForArticles = useCallback((cacheData, currentMetadata) => {
    if (!cacheData || !cacheData.metadata || !currentMetadata) {
      console.log('❌ Cache invalid: Missing cache data or metadata');
      return false;
    }

    const cache = cacheData.metadata;

    console.log('📋 Cache metadata:', {
      totalArticles: cache.totalArticles,
      lastModified: cache.lastModified,
      articleCount: cache.articleIds?.length || 0
    });
    console.log('📋 Current metadata:', {
      count: currentMetadata.count,
      lastModified: currentMetadata.lastModified,
      articleCount: currentMetadata.articleIds?.length || 0
    });

    // Check article count
    if (cache.totalArticles !== currentMetadata.count) {
      console.log('❌ Cache invalid: Article count changed');
      return false;
    }

    // Check if article list changed (most reliable check)
    if (cache.articleIds && currentMetadata.articleIds) {
      const cacheIds = JSON.stringify(cache.articleIds);
      const currentIds = JSON.stringify(currentMetadata.articleIds);

      if (cacheIds !== currentIds) {
        console.log('❌ Cache invalid: Article list changed');

        // Show detailed differences for debugging
        const cacheSet = new Set(cache.articleIds);
        const currentSet = new Set(currentMetadata.articleIds);

        const added = currentMetadata.articleIds.filter(id => !cacheSet.has(id));
        const removed = cache.articleIds.filter(id => !currentSet.has(id));

        console.log('📝 Articles added:', added);
        console.log('📝 Articles removed:', removed);

        return false;
      }
    }

    // Check last modified date
    if (cache.lastModified && currentMetadata.lastModified) {
      const cacheDate = new Date(cache.lastModified);
      const currentDate = new Date(currentMetadata.lastModified);
      if (currentDate > cacheDate) {
        console.log('❌ Cache invalid: Articles modified since cache');
        return false;
      }
    }

    console.log('✅ Cache is valid');
    return true;
  }, []);

  const getCacheFileFromArticles = useCallback(async () => {
    try {
      if (!sp?.web) return null;

      console.log('🔍 Looking for RAG cache in ArticlesList...');

      // Look for cache in ArticlesList with specific slug
      const cacheItems = await sp.web.lists
        .getByTitle("ArticlesList")
        .items
        .select("Id", "ArticleContent", "Modified")
        .filter("ArticleSlug eq 'cellito-rag-cache'")
        .top(1)();

      if (cacheItems && cacheItems.length > 0) {
        const cacheItem = cacheItems[0];
        if (cacheItem.ArticleContent) {
          try {
            const cacheData = JSON.parse(cacheItem.ArticleContent);
            console.log('✅ Cache found in ArticlesList');
            return cacheData;
          } catch (parseError) {
            console.error('❌ Error parsing cache JSON:', parseError);
          }
        }
      }

      console.log('ℹ️ No cache found in ArticlesList');
      return null;
    } catch (error) {
      console.error('❌ Error getting cache from ArticlesList:', error);
      return null;
    }
  }, [sp]);

  const saveCacheFileToArticles = useCallback(async (processedArticles, metadata) => {
    try {
      if (!sp?.web) return false;

      console.log('💾 Saving cache to ArticlesList...');

      const cacheData = {
        metadata: {
          ...metadata,
          lastUpdated: new Date().toISOString(),
          version: "2.0",
          source: "ArticlesList"
        },
        processedDocuments: processedArticles
      };

      const cacheContent = JSON.stringify(cacheData);

      // Check if cache article already exists
      const existingCache = await sp.web.lists
        .getByTitle("ArticlesList")
        .items
        .select("Id")
        .filter("ArticleSlug eq 'cellito-rag-cache'")
        .top(1)();

      if (existingCache && existingCache.length > 0) {
        // Update existing cache
        await sp.web.lists
          .getByTitle("ArticlesList")
          .items.getById(existingCache[0].Id)
          .update({
            ArticleContent: cacheContent,
            LastModifiedContentDate: new Date().toISOString(),
            Modified: new Date().toISOString()
          });
        console.log('✅ Cache updated in ArticlesList');
      } else {
        // Create new cache article
        await sp.web.lists
          .getByTitle("ArticlesList")
          .items.add({
            Title: "Cellito RAG Cache",
            ArticleSlug: "cellito-rag-cache",
            ArticleStatus: "Draft", // Keep as draft so it doesn't appear in public
            ArticleType: "System",
            Category: "Internal",
            ArticleContent: cacheContent,
            Summary: "Internal cache for RAG system",
            LastModifiedContentDate: new Date().toISOString()
          });
        console.log('✅ Cache created in ArticlesList');
      }

      return true;
    } catch (error) {
      console.error('❌ Error saving cache to ArticlesList:', error);
      return false;
    }
  }, [sp]);

  const getArticlesForRAG = useCallback(async () => {
    if (!sp?.web) {
      console.error('SharePoint context not initialized');
      return [];
    }

    try {
      console.log('📚 Fetching published articles for RAG...');

      const list = sp.web.lists.getByTitle("ArticlesList");

      const items = await list.items
        .select(
          "Id",
          "Title",
          "Summary",
          "Category",
          "Subcategory",
          "ArticleType",
          "ArticleLevel",
          "Tags",
          "ArticleContent",
          "ArticleSlug",
          "ReadTime",
          "Created",
          "Modified",
          "LastModifiedContentDate"
        )
        .filter("ArticleStatus eq 'Published' and ArticleSlug ne 'cellito-rag-cache'")
        .orderBy("LastModifiedContentDate", false)
        .top(100)();

      console.log(`📚 Found ${items.length} published articles`);

      if (items.length === 0) {
        console.log('⚠️ No published articles found');
        return [];
      }

      // Process articles into RAG format
      const processedArticles = items.map(article => {
        // Clean HTML from content
        const cleanContent = stripHtmlTags(article.ArticleContent || '');

        // Combine different text fields for better searchability
        const fullText = [
          article.Title || '',
          article.Summary || '',
          cleanContent,
          // Add tags as searchable text
          article.Tags ? (typeof article.Tags === 'string' ? article.Tags : JSON.stringify(article.Tags)) : ''
        ].filter(Boolean).join('\n\n');

        return {
          id: article.Id,
          fileName: `${article.Title || 'Untitled'}.article`, // Virtual filename
          title: article.Title || 'Untitled',
          slug: article.ArticleSlug || '',
          category: article.Category || '',
          subcategory: article.Subcategory || '',
          type: article.ArticleType || '',
          level: article.ArticleLevel || '',
          tags: article.Tags || '',
          summary: article.Summary || '',
          readTime: article.ReadTime || '',
          text: fullText,
          textLength: fullText.length,
          extension: 'article',
          size: fullText.length,
          created: article.Created,
          modified: article.Modified || article.LastModifiedContentDate,
          // Add article-specific metadata
          articleMetadata: {
            id: article.Id,
            slug: article.ArticleSlug,
            category: article.Category,
            subcategory: article.Subcategory,
            type: article.ArticleType,
            level: article.ArticleLevel,
            readTime: article.ReadTime
          }
        };
      });

      console.log('✅ Articles processed for RAG:', {
        totalArticles: processedArticles.length,
        averageLength: Math.round(processedArticles.reduce((sum, a) => sum + a.textLength, 0) / processedArticles.length),
        categoriesFound: [...new Set(processedArticles.map(a => a.category).filter(Boolean))]
      });

      return processedArticles;

    } catch (error) {
      console.error('❌ Error in getArticlesForRAG:', error);
      throw error;
    }
  }, [sp, stripHtmlTags]);



  const createTextChunks = useCallback((text, chunkSize = 800, overlap = 100) => {
    if (!text || text.length === 0) return [];

    const chunks = [];

    // Better sentence splitting
    const sentences = text
      .split(/(?<=[.!?])\s+/)
      .filter(s => s.trim().length > 15) // Filter very short sentences
      .map(s => s.trim());

    if (sentences.length === 0) return [];

    let currentChunk = '';
    let currentSentences = [];

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const testChunk = currentChunk + (currentChunk ? ' ' : '') + sentence;

      if (testChunk.length > chunkSize && currentChunk.length > 0) {
        // Save current chunk
        chunks.push({
          text: currentChunk.trim(),
          size: currentChunk.length,
          sentenceCount: currentSentences.length,
          startsWithCapital: /^[A-Z]/.test(currentChunk.trim()),
          endsWithPunctuation: /[.!?]$/.test(currentChunk.trim())
        });

        // Create overlap - take last sentence
        const overlapSentences = currentSentences.slice(-1);
        currentChunk = overlapSentences.join(' ') + ' ' + sentence;
        currentSentences = [...overlapSentences, sentence];
      } else {
        currentChunk = testChunk;
        currentSentences.push(sentence);
      }
    }

    // Add final chunk
    if (currentChunk.trim().length > 20) { // Only if substantial content
      chunks.push({
        text: currentChunk.trim(),
        size: currentChunk.length,
        sentenceCount: currentSentences.length,
        startsWithCapital: /^[A-Z]/.test(currentChunk.trim()),
        endsWithPunctuation: /[.!?]$/.test(currentChunk.trim())
      });
    }

    console.log(`📄 Created ${chunks.length} optimized chunks`);
    return chunks;
  }, []);

  // 6. QUERY NORMALIZATION for consistent matching
  const normalizeQuery = useCallback((query) => {
    return query.toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
  }, []);

  // 7. DETERMINISTIC RESPONSE STRATEGIES
  const getDeterministicSeed = useCallback((query) => {
    // Create a simple hash for consistent seed generation
    let hash = 0;
    const normalized = normalizeQuery(query);
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) % 1000; // Keep seed reasonable
  }, []);

  const extractKeywords = useCallback((text) => {
    if (!text) return {};

    // Expanded stop words for Portuguese and English
    const stopWords = new Set([
      // Portuguese
      'o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas', 'e', 'ou', 'mas', 'se', 'que', 'de', 'da', 'do', 'das', 'dos',
      'em', 'no', 'na', 'nos', 'nas', 'por', 'para', 'com', 'sem', 'sob', 'sobre', 'entre', 'até', 'desde', 'durante',
      'ser', 'ter', 'estar', 'fazer', 'dizer', 'haver', 'ir', 'ver', 'dar', 'saber', 'vir', 'ficar', 'poder', 'dever',
      'isso', 'isto', 'aquilo', 'ele', 'ela', 'eles', 'elas', 'você', 'vocês', 'nós', 'seu', 'sua', 'seus', 'suas',
      'meu', 'minha', 'meus', 'minhas', 'nosso', 'nossa', 'nossos', 'nossas', 'este', 'esta', 'estes', 'estas',
      'esse', 'essa', 'esses', 'essas', 'aquele', 'aquela', 'aqueles', 'aquelas', 'muito', 'mais', 'menos', 'bem',
      'mal', 'onde', 'quando', 'como', 'porque', 'então', 'assim', 'também', 'ainda', 'já', 'sempre', 'nunca',
      // English
      'the', 'and', 'or', 'but', 'if', 'that', 'of', 'in', 'on', 'at', 'by', 'for', 'with', 'without', 'to', 'from',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
      'could', 'should', 'may', 'might', 'can', 'must', 'shall', 'this', 'that', 'these', 'those', 'i', 'you', 'he',
      'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their',
      'a', 'an', 'some', 'any', 'all', 'each', 'every', 'no', 'not', 'only', 'just', 'very', 'too', 'so', 'now',
      'then', 'here', 'there', 'where', 'when', 'why', 'how', 'what', 'who', 'which', 'whose', 'whom'
    ]);

    // Enhanced text processing
    const processedText = text
      .toLowerCase()
      .replace(/[^\w\sàáâãäåçèéêëìíîïñòóôõöùúûüý]/g, ' ') // Keep accented characters
      .replace(/\s+/g, ' ')
      .trim();

    const words = processedText
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .filter(word => !/^\d+$/.test(word)); // Remove pure numbers

    // Calculate word frequencies
    const wordFreq = {};
    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    // Extract phrases (2-3 words)
    const phrases = [];
    for (let i = 0; i < words.length - 1; i++) {
      const phrase2 = words[i] + ' ' + words[i + 1];
      const phrase3 = i < words.length - 2 ? words[i] + ' ' + words[i + 1] + ' ' + words[i + 2] : null;

      phrases.push(phrase2);
      if (phrase3) phrases.push(phrase3);
    }

    const phraseFreq = {};
    phrases.forEach(phrase => {
      phraseFreq[phrase] = (phraseFreq[phrase] || 0) + 1;
    });

    // Combine and rank keywords
    const allKeywords = {};

    // Single words (weight: 1x)
    Object.entries(wordFreq).forEach(([word, freq]) => {
      if (freq > 1) { // Only include words that appear more than once
        allKeywords[word] = freq;
      }
    });

    // Phrases (weight: 2x for appearing together)
    Object.entries(phraseFreq).forEach(([phrase, freq]) => {
      if (freq > 1) {
        allKeywords[phrase] = freq * 2;
      }
    });

    // Return top 30 keywords/phrases
    return Object.entries(allKeywords)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 30)
      .reduce((acc, [keyword, freq]) => {
        acc[keyword] = freq;
        return acc;
      }, {});
  }, []);

  const processArticlesForRAG = useCallback((articles) => {
    console.log(`🔄 Processing ${articles.length} articles for RAG...`);

    const processedArticles = [];

    articles.forEach((article, articleIndex) => {
      if (!article.text || article.text.length < 50) {
        console.log(`⚠️ Skipping article "${article.title}" - insufficient content`);
        return;
      }

      console.log(`📝 Processing article: "${article.title}" (${article.text.length} chars)`);

      // Create chunks for this article
      const chunks = createTextChunks(article.text, 800, 100);

      console.log(`   Created ${chunks.length} chunks`);

      // Add article with chunks to processed list
      processedArticles.push({
        ...article,
        chunks,
        totalChunks: chunks.length,
        // Create keywords for better search
        keywords: extractKeywords(article.text),
        // Store original text length
        originalTextLength: article.text.length
      });
    });

    console.log(`✅ Processed ${processedArticles.length} articles with ${processedArticles.reduce((sum, a) => sum + a.totalChunks, 0)} total chunks`);

    return processedArticles;
  }, [createTextChunks, extractKeywords]);

  const initializeRAGWithArticles = useCallback(async () => {
    if (!sp?.web || isIndexing) return;

    setIsIndexing(true);

    try {
      console.log('🚀 Initializing RAG system with ArticlesList...');

      // Step 1: Get current articles metadata
      const currentMetadata = await getArticlesMetadata();
      console.log('📊 Current articles metadata obtained');

      // Step 2: Try to load cache
      const cacheData = await getCacheFileFromArticles();

      // Step 3: Validate cache against current articles
      if (cacheData) {
        console.log('💾 Found existing cache, validating...');

        if (isCacheValidForArticles(cacheData, currentMetadata)) {
          console.log('✅ Using cached data');

          setProcessedDocs(cacheData.processedDocuments);

          const totalChunks = cacheData.processedDocuments.reduce(
            (sum, doc) => sum + doc.totalChunks, 0
          );

          setRagStatus({
            totalDocs: cacheData.processedDocuments.length,
            totalChunks,
            isReady: true,
            fromCache: true,
            lastUpdated: cacheData.metadata?.lastUpdated
          });

          console.log('✅ RAG system ready with cached data');

          return {
            success: true,
            fromCache: true,
            processedDocs: cacheData.processedDocuments,
            ragStatus: {
              totalDocs: cacheData.processedDocuments.length,
              totalChunks,
              isReady: true,
              fromCache: true,
              lastUpdated: cacheData.metadata?.lastUpdated
            }
          };
        } else {
          console.log('❌ Cache invalid, rebuilding...');
        }
      } else {
        console.log('ℹ️ No cache found, building from scratch...');
      }

      // Step 4: Cache is invalid or doesn't exist, rebuild
      console.log('🔄 Loading and processing articles...');

      // Get all published articles content
      const allArticles = await getArticlesForRAG();

      // Verify count matches our metadata check
      if (allArticles.length !== currentMetadata.count) {
        console.warn(`⚠️ Article count mismatch! Metadata: ${currentMetadata.count}, Loaded: ${allArticles.length}`);
      }

      // Process articles into chunks
      console.log('🔄 Processing articles for RAG...');
      const processed = processArticlesForRAG(allArticles);
      setProcessedDocs(processed);

      // Update status
      const totalChunks = processed.reduce((sum, doc) => sum + doc.totalChunks, 0);
      const newRagStatus = {
        totalDocs: processed.length,
        totalChunks,
        isReady: true,
        fromCache: false,
        lastUpdated: new Date().toISOString()
      };

      setRagStatus(newRagStatus);

      // Step 5: Save to cache with verified metadata
      console.log('💾 Saving new cache...');
      const cacheMetadata = {
        totalArticles: processed.length,
        totalChunks,
        lastModified: currentMetadata.lastModified,
        articleIds: currentMetadata.articleIds,
        buildTime: new Date().toISOString(),
        articlesCount: currentMetadata.count
      };

      await saveCacheFileToArticles(processed, cacheMetadata);

      console.log('✅ RAG system initialized successfully');

      return {
        success: true,
        fromCache: false,
        processedDocs: processed,
        ragStatus: newRagStatus
      };

    } catch (err) {
      console.error('❌ RAG initialization failed:', err);
      const errorStatus = {
        totalDocs: 0,
        totalChunks: 0,
        isReady: false,
        fromCache: false,
        lastUpdated: null
      };
      setRagStatus(errorStatus);

      return {
        success: false,
        error: err.message,
        ragStatus: errorStatus
      };
    } finally {
      setIsIndexing(false);
    }
  }, [
    sp,
    getArticlesForRAG,
    processArticlesForRAG,
    isIndexing,
    getArticlesMetadata,
    getCacheFileFromArticles,
    isCacheValidForArticles,
    saveCacheFileToArticles
  ]);

  const rebuildArticlesCache = useCallback(async () => {
    try {
      console.log('🔄 Rebuilding articles cache...');

      // Clear current state
      setProcessedDocs([]);
      setRagStatus({
        totalDocs: 0,
        totalChunks: 0,
        isReady: false,
        fromCache: false,
        lastUpdated: null
      });

      // Call the initialization directly
      return await initializeRAGWithArticles();

    } catch (error) {
      console.error('❌ Error rebuilding articles cache:', error);
      throw error;
    }
  }, [initializeRAGWithArticles, setProcessedDocs, setRagStatus]);


  const processDocumentsForRAG = useCallback((documents) => {
    const processedDocs = [];

    documents.forEach((doc, docIndex) => {
      if (!doc.text || doc.text.length < 50) {
        return;
      }


      // Create chunks for this document
      const chunks = createTextChunks(doc.text, 500, 100);


      // Add document with chunks to processed list
      processedDocs.push({
        ...doc,
        chunks,
        totalChunks: chunks.length,
        // Create keywords for better search
        keywords: extractKeywords(doc.text),
        // Store original text length
        originalTextLength: doc.text.length
      });
    });

    return processedDocs;
  }, [createTextChunks]);

  const calculateSimilarity = useCallback((query, chunk, doc) => {
    const queryLower = query.toLowerCase();
    const chunkTextLower = chunk.text.toLowerCase();
    const docNameLower = doc.fileName.toLowerCase();

    let score = 0;
    const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2);
    const chunkWords = chunkTextLower.split(/\s+/);

    // 1. EXACT PHRASE MATCHING (highest weight) - More precise
    const queryPhrase = queryLower.trim();
    if (chunkTextLower.includes(queryPhrase)) {
      score += 200; // Increased weight for exact matches
    }

    // 2. SEMANTIC WORD MATCHING with better weights
    let wordMatchScore = 0;
    let exactWordMatches = 0;

    queryWords.forEach(queryWord => {
      // Exact word matches (highest priority)
      const exactMatches = chunkWords.filter(word => word === queryWord).length;
      if (exactMatches > 0) {
        exactWordMatches++;
        wordMatchScore += exactMatches * 25; // Increased from 15
      }

      // Partial matches (reduced weight to avoid noise)
      const partialMatches = chunkWords.filter(word =>
        word.length > 3 && queryWord.length > 3 &&
        (word.includes(queryWord) || queryWord.includes(word))
      ).length;
      wordMatchScore += partialMatches * 5; // Reduced from 8
    });

    // Bonus for high word match ratio
    const wordMatchRatio = exactWordMatches / queryWords.length;
    if (wordMatchRatio > 0.5) {
      score += wordMatchScore * 2; // Double score for high match ratio
    } else {
      score += wordMatchScore;
    }

    // 3. PROXIMITY SCORING - Words appearing close together
    let proximityScore = 0;
    for (let i = 0; i < queryWords.length - 1; i++) {
      const word1 = queryWords[i];
      const word2 = queryWords[i + 1];

      // Look for words within 20 characters of each other
      const regex = new RegExp(`${word1}.{0,20}${word2}|${word2}.{0,20}${word1}`, 'i');
      if (regex.test(chunk.text)) {
        proximityScore += 30; // Increased proximity bonus
      }
    }
    score += proximityScore;

    // 4. DOCUMENT TITLE/NAME RELEVANCE
    queryWords.forEach(queryWord => {
      if (docNameLower.includes(queryWord)) {
        score += 15; // Reduced from 25 to balance with content
      }
    });

    // 5. QUALITY AND CONTEXT BONUSES
    if (chunk.startsWithCapital && chunk.endsWithPunctuation) score += 10;
    if (chunk.sentenceCount >= 2 && chunk.sentenceCount <= 5) score += 8; // Sweet spot

    // 6. LENGTH PENALTIES for very short or very long chunks
    if (chunk.text.length < 100) {
      score *= 0.7; // Penalty for too short
    } else if (chunk.text.length > 1000) {
      score *= 0.9; // Slight penalty for very long
    }

    // 7. KEYWORD DENSITY CHECK (prevent keyword stuffing)
    const totalWords = chunkWords.length;
    const keywordDensity = exactWordMatches / totalWords;
    if (keywordDensity > 0.1) { // If more than 10% are query words
      score += 20; // Bonus for relevant density
    }

    return Math.round(score);
  }, []);

  // 4. IMPROVED RELEVANCE FINDING
  const findRelevantChunks = useCallback((processedDocuments, query, maxChunks = 3) => {
    if (!processedDocuments || processedDocuments.length === 0) {
      return [];
    }

    console.log(`🔍 Searching ${processedDocuments.length} documents for: "${query}"`);

    const relevantChunks = [];
    let totalChunksSearched = 0;

    processedDocuments.forEach((doc, docIndex) => {
      doc.chunks.forEach((chunk, chunkIndex) => {
        totalChunksSearched++;
        const score = calculateSimilarity(query, chunk, doc);

        if (score > 0) {
          relevantChunks.push({
            chunk,
            score,
            document: {
              fileName: doc.fileName,
              title: doc.title,
              category: doc.category,
              articleMetadata: doc.articleMetadata
            },
            chunkIndex,
            docIndex,
            estimatedTokens: Math.ceil((chunk.text?.length || 0) / 4)
          });
        }
      });
    });

    // IMPROVED SORTING with multiple criteria
    const sortedChunks = relevantChunks.sort((a, b) => {
      // Primary: Score difference
      if (Math.abs(b.score - a.score) > 5) {
        return b.score - a.score;
      }

      // Secondary: Sentence count (prefer 2-4 sentences)
      const aSentenceScore = Math.abs(a.chunk.sentenceCount - 3);
      const bSentenceScore = Math.abs(b.chunk.sentenceCount - 3);
      if (aSentenceScore !== bSentenceScore) {
        return aSentenceScore - bSentenceScore;
      }

      // Tertiary: Text quality
      const aQuality = (a.chunk.startsWithCapital ? 1 : 0) + (a.chunk.endsWithPunctuation ? 1 : 0);
      const bQuality = (b.chunk.startsWithCapital ? 1 : 0) + (b.chunk.endsWithPunctuation ? 1 : 0);

      return bQuality - aQuality;
    });

    // STRICTER FILTERING - Only high-quality matches
    const minScore = 30; // Increased minimum score
    const filteredChunks = sortedChunks.filter(item => item.score >= minScore);

    // SMART SELECTION with diversity
    const selectedChunks = [];
    const usedDocuments = new Set();
    let currentTokens = 0;
    const maxContextTokens = 2500; // Reduced for better focus

    for (const chunk of filteredChunks) {
      if (selectedChunks.length >= maxChunks) break;
      if (currentTokens + chunk.estimatedTokens > maxContextTokens) continue;

      // Prefer diversity - try to get chunks from different documents
      const docKey = chunk.document.title || chunk.document.fileName;
      if (selectedChunks.length < 2 || !usedDocuments.has(docKey) || selectedChunks.length === 0) {
        selectedChunks.push(chunk);
        usedDocuments.add(docKey);
        currentTokens += chunk.estimatedTokens;
      }
    }

    console.log(`📊 Found ${selectedChunks.length} high-quality chunks (min score: ${minScore})`);
    selectedChunks.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.document.title} - Score: ${item.score}`);
    });

    return selectedChunks;
  }, [calculateSimilarity]);

  const searchWebForQuery = useCallback(async (query) => {
    const response = await fetch(
      `https://www.googleapis.com/customsearch/v1?key=${import.meta.env.VITE_GOOGLE_SEARCH_API_KEY}&cx=${import.meta.env.VITE_GOOGLE_SEARCH_ENGINE_ID}&q=africell%3A${encodeURIComponent(query)}&num=3`
    );

    const data = await response.json();
    return (data.items || []).map(item => ({
      title: item.title,
      snippet: item.snippet,
      url: item.link,
      source: new URL(item.link).hostname
    }));
  }, []);

  // 5. ENHANCED CONTEXT CREATION
  const createContextForGroq = useCallback((relevantChunks, webResults, query) => {
    let context = `PERGUNTA: "${query}"\n\n`;

    // Add internal documents first (higher priority)
    if (relevantChunks && relevantChunks.length > 0) {
      context += `Artigos INTERNOS:\n\n`;
      relevantChunks.forEach((item, index) => {
        const docName = item.document.title || item.document.fileName;
        context += `${index + 1}. FONTE INTERNA: ${docName}\n`;
        if (item.document.category) {
          context += `   CATEGORIA: ${item.document.category}\n`;
        }
        context += `   CONTEÚDO: ${item.chunk.text.trim()}\n\n`;
      });
    }

    // Add web results as supplementary information
    if (webResults && webResults.length > 0) {
      context += `INFORMAÇÕES WEB COMPLEMENTARES:\n\n`;
      webResults.forEach((result, index) => {
        context += `${index + 1}. FONTE WEB: ${result.title}\n`;
        context += `   SITE: ${result.source}\n`;
        context += `   RESUMO: ${result.snippet}\n\n`;
      });
    }
    console.log({context})
    return context;
  }, []);

  const shouldSearchWeb = useCallback((relevantChunks, query, confidence) => {
    // Search web if:
    // - No relevant internal documents found
    // - Very low confidence in internal results
    // - Query seems to require current/recent information
    // - Query explicitly asks for current information

    const lowConfidence = confidence < 40;
    const noInternalResults = !relevantChunks || relevantChunks.length === 0;
    const needsCurrentInfo = /\b(atual|recente|hoje|agora|último|nova|novo|2024|2025)\b/i.test(query);
    const askingForCurrentInfo = /\b(qual.*(atual|recente)|como.*(hoje|agora))\b/i.test(query);

    const shouldSearch = noInternalResults || lowConfidence || needsCurrentInfo || askingForCurrentInfo;

    console.log('🤔 Web search decision:', {
      shouldSearch,
      reasons: {
        noInternalResults,
        lowConfidence,
        needsCurrentInfo,
        askingForCurrentInfo
      }
    });

    return shouldSearch;
  }, []);


  // Add internal state for caching operations

  const CACHE_FILE_NAME = "cellito_rag_cache.txt";
  const CACHE_FOLDER = "Documents"; // or wherever you want to store the cache



  // Initialization of feedbacks


  const upsertHighQualityQnA = useCallback(async ({ question, answer, source = 'internal', tags = [] }) => {
    if (!sp?.web) return;

    try {
      const normalizedQuestion = question.trim().toLowerCase().substring(0, 100);
      const list = sp.web.lists.getByTitle("HighQualityQnA");

      // ✅ Fixed: Use () instead of .get()
      const existingItems = await list.items
        .select("Id", "RatingCount", "AverageRating")
        .filter(`substringof('${normalizedQuestion.replace(/'/g, "''")}', tolower(Question))`)
        .top(1)();

      if (existingItems.length > 0) {
        const item = existingItems[0];
        const newRatingCount = item.RatingCount + 1;
        const newAvgRating = parseFloat(
          ((item.AverageRating * item.RatingCount + 5) / newRatingCount).toFixed(2)
        );

        await list.items.getById(item.Id).update({
          RatingCount: newRatingCount,
          AverageRating: newAvgRating,
          LastUsed: new Date().toISOString(),
          ConfidenceScore: Math.min(100, 70 + newAvgRating * 6),
        });

        console.log(`✅ Updated Q&A: "${question.substring(0, 50)}..."`);
      } else {
        await list.items.add({
          Title: question.length > 90 ? question.substring(0, 87) + "..." : question,
          Question: question,
          Answer: answer,
          Source: source,
          RatingCount: 1,
          AverageRating: 5.0,
          ConfidenceScore: 90,
          Tags: Array.isArray(tags) ? tags.join(", ") : "",
          IsApproved: true,
          LastUsed: new Date().toISOString(),
        });

        console.log(`✅ New Q&A saved: "${question.substring(0, 50)}..."`);
      }
    } catch (error) {
      console.error("❌ Failed to save Q&A:", error);
    }
  }, [sp]);

  const getSimilarQnAFromFeedback = useCallback(async (query, minConfidence = 70, topN = 3) => {
    if (!sp?.web || !query?.trim()) return [];

    try {
      const normalizedQuery = query.toLowerCase().trim();
      const words = normalizedQuery.split(/\s+/).filter(w => w.length > 3);

      // ✅ Fixed: Use () to execute
      const items = await sp.web.lists.getByTitle("HighQualityQnA")
        .items
        .select("Question", "Answer", "AverageRating", "ConfidenceScore", "Tags")
        .filter(`ConfidenceScore ge ${minConfidence} and IsApproved eq true`)();

      const scored = items
        .map(item => {
          const qWords = item.Question.toLowerCase().split(/\s+/);
          const matches = words.filter(word => qWords.some(qw => qw.includes(word) || word.includes(qw))).length;
          const relevance = matches / words.length;
          const ratingBoost = item.AverageRating / 5;
          const confidenceBoost = item.ConfidenceScore / 100;
          const score = relevance * ratingBoost * confidenceBoost * 100;

          return {
            question: item.Question,
            answer: item.Answer,
            score,
            avgRating: item.AverageRating,
          };
        })
        .filter(item => item.score > 20)
        .sort((a, b) => b.score - a.score)
        .slice(0, topN);

      console.log(`🔍 Found ${scored.length} feedback-based answers for: "${query}"`);
      return scored;
    } catch (error) {
      console.error("❌ Error fetching feedback Q&A:", error);
      return [];
    }
  }, [sp]);





  // 1. Updated getCacheFile function
  const getCacheFile = useCallback(async () => {
    try {
      if (!sp?.web) return null;



      // Use your existing getDocumentTextFromFolder method to find the cache file
      const cacheFiles = await getDocumentTextFromFolder("Documents", "", {
        top: 5,
        excludeErrors: true,
        filter: `FileLeafRef eq '${CACHE_FILE_NAME}'`
      });

      if (cacheFiles && cacheFiles.length > 0) {
        const cacheFile = cacheFiles[0];
        if (cacheFile.text) {
          const cacheData = JSON.parse(cacheFile.text);

          return cacheData;
        }
      }


      return null;
    } catch (error) {

      return null;
    }
  }, [sp, getDocumentTextFromFolder]);

  // 2. Updated saveCacheFile function using your existing addFile method
  const saveCacheFile = useCallback(async (processedDocs, metadata) => {
    try {
      if (!sp?.web) return false;



      const cacheData = {
        metadata: {
          ...metadata,
          lastUpdated: new Date().toISOString(),
          version: "1.0"
        },
        processedDocuments: processedDocs
      };

      const cacheContent = JSON.stringify(cacheData, null, 2);

      // Create a blob from the content
      const blob = new Blob([cacheContent], { type: 'text/plain' });
      const file = new File([blob], CACHE_FILE_NAME, { type: 'text/plain' });

      // Use your existing addFile method to upload to SharePoint
      await addFile({ file, category: "RAG_Cache" });


      return true;
    } catch (error) {
      console.error('❌ Error saving cache file:', error);
      return false;
    }
  }, [sp, addFile]);


  // 2. Enhanced isCacheValid with detailed logging
  const isCacheValid = useCallback((cacheData, currentMetadata) => {
    if (!cacheData || !cacheData.metadata || !currentMetadata) {

      return false;
    }

    const cache = cacheData.metadata;


    console.log('📋 Cache metadata:', {
      totalDocs: cache.totalDocs,
      lastModified: cache.lastModified,
      fileCount: cache.fileNames?.length || 0
    });
    console.log('📋 Current metadata:', {
      count: currentMetadata.count,
      lastModified: currentMetadata.lastModified,
      fileCount: currentMetadata.fileNames?.length || 0
    });

    // Check document count
    if (cache.totalDocs !== currentMetadata.count) {


      return false;
    }

    // Check if file list changed (most reliable check)
    if (cache.fileNames && currentMetadata.fileNames) {
      const cacheFiles = JSON.stringify(cache.fileNames);
      const currentFiles = JSON.stringify(currentMetadata.fileNames);

      if (cacheFiles !== currentFiles) {



        // Show detailed differences for debugging
        const cacheSet = new Set(cache.fileNames);
        const currentSet = new Set(currentMetadata.fileNames);

        const added = currentMetadata.fileNames.filter(f => !cacheSet.has(f));
        const removed = cache.fileNames.filter(f => !currentSet.has(f));




        return false;
      }
    }

    // Check last modified date (optional but helpful)
    if (cache.lastModified && currentMetadata.lastModified) {
      const cacheDate = new Date(cache.lastModified);
      const currentDate = new Date(currentMetadata.lastModified);
      if (currentDate > cacheDate) {




        return false;
      }
    }


    return true;
  }, []);


  // 3. Enhanced initializeRAGWithCache with better validation and logging
  const initializeRAGWithCache = useCallback(async () => {
    if (!sp?.web || isIndexing) return;

    setIsIndexing(true);

    try {


      // Step 1: Get current document metadata from folder
      const currentMetadata = await getArticlesMetadata();


      // Step 2: Try to load cache

      const cacheData = await getCacheFile();

      // Step 3: Validate cache against current folder state
      if (cacheData) {


        if (isCacheValid(cacheData, currentMetadata)) {


          setProcessedDocs(cacheData.processedDocuments);

          const totalChunks = cacheData.processedDocuments.reduce(
            (sum, doc) => sum + doc.totalChunks, 0
          );

          setRagStatus({
            totalDocs: cacheData.processedDocuments.length,
            totalChunks,
            isReady: true,
            fromCache: true,
            lastUpdated: cacheData.metadata?.lastUpdated
          });



          return {
            success: true,
            fromCache: true,
            processedDocs: cacheData.processedDocuments,
            ragStatus: {
              totalDocs: cacheData.processedDocuments.length,
              totalChunks,
              isReady: true,
              fromCache: true,
              lastUpdated: cacheData.metadata?.lastUpdated
            }
          };
        } else {

        }
      } else {

      }

      // Step 4: Cache is invalid or doesn't exist, rebuild


      // Get full documents with content (exclude cache file)

      const allDocuments = await getDocumentTextFromFolder("Documents", "", {
        top: 50,
        excludeErrors: false
      });

      // Filter out cache file from processing
      const documents = allDocuments.filter(doc => doc.fileName !== CACHE_FILE_NAME);



      // Verify count matches our metadata check
      if (documents.length !== currentMetadata.count) {
        console.warn(`⚠️ Document count mismatch! Metadata: ${currentMetadata.count}, Loaded: ${documents.length}`);
      }

      // Process documents into chunks

      const processed = processDocumentsForRAG(documents);
      setProcessedDocs(processed);

      // Update status
      const totalChunks = processed.reduce((sum, doc) => sum + doc.totalChunks, 0);
      const newRagStatus = {
        totalDocs: processed.length,
        totalChunks,
        isReady: true,
        fromCache: false,
        lastUpdated: new Date().toISOString()
      };

      setRagStatus(newRagStatus);

      // Step 5: Save to cache with verified metadata

      const cacheMetadata = {
        totalDocs: processed.length,
        totalChunks,
        lastModified: currentMetadata.lastModified,
        fileNames: currentMetadata.fileNames,
        buildTime: new Date().toISOString(),
        folderDocCount: currentMetadata.count // Extra verification
      };

      await saveCacheFile(processed, cacheMetadata);



      return {
        success: true,
        fromCache: false,
        processedDocs: processed,
        ragStatus: newRagStatus
      };

    } catch (err) {
      console.error('❌ RAG initialization failed:', err);
      const errorStatus = {
        totalDocs: 0,
        totalChunks: 0,
        isReady: false,
        fromCache: false,
        lastUpdated: null
      };
      setRagStatus(errorStatus);

      return {
        success: false,
        error: err.message,
        ragStatus: errorStatus
      };
    } finally {
      setIsIndexing(false);
    }
  }, [
    sp,
    getDocumentTextFromFolder,
    processDocumentsForRAG,
    isIndexing,
    getArticlesMetadata,
    getCacheFile,
    isCacheValid,
    saveCacheFile
  ]);

  // 5. Separate rebuild function - defined after initializeRAGWithCache
  const performCacheRebuild = useCallback(async () => {
    try {


      // Clear current state
      setProcessedDocs([]);
      setRagStatus({
        totalDocs: 0,
        totalChunks: 0,
        isReady: false,
        fromCache: false,
        lastUpdated: null
      });

      // Note: We can't easily delete the old cache file with current setup
      // The new cache will overwrite it when saved


      // Call the initialization directly
      return await initializeRAGWithCache();

    } catch (error) {
      console.error('❌ Error rebuilding cache:', error);
      throw error;
    }
  }, [initializeRAGWithCache, setProcessedDocs, setRagStatus]);


  // Reset RAG state function
  const resetRAGState = useCallback(() => {
    setIsIndexing(false);
    setProcessedDocs([]);
    setRagStatus({
      totalDocs: 0,
      totalChunks: 0,
      isReady: false,
      fromCache: false,
      lastUpdated: null
    });
  }, [setIsIndexing, setProcessedDocs, setRagStatus]);


  // Helper function to create web context
  const createWebContext = useCallback((webResults, query) => {
    if (!webResults || webResults.length === 0) return "";

    let context = `CONTEXTO WEB PARA: "${query}"\n\n`;

    webResults.slice(0, 3).forEach((result, index) => {
      context += `📌 Fonte ${index + 1}: ${result.title}\n`;
      context += `${result.snippet || result.content}\n\n`;
    });

    return context;
  }, []);

  const addHighQualityQnA = useCallback(async (question, answer, source = 'internal', tags = [], confidenceScore = 90) => {
    if (!sp?.web) {
      console.error("❌ SharePoint context not available");
      return;
    }

    // Validate required fields
    if (!question || !answer) {
      console.error("❌ Question and Answer are required");
      return;
    }

    // Ensure numeric fields are numbers
    const ratingCount = 1;
    const averageRating = 5.0;

    // Prepare item data with correct types
    const itemData = {
      Title: question.length > 90 ? question.substring(0, 87) + "..." : question,
      Question: question,
      Answer: answer,
      Source: source, // Choice: must be one of your options (e.g., 'internal', 'web', 'hybrid')
      RatingCount: Number(ratingCount),
      AverageRating: Number(averageRating),
      ConfidenceScore: Number(confidenceScore),
      Tags: Array.isArray(tags) ? tags.join(", ") : String(tags),
      LastUsed: new Date().toISOString(), // ISO string → SharePoint handles conversion
      IsApproved: "Yes" // Choice field: use "Yes" or "No" (text value of choice)
    };

    try {
      console.log("📤 Attempting to save to HighQualityQnA:", itemData);

      const result = await sp.web.lists.getByTitle("HighQualityQnA").items.add(itemData);

      console.log("✅ Successfully saved Q&A to SharePoint", result.data);
      return result.data;
    } catch (error) {
      console.error("❌ Failed to save Q&A to HighQualityQnA list:", error);

      // Enhanced error logging
      if (error.isHttpRequestError) {
        try {
          const responseText = await error.response.clone().text();
          console.error("📋 Full error response:", responseText);
        } catch (detailError) {
          console.error("Could not read error response:", detailError);
        }
      }

      throw error;
    }
  }, [sp]);


  // 6. ENHANCED GROQ QUERY WITH VERIFICATION
  const queryGroqWithRAG = useCallback(async (userQuery, processedDocuments, messageHistory = []) => {
    try {
      console.log('🤖 Starting enhanced RAG query with web support:', userQuery);

      // Step 1: Search internal documents first
      const maxChunks = 8;
      const minScoreThreshold = 0.7;
      const relevantChunks = findRelevantChunks(processedDocuments, userQuery, maxChunks)
        .filter(chunk => chunk.score >= minScoreThreshold);

      // Calculate initial confidence
      const avgScore = relevantChunks.length > 0
        ? relevantChunks.reduce((sum, chunk) => sum + chunk.score, 0) / relevantChunks.length
        : 0;
      const confidence = Math.min(95, Math.max(20, Math.round(avgScore * 0.8)));

      console.log('📊 Internal search results:', {
        chunksFound: relevantChunks.length,
        avgScore: Math.round(avgScore),
        confidence
      });

      // Step 2: Determine if we need web search
      let webResults = [];
      const needsWebSearch = shouldSearchWeb(relevantChunks, userQuery, confidence);

      if (needsWebSearch) {
        console.log('🌐 Triggering web search for additional context');
        webResults = await searchWebForQuery(userQuery);
      }

      // Step 3: Handle case where we have neither internal nor web results
      if (relevantChunks.length === 0 && webResults.length === 0) {
        return {
          content: "Não encontrei informações relevantes para responder à sua pergunta. Pode reformular ou ser mais específico?",
          //sources: [],
          //webSources: [],
          hasRelevantDocs: false,
          hasWebResults: false,
          confidence: 0
        };
      }

      // Step 4: Create enhanced context with both internal and web sources
      const context = createContextForGroq(relevantChunks, webResults, userQuery);
      const systemMessage = {
        role: "system",
        content: `
        Você é o Cellito, expert em customer experience da Africell Angola.
        Forneça respostas PRECISAS, CONSISTENTES e ESPECÍFICAS usando SOMENTE as informações no bloco "BASE DE CONHECIMENTO" abaixo.



        REGRAS:
        - Ignore erros ortograficos e leia as informacoes na mesma
        - Responda SEMPRE no idioma que lhe for perguntado mesmo que for necessario traduzir a informacao da base de conhecimento
        - Se a resposta não estiver na base, diga e de sugira uma questao
        - Espere perguntas muito longas, mas mantenha a precisão para a extração tais como :
          - quais sao os telemoveis que temos a venda
        1. Não invente dados, preços, prazos ou nomes de planos.
        2. Sempre responda no idioma do usuário.
        3. Sempre que for requisitado, compare planos e serviços com base na informação disponível.
        4. Sempre inclua preços ao falar de planos.
        5. Use respostas curtas e claras.
        6. Se o mesmo plano tiver variações (diário, semanal, mensal), destaque as diferenças.
        7. Reconheça sinônimos, abreviações e erros ortográficos.
        8. Mantenha a mesma resposta para perguntas idênticas.

        Quando fizer comparações, use esta estrutura:
        - Nome do plano: [benefícios] — [preço]
        - Nome do plano: [benefícios] — [preço]
        - Forneça a informação dos preços com precisão

        ---
        BASE DE CONHECIMENTO:
        ${context}
        ---
        `
      };

      // Step 5: Enhanced system prompt
      // const systemMessage = {
      //   role: "system",
      //   content: `
      //   Você é o Cellito, expert em customer experience com alto dominio das informações relacionadas a Africell Angola.
      //   Sua função é fornecer suporte aos agentes de apoio ao cliente com respostas PRECISAS, CONSISTENTES e ESPECÍFICAS sobre produtos, serviços, planos e suporte técnico da Africell.
      //   REGRAS CRÍTICAS:
      //     1.	Use SOMENTE as informações fornecidas no contexto — nunca invente dados.
      //     2.	Seja ESPECÍFICO e PRECISO — evite generalidades.
      //     3.	Se não souber exatamente, diga: "Não tenho essa informação específica" e Ofereça sugestāo de forma amigavel de pergunta relacionada ao contexto que saibas a resposta .
      //     4.	Mantenha a MESMA resposta para perguntas idênticas.
      //     5.	Seja objetivo e direto — respostas curtas e claras.
      //     6.	Responda no mesmo idioma usado pelo usuário (Português ou Inglês).
      //     6.	Voce é o apoio ao cliente não peça ao usuario para entrar em contacto com o apoio ao cliente.
      //     7.	SEMPRE que encontrar kz ou kzs entregue como preços.
      //     8.	SEMPRE que for requisitado faça comparacões entre os planos e serviços.
      //     9.	Quando falar de um plano mencione os precos mesmo sem que lhe for requisitado diretamente.

      //   COMO INTERPRETAR AS PERGUNTAS:
      //     •	Entenda variações, sinônimos, abreviações, erros ortográficos e perguntas mistas em português e inglês.
      //     •	Reconheça termos equivalentes:
      //       ◦	"cartão SIM" = "chip" = "SIM card"
      //       ◦	"pacote de dados" = "internet bundle" = "plano de internet"
      //       ◦	"plano diário" = "24h" = "1 dia"
      //       ◦	"plano semanal" = "7 dias"
      //       ◦	"plano mensal" = "30 dias"
      //     •	Detecte palavras-chave como: Socializa, Tudo e Todos, Konekta, eSIM, roaming, tarifa, pacote, SMS, saldo, promoção, 5G, 4G, Preço.
      //     •	Agrupe perguntas semelhantes mesmo com redações diferentes:
      //     ◦	"Quanto custa um cartão SIM?" → "How much does a SIM card cost?"
      //     ◦	"Tem pacote semanal de internet?" → "Can I buy a weekly data bundle?"
      //     ◦	"Diferença entre Konekta 5G e 4G?" → "What’s the difference between Konekta 5G and 4G?"


      //   SEMPRE MANTENHA:
      //     •	Não inventar valores, prazos ou nomes de planos.
      //     •	Se o contexto não responder, diga que não sabe e sugira contato com o apoio ao cliente.
      //     •	Se houver várias respostas possíveis, escolha a que melhor se encaixa na pergunta específica.
      //     •	Ofereça sugestoes de perguntas relacionadas ao contexto quando não encontrar uma resposta .

      //     ${context}`
      // };

      // Step 6: Process with Groq
      const recentHistory = messageHistory.slice(-2);
      const messages = [
        systemMessage,
        { role: "user", content: userQuery }
      ];

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_APP_GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-20b",
          messages: messages,
          max_tokens: 1500,
          temperature: 0.3,  // play with 0.1 to 0.3 for some variability
          top_p: 0.95,
          frequency_penalty: 0.2,
          presence_penalty: 0.1,
          seed: 42
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;

      // Step 7: Calculate final confidence considering both sources
      let finalConfidence = confidence;
      if (webResults.length > 0 && relevantChunks.length > 0) {
        finalConfidence = Math.min(85, confidence + 15); // Boost confidence when we have both
      } else if (webResults.length > 0 && relevantChunks.length === 0) {
        finalConfidence = 65; // Moderate confidence for web-only results
      }

      return {
        content: aiResponse,
        // sources: relevantChunks.map(chunk => ({
        //   fileName: chunk.document.fileName,
        //   title: chunk.document.title,
        //   relevanceScore: chunk.score,
        //   category: chunk.document.category,
        //   type: 'internal'
        // })),
        // webSources: webResults.map(result => ({
        //   title: result.title,
        //   url: result.url,
        //   source: result.source,
        //   snippet: result.snippet,
        //   type: 'web'
        // })),
        hasRelevantDocs: relevantChunks.length > 0,
        hasWebResults: webResults.length > 0,
        confidence: finalConfidence,
        queryInfo: {
          chunksFound: relevantChunks.length,
          webResultsFound: webResults.length,
          avgRelevanceScore: Math.round(avgScore),
          usedWebSearch: needsWebSearch,
          searchStrategy: needsWebSearch ? 'hybrid' : 'internal-only'
        }
      };

    } catch (error) {
      console.error('❌ Enhanced RAG query error:', error);
      throw error;
    }
  }, [findRelevantChunks, createContextForGroq, shouldSearchWeb, searchWebForQuery]);



  const queryGroqSimple = useCallback(async (userQuery, messageHistory = []) => {
    try {


      const systemMessage = {
        role: "system",
        content: `Você é Cellito, um assistente de experiência do cliente profissional e prestativo.

INSTRUÇÕES:
- Seja profissional, empático e útil
- Foque em resolver problemas e ajudar clientes
- Forneça respostas claras e práticas
- Use um tom amigável mas profissional
- Se não souber algo específico, seja honesto e ofereça alternativas úteis`
      };

      const filteredHistory = messageHistory.filter(msg => msg.role !== 'system');
      const currentUserMessage = { role: "user", content: userQuery };

      const messagesToSend = [
        systemMessage,
        ...filteredHistory,
        currentUserMessage
      ];

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_APP_GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-20b",
          messages: messagesToSend,
          max_tokens: 1024,
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Groq API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      return {
        content: data.choices[0].message.content,
        // sources: [],
        hasRelevantDocs: false,
        totalChunksSearched: 0
      };

    } catch (error) {
      console.error('❌ Error in simple Groq query:', error);
      throw error;
    }
  }, []);



  const askRAGQuestion = useCallback(async (userQuery, processedDocuments = [], messageHistory = [], config = {}) => {
    try {
      const { useWebSearch = false, confidenceThreshold = 40 } = config;

      // STEP 1: Check if we already have a high-quality answer from past feedback
      const similarQnA = await getSimilarQnAFromFeedback(userQuery, confidenceThreshold);

      if (similarQnA.length > 0) {
        console.log('✅ Using cached high-quality answer from user feedback');
        return {
          content: similarQnA[0].answer,
          hasRelevantDocs: true,
          hasWebResults: false,
          confidence: Math.min(95, similarQnA[0].score),
          source: 'feedback-cache',
          strategy: 'pre-approved-qa'
        };
      }

      // STEP 2: Fall back to normal RAG + web search if no good Q&A found
      console.log('🚀 No cached Q&A found, using enhanced RAG...');
      const result = await queryGroqWithRAG(userQuery, processedDocuments, messageHistory);
      return result;

    } catch (error) {
      console.error('❌ Error in askRAGQuestion:', error);
      throw error;
    }
  }, [getSimilarQnAFromFeedback, queryGroqWithRAG]);

  const handleChatWithWebSupport = useCallback(async (userMessage, messageHistory = []) => {
    try {
      console.log('🚀 Starting enhanced chat with web support');

      const result = await askRAGQuestion(
        userMessage,
        processedDocs, // Your existing processed documents
        messageHistory,
        {
          useWebSearch: true,
          confidenceThreshold: 40,
          maxWebResults: 5
        }
      );

      console.log('📊 Chat result:', {
        hasInternal: result.hasRelevantDocs,
        hasWeb: result.hasWebResults,
        confidence: result.confidence,
        strategy: result.queryInfo?.searchStrategy
      });

      return result;
    } catch (error) {
      console.error('❌ Chat error:', error);
      throw error;
    }
  }, [askRAGQuestion, processedDocs]);

  const initializeRAGWithFeedbackBoost = useCallback(async (userQuery, processedDocuments, messageHistory = []) => {
    // Step 1: Check if we have a high-quality answer from feedback
    const topQnA = await getSimilarQnAFromFeedback(userQuery, 75);

    if (topQnA.length > 0) {
      console.log("✅ Using feedback-based answer");
      return {
        content: topQnA[0].answer,
        hasRelevantDocs: true,
        hasWebResults: false,
        confidence: Math.round(topQnA[0].score),
        source: "feedback-cache",
        strategy: "pre-approved-qa",
      };
    }

    // Step 2: Fall back to normal RAG + web search
    console.log("🔄 No feedback match, using standard RAG...");
    return await handleChatWithWebSupport(userQuery, processedDocuments, messageHistory);
  }, [getSimilarQnAFromFeedback, handleChatWithWebSupport]);

  const getFeedbackStats = useCallback(async () => {
    if (!sp?.web) return { total: 0, avgRating: 0, recentCount: 0 };

    try {
      const items = await sp.web.lists.getByTitle("HighQualityQnA")
        .items
        .select("RatingCount", "AverageRating", "LastUsed")
        .filter("IsApproved eq true")
        .get();

      const total = items.length;
      const avgRating = total > 0
        ? parseFloat((items.reduce((sum, i) => sum + i.AverageRating, 0) / total).toFixed(2))
        : 0;
      const recentCount = items.filter(i => {
        const lastUsed = new Date(i.LastUsed);
        const daysAgo = (Date.now() - lastUsed.getTime()) / (1000 * 60 * 60 * 24);
        return daysAgo < 7;
      }).length;

      return { total, avgRating, recentCount };
    } catch (error) {
      console.error("❌ Failed to fetch feedback stats:", error);
      return { total: 0, avgRating: 0, recentCount: 0 };
    }
  }, [sp]);

  const AddLesson = useCallback(
    async (lesson) => {

      if (sp?.web) {
        try {


          // Validate required fields
          if (!lesson.contentLink || !lesson.contentLink.startsWith("http")) {
            throw new Error("Invalid ContentLink URL");
          }

          // Prepare the item data
          const itemData = {
            Title: lesson.title || "",
            ContentLink: {
              Url: lesson.contentLink,
              Description: lesson.title || "Lesson Link"
            },
            Order0: parseInt(lesson.order) || 0,
            HasQuiz: lesson.hasQuiz === true ? 'Yes' : 'No',
            Duration: lesson.duration || "",
            AdditionalContent: lesson.additionalContent || ""
          };

          // Handle Course field (assuming it's a lookup field)
          if (lesson.courseId && lesson.courseId !== "") {
            // If course is an object with Id
            if (typeof lesson.courseId === 'object' && lesson.courseId) {
              itemData.CourseId = lesson.courseId;
            }
            // If course is just an ID number
            else if (typeof lesson.courseId === 'number') {
              itemData.CourseId = lesson.courseId;
            }
            // If course is a string that can be parsed as number
            else if (typeof lesson.courseId === 'string' && !isNaN(parseInt(lesson.courseId))) {
              itemData.CourseId = parseInt(lesson.courseId);
            }
            // If it's the actual course name for lookup
            else if (typeof lesson.courseId === 'string') {
              // For lookup by text, you might need to use a different approach
              // This depends on your SharePoint setup
              itemData.CourseId = lesson.courseId;
            }
          }

          // Handle Chapters field
          if (lesson.chapters && Array.isArray(lesson.chapters)) {
            // Join array elements with newlines for multiple lines of text
            itemData.Chapters = JSON.stringify(lesson.chapters)
          } else if (lesson.chapters) {
            itemData.Chapters = JSON.stringify(lesson.chapters);
          }



          const result = await sp.web.lists.getByTitle("LessonsList").items.add(itemData);

          return result;
        } catch (error) {
          console.error("Error adding lesson:", error);
          throw error; // Re-throw to handle in calling code
        }
      }
    },
    [sp]
  );

  const UpdateLesson = useCallback(
    async (id, lesson) => {
      if (sp?.web) {
        try {
          // Prepare update data similar to add function
          const updateData = {};

          if (lesson.title !== undefined) updateData.Title = lesson.title;
          if (lesson.contentLink !== undefined) {
            updateData.ContentLink = {
              Url: lesson.contentLink,
              Description: lesson.title || "Lesson Link"
            };
          }
          if (lesson.order !== undefined) updateData.Order0 = parseInt(lesson.order) || 0;
          if (lesson.hasQuiz !== undefined) updateData.HasQuiz = lesson.hasQuiz === true ? 'Yes' : 'No';
          if (lesson.duration !== undefined) updateData.Duration = lesson.duration;
          if (lesson.additionalContent !== undefined) updateData.AdditionalContent = lesson.additionalContent;

          // Handle Course field for updates
          if (lesson.courseId !== undefined) {
            if (lesson.courseId && lesson.courseId !== "") {
              if (typeof lesson.courseId === 'object' && lesson.courseId) {
                updateData.CourseId = lesson.courseId;
              } else if (typeof lesson.course === 'number') {
                updateData.CourseId = lesson.courseId;
              } else if (typeof lesson.courseId === 'string' && !isNaN(parseInt(lesson.courseId))) {
                updateData.CourseId = parseInt(lesson.courseId);
              } else if (typeof lesson.courseId === 'string') {
                updateData.CourseId = lesson.courseId;
              }
            } else {
              // Clear the course field if empty
              updateData.CourseId = null;
            }
          }

          // Handle Chapters field for updates
          if (lesson.chapters !== undefined) {
            if (lesson.chapters && Array.isArray(lesson.chapters)) {
              updateData.Chapters = JSON.stringify(lesson.chapters)
            } else if (lesson.chapters) {
              updateData.Chapters = JSON.stringify(lesson.chapters)
            } else {
              updateData.Chapters = JSON.stringify(lesson.chapters);
            }
          }



          const list = sp.web.lists.getByTitle("LessonsList");
          const result = await list.items.getById(id).update(updateData);


          return result;
        } catch (error) {
          console.error('Error updating lesson:', error);
          throw error;
        }
      }
    },
    [sp]
  );

  const AddExam = useCallback(async (exam) => {
    if (sp?.web) {
      try {
        // Basic validation
        if (!exam.Title || exam.Questions.length === 0) {
          throw new Error("Exam must have a title and at least one question.");
        }

        const itemData = {
          CourseId: String(exam.courseId),
          Title: exam.Title,
          Description: exam.Description || "",
          TotalQuestions: exam.TotalQuestions?.toString() || exam.Questions.length.toString(),
          PassingScore: exam.PassingScore?.toString() || "0",
          DurationMinutes: exam.DurationMinutes || 0,
          Questions: JSON.stringify(exam.Questions), // Store as JSON string
        };

        const result = await sp.web.lists.getByTitle("ExamsList").items.add(itemData);
        return result;
      } catch (error) {
        console.error("Error adding exam:", error);
        throw error;
      }
    }
  }, [sp]);

  const UpdateExam = useCallback(async (id, exam) => {
    if (sp?.web) {
      try {
        const updateData = {};

        if (exam.Title !== undefined) updateData.Title = exam.Title;
        if (exam.Description !== undefined) updateData.Description = exam.Description;
        if (exam.TotalQuestions !== undefined) updateData.TotalQuestions = exam.TotalQuestions.toString();
        if (exam.PassingScore !== undefined) updateData.PassingScore = String(exam.PassingScore);
        if (exam.DurationMinutes !== undefined) updateData.DurationMinutes = String(exam.DurationMinutes);
        if (exam.Questions !== undefined) updateData.Questions = JSON.stringify(exam.Questions);

        const list = sp.web.lists.getByTitle("ExamsList");
        const result = await list.items.getById(id).update(updateData);
        return result;
      } catch (error) {
        console.error("Error updating exam:", error);
        throw error;
      }
    }
  }, [sp]);

  const DeleteExam = useCallback(
    async (examId) => {
      if (sp?.web && examId) {
        try {
          await sp.web.lists
            .getByTitle("ExamsList")
            .items.getById(examId)
            .delete();

          return { success: true, message: "Exam deleted successfully" };
        } catch (error) {
          console.error("Error deleting exam:", error);
          return { success: false, message: "Failed to delete exam", error };
        }
      }

      return { success: false, message: "Invalid parameters" };
    },
    [sp]
  );

  const getUserRating = useCallback(async (Id, isArticle) => {
    try {
      const currentUser = await sp.web.currentUser();
      const email = currentUser.Email;
      let items = null;

      if (isArticle) {
        items = await sp.web.lists
          .getByTitle("UsersList")
          .items
          .filter(`Email eq '${email}' and Article/Id eq ${Id}`)
          .top(1)
          .select("*")
          ();
      } else {
        items = await sp.web.lists
          .getByTitle("UsersList")
          .items
          .filter(`Email eq '${email}' and Course/Id eq ${Id}`)
          .top(1)
          .select("*")
          ();
      }

      return items?.[0] ?? 0;
    } catch {
      return 0
    }
  }, [sp]);

  const upsertUserRating = useCallback(async ({
    courseId,
    articleId,
    rating,
    isArticle = false
  }) => {
    const Id = courseId ? courseId : articleId
    const currentUser = await sp.web.currentUser();
    const email = currentUser.Email;
    const existing = await getUserRating(Id, isArticle);
    let dataRating = {}
    let meta = {}
    if (existing) {
      if (isArticle) {
        dataRating = {
          RatingArticle: rating
        };
      } else {
        dataRating = {
          Rating: rating
        };
      }


      return sp.web.lists
        .getByTitle("UsersList")
        .items
        .getById(existing.Id)
        .update(dataRating);
    } else {
      if (isArticle) {
        meta = {
          Title: `Rating from ${currentUser.Title}`,
          Email: email,
          ArticleId: Number(Id),
          RatingArticle: Number(rating),
          CommentArticle: ''
        }
      } else {
        meta = {
          Title: `Rating from ${currentUser.Title}`,
          Email: email,
          CourseId: Number(Id),
          Rating: Number(0),
          Comment: ''
        }
      }


      return sp.web.lists
        .getByTitle("UsersList")
        .items
        .add(meta);
    }
  }, [sp, getUserRating]);

  const getCourseAverageRating = useCallback(async (Id, isArticle = false) => {
    try {
      let ratings = [];
      if (isArticle) {
        ratings = await sp.web.lists
          .getByTitle("UsersList")
          .items
          .filter(`ArticleId eq ${Id}`)
          .select("RatingArticle")
          ();
      } else {
        ratings = await sp.web.lists
          .getByTitle("UsersList")
          .items
          .filter(`Course/Id eq ${Id}`)
          .select("Rating")
          ();
      }

      if (ratings.length === 0) return 0;

      const sum = ratings.reduce((acc, item) => acc + (isArticle ? item.RatingArticle : item.Rating), 0);

      return parseFloat((sum / ratings.length).toFixed(2));
    } catch {
      return 0;
    }
  }, [sp]);

  const getTrendingArticles = useCallback(
    async () => {
      if (sp?.web) {
        try {
          const list = sp.web.lists.getByTitle("ArticlesList");

          const items = await list.items
            .filter("Trending eq 1") // filter for items where Trending is true
            .expand("File", "Author", "Editor")
            .select(
              "*",
              "File/Name",
              "File/ServerRelativeUrl",
              "File/TimeLastModified",
              "File/TimeCreated",
              "Author/Title",
              "Editor/Title"
            ).orderBy('ArticleRating', false)();

          setTrendingArticles(items);
        } catch (error) {
          console.error('Error fetching trending articles:', error);
        }
      }
    },
    [sp]
  );

  const getFeaturedArticles = useCallback(
    async () => {
      if (sp?.web) {
        try {
          const list = sp.web.lists.getByTitle("ArticlesList");

          const items = await list.items
            .filter("Featured eq 1") // filter for items where Trending is true
            .expand("File", "Author", "Editor")
            .select(
              "*",
              "File/Name",
              "File/ServerRelativeUrl",
              "File/TimeLastModified",
              "File/TimeCreated",
              "Author/Title",
              "Editor/Title"
            )();

          setFeaturedArticles(items);
        } catch (error) {
          console.error('Error fetching trending articles:', error);
        }
      }
    },
    [sp]
  );


  const DeleteLesson = useCallback(
    async (lessonId) => {
      if (sp?.web && lessonId) {
        try {
          await sp.web.lists
            .getByTitle("LessonsList")
            .items.getById(lessonId)
            .delete();
          return { success: true, message: "Lesson deleted successfully" };
        } catch (error) {
          console.error("Error deleting lesson:", error);
          return { success: false, message: "Failed to delete lesson", error };
        }
      }
      return { success: false, message: "Invalid parameters" };
    },
    [sp]
  );

  // Calendar functions

  const getAllEvents = useCallback(
    async () => {
      if (sp?.web) {
        try {
          const list = sp.web.lists.getByTitle("EventsList");
          console.log('Fetching all events from EventsList')
          const items = await list.items
            .expand("Author", "Editor")
            .select(
              "*",
              "Title",
              "Start_Date",
              "End_Date",
              "Recurrence_Type",
              "Description",
              "Event_Type",
              "Team",
              "Access_Level",
              "Notes",
              "Status",
              "Reminder",
              "Modified",
              "Created",
              "Author/Title",
              "Editor/Title"
            )
            .orderBy("Modified", false)();

          setAllEvents(items);
          return items;
        } catch (error) {
          console.error('Error fetching events:', error);
          throw error;
        }
      }
    },
    [sp]
  );

  const getEventById = useCallback(
    async (eventId) => {
      if (sp?.web && eventId) {
        try {
          const list = sp.web.lists.getByTitle("EventsList");
          const item = await list.items
            .getById(eventId)
            .expand("Author", "Editor")
            .select(
              "*",
              "Title",
              "Category",
              "Start_Date",
              "End_Date",
              "Recurrence_Type",
              "Description",
              "Event_Type",
              "Team",
              "Access_Level",
              "Notes",
              "Status",
              "Reminder",
              "Modified",
              "Created",
              "Author/Title",
              "Editor/Title"
            )();
          return item;
        } catch (error) {
          console.error('Error fetching event by ID:', error);
          throw error;
        }
      }
    },
    [sp]
  );

  const createEvent = useCallback(
    async (eventData) => {
      if (sp?.web) {
        try {
          const list = sp.web.lists.getByTitle("EventsList");
          const newItem = await list.items.add({
            Title: eventData.Title || "",
            Category: eventData.Category || "",
            Start_Date: eventData.Start_Date || "",
            End_Date: eventData.End_Date || "",
            Recurrence_Type: eventData.Recurrence_Type || "",
            Description: eventData.Description || "",
            Event_Type: eventData.Event_Type || "",
            Team: eventData.Team || "",
            Access_Level: eventData.Access_Level || "",
            Notes: eventData.Notes || 0,
            Status: eventData.Status || "",
            Reminder: eventData.Reminder || ""
          });

          // Refresh the events list after creation
          await getAllEvents();
          return newItem.data;
        } catch (error) {
          console.error('Error creating event:', error);
          throw error;
        }
      }
    },
    [sp, getAllEvents]
  );

  const updateEvent = useCallback(
    async (eventId, eventData) => {
      if (sp?.web && eventId) {
        try {
          const list = sp.web.lists.getByTitle("EventsList");
          const updateData = {};

          // Only include fields that are provided
          if (eventData.Title !== undefined) updateData.Title = eventData.Title;
          if (eventData.Category !== undefined) updateData.Category = eventData.Category;
          if (eventData.Start_Date !== undefined) updateData.Start_Date = eventData.Start_Date;
          if (eventData.End_Date !== undefined) updateData.End_Date = eventData.End_Date;
          if (eventData.Recurrence_Type !== undefined) updateData.Recurrence_Type = eventData.Recurrence_Type;
          if (eventData.Description !== undefined) updateData.Description = eventData.Description;
          if (eventData.Event_Type !== undefined) updateData.Event_Type = eventData.Event_Type;
          if (eventData.Team !== undefined) updateData.Team = eventData.Team;
          if (eventData.Access_Level !== undefined) updateData.Access_Level = eventData.Access_Level;
          if (eventData.Notes !== undefined) updateData.Notes = eventData.Notes;
          if (eventData.Status !== undefined) updateData.Status = eventData.Status;
          if (eventData.Reminder !== undefined) updateData.Reminder = eventData.Reminder;

          await list.items.getById(eventId).update(updateData);

          // Refresh the events list after update
          await getAllEvents();
          return true;
        } catch (error) {
          console.error('Error updating event:', error);
          throw error;
        }
      }
    },
    [sp, getAllEvents]
  );

  const deleteEvent = useCallback(
    async (eventId) => {
      if (sp?.web && eventId) {
        try {
          const list = sp.web.lists.getByTitle("EventsList");
          await list.items.getById(eventId).delete();

          // Refresh the events list after deletion
          await getAllEvents();
          return true;
        } catch (error) {
          console.error('Error deleting event:', error);
          throw error;
        }
      }
    },
    [sp, getAllEvents]
  );

  const filterEvents = useCallback(
    async (filterCriteria) => {
      if (sp?.web) {
        try {
          const list = sp.web.lists.getByTitle("EventsList");
          let query = list.items
            .expand("Author", "Editor")
            .select(
              "*",
              "Title",
              "Category",
              "Start_Date",
              "End_Date",
              "Recurrence_Type",
              "Description",
              "Event_Type",
              "Team",
              "Access_Level",
              "Notes",
              "Status",
              "Reminder",
              "Modified",
              "Created",
              "Author/Title",
              "Editor/Title"
            );

          // Apply filters
          if (filterCriteria.category) {
            query = query.filter(`Category eq '${filterCriteria.category}'`);
          }
          if (filterCriteria.status) {
            query = query.filter(`Status eq '${filterCriteria.status}'`);
          }
          if (filterCriteria.team) {
            query = query.filter(`Team eq '${filterCriteria.team}'`);
          }
          if (filterCriteria.eventType) {
            query = query.filter(`Event_Type eq '${filterCriteria.eventType}'`);
          }
          if (filterCriteria.startDate) {
            query = query.filter(`Start_Date ge '${filterCriteria.startDate}'`);
          }
          if (filterCriteria.endDate) {
            query = query.filter(`End_Date le '${filterCriteria.endDate}'`);
          }

          const items = await query.orderBy("Modified", false)();
          return items;
        } catch (error) {
          console.error('Error filtering events:', error);
          throw error;
        }
      }
    },
    [sp]
  );

   const getAllFeedback = useCallback(
    async () => {
      if (sp?.web) {
        try {
          setLoading(true);
          setError(null);

          const list = sp.web.lists.getByTitle("FeedbackLists");

          const items = await list.items
            .expand("Author", "Editor")
            .select(
              "*",
              "Title",
              "FeedbackType",
              "Description",
              "Priority",
              "Status",
              "Modified",
              "Created",
              "Author/Title",
              "Editor/Title",
              "Attachments"
            )
            .orderBy("Modified", false)();

          setAllFeedback(items);
          return items;
        } catch (error) {
          console.error('Error fetching feedback:', error);
          setError(error.message);
          throw error;
        } finally {
          setLoading(false);
        }
      }
    },
    [sp]
  );

  // GET BY ID - Read single feedback item
  const getFeedbackById = useCallback(
    async (id) => {
      if (sp?.web && id) {
        try {
          setLoading(true);
          setError(null);

          const list = sp.web.lists.getByTitle("FeedbackLists");

          const item = await list.items
            .getById(id)
            .expand("Author", "Editor")
            .select(
              "*",
              "Title",
              "FeedbackType",
              "Description",
              "Priority",
              "Status",
              "Modified",
              "Created",
              "Author/Title",
              "Editor/Title",
              "Attachments"
            )();

          return item;
        } catch (error) {
          console.error('Error fetching feedback item:', error);
          setError(error.message);
          throw error;
        } finally {
          setLoading(false);
        }
      }
    },
    [sp]
  );

  // CREATE - Add new feedback
  const createFeedback = useCallback(
    async (feedbackData) => {
    if (sp?.web) {
      try {
        setLoading(true);
        setError(null);

        const batch = sp.web.createBatch();
        const list = sp.web.lists.getByTitle("FeedbackLists");

        const itemData = {
          Title: feedbackData.title,
          FeedbackType: feedbackData.feedbackType,
          Description: feedbackData.description,
          Priority: feedbackData.priority,
          Status: feedbackData.status || "New"
        };

        // Add item to batch
        let addResult;
        list.items.inBatch(batch).add(itemData).then(result => {
          addResult = result;
        });

        // Execute batch
        await batch.execute();

        // Now handle attachment if present
        if (feedbackData.image && addResult?.data?.Id) {
          const newItemId = addResult.data.Id;

          try {
            // Small delay to ensure item is ready
            await new Promise(resolve => setTimeout(resolve, 800));

            const fileBuffer = await feedbackData.image.arrayBuffer();

            await list.items.getById(newItemId)
              .attachmentFiles.add(feedbackData.image.name, fileBuffer);

            console.log('Batch: Attachment added successfully');

          } catch (attachmentError) {
            console.error('Batch: Attachment error:', attachmentError);
            setError(`Feedback created successfully, but image upload failed: ${attachmentError.message}`);
          }
        }

        await getAllFeedback();
        return addResult;

      } catch (error) {
        console.error('Error in batch feedback creation:', error);
        setError(error.message);
        throw error;
      } finally {
        setLoading(false);
      }
    }
  },
  [sp, getAllFeedback, setLoading, setError]
);

// UPDATE - Update existing feedback
  const updateFeedback = useCallback(
    async (id, feedbackData) => {
      if (sp?.web && id) {
        try {
          setLoading(true);
          setError(null);

          const list = sp.web.lists.getByTitle("FeedbackLists");

          const itemData = {
            Title: feedbackData.title,
            FeedbackType: feedbackData.feedbackType,
            Description: feedbackData.description,
            Priority: feedbackData.priority,
            Status: feedbackData.status
          };

          const item = list.items.getById(id);
          await item.update(itemData);

          // Handle image attachment update if provided
          if (feedbackData.image) {
            try {
              // Get current attachments and delete them
              const attachments = await item.attachmentFiles();
              for (const attachment of attachments) {
                await item.attachmentFiles.getByName(attachment.FileName).delete();
              }

              // Convert file to array buffer for SharePoint attachments
              const fileBuffer = await feedbackData.image.arrayBuffer();

              // Add new image attachment
              await item.attachmentFiles.add(
                feedbackData.image.name,
                fileBuffer
              );

              console.log('Image attachment updated successfully');
            } catch (attachmentError) {
              console.error('Error handling attachments:', attachmentError);
              // Continue with the update even if attachment handling fails
            }
          }

          await getAllFeedback();
          return true;
        } catch (error) {
          console.error('Error updating feedback:', error);
          setError(error.message);
          throw error;
        } finally {
          setLoading(false);
        }
      }
    },
    [sp, getAllFeedback]
  );


// Alternative method if the above doesn't work - using base64 encoding
  const createFeedbackWithBase64 = useCallback(
    async (feedbackData) => {
      if (sp?.web) {
        try {
          setLoading(true);
          setError(null);

          const list = sp.web.lists.getByTitle("FeedbackLists");

          const itemData = {
            Title: feedbackData.title,
            Description: feedbackData.description,
            Status: feedbackData.status || "New"
          };

          if (feedbackData.feedbackType) itemData.FeedbackType = feedbackData.feedbackType;
          if (feedbackData.priority) itemData.Priority = feedbackData.priority;

          // Create the item first
          const addResult = await list.items.add(itemData);
          const newItemId = addResult.data.Id;

          // Handle image upload using base64
          if (feedbackData.image && newItemId) {
            try {
              console.log('Using base64 method for attachment...');

              // Convert to base64
              const base64String = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                  // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
                  const base64 = reader.result.split(',')[1];
                  resolve(base64);
                };
                reader.onerror = reject;
                reader.readAsDataURL(feedbackData.image);
              });

              console.log('Base64 conversion complete, length:', base64String.length);

              // Use REST API directly for attachment
              const response = await sp.web.lists
                .getByTitle("FeedbackLists")
                .items.getById(newItemId)
                .attachmentFiles
                .add(feedbackData.image.name, base64String);

              console.log('Base64 attachment added:', response);
            } catch (attachmentError) {
              console.error('Base64 attachment failed:', attachmentError);
              throw attachmentError;
            }
          }

          await getAllFeedback();
          return addResult;
        } catch (error) {
          console.error('Error in createFeedbackWithBase64:', error);
          setError(error.message);
          throw error;
        } finally {
          setLoading(false);
        }
      }
    },
    [sp, getAllFeedback]
  );

  // DELETE - Remove feedback item
  const deleteFeedback = useCallback(
    async (id) => {
      if (sp?.web && id) {
        try {
          setLoading(true);
          setError(null);

          const list = sp.web.lists.getByTitle("FeedbackLists");
          await list.items.getById(id).delete();

          await getAllFeedback();
          return true;
        } catch (error) {
          console.error('Error deleting feedback:', error);
          setError(error.message);
          throw error;
        } finally {
          setLoading(false);
        }
      }
    },
    [sp, getAllFeedback]
  );

  // FILTER OPERATIONS
  const getFeedbackByType = useCallback(
    async (feedbackType) => {
      if (sp?.web) {
        try {
          setLoading(true);
          setError(null);

          const list = sp.web.lists.getByTitle("FeedbackLists");

          const items = await list.items
            .expand("Author", "Editor")
            .select(
              "*",
              "Title",
              "FeedbackType",
              "Description",
              "Image",
              "Priority",
              "Status",
              "Modified",
              "Created",
              "Author/Title",
              "Editor/Title"
            )
            .filter(`FeedbackType eq '${feedbackType}'`)
            .orderBy("Modified", false)();

          return items;
        } catch (error) {
          console.error('Error fetching feedback by type:', error);
          setError(error.message);
          throw error;
        } finally {
          setLoading(false);
        }
      }
    },
    [sp]
  );

  const getFeedbackByStatus = useCallback(
    async (status) => {
      if (sp?.web) {
        try {
          setLoading(true);
          setError(null);

          const list = sp.web.lists.getByTitle("FeedbackLists");

          const items = await list.items
            .expand("Author", "Editor")
            .select(
              "*",
              "Title",
              "FeedbackType",
              "Description",
              "Image",
              "Priority",
              "Status",
              "Modified",
              "Created",
              "Author/Title",
              "Editor/Title"
            )
            .filter(`Status eq '${status}'`)
            .orderBy("Modified", false)();

          return items;
        } catch (error) {
          console.error('Error fetching feedback by status:', error);
          setError(error.message);
          throw error;
        } finally {
          setLoading(false);
        }
      }
    },
    [sp]
  );

// Add this function to your useSharePoint hook



// Updated helper function to upload audio recordings as attachments
const uploadAudioRecordings = useCallback(
  async (itemId, audioRecordings) => {
    if (!sp?.web || !itemId || !audioRecordings) {
      console.log('Upload skipped - missing parameters:', {
        hasSharePoint: !!sp?.web,
        itemId,
        hasRecordings: !!audioRecordings
      });
      return;
    }

    try {
      console.log('Uploading audio recordings for item:', itemId);
      console.log('Audio recordings to upload:', Object.keys(audioRecordings));

      const list = sp.web.lists.getByTitle("Huila_CustumerExp_Survey");
      const item = list.items.getById(itemId);

      const uploadResults = [];

      // Upload files sequentially to avoid conflicts
      for (const [questionId, recording] of Object.entries(audioRecordings)) {
        if (recording && recording.blob) {
          console.log(`Preparing to upload audio for question: ${questionId}`);

          try {
            // Convert blob to array buffer
            const arrayBuffer = await recording.blob.arrayBuffer();

            // Create a unique filename
            const timestamp = new Date().getTime();
            const randomSuffix = Math.random().toString(36).substring(2, 8);
            const fileName = `${questionId}_${timestamp}_${randomSuffix}.wav`;

            console.log(`Uploading file: ${fileName} (${arrayBuffer.byteLength} bytes)`);

            // Retry logic for upload
            let uploadResult = null;
            let attempts = 0;
            const maxAttempts = 3;
            const retryDelay = 1000; // 1 second

            while (attempts < maxAttempts && !uploadResult) {
              attempts++;

              try {
                console.log(`Upload attempt ${attempts} for ${questionId}`);

                // Add a small delay between attempts to avoid conflicts
                if (attempts > 1) {
                  await new Promise(resolve => setTimeout(resolve, retryDelay * attempts));
                }

                uploadResult = await item.attachmentFiles.add(fileName, arrayBuffer);
                console.log(`Successfully uploaded audio for question: ${questionId}`, uploadResult);

                uploadResults.push({
                  questionId,
                  success: true,
                  fileName,
                  attempts,
                  size: arrayBuffer.byteLength
                });

                break; // Success, exit retry loop

              } catch (uploadError) {
                console.error(`Upload attempt ${attempts} failed for ${questionId}:`, uploadError);

                // Check if it's a final attempt
                if (attempts >= maxAttempts) {
                  let errorMessage = uploadError.message || 'Unknown error';

                  // Parse specific SharePoint errors
                  if (uploadError.message.includes('500')) {
                    errorMessage = 'SharePoint server error. Please try again later.';
                  } else if (uploadError.message.includes('409')) {
                    errorMessage = 'File upload conflict. Please try again.';
                  } else if (uploadError.message.includes('413')) {
                    errorMessage = 'File too large for upload.';
                  } else if (uploadError.message.includes('403')) {
                    errorMessage = 'Permission denied for file upload.';
                  }

                  uploadResults.push({
                    questionId,
                    success: false,
                    error: errorMessage,
                    attempts,
                    size: arrayBuffer.byteLength
                  });
                }
              }
            }

          } catch (conversionError) {
            console.error(`Error converting audio blob for ${questionId}:`, conversionError);
            uploadResults.push({
              questionId,
              success: false,
              error: 'Failed to convert audio file',
              attempts: 0
            });
          }
        } else {
          console.warn(`No valid recording found for question: ${questionId}`, recording);
          uploadResults.push({
            questionId,
            success: false,
            error: 'No valid audio recording found',
            attempts: 0
          });
        }

        // Add a small delay between different file uploads
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Log results summary
      const successful = uploadResults.filter(r => r.success);
      const failed = uploadResults.filter(r => !r.success);

      console.log(`Audio upload summary: ${successful.length} successful, ${failed.length} failed`);

      if (failed.length > 0) {
        console.error('Failed uploads:', failed);
      }

      if (successful.length > 0) {
        console.log('Successful uploads:', successful);
      }

      return {
        total: uploadResults.length,
        successful: successful.length,
        failed: failed.length,
        details: uploadResults,
        hasFailures: failed.length > 0
      };

    } catch (error) {
      console.error('Error in uploadAudioRecordings:', error);
      throw error;
    }
  },
  [sp]
);

const saveSurveyResponse = useCallback(
  async (surveyData) => {
    if (!sp?.web) {
      console.error('SharePoint context not available');
      return { success: false, message: 'SharePoint not initialized' };
    }

    try {
      console.log('Saving survey response:', surveyData);

      // Helper function to get the text value for voice questions
      const getVoiceQuestionValue = (questionId) => {
        const textResponse = surveyData.responses?.[questionId] || '';
        const hasAudio = surveyData.audioRecordings?.[questionId];

        // If there's an audio recording, indicate that, otherwise use text response
        if (hasAudio && textResponse.includes('[Audio Recording')) {
          return `Audio recording captured at ${new Date().toLocaleString()}`;
        } else if (textResponse && !textResponse.includes('[Audio Recording')) {
          return textResponse; // Text fallback
        }
        return '';
      };

      // Prepare the data for SharePoint
      const itemData = {
        // Demographic Section
        Title: `Survey Response - ${new Date().toLocaleDateString()}`,
        Bairro: surveyData.responses?.bairro || '',
        Idade: surveyData.responses?.idade || '',
        Genero: surveyData.responses?.genero || '',
        Ocupacao: surveyData.responses?.ocupacao || '',
        OcupacaoOutro: surveyData.customInputs?.ocupacao || '',
        OperadoraPrincipal: surveyData.responses?.operadora || '',
        MultipleSim: surveyData.responses?.multipleSim || '',
        MultipleSimRazao: surveyData.customInputs?.multipleSim || '',

        // Africell User Section - handle voice questions properly
        SatisfacaoAfricell: surveyData.responses?.satisfacao || '',
        ServicoMaisUsado: surveyData.responses?.servicoMaisUsado || '',
        GastoMensal: surveyData.responses?.gastoMensal || '',
        RazaoEscolhaAfricell: getVoiceQuestionValue('razaoEscolha'),
        MelhoriasAfricell: getVoiceQuestionValue('melhorias'),
        RecomendariaAfricell: surveyData.responses?.recomendacao || '',
        RecomendacaoJustificacao: surveyData.customInputs?.recomendacao || '',
        UsarMaisServicos: surveyData.responses?.usarMais || '',
        UsarMaisOutro: surveyData.customInputs?.usarMais || '',

        // Non-Africell User Section - handle voice questions properly
        OperadoraAtual: surveyData.responses?.operadoraAtual || '',
        RazaoOperadoraAtual: getVoiceQuestionValue('razaoOperadoraAtual'),
        QualidadeSinal: getVoiceQuestionValue('qualidadeSinal'),
        ExperimentouAfricell: surveyData.responses?.experimentouAfricell || '',
        ExperimentouAfricellRazao: surveyData.customInputs?.experimentouAfricell || '',
        OpiniaoAfricell: surveyData.responses?.opiniao || '',
        JustificacaoOpiniao: getVoiceQuestionValue('justificacaoOpiniao'),
        MudariaAfricell: getVoiceQuestionValue('mudaria'),
        ServicosDesejados: surveyData.responses?.servicosDesejados || '',
        ServicosDesejadosOutro: surveyData.customInputs?.servicosDesejados || '',

        // Metadata
        DataPreenchimento: new Date().toISOString(),
        TipoUsuario: surveyData.responses?.operadora === 'Africell' ? 'Usuario Africell' : 'Nao Usuario Africell',
        StatusInquerito: 'Completo'
      };

      // Handle audio recordings metadata
      if (surveyData.audioRecordings && Object.keys(surveyData.audioRecordings).length > 0) {
        const audioFields = Object.keys(surveyData.audioRecordings);
        itemData.TemGravacoes = 'Sim';
        itemData.CamposComGravacao = audioFields.join(', ');

        // Remove this line - NumeroGravacoes field doesn't exist in SharePoint
        // itemData.NumeroGravacoes = audioFields.length;
      } else {
        itemData.TemGravacoes = 'Nao';
        // Remove this line too
        // itemData.NumeroGravacoes = 0;
      }

      console.log('Item data to save:', itemData);

      // Create the survey response item
      const result = await sp.web.lists
        .getByTitle("Huila_CustumerExp_Survey")
        .items.add(itemData);

      console.log('Full SharePoint result:', result);

      // Extract item ID (using your existing logic)
      let itemId = null;
      let createdItem = null;

      if (result && result.data) {
        itemId = result.data.Id || result.data.ID;
        createdItem = result.data;
      } else if (result && result.Id) {
        itemId = result.Id || result.ID;
        createdItem = result;
      } else if (result && typeof result === 'object') {
        itemId = result.Id || result.ID || result.id;
        createdItem = result;
      }

      if (!itemId) {
        console.error('Could not extract item ID from result:', result);
        throw new Error('Failed to get item ID from SharePoint response');
      }

      console.log('Survey response saved successfully with ID:', itemId);

      // Handle audio file uploads if present
      let audioUploadResult = null;
      if (surveyData.audioRecordings && Object.keys(surveyData.audioRecordings).length > 0) {
        try {
          console.log('Attempting to upload audio recordings for item ID:', itemId);
          audioUploadResult = await uploadAudioRecordings(itemId, surveyData.audioRecordings);
          console.log('Audio upload result:', audioUploadResult);
        } catch (audioError) {
          console.error('Error uploading audio recordings:', audioError);
          audioUploadResult = {
            total: Object.keys(surveyData.audioRecordings).length,
            successful: 0,
            failed: Object.keys(surveyData.audioRecordings).length,
            error: audioError.message,
            hasFailures: true
          };
        }
      }

      // Prepare response message
      let message = 'Inquérito guardado com sucesso!';
      if (audioUploadResult && audioUploadResult.hasFailures) {
        if (audioUploadResult.successful > 0) {
          message += ` (${audioUploadResult.successful} de ${audioUploadResult.total} gravações guardadas)`;
        } else {
          message += ' (Erro ao guardar gravações de áudio)';
        }
      } else if (audioUploadResult && audioUploadResult.successful > 0) {
        message += ` (${audioUploadResult.successful} gravações de áudio guardadas)`;
      }

      return {
        success: true,
        message: message,
        itemId: itemId,
        createdItem: createdItem,
        audioUploadResult: audioUploadResult
      };

    } catch (error) {
      console.error('Error saving survey response:', error);

      if (error.data?.responseBody) {
        console.error('SharePoint error details:', error.data.responseBody);
      }

      if (error.response) {
        console.error('HTTP Response error:', error.response);
      }

      let errorMessage = 'Erro ao guardar o inquérito. Tente novamente.';

      if (error.message.includes('Unauthorized') || error.message.includes('403')) {
        errorMessage = 'Erro de permissões. Contacte o administrador.';
      } else if (error.message.includes('Not Found') || error.message.includes('404')) {
        errorMessage = 'Lista não encontrada. Verifique a configuração.';
      } else if (error.message.includes('Bad Request') || error.message.includes('400')) {
        errorMessage = 'Dados inválidos. Verifique o preenchimento.';
      }

      return {
        success: false,
        message: errorMessage,
        error: error.message,
        details: error
      };
    }
  },
  [sp, uploadAudioRecordings]
);

// Also update your deleteAudio function to clear both the recording and the text
const deleteAudio = (questionId) => {
  setAudioRecordings(prev => {
    const newRecordings = { ...prev };
    if (newRecordings[questionId]) {
      URL.revokeObjectURL(newRecordings[questionId].url);
      delete newRecordings[questionId];
    }
    return newRecordings;
  });

  // Clear the response text as well when deleting audio
  setResponses(prev => ({
    ...prev,
    [questionId]: ''
  }));
};

// Debug function to test SharePoint connection and list access
const testSharePointConnection = useCallback(
  async () => {
    if (!sp?.web) {
      console.error('SharePoint context not available');
      return { success: false, message: 'SharePoint not initialized' };
    }

    try {
      console.log('Testing SharePoint connection...');

      // Test basic web access
      const web = await sp.web.get();
      console.log('Web info:', web);

      // Test list access
      const list = await sp.web.lists.getByTitle("Huila_CustumerExp_Survey").get();
      console.log('List info:', list);

      // Test list fields
      const fields = await sp.web.lists.getByTitle("Huila_CustumerExp_Survey").fields.get();
      console.log('List fields:', fields.map(f => ({ InternalName: f.InternalName, Title: f.Title, TypeAsString: f.TypeAsString })));

      return {
        success: true,
        message: 'SharePoint connection successful',
        web: web,
        list: list,
        fieldsCount: fields.length
      };

    } catch (error) {
      console.error('SharePoint connection test failed:', error);
      return {
        success: false,
        message: 'SharePoint connection failed',
        error: error.message
      };
    }
  },
  [sp]
);
  return {
    sp,
    role,
    files,
    article,
    teams,
    allArticles,
    trendingArticles,
    featuredArticles,
    publishArticles,
    allEvents,
    teamMember,


    getUserRole,
    addFile,
    getFiles,
    AddArticle,
    getArticle,
    getTeams,
    getTeamMember,
    addTeamMember,
    updateTeamMember,
    uploadImageAsAttachmentTeam,
    getAllArticles,
    getFeaturedArticles,
    updateTrendingArticles,
    getAllPublishArticles,
    getTrendingArticles,
    updateArticleContent,
    updateArticleMetadata,
    uploadImageAsAttachment,
    getArticleAttachments,
    deleteArticleAttachment,

    logAuditEvent,
    searchSharePointFolder,
    getSharePointListItems,
    searchSharePointList,
    createSharePointListItem,

    // Academy Functionalities
    saveCourse,
    updateCourse,
    deleteCourse,
    getCourses,
    courses,
    getCourseById,
    getCourseLessons,
    AddLesson,
    UpdateLesson,
    DeleteLesson,
    courseLessons,
    courseEnrollment,
    getCourseExam,
    enrollments,
    updateCourseRating,
    getEnrrolment,


    // === Cellito exports start === //

    stripHtmlTags,
    getArticlesMetadata,
    getArticlesForRAG,
    processArticlesForRAG,
    initializeRAGWithArticles,
    rebuildCache: rebuildArticlesCache, // Replace the old rebuild function
    getCacheFile: getCacheFileFromArticles, // Replace old getCacheFile

    getDocumentTextFromFolder,
    processDocumentsForRAG,
    askRAGQuestion,
    getMyEnrollments,
    getCourseEnrollment,
    updateEnrollment,

    initializeRAGWithCache,
    resetRAGState,

    // Cellito FEEDBACKS  Functions
    upsertHighQualityQnA,
    getSimilarQnAFromFeedback,
    initializeRAGWithFeedbackBoost,
    getFeedbackStats,
    addHighQualityQnA,

    // State (now managed internally)
    // State setters (if needed externally)
    isIndexing,
    processedDocs,
    ragStatus,

    setIsIndexing,
    setProcessedDocs,
    setRagStatus,
    //  rebuildCache: performCacheRebuild,

    searchWebForQuery,
    shouldSearchWeb,
    queryGroqWithRAG, // This replaces your existing function
    handleChatWithWebSupport,
    // === Cellito exports end here === //


    // Calendar
    getAllEvents,
    getEventById,
    createEvent,
    updateEvent,
    deleteEvent,
    filterEvents,

    // Feedbacks Functions
    allFeedback,
    loading,
    error,
    getAllFeedback,
    getFeedbackById,
    createFeedback,
    updateFeedback,
    deleteFeedback,
    getFeedbackByType,
    getFeedbackByStatus,
    setError,
    setAllFeedback,
    createFeedbackWithBase64,

    saveSurveyResponse,
    uploadAudioRecordings,
    testSharePointConnection,

    AddExam,
    UpdateExam,
    DeleteExam,

    getUserRating,
    upsertUserRating,
    getCourseAverageRating
  };
};
