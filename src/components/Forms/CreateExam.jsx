
import React, { useState } from 'react';
import { Plus, Edit2, Save, ArrowLeft, Trash2, Clock } from 'lucide-react';
import { Button } from '@material-tailwind/react';
import { useParams } from 'react-router-dom';
import { useSharePoint } from '@/hooks/useSharePoint';

const CreateExamForm = ({ setFormExam, refresh, exam, userProfile, courseTitle }) => {
  const { courseID } = useParams();
  const { AddExam, UpdateExam, DeleteExam, logAuditEvent } = useSharePoint();
  const [isLoading, setIsLoading] = useState(false);

  const [editingExam, setEditingExam] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [formData, setFormData] = useState({
    Title: '',
    Description: '',
    TotalQuestions: '',
    PassingScore: '',
    DurationMinutes: '',
    Questions: []
  });

  const resetForm = () => {
    setFormData({
      Title: '',
      Description: '',
      TotalQuestions: '',
      PassingScore: '',
      DurationMinutes: '',
      Questions: []
    });
    setQuestions([]);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleQuestionChange = (index, field, value) => {
    const updated = [...questions];
    updated[index][field] = value;
    setQuestions(updated);
  };

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: crypto.randomUUID(),
        title: '',
        question: '',
        options: ['', '', '', ''],
        correctAnswer: '',
        score: 1
      }
    ]);
  };

  const removeQuestion = (index) => {
    const updated = questions.filter((_, i) => i !== index);
    setQuestions(updated);
  };

  const handleEdit = (exam) => {
    setEditingExam(true);
    setFormData({
      Id: exam.Id,
      Title: exam.Title,
      Description: exam.Description,
      TotalQuestions: exam.TotalQuestions,
      PassingScore: exam.PassingScore,
      DurationMinutes: exam.DurationMinutes,
      Questions: exam.Questions || []
    });
    setQuestions(exam.Questions || []);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this exam?')) {
      await DeleteExam(id);
      refresh();
    }
  };

  const handleSave = async () => {
    setIsLoading(true)
    if (!formData.Title.trim()) {
      alert('Title is required');
      return;
    }

    const examData = {
      ...formData,
      Questions: questions,
      courseId: courseID
    };

    if (editingExam) {
      await UpdateExam(exam.Id, examData);
      await logAuditEvent({
          title: `modified exam of the ${courseTitle}`,
          userEmail: userProfile?.mail,
          userName: userProfile?.displayName,
          actionType: "Modify",
          details: `User updated fields in the exam of the course "${courseTitle}".`,
        });
    } else {
      await AddExam(examData);
      await logAuditEvent({
          title: `created exam for the course ${courseTitle}`,
          userEmail: userProfile?.mail,
          userName: userProfile?.displayName,
          actionType: "Create",
          details: `User created a new exam for the course "${courseTitle}".`,
        });
    }

    refresh();
    resetForm();
    setEditingExam(false);
    setFormExam(false);
    setIsLoading(false)
  };

  const handleCancel = () => {
    resetForm();
    setEditingExam(false);
    setFormExam(false);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
          <Edit2 className="text-primary-600" size={24} />
          {editingExam ? 'Edit Exam' : 'Add New Exam'}
        </h2>
        <Button variant="ghost" onClick={() => setFormExam(false)}>
          <ArrowLeft size={20} /> Back
        </Button>
      </div>

      {(!exam?.Id || editingExam) && <div className="space-y-4">
        <input
          type="text"
          placeholder="Title"
          value={formData.Title}
          onChange={(e) => handleInputChange('Title', e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg"
        />

        <textarea
          placeholder="Description"
          rows={3}
          value={formData.Description}
          onChange={(e) => handleInputChange('Description', e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg"
        />

        <div className="grid grid-cols-3 gap-4">
          <input
            placeholder="Total Questions"
            type="number"
            value={formData.TotalQuestions}
            onChange={(e) => handleInputChange('TotalQuestions', e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-lg"
          />
          <input
            placeholder="Passing Score"
            type="number"
            value={formData.PassingScore}
            onChange={(e) => handleInputChange('PassingScore', e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-lg"
          />
          <input
            placeholder="Duration (min)"
            type="number"
            value={formData.DurationMinutes}
            onChange={(e) => handleInputChange('DurationMinutes', e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-lg"
          />
        </div>

        {/* Questions Section */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-700">Questions</label>
            <button onClick={addQuestion} className="text-primary-600 text-sm font-medium flex items-center gap-1">
              <Plus size={16} />
              Add Question
            </button>
          </div>

          {questions.map((q, idx) => (
            <div key={q.id} className="border p-4 mb-4 rounded-md">
              <textarea
                placeholder="Question"
                value={q.question}
                onChange={(e) => handleQuestionChange(idx, 'question', e.target.value)}
                rows={2}
                className="w-full mb-2 px-4 py-2 border border-gray-300 rounded-lg"
              />
              <ol className="list-decimal px-4">
                {q.options.map((opt, optIdx) => (
                <li key={optIdx}>
                  <input
                    type="text"
                    placeholder={`Option ${optIdx + 1}`}
                    value={opt}
                    onChange={(e) => {
                      const updatedOptions = [...q.options];
                      updatedOptions[optIdx] = e.target.value;
                      handleQuestionChange(idx, 'options', updatedOptions);
                    }}
                    className="w-full mb-1 ml-1 py-2 border-b hover:border-primary focus:outline-primary focus:pl-2"
                  />
                </li>
              ))}
              </ol>
              <fieldset>
                <legend className='text-xs text-gray-700 py-1 font-semibold'>Correct Answer</legend>
                <input
                  type="text"
                  placeholder="Correct Answer"
                  value={q.correctAnswer}
                  onChange={(e) => handleQuestionChange(idx, 'correctAnswer', e.target.value)}
                  className="w-full mb-2 px-4 py-2 border border-gray-300 rounded-lg"
                />
              </fieldset>
              <fieldset>
                <legend className='text-xs text-gray-700 py-1 font-semibold'>Score</legend>
                <input
                  type="number"
                  placeholder="Score"
                  value={q.score}
                  onChange={(e) => handleQuestionChange(idx, 'score', parseInt(e.target.value))}
                  className="w-full mb-2 px-4 py-2 border border-gray-300 rounded-lg"
                />
              </fieldset>
              <button
                onClick={() => removeQuestion(idx)}
                className="text-red-600 text-sm hover:underline"
              >
                Remove Question
              </button>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button
            variant="ghost"
            onClick={handleSave}
            disabled={isLoading}
            className="flex-1 text-primary py-3 rounded-lg flex items-center justify-center gap-2"
          >
            {!isLoading && <Save size={18} />}
            {isLoading && <Clock size={18} className="animate-spin text-primary-500" />}
            {isLoading ? "Saving" : "Save"} Exam
          </Button>
          <button
            onClick={handleCancel}
            className="px-6 py-3 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>}

      {/* Exam View */}

      {exam?.Id && !editingExam && (
      <div className="mt-10">
        <h3 className="text-xl font-semibold mb-4">Exam</h3>

        <div className="border p-6 rounded-md space-y-4 bg-white shadow-sm">
          {/* Exam header */}
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-2xl font-semibold text-gray-800">{exam.Title}</h4>
              <p className="text-gray-600" dangerouslySetInnerHTML={{
                __html: exam.Description
              }}></p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleEdit(exam)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <Edit2 size={18} />
              </button>
               <button
                onClick={() => {
                  handleDelete(exam.Id)
                }}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                <Trash2 size={18} />
              </button>
            </div>
          </div>

          {/* Meta info */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-gray-700">
            <div><strong>Total Questions:</strong> {exam.TotalQuestions}</div>
            <div><strong>Passing Score:</strong> {exam.PassingScore}</div>
            <div><strong>Duration:</strong> {exam.DurationMinutes} minutes</div>
          </div>

          {/* Questions list */}
          <div className="mt-6">
            <h5 className="text-lg font-semibold text-gray-800 mb-2">Questions</h5>
            {exam.Questions && exam.Questions.length > 0 ? (
              <ul className="space-y-4">
                {exam.Questions.map((q, index) => (
                  <li key={q.id} className="border border-gray-200 rounded-md p-4 bg-gray-50">
                    <div className="text-sm text-gray-800 mb-2">
                      <strong>Q{index + 1}:</strong> {q.question}
                    </div>
                    <ul className="list-disc ml-6 text-sm text-gray-700 space-y-1">
                      {q.options.map((opt, idx) => (
                        <li key={idx}>
                          {opt}
                        </li>
                      ))}
                    </ul>
                    <div className="text-sm text-green-700 mt-2">
                      <strong>Correct Answer:</strong> {q.correctAnswer}
                    </div>
                    <div className="text-sm text-gray-600">
                      <strong>Score:</strong> {q.score}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-600 italic">No questions added.</p>
            )}
          </div>
        </div>
      </div>
    )}
    </div>
  );
};

export default CreateExamForm;
