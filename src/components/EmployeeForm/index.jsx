// import React, { useEffect, useState } from 'react';
// import { Save, X, User, Building, Users, Briefcase, UserCheck, Phone, Mail, Calendar, FileText, Info, Edit, Eye, Plus, ArrowLeft, Image } from 'lucide-react';

// const EmployeeForm = ({
//   mode = 'add', // 'add', 'edit', 'view'
//   formData = {
//     id: '',
//     name: '',
//     department: '',
//     section: '',
//     function: '',
//     team: '',
//     reportTo: '',
//     msisdn: '',
//     email: '',
//     startDate: '',
//     currentType: '',
//     ranking: '',
//     kpi: '',
//     img: 'https://via.placeholder.com/80',
//   },
//   setFormData = () => { },
//   onSave = () => { },
//   onCancel = () => { },
//   onEdit = () => { },
//   onBack = () => { }
// }) => {

//   const [errors, setErrors] = useState({});
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [currentMode, setCurrentMode] = useState(mode);

//   useEffect(() => {
//     setCurrentMode(mode);
//   }, [mode]);

//   // Sample data for dropdowns
//   const Departments = [
//     'PCX - Projects & Customer Experience',
//   ];

//   const Teams = [
//     'Customer Experience',
//     'Corporate Customer Support',
//     'Residential Customer Support',
//     'Hybrid Customer Support',
//     'Project Innovation Developers',
//     'Project Managers',
//     'Quality Assurance',
//     'PCX',
//   ];

//   const Functions = [
//     'Customer Support Agent',
//     'Developer',
//     'Team Lead',
//     'Manager',
//     'Director',
//     'Chief Projects & Customer Experience Officer'
//   ];

//   const employeeTypes = [
//     'HRD - Full Time',
//     'Africell -FT',
//   ];

//   const handleChange = (field, value) => {
//     if (currentMode === 'view') return; // Prevent changes in view mode

//     if (field === 'img') {
//       const file = value.target.files?.[0]
//       setFormData(prev => ({ ...prev, img: file }));
//     } else {

//       setFormData(prev => ({ ...prev, [field]: value }));
//     }

//     // Clear error when user starts typing
//     if (errors[field]) {
//       setErrors(prev => ({ ...prev, [field]: null }));
//     }
//   };

//   const validateForm = () => {
//     const newErrors = {};

//     if (!formData.name.trim()) newErrors.name = 'Name is required';
//     if (!formData.department.trim()) newErrors.department = 'Department is required';
//     if (!formData.team.trim()) newErrors.team = 'Team is required';
//     if (!formData.function.trim()) newErrors.function = 'Function is required';
//     if (!formData.reportTo.trim()) newErrors.reportTo = 'Report to is required';

//     // Phone validation
//     if (!formData.msisdn.trim()) {
//       newErrors.msisdn = 'Phone number is required';
//     } else if (!/^\+?[\d\s-()]+$/.test(formData.msisdn)) {
//       newErrors.msisdn = 'Please enter a valid phone number';
//     }

//     // Email validation
//     if (!formData.email.trim()) {
//       newErrors.email = 'Email is required';
//     } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
//       newErrors.email = 'Please enter a valid email address';
//     }

//     if (!formData.startDate) newErrors.startDate = 'Start date is required';
//     if (!formData?.currentType.trim()) newErrors.currentType = 'Current type is required';

//     setErrors(newErrors);
//     return Object.keys(newErrors).length === 0;
//   };

//   const handleSubmit = async () => {
//     if (!validateForm()) {
//       return;
//     }

//     setIsSubmitting(true);

//     // Simulate API call
//     setTimeout(() => {
//       onSave(formData);
//       setIsSubmitting(false);
//     }, 1000);
//   };

//   const handleEditClick = () => {
//     setCurrentMode('edit');
//     onEdit && onEdit();
//   };

//   const handleCancelEdit = () => {
//     setCurrentMode('view');
//     onCancel && onCancel();
//   };

