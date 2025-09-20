import React, { useCallback, useEffect, useState } from "react";
import { Plus, Minus, Save, ArrowLeft, PencilIcon, BookCheck, BookOpenCheckIcon } from "lucide-react";
import { useSharePoint } from "@/hooks/useSharePoint";
import SelectDropdown from "../SelectDropdown";
import { Button, Input, Textarea } from "@material-tailwind/react";
import { NavLink, useNavigate, useParams } from "react-router-dom";
import LessonCreationForm from "./CreateLesson";
import ExamCreationForm from "./CreateExam";
import { useTranslation } from 'react-i18next'; // Add this import
import { useAuth } from "@/hooks/useAuth";

const CourseCreationForm = () => {
  const { t } = useTranslation(); // Add this hook
  const { userProfile } = useAuth();
  const { saveCourse, getCourseById, updateCourse, getCourseLessons, getCourseExam, logAuditEvent } = useSharePoint();
  const { courseID, isView } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formLesson, setformLesson] = useState(false);
  const [formExam, setFormExam] = useState(false);
  const [lessons, setLessons] = useState([]);
  const [exam, setExam] = useState(null);

  const [course, setCourse] = useState({
    Title: "",
    CourseID: "",
    Description: "",
    AuthorBio: "",
    Level: "",
    Language: "",
    Tags: "",
    Duration: "",
    Format: "",
    Image: "",
    Rating: 0,
    Reviews: 0,
    LearningOutcomes: [""],
    Curriculum: [""],
    Status: "Draft",
    Category: "",
    Assessment: "",
    Exam: {
      Title: '',
      Description: '',
      TotalQuestions: '',
      PassingScore: '',
      DurationMinutes: 0,
      Questions: [
        {
          id: crypto.randomUUID(),
          title: '',
          question: '',
          options: ['', ''],
          correctAnswer: '',
          score: 1
        }
      ],
    }
  });
  const navigate = useNavigate();

  // Check if we're in view mode
  const isViewMode = isView === "view";

 const getFormatOptions = [
  { value: 'Online', label: t('courseForm.formats.online') },
  { value: 'In Person', label: t('courseForm.formats.inPerson') },
  { value: 'Hybrid', label: t('courseForm.formats.hybrid') },
  { value: 'Self Paced', label: t('courseForm.formats.selfPaced') }
];

// Get translated level options
const getLevelOptions = [
  { value: 'Beginner', label: t('courseForm.levels.beginner') },
  { value: 'Intermediate', label: t('courseForm.levels.intermediate') },
  { value: 'Advanced', label: t('courseForm.levels.advanced') }
];

