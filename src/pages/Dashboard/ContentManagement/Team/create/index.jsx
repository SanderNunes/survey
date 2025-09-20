import React, { useState, useEffect } from 'react';
import {
  Save,
  User,
  Mail,
  Phone,
  Building,
  Users,
  Calendar,
  Award,
  TrendingUp,
  X,
  Plus,
  ArrowLeft,
  EyeIcon,
  Edit3,
  PlusIcon
} from 'lucide-react';
import { NavLink, useNavigate, useParams } from 'react-router-dom';
import { Button, Chip } from '@material-tailwind/react';
import DashboardLayout from '@/layouts/Dashboard';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useSharePoint } from '@/hooks/useSharePoint';
import CSSTooltip from '@/components/CSSTooltip';
import EmployeeForm from '@/components/EmployeeForm';
import moment from 'moment';

const TeamMemberForm = ({ memberId, onSave, onCancel, view = 'add' }) => {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(view === 'add');
  const [loading, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [errors, setErrors] = useState({});
  const { userProfile } = useAuth();
  const { addTeamMember, teamMember, getTeamMember, updateTeamMember, logAuditEvent, uploadImageAsAttachmentTeam } = useSharePoint();
  const { id } = useParams();
  const [currentMode, setCurrentMode] = useState(view);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    id: teamMember.Id || '',
    name: teamMember.Title || '',
    department: teamMember.field_7 || '',
    section: teamMember.field_1 || '',
    function: teamMember.field_3 || '',
    team: teamMember.field_2 || '',
    reportTo: teamMember.field_4 || '',
    msisdn: teamMember.field_5 || '',
    email: teamMember.field_6 || '',
    startDate: teamMember.field_8 ? moment(teamMember.field_8).format('LL') : null,
    currentType: teamMember.field_9 || '',
    ranking: teamMember.field_10 || '',
    kpi: teamMember.field_11 || '',
    img: teamMember.img || 'https://via.placeholder.com/80',
  });



  const fetchTeamMember = async () => {
    try {
      await getTeamMember({ id });
    } catch (err) {
      console.error(t('teamForm.messages.fetchError', { error: err.message }));
    }
  };

  // Map teams into rows
  useEffect(() => {
    if (teamMember && teamMember.Id !== formData.id) {
      const mappedTeams = {
        id: teamMember.Id,
        name: teamMember.Title,
        department: teamMember.field_7,
        section: teamMember.field_1,
        function: teamMember.field_3,
        team: teamMember.field_2,
        reportTo: teamMember.field_4,
        msisdn: teamMember.field_5,
        email: teamMember.field_6,
        startDate: teamMember.field_8 ? moment(teamMember.field_8).format('LL') : null,
        currentType: teamMember.field_9,
        ranking: teamMember.field_10,
        kpi: teamMember.field_11,
        img: teamMember.img || 'https://via.placeholder.com/80',
      };

      setFormData(mappedTeams);
    }
  }, [teamMember]);


  useEffect(() => {
    if (id) {
      fetchTeamMember();
    }
  }, [getTeamMember, id]);


  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = t('teamForm.validation.nameRequired');
    if (!formData.email.trim()) newErrors.email = t('teamForm.validation.emailRequired');
    if (!formData.department) newErrors.department = t('teamForm.validation.departmentRequired');
    if (!formData.function) newErrors.function = t('teamForm.validation.functionRequired');
    if (!formData.team) newErrors.team = t('teamForm.validation.teamRequired');
    if (!formData.currentType) newErrors.currentType = t('teamForm.validation.typeRequired');

    // Email validation
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('teamForm.validation.emailInvalid');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    setSaveStatus(null);

    try {
      if (currentMode == 'edit') {
        // Edit team member
        const data = {
          Title: formData.name,
          field_6: formData.email,
          field_5: formData.msisdn,
          field_7: formData.department,
          field_1: formData.section,
          field_3: formData.function,
          field_2: formData.team,
          field_4: formData.reportTo,
          field_8: moment(formData.startDate).format("YYYY-MM-DDT10:00:00.000[Z]"),
          field_9: formData.currentType,
          field_10: formData.ranking,
          field_11: formData.kpi,
        };

        await updateTeamMember(teamMember.Id, data);
        await uploadImageAsAttachmentTeam(teamMember.Id, formData.img)

        setSaveStatus('success');
        await logAuditEvent({
          title: `modified team member ${formData.name}`,
          userEmail: userProfile?.mail,
          userName: userProfile?.displayName,
          actionType: "Modify",
          details: `User updated fields for team member "${formData.name}".`,
        });

      } else {
        // Add team member
        const member = await addTeamMember(formData);
        await uploadImageAsAttachmentTeam(member.Id, formData.img)
        setSaveStatus('success');
        await logAuditEvent({
          title: `created team member ${formData.name}`,
          userEmail: userProfile?.mail,
          userName: userProfile?.displayName,
          actionType: "Create",
          details: `User created a new team member "${formData.name}".`,
        });
      }

      setIsEditing(false);
    } catch (error) {
      setSaveStatus('error');
      console.error(t('teamForm.messages.saveError', { error: error.message }));
    } finally {
      setSaving(false);
      navigate('/home/content-management/team');
    }
  };

  const handleView = () => {
    setIsEditing(!isEditing)
    setCurrentMode(isEditing ? 'view' : 'edit')
    fetchTeamMember()
  }
  const handeAdd = () => {
    setIsEditing(true)
    setCurrentMode('add')
    setFormData({
      id: '',
      name: '',
      department: '',
      section: '',
      function: '',
      team: '',
      msisdn: '',
      email: '',
      startDate: '',
      currentType: '',
      ranking: '',
      kpi: '',
      img: 'https://via.placeholder.com/80',
      reportTo: teamMember.Title
    })
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto p-6 bg-white">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-gray-800">

          </h2>
          <div className='flex gap-2'>
            <CSSTooltip text={t('navigationTeams.goBack')} position="top">
              <NavLink
                to={'/home/content-management/team'}
                className="flex justify-center items-center gap-3 text-white w-11 h-11 hover:bg-alternative-300 bg-alternative-400 px-3 py-2 rounded-full whitespace-nowrap"
                aria-label={t('navigationTeams.backToTeams')}
              >
                <ArrowLeft strokeWidth={2} className="h-5 w-5" />
              </NavLink>
            </CSSTooltip>

            {id && (
              <CSSTooltip text={isEditing ? t('navigationTeams.viewMode') : t('navigationTeams.editMode')} position="top">
                <Button
                  variant='ghost'
                  onClick={handleView}
                  className={`flex justify-center items-center gap-3 w-11 h-11 text-white hover:bg-alternative-300 bg-alternative-400 px-3 py-2 rounded-full whitespace-nowrap`}
                  aria-label={isEditing ? t('navigationTeams.switchToViewMode') : t('navigationTeams.switchToEditMode')}
                >
                  {isEditing ? <EyeIcon className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                </Button>
              </CSSTooltip>
            )}

            <Button
              onClick={handeAdd}
              className="flex justify-center items-center gap-3 text-white w-11 h-11 hover:bg-alternative-300 bg-alternative-400 px-3 py-2 rounded-full whitespace-nowrap"
            >
              <PlusIcon strokeWidth={2} className="h-5 w-5" />
            </Button>


          </div>
        </div>

        {/* Main Content */}
        <EmployeeForm
          mode={currentMode}
          formData={formData}
          setFormData={setFormData} />

        {/* Save Button */}
        <div className="flex w-full mt-8">
          <div className='w-full'>
            {isEditing && (
              <Button
                variant='ghost'
                onClick={handleSave}
                disabled={loading}
                className="flex justify-center items-center gap-3 text-primary py-2 rounded-md whitespace-nowrap w-full disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {loading ? (
                  currentMode == 'edit' ? t('teamForm.buttons.updating') : t('teamForm.buttons.saving')
                ) : (
                  currentMode == 'edit' ? t('teamForm.buttons.update') : t('teamForm.buttons.save')
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Status Messages */}
        {saveStatus === 'success' && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-800">{t('teamForm.messages.saveSuccess')}</p>
          </div>
        )}

        {saveStatus === 'error' && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800">{t('teamForm.messages.saveError')}</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TeamMemberForm;
