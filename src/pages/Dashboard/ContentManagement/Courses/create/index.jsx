import CourseCreationForm from '@/components/Forms/CreateCourse';
import DashboardLayout from '@/layouts/Dashboard';
import React from 'react';

export default function CreateCoursePage() {
  return (
  <DashboardLayout>
    <CourseCreationForm />
  </DashboardLayout>
  );
}