// Get translated category options
const getCategoryOptions = [
  { value: 'Customer Experience', label: t('courseForm.categories.customerExperience') }
];

  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      const course = await getCourseById(
        "https://africellcloud.sharepoint.com/sites/KnowledgeBase",
        "CoursesList",
        courseID
      );

      if (course) {
        // Parse course relevant course columns to proper type
        if (typeof course.Exam === "string") {
          try {
            course.Exam = JSON.parse(course.Exam);
          } catch {
            // If can't be parsed as JSON, split by newlines
            course.Exam = course.Exam.split("\n")
              .filter((item) => item.trim());
          }
        }

        if (typeof course.Curriculum === "string") {
          try {
            course.Curriculum = JSON.parse(course.Curriculum);
          } catch {
            // If can't be parsed as JSON, split by newlines
            course.Curriculum = course.Curriculum.split("\n")
              .filter((item) => item.trim());
          }
        }

        if (typeof course.LearningOutcomes === "string") {
          try {
            course.LearningOutcomes = JSON.parse(course.LearningOutcomes);
          } catch {
            // If can't be parsed as JSON, split by newlines
            course.LearningOutcomes = course.LearningOutcomes.split("\n")
              .filter((item) => item.trim());
          }
        }

        const cleanHtml = (html) =>
          html
            .replace(/<div class="ExternalClass[^"]+"><div>/, '')
            .replace(/&#160;<br><\/div><\/div>/g, '')
            .replace(/<\/div><\/div>/g, '')
            .replace(/<\/div>/g, '')
            .replace(/<div class="ExternalClass[^"]+">/g, '');

        const courseMap = {
          Title: course._original.Title,
          Description: cleanHtml(course._original.Description),
          AuthorBio: cleanHtml(course._original.AuthorBio),
          Level: course._original.Level,
          Language: course._original.Language,
          Tags: course._original.Tags,
          Duration: course._original.Duration,
          Format: course._original.Format,
          Image: course._original.Image,
          LearningOutcomes: JSON.parse(course._original.LearningOutcomes),
          Curriculum: JSON.parse(course._original.Curriculum),
          Status: course._original.Status,
          Category: course._original.Category,
          Assessment: course._original.Assessment,
        };

        setCourse(courseMap);
      } else {
        setError(t('courseForm.messages.courseNotFound'));
      }
    } catch (err) {
      console.error("Failed to fetch courses:", err);
      setError(t('courseForm.messages.fetchError', { error: err.message }));
    } finally {
      setLoading(false);
    }
  }, [courseID, getCourseById, t]);

  useEffect(() => {
    if (courseID) {
      fetchCourses();
    } else {
      setLoading(false); // Set loading to false for new course creation
    }
  }, [courseID, t, fetchCourses]);

  const fetchLesson = useCallback(async () => {
    try {
      setLoading(true);
      const courseLessons = await getCourseLessons(courseID);
      const lessonMapped = courseLessons?.map(lesson => {
        return {
          id: lesson.Id,
          title: lesson.Title,
          contentLink: lesson.ContentLink.Url,
          order: lesson.Order0,
          hasQuiz: lesson.HasQuiz,
          duration: lesson.Duration,
          additionalContent: lesson.AdditionalContent,
          course: lesson.Course.Title,
          chapters: Array.isArray(JSON.parse(lesson.Chapters)) ? JSON.parse(lesson.Chapters) : [lesson.Chapters]
        };
      });
      setLessons(lessonMapped);
    } catch (err) {
      console.error("Failed to fetch lessons:", err);
      setError(t('courseForm.messages.fetchError', { error: err.message }));
    } finally {
      setLoading(false);
    }
  }, [courseID, getCourseLessons, t]);

  useEffect(() => {
    if (courseID) {
      fetchLesson();
    }
  }, [courseID, getCourseLessons, t, fetchLesson]);

  const fetchExam = useCallback(async () => {
    try {
      setLoading(true);
      const exam = await getCourseExam(courseID);

      if (!exam) {
        setExam(null);
        return;
      }

      const parsedExam = {
        Id: exam.Id,
        Title: exam.Title,
        Description: exam.Description,
        TotalQuestions: exam.TotalQuestions,
        PassingScore: exam.PassingScore,
        DurationMinutes: exam.DurationMinutes,
        Questions: Array.isArray(exam.Questions)
          ? exam.Questions
          : JSON.parse(exam?.Questions || "[]"),
      };

      setExam(parsedExam);
    } catch (err) {
      console.error("Failed to fetch exam:", err);
      setError(t('courseForm.messages.fetchError', { error: err.message }));
    } finally {
      setLoading(false);
    }
  }, [courseID, getCourseExam, t]);

  useEffect(() => {
    if (courseID) {
      fetchExam();
    }
  }, [courseID, fetchExam]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field, value) => {
    if (value === "all" || isViewMode) return;

    setCourse((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleArrayChange = (field, index, value) => {
    if (isViewMode) return;

    setCourse((prev) => ({
      ...prev,
      [field]: prev[field].map((item, i) => (i === index ? value : item)),
    }));
  };

  const addArrayItem = (field) => {
    if (isViewMode) return;

    setCourse((prev) => ({
      ...prev,
      [field]: [...prev[field], ""],
    }));
  };

  const removeArrayItem = (field, index) => {
    if (isViewMode) return;

    setCourse((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isViewMode) return;

    setIsSubmitting(true);

    try {
      // Clean up empty array items
      const cleanedCourse = {
        ...course,
        LearningOutcomes: course.LearningOutcomes.filter(
          (item) => item.trim() !== ""
        ),
        Curriculum: course.Curriculum.filter((item) => item.trim() !== ""),
        Rating: parseFloat(course.Rating) || 0,
        Reviews: parseInt(course.Reviews) || 0,
      };

      await saveCourse(cleanedCourse);
      alert(t('courseForm.messages.courseSaved'));
      navigate(`/home/content-management/courses`);
      await logAuditEvent({
          title: `created course ${course.Title}`,
          userEmail: userProfile?.mail,
          userName: userProfile?.displayName,
          actionType: "Create",
          details: `User created a new course titled "${course.Title}".`,
        });

      // Reset form
      setCourse({
        Title: "",
        CourseID: "",
        Description: "",
        AuthorBio: "",
        Level: "",
        Language: "",
        Tags: "",
        Duration: "",
        Format: "",
        Image: "",
        Rating: 0,
        Reviews: 0,
        LearningOutcomes: [""],
        Curriculum: [""],
        Status: "",
        Category: "",
        Assessment: "",
      });
    } catch (error) {
      alert(t('courseForm.messages.errorSaving', { error: error.message }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (isViewMode) return;

    setIsSubmitting(true);

    try {
      // Clean up empty array items
      const cleanedCourse = {
        ...course,
        LearningOutcomes: course.LearningOutcomes.filter(
          (item) => item.trim() !== ""
        ),
        Curriculum: course.Curriculum.filter((item) => item.trim() !== ""),
      };

      await updateCourse(courseID, cleanedCourse);
      alert(t('courseForm.messages.courseUpdated'));
      await logAuditEvent({
          title: `modified course ${course.Title}`,
          userEmail: userProfile?.mail,
          userName: userProfile?.displayName,
          actionType: "Modify",
          details: `User updated fields in course "${course.Title}".`,
        });
      navigate(`view`);
    } catch (error) {
      alert(t('courseForm.messages.errorSaving', { error: error.message }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const friendlyViewAssessment = () => {
    try {
      const questions = typeof course.Assessment === 'string'
        ? JSON.parse(course.Assessment)
        : course.Assessment || [];

      if (!Array.isArray(questions) || questions.length === 0) {
        return <p className="text-gray-500 italic">{t('courseForm.assessment.noQuestions')}</p>;
      }

      return questions.map((q, index) => (
        <div key={q.id || index} className="p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-secondary-100 text-primary px-2 py-1 rounded text-sm font-medium">
              {q.title || t('courseForm.assessment.questionNumber', { number: index + 1 })}
            </span>
          </div>
          <h4 className="font-medium text-gray-800 mb-2">{q.question}</h4>
          <div className="space-y-1">
            <p className="text-sm text-gray-600 mb-1">{t('courseForm.assessment.answerOptions')}:</p>
            {q.options?.map((option, optIndex) => (
              <div key={optIndex} className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <span className="text-gray-700">{option}</span>
              </div>
            ))}
          </div>
        </div>
      ));
    } catch {
      return <p className="text-red-500">{t('courseForm.messages.errorParsing')}</p>;
    }
  };

  const friendlyEditAssessment = () => {
    let questions = [];
    try {
      questions = typeof course.Assessment === 'string'
        ? JSON.parse(course.Assessment)
        : course.Assessment || [];
      if (!Array.isArray(questions)) questions = [];
    } catch {
      questions = [];
    }

    const updateAssessment = (newQuestions) => {
      handleInputChange("Assessment", JSON.stringify(newQuestions));
    };

    const addQuestion = () => {
      const newQuestion = {
        title: `${t('courseForm.assessment.stepTitle')} ${questions.length + 1}`,
        id: `q${questions.length + 1}`,
        question: "",
        options: [""]
      };
      updateAssessment([...questions, newQuestion]);
    };

    const updateQuestion = (index, field, value) => {
      const updated = [...questions];
      updated[index] = { ...updated[index], [field]: value };
      updateAssessment(updated);
    };

    const removeQuestion = (index) => {
      const updated = questions.filter((_, i) => i !== index);
      updateAssessment(updated);
    };

    const addOption = (questionIndex) => {
      const updated = [...questions];
      updated[questionIndex].options = [...updated[questionIndex].options, ""];
      updateAssessment(updated);
    };

    const updateOption = (questionIndex, optionIndex, value) => {
      const updated = [...questions];
      updated[questionIndex].options[optionIndex] = value;
      updateAssessment(updated);
    };

    const removeOption = (questionIndex, optionIndex) => {
      const updated = [...questions];
      updated[questionIndex].options = updated[questionIndex].options.filter((_, i) => i !== optionIndex);
      updateAssessment(updated);
    };

    return (
      <>
        {questions.map((question, qIndex) => (
          <div key={question.id || qIndex} className="border border-gray-200 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-medium text-gray-800">
                {t('courseForm.assessment.questionNumber', { number: qIndex + 1 })}
              </h4>
              {questions.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => removeQuestion(qIndex)}
                  className="px-2 py-1 border border-red-200 text-red-500 rounded hover:bg-red-400 hover:text-white"
                  aria-label={`Remove question ${qIndex + 1}`}
                >
                  <Minus size={14} />
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {t('courseForm.assessment.stepTitle')}
                </label>
                <Input
                  type="text"
                  value={question.title || ""}
                  onChange={(e) => updateQuestion(qIndex, "title", e.target.value)}
                  placeholder={t('courseForm.assessment.stepTitlePlaceholder')}
                  className="w-full px-2 py-1 text-sm border border-gray-100 focus:border-primary rounded focus:outline-none focus:ring-1 focus:ring-secondary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {t('courseForm.assessment.questionId')}
                </label>
                <Input
                  type="text"
                  value={question.id || ""}
                  onChange={(e) => updateQuestion(qIndex, "id", e.target.value)}
                  placeholder={t('courseForm.assessment.questionIdPlaceholder')}
                  readOnly
                  className="w-full px-2 py-1 text-sm border border-gray-100 focus:border-primary rounded focus:outline-none focus:ring-1 focus:ring-secondary"
                />
              </div>
            </div>

            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {t('courseForm.assessment.question')}
              </label>
              <Textarea
                value={question.question || ""}
                onChange={(e) => updateQuestion(qIndex, "question", e.target.value)}
                placeholder={t('courseForm.assessment.questionPlaceholder')}
                rows={2}
                className="w-full px-2 py-1 text-sm border border-gray-100 focus:border-primary rounded focus:outline-none focus:ring-1 focus:ring-secondary"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">
                {t('courseForm.assessment.answerOptions')}
              </label>
              {question.options?.map((option, oIndex) => (
                <div key={oIndex} className="flex gap-2 mb-2">
                  <Input
                    type="text"
                    value={option}
                    onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                    placeholder={t('courseForm.assessment.optionPlaceholder', { number: oIndex + 1 })}
                    className="flex-1 px-2 py-1 text-sm border border-gray-100 focus:border-primary rounded focus:outline-none focus:ring-1 focus:ring-secondary"
                  />
                  {question.options.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => removeOption(qIndex, oIndex)}
                      className="px-2 py-1 border border-red-200 text-red-500 rounded hover:bg-red-400 hover:text-white"
                      aria-label={`Remove option ${oIndex + 1}`}
                    >
                      <Minus size={12} />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="ghost"
                onClick={() => addOption(qIndex)}
                className="mt-1 px-3 py-1 text-xs text-primary-600 rounded border border-primary-200 hover:bg-primary-50 flex items-center gap-1"
              >
                <Plus size={12} />
                {t('courseForm.buttons.addOption')}
              </Button>
            </div>
          </div>
        ))}

        <Button
          type="button"
          variant="ghost"
          onClick={addQuestion}
          className="w-full py-3 border-2 border-dashed border-gray-300 text-gray-600 rounded-lg hover:border-primary hover:text-primary flex items-center justify-center gap-2"
        >
          <Plus size={16} />
          {t('courseForm.buttons.addNewQuestion')}
        </Button>
      </>
    );
  };

  if (formLesson) {
    return <LessonCreationForm setformLesson={setformLesson} lessons={lessons} fetchLesson={fetchLesson} userProfile={userProfile} courseTitle={course.Title} />;
  }

  if (formExam) {
    return <ExamCreationForm
      setFormExam={setFormExam}
      exam={exam}
      refresh={fetchExam}
      userProfile={userProfile}
      courseTitle={course.Title}
    />;
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg">
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">{t('table.loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg">
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <div className="text-red-500 text-xl mb-2">⚠️</div>
            <p className="text-gray-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">
          {isViewMode
            ? t('courseForm.titles.view')
            : courseID
              ? t('courseForm.titles.edit')
              : t('courseForm.titles.create')
          }
        </h2>
        <div className="flex gap-2">
          <NavLink
            to={'/home/content-management/courses'}
            className="flex justify-center items-center gap-3 text-white w-11 h-11 hover:bg-alternative-300 bg-alternative-400 px-3 py-2 rounded-full whitespace-nowrap"
            aria-label="Back to courses"
          >
            <ArrowLeft strokeWidth={2} className="h-5 w-5" />
          </NavLink>
          {courseID && (
            <Button
              variant="ghost"
              onClick={() => setformLesson(!formLesson)}
              className="flex justify-center items-center gap-3 text-alternative h-11 hover:bg-alternative-100 px-3 py-2 rounded-md whitespace-nowrap"
            >
              <BookOpenCheckIcon strokeWidth={2} className="h-5 w-5" />
              {t('courseForm.buttons.lesson')}
            </Button>
          )}
          {courseID && (
            <Button
              variant="ghost"
              onClick={() => setFormExam(!formExam)}
              className="flex justify-center items-center gap-3 text-alternative h-11 hover:bg-alternative-100 px-3 py-2 rounded-md whitespace-nowrap"
            >
              <BookCheck strokeWidth={2} className="h-5 w-5" />
              {t('courseForm.buttons.exam')}
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('courseForm.fields.courseTitleRequired')}
            </label>
            <Input
              type="text"
              required
              value={course.Title}
              onChange={(e) => handleInputChange("Title", e.target.value)}
              placeholder={t('courseForm.fields.courseTitle')}
              readOnly={isViewMode}
              className={`w-full px-3 py-2 ${isViewMode ? 'border-none bg-white cursor-default hover:border-none focus:border-none focus:ring-0' : 'border border-gray-100 focus:border-primary'} rounded-md focus:outline-none focus:ring-2 focus:ring-secondary`}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('courseForm.fields.description')}
          </label>
          <Textarea
            value={course.Description}
            onChange={(e) => handleInputChange("Description", e.target.value)}
            rows={4}
            placeholder={t('courseForm.fields.description')}
            readOnly={isViewMode}
            className={`w-full px-3 py-2 ${isViewMode ? 'border-none bg-white cursor-default hover:border-none focus:border-none focus:ring-0' : 'border border-gray-100 focus:border-primary'} rounded-md focus:outline-none focus:ring-2 focus:ring-secondary`}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('courseForm.fields.authorBio')}
          </label>
          <Textarea
            rows={3}
            placeholder={t('courseForm.fields.authorBio')}
            readOnly={isViewMode}
            className={`w-full px-3 py-2 ${isViewMode ? 'border-none bg-white cursor-default hover:border-none focus:border-none focus:ring-0' : 'border border-gray-100 focus:border-primary'} rounded-md focus:outline-none focus:ring-2 focus:ring-secondary`}
          />
        </div>

        {/* Course Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('courseForm.fields.duration')}
            </label>
            <Input
              type="text"
              value={course.Duration}
              onChange={(e) => handleInputChange("Duration", e.target.value)}
              placeholder={t('courseForm.fields.durationPlaceholder')}
              readOnly={isViewMode}
              className={`w-full px-3 py-2 ${isViewMode ? 'border-none bg-white cursor-default hover:border-none focus:border-none focus:ring-0' : 'border border-gray-100 focus:border-primary'} rounded-md focus:outline-none focus:ring-2 focus:ring-secondary`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('courseForm.fields.format')}
            </label>
            {!isViewMode ? (
              <SelectDropdown
                value={course.Format || 'all'}
                onChange={handleInputChange}
                options={getFormatOptions}
                label={t('courseForm.fields.format')}
                placeholder={t('courseForm.fields.selectFormat')}
                filterKey={'Format'}
                disabled={isViewMode}
                className={`w-full px-3 py-2 ${isViewMode ? 'border-none bg-white cursor-default hover:border-none focus:border-none focus:ring-0' : 'border border-gray-100 focus:border-primary'} rounded-md focus:outline-none focus:ring-2 focus:ring-secondary`}
              />
            ) : (
              <span className="block px-3 py-2">{course.Format}</span>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('courseForm.fields.level')}
            </label>
            {!isViewMode ? (
              <SelectDropdown
                value={course.Level || 'all'}
                onChange={handleInputChange}
                options={getLevelOptions}
                label={t('courseForm.fields.level')}
                placeholder={t('courseForm.fields.selectLevel')}
                filterKey={'Level'}
                disabled={isViewMode}
                className={`w-full px-3 py-2 ${isViewMode ? 'border-none bg-white cursor-default hover:border-none focus:border-none focus:ring-0' : 'border border-gray-100 focus:border-primary'} rounded-md focus:outline-none focus:ring-2 focus:ring-secondary`}
              />
            ) : (
              <span className="block px-3 py-2">{course.Level}</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('courseForm.fields.tags')}
            </label>
            <Input
              type="text"
              value={course.Tags}
              onChange={(e) => handleInputChange("Tags", e.target.value)}
              placeholder={t('courseForm.fields.tagsPlaceholder')}
              readOnly={isViewMode}
              className={`w-full px-3 py-2 ${isViewMode ? 'border-none bg-white cursor-default hover:border-none focus:border-none focus:ring-0' : 'border border-gray-100 focus:border-primary'} rounded-md focus:outline-none focus:ring-2 focus:ring-secondary`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('courseForm.fields.language')}
            </label>
            <Input
              type="text"
              value={course.Language}
              onChange={(e) => handleInputChange("Language", e.target.value)}
              placeholder={t('courseForm.fields.languagePlaceholder')}
              readOnly={isViewMode}
              className={`w-full px-3 py-2 ${isViewMode ? 'border-none bg-white cursor-default hover:border-none focus:border-none focus:ring-0' : 'border border-gray-100 focus:border-primary'} rounded-md focus:outline-none focus:ring-2 focus:ring-secondary`}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('courseForm.fields.category')}
            </label>
            {!isViewMode ? (
              <SelectDropdown
                value={course?.Category || 'all'}
                onChange={handleInputChange}
                options={getCategoryOptions}
                label={t('courseForm.fields.category')}
                placeholder={t('courseForm.fields.selectCategory')}
                filterKey={'Category'}
                disabled={isViewMode}
                className={`w-full px-3 py-2 ${isViewMode ? 'border-none bg-white cursor-default hover:border-none focus:border-none focus:ring-0' : 'border border-gray-100 focus:border-primary'} rounded-md focus:outline-none focus:ring-2 focus:ring-secondary`}
              />
            ) : (
              <span className="block px-3 py-2">{course.Category}</span>
            )}
          </div>
        </div>

        {/* Learning Outcomes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('courseForm.fields.learningOutcomes')}
          </label>
          {course.LearningOutcomes.map((outcome, index) => (
            <div key={index} className="flex gap-2 mb-2">
              <Input
                type="text"
                value={outcome}
                onChange={(e) =>
                  handleArrayChange("LearningOutcomes", index, e.target.value)
                }
                placeholder={t('courseForm.fields.learningOutcomePlaceholder', { index: index + 1 })}
                readOnly={isViewMode}
                className={`flex-1 px-3 py-2 ${isViewMode ? 'border-none bg-white cursor-default hover:border-none focus:border-none focus:ring-0' : 'border border-gray-100 focus:border-primary'} rounded-md focus:outline-none focus:ring-2 focus:ring-secondary`}
              />
              {course.LearningOutcomes.length > 1 && !isViewMode && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => removeArrayItem("LearningOutcomes", index)}
                  className="px-3 py-2 border border-red-200 text-red-500 rounded-md hover:bg-red-400 hover:text-white"
                  aria-label={`Remove learning outcome ${index + 1}`}
                >
                  <Minus size={16} />
                </Button>
              )}
            </div>
          ))}
          {!isViewMode && (
            <Button
              variant="ghost"
              type="button"
              onClick={() => addArrayItem("LearningOutcomes")}
              className="mt-2 px-4 py-2 text-primary rounded-md flex items-center gap-2"
            >
              <Plus size={16} />
              {t('courseForm.buttons.addLearningOutcome')}
            </Button>
          )}
        </div>

        {/* Curriculum */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('courseForm.fields.curriculum')}
          </label>
          {course.Curriculum.map((item, index) => (
            <div key={index} className="flex gap-2 mb-2">
              <Input
                type="text"
                value={item}
                onChange={(e) =>
                  handleArrayChange("Curriculum", index, e.target.value)
                }
                placeholder={t('courseForm.fields.curriculumPlaceholder', { index: index + 1 })}
                readOnly={isViewMode}
                className={`flex-1 px-3 py-2 ${isViewMode ? 'border-none bg-white cursor-default hover:border-none focus:border-none focus:ring-0' : 'border border-gray-100 focus:border-primary'} rounded-md focus:outline-none focus:ring-2 focus:ring-secondary`}
              />
              {course.Curriculum.length > 1 && !isViewMode && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => removeArrayItem("Curriculum", index)}
                  className="px-3 py-2 border border-red-200 text-red-500 rounded-md hover:bg-red-400 hover:text-white"
                  aria-label={`Remove curriculum item ${index + 1}`}
                >
                  <Minus size={16} />
                </Button>
              )}
            </div>
          ))}
          {!isViewMode && (
            <Button
              variant="ghost"
              type="button"
              onClick={() => addArrayItem("Curriculum")}
              className="mt-2 px-4 py-2 text-primary rounded-md flex items-center gap-2"
            >
              <Plus size={16} />
              {t('courseForm.buttons.addCurriculumItem')}
            </Button>
          )}
        </div>

        {/* Assessment Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('courseForm.fields.assessmentQuestions')}
          </label>
          {isViewMode ? (
            /* View Mode - Display questions in a user-friendly format */
            <div className="space-y-4">
              {friendlyViewAssessment()}
            </div>
          ) : (
            /* Edit Mode - Form builder interface */
            <div className="space-y-4">
              {friendlyEditAssessment()}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('courseForm.fields.imageUrl')}
          </label>
          <Input
            type="url"
            value={course.Image}
            onChange={(e) => handleInputChange("Image", e.target.value)}
            placeholder={t('courseForm.fields.imageUrlPlaceholder')}
            readOnly={isViewMode}
            className={`w-full px-3 py-2 border border-gray-100 focus:border-primary rounded-md focus:outline-none focus:ring-2 focus:ring-secondary ${isViewMode ? 'bg-white cursor-not-allowed' : ''}`}
          />
        </div>

        {/* Submit Button - Hidden in view mode */}
        {!isViewMode && (
          <div className="flex justify-end w-full">
            <Button
              variant="ghost"
              type="button"
              onClick={courseID ? handleUpdate : handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-3 text-primary rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 w-full"
            >
              {courseID ? (
                <>
                  <PencilIcon size={16} />
                  {isSubmitting ? t('courseForm.buttons.editing') : t('courseForm.buttons.update')}
                </>
              ) : (
                <>
                  <Save size={16} />
                  {isSubmitting ? t('courseForm.buttons.saving') : t('courseForm.buttons.save')}
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseCreationForm;