//   const getModeConfig = () => {
//     switch (currentMode) {
//       case 'view':
//         return {
//           title: 'Employee Details',
//           icon: Eye,
//           headerColor: 'text-gray-800',
//           readonly: true
//         };
//       case 'edit':
//         return {
//           title: 'Edit Employee',
//           icon: Edit,
//           headerColor: 'text-primary-800',
//           readonly: false
//         };
//       case 'add':
//       default:
//         return {
//           title: 'Add New Employee',
//           icon: Plus,
//           headerColor: 'text-green-800',
//           readonly: false
//         };
//     }
//   };

//   const modeConfig = getModeConfig();

//   const InputField = ({
//     label,
//     field,
//     type = 'text',
//     icon: Icon,
//     placeholder,
//     options = null,
//     required = true
//   }) => (
//     <div className="space-y-2">
//       <label className="flex items-center text-sm font-semibold text-gray-700">
//         {label}
//         {required && currentMode !== 'view' && <span className="text-red-500 ml-1">*</span>}
//       </label>

//       {currentMode === 'view' ? (
//         <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-700">
//           {formData[field] || <span className="text-gray-400 italic">Not specified</span>}
//         </div>
//       ) : options ? (
//         <select
//           value={formData[field]}
//           onChange={(e) => handleChange(field, e.target.value)}
//           readOnly={modeConfig.readonly}
//           className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${modeConfig.readonly ? 'bg-white text-gray-600' : ''
//             } ${errors[field] ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
//         >
//           <option value="">Select {label}</option>
//           {options.map((option, index) => (
//             <option key={index} value={option}>{option}</option>
//           ))}
//         </select>
//       ) : (
//         <input
//           type={type}
//           value={formData[field]}
//           onChange={(e) => handleChange(field, e.target.value)}
//           placeholder={placeholder}
//           readOnly={modeConfig.readonly}
//           className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${modeConfig.readonly ? 'bg-white text-gray-600' : ''
//             } ${errors[field] ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
//         />
//       )}

//       {errors[field] && (
//         <p className="text-red-500 text-sm flex items-center">
//           <Info size={14} className="mr-1" />
//           {errors[field]}
//         </p>
//       )}
//     </div>
//   );

//   return (
//     <div className="">
//       <div className="px-8 py-8 space-y-8">
//         {/* Personal Information */}
//         <div>
//           <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center">

//             Personal Information
//           </h2>
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//             {InputField({
//               label: "Full Name",
//               field: "name",
//               icon: User,
//               placeholder: "Enter employee's full name"
//             })}
//             {InputField({
//               label: "Email Address",
//               field: "email",
//               type: "email",
//               icon: Mail,
//               placeholder: "employee@company.com"
//             })}
//           </div>
//         </div>

//         {/* Organization Information */}
//         <div>
//           <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center">

//             Organization Information
//           </h2>
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//             {InputField({
//               label: "Department",
//               field: "department",
//               icon: Building,
//               options: Departments
//             })}
//             {InputField({
//               label: "Team",
//               field: "team",
//               icon: Users,
//               options: Teams
//             })}
//             {InputField({
//               label: "Function/Position",
//               field: "function",
//               icon: Briefcase,
//               options: Functions
//             })}
//             <div className="space-y-2">
//       <label className="flex items-center text-sm font-semibold text-gray-700">
//         Reports To
//       </label>
//              <input
//                 type={'text'}
//                 name='reportTo'
//                 value={formData?.reportTo}
//                 placeholder="Manager's name"
//                 disabled
//                 className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors `}
//               />
//           </div>
//           </div>
//         </div>

//         {/* Contact & Employment */}
//         <div>
//           <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center">

//             Contact & Employment Details
//           </h2>
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//             {InputField({
//               label: "Phone Number (MSISDN)",
//               field: "msisdn",
//               icon: Phone,
//               placeholder: "+244 999 999 999"
//             })}
//             {InputField({
//               label: "Start Date",
//               field: "startDate",
//               type: "date",
//               icon: Calendar
//             })}
//             {InputField({
//               label: "Current Type",
//               field: "currentType",
//               icon: FileText,
//               options: employeeTypes
//             })}

//             {/* Cover Image */}
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">
//                 Image Profile
//               </label>
//               {currentMode === 'view' ? (
//                 <div className="space-y-2">

