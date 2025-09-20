import DashboardLayout from '@/layouts/Dashboard';
import React, { useState, useEffect } from 'react';
import { useSharePoint } from '@/hooks/useSharePoint';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import moment from 'moment';
import TableComponent from '@/components/TableComponent';
import { Eye } from 'lucide-react';
import { getInitials } from '@/utils/constants';
import FallBackAvatar from '@/components/FallBackAvatar';
import { useNavigate } from 'react-router-dom';

export default function TeamManagementPage() {
  const { t, i18n } = useTranslation();
  const { userProfile } = useAuth();
  const { teams, getTeams } = useSharePoint();

  const [loading, setLoading] = useState(false);
  const [teamData, setTeamData] = useState([]);

  const navigate = useNavigate();

  // Configure moment locale
  useEffect(() => {
    if (i18n.language.startsWith('pt')) {
      moment.locale('pt-br');
    } else {
      moment.locale('en');
    }
  }, [i18n.language]);

  // Fetch Teams
  useEffect(() => {
    const fetchTeams = async () => {
      setLoading(true);
      try {
        await getTeams();
      } catch (error) {
        console.error('Failed to fetch teams:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTeams();
  }, [getTeams]);

  // Map teams into rows
  useEffect(() => {
    if (teams && teams.length > 0) {
      const mappedTeams = teams.map(team => ({
        id: team.Id,
        name: team.Title,
        department: team.field_7,
        section: team.field_1,
        function: team.field_3,
        team: team.field_2,
        reportTo: team.field_4,
        msisdn: team.field_5,
        email: team.field_6,
        startDate: team.field_8 ? moment(team.field_8).format('LL') : null,
        currentType: team.field_9,
        ranking: team.field_10,
        kpi: team.field_11,
        img: team.img ? `https://africellcloud.sharepoint.com${team.img}` : 'https://via.placeholder.com/80',
      }));

      setTeamData(mappedTeams);
    }
  }, [teams]);

  // TABLE CONFIGURATION
  const tableHead = [
    { key: "name", label: t('teams.table.headers.name', 'Name') },
    { key: "team", label: t('teams.table.headers.team', 'Team') },
    { key: "reportTo", label: t('teams.table.headers.reportTo', 'Report To') },
    { key: "email", label: t('teams.table.headers.email', 'Email') },
    { key: "msisdn", label: t('teams.table.headers.msisdn', 'MSISDN') },
    { key: "startDate", label: t('teams.table.headers.startDate', 'Start Date') },
    { isAction: true }
  ];


  // ACTIONS
  const handleView = (row) => {
    navigate(`/home/content-management/team/view/${row.id}`);
  };

  const customCellRenderer = (value, row, column) => {
    if (column.key === 'name') {
      return (
        <div className="flex items-center gap-2">
          <FallBackAvatar
            src={row.img}
            alt={getInitials(row.name)}
            className={'h-8 w-8 text-xl lg:h-8 lg:w-8 lg:text-2xl mr-4'}
            isDark={true}
          />
          <span className="font-medium">{row.name}</span>
        </div>
      );
    }

    if (column.key === 'email') {
      return (
        <a href={`mailto:${value}`} className="text-primary hover:underline">
          {value}
        </a>
      );
    }

    return undefined;
  };

  return (
    <DashboardLayout>
      <div className="mx-6">
        <TableComponent
          Title={t('teams.title', 'Team')}
          TABLE_HEAD={tableHead}
          TABLE_ROWS={teamData}

          // Pagination
          itemsPerPage={7}
          enablePagination={true}

          // Selection
          enableSelection={false}

          // Filters
          enableFilters={false}
          filterOptions={{}}

          // Search
          searchableColumns={["name", "department", "function", "email"]}

          // Actions
          actions={{ view: handleView }}

          // Customization
          renderCell={customCellRenderer}
          emptyStateMessage={t('teams.emptyState', 'No team data available')}

          // Loading
          loading={loading}

          // Accessibility
          ariaLabel={t('teams.title', 'Teams')}
        />
      </div>
    </DashboardLayout>
  );
}