//                   {formData.img && (
//                     <img
//                       src={`https://africellcloud.sharepoint.com/${formData.img}`}
//                       alt="Cover"
//                       className="w-32 h-20 object-cover rounded border"
//                     />
//                   )}
//                    <p className="text-gray-700 text-sm break-all">{formData.img}</p>
//                 </div>
//               ) : (
//                 <input
//                   type="file"
//                   onChange={(e) => handleChange('img', e)}
//                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:border-transparent"
//                 // placeholder={t('createArticle.fields.coverImagePlaceholder')}
//                 />
//               )}
//             </div>
//           </div>
//         </div>

//       </div>

//     </div>
//   );
// };

// export default EmployeeForm;

import React, { useEffect, useState } from 'react';
import { Save, X, User, Building, Users, Briefcase, UserCheck, Phone, Mail, Calendar, FileText, Info, Edit, Eye, Plus, ArrowLeft, Image } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const EmployeeForm = ({
  mode = 'add', // 'add', 'edit', 'view'
  formData = {
    id: '',
    name: '',
    department: '',
    section: '',
    function: '',
    team: '',
    reportTo: '',
    msisdn: '',
    email: '',
    startDate: '',
    currentType: '',
    ranking: '',
    kpi: '',
    img: 'https://via.placeholder.com/80',
  },
  setFormData = () => { },
  onSave = () => { },
  onCancel = () => { },
  onEdit = () => { },
  onBack = () => { }
}) => {
  const { t } = useTranslation();
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentMode, setCurrentMode] = useState(mode);

  useEffect(() => {
    setCurrentMode(mode);
  }, [mode]);

  // Get dropdown options from translations
  const departments = t('employeeForm.departments', { returnObjects: true });
  const teams = t('employeeForm.teams', { returnObjects: true });
  const functions = t('employeeForm.functions', { returnObjects: true });
  const employeeTypes = t('employeeForm.employeeTypes', { returnObjects: true });

  const handleChange = (field, value) => {
    if (currentMode === 'view') return; // Prevent changes in view mode

    if (field === 'img') {
      const file = value.target.files?.[0]
      setFormData(prev => ({ ...prev, img: file }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = t('employeeForm.validation.nameRequired');
    if (!formData.department.trim()) newErrors.department = t('employeeForm.validation.departmentRequired');
    if (!formData.team.trim()) newErrors.team = t('employeeForm.validation.teamRequired');
    if (!formData.function.trim()) newErrors.function = t('employeeForm.validation.functionRequired');
    if (!formData.reportTo.trim()) newErrors.reportTo = t('employeeForm.validation.reportToRequired');

    // Phone validation
    if (!formData.msisdn.trim()) {
      newErrors.msisdn = t('employeeForm.validation.phoneRequired');
    } else if (!/^\+?[\d\s-()]+$/.test(formData.msisdn)) {
      newErrors.msisdn = t('employeeForm.validation.phoneInvalid');
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = t('employeeForm.validation.emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('employeeForm.validation.emailInvalid');
    }

    if (!formData.startDate) newErrors.startDate = t('employeeForm.validation.startDateRequired');
    if (!formData?.currentType.trim()) newErrors.currentType = t('employeeForm.validation.currentTypeRequired');

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      onSave(formData);
      setIsSubmitting(false);
    }, 1000);
  };

  const handleEditClick = () => {
    setCurrentMode('edit');
    onEdit && onEdit();
  };

  const handleCancelEdit = () => {
    setCurrentMode('view');
    onCancel && onCancel();
  };

  const getModeConfig = () => {
    switch (currentMode) {
      case 'view':
        return {
          title: t('employeeForm.titles.employeeDetails'),
          icon: Eye,
          headerColor: 'text-gray-800',
          readonly: true
        };
      case 'edit':
        return {
          title: t('employeeForm.titles.editEmployee'),
          icon: Edit,
          headerColor: 'text-primary-800',
          readonly: false
        };
      case 'add':
      default:
        return {
          title: t('employeeForm.titles.addNewEmployee'),
          icon: Plus,
          headerColor: 'text-green-800',
          readonly: false
        };
    }
  };

  const modeConfig = getModeConfig();

  const InputField = ({
    label,
    field,
    type = 'text',
    icon: Icon,
    placeholder,
    options = null,
    required = true
  }) => (
    <div className="space-y-2">
      <label className="flex items-center text-sm font-semibold text-gray-700">
        {label}
        {required && currentMode !== 'view' && <span className="text-red-500 ml-1">*</span>}
      </label>

      {currentMode === 'view' ? (
        <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-700">
          {formData[field] || <span className="text-gray-400 italic">{t('employeeForm.status.notSpecified')}</span>}
        </div>
      ) : options ? (
        <select
          value={formData[field]}
          onChange={(e) => handleChange(field, e.target.value)}
          readOnly={modeConfig.readonly}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${modeConfig.readonly ? 'bg-white text-gray-600' : ''
            } ${errors[field] ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
        >
          <option value="">{t('employeeForm.placeholders.selectOption')} {label}</option>
          {options.map((option, index) => (
            <option key={index} value={option.value}>{option.label}</option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          value={formData[field]}
          onChange={(e) => handleChange(field, e.target.value)}
          placeholder={placeholder}
          readOnly={modeConfig.readonly}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${modeConfig.readonly ? 'bg-white text-gray-600' : ''
            } ${errors[field] ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
        />
      )}

      {errors[field] && (
        <p className="text-red-500 text-sm flex items-center">
          <Info size={14} className="mr-1" />
          {errors[field]}
        </p>
      )}
    </div>
  );

  return (
    <div className="">
      <div className="px-8 py-8 space-y-8">
        {/* Personal Information */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center">
            {t('employeeForm.sections.personalInformation')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {InputField({
              label: t('employeeForm.fields.fullName'),
              field: "name",
              icon: User,
              placeholder: t('employeeForm.placeholders.fullName')
            })}
            {InputField({
              label: t('employeeForm.fields.emailAddress'),
              field: "email",
              type: "email",
              icon: Mail,
              placeholder: t('employeeForm.placeholders.email')
            })}
          </div>
        </div>

        {/* Organization Information */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center">
            {t('employeeForm.sections.organizationInformation')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {InputField({
              label: t('employeeForm.fields.department'),
              field: "department",
              icon: Building,
              options: departments
            })}
            {InputField({
              label: t('employeeForm.fields.team'),
              field: "team",
              icon: Users,
              options: teams
            })}
            {InputField({
              label: t('employeeForm.fields.functionPosition'),
              field: "function",
              icon: Briefcase,
              options: functions
            })}
            <div className="space-y-2">
              <label className="flex items-center text-sm font-semibold text-gray-700">
                {t('employeeForm.fields.reportsTo')}
              </label>
              <input
                type={'text'}
                name='reportTo'
                value={formData?.reportTo}
                placeholder={t('employeeForm.placeholders.managerName')}
                disabled
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors `}
              />
            </div>
          </div>
        </div>

        {/* Contact & Employment */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center">
            {t('employeeForm.sections.contactEmploymentDetails')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {InputField({
              label: t('employeeForm.fields.phoneNumber'),
              field: "msisdn",
              icon: Phone,
              placeholder: t('employeeForm.placeholders.phone')
            })}
            {InputField({
              label: t('employeeForm.fields.startDate'),
              field: "startDate",
              type: "date",
              icon: Calendar
            })}
            {InputField({
              label: t('employeeForm.fields.currentType'),
              field: "currentType",
              icon: FileText,
              options: employeeTypes
            })}

            {/* Image Profile */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('employeeForm.fields.imageProfile')}
              </label>
              {currentMode === 'view' ? (
                <div className="space-y-2">
                  {formData.img && (
                    <img
                      src={`https://africellcloud.sharepoint.com/${formData.img}`}
                      alt="Profile"
                      className="w-32 h-20 object-cover rounded border"
                    />
                  )}
                  <p className="text-gray-700 text-sm break-all">{formData.img}</p>
                </div>
              ) : (
                <input
                  type="file"
                  onChange={(e) => handleChange('img', e)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:border-transparent"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeForm;
