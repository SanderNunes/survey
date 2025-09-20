import React, { useState } from "react";
import TableComponent from "../TableComponent";

export default function ExampleUsage () {
  const [data, setData] = useState([
    {
      id: 1,
      name: "John Doe",
      email: "john@example.com",
      role: "Admin",
      status: "active",
      department: "Engineering",
      tags: ["React", "JavaScript", "Node.js"],
      joinDate: "2023-01-15",
      stats: { views: 1250, ratings: 45 },
      salary: 75000,
      isActive: true
    },
    {
      id: 2,
      name: "Jane Smith",
      email: "jane@example.com",
      role: "Developer",
      status: "inactive",
      department: "Engineering",
      tags: ["Python", "Django"],
      joinDate: "2023-03-22",
      stats: { views: 890, ratings: 32 },
      salary: 68000,
      isActive: false
    },
    {
      id: 3,
      name: "Mike Johnson",
      email: "mike@example.com",
      role: "Designer",
      status: "active",
      department: "Design",
      tags: ["Figma", "UI/UX"],
      joinDate: "2023-02-10",
      stats: { views: 2100, ratings: 67 },
      salary: 62000,
      isActive: true
    }
  ]);

  // 1. BASIC TABLE CONFIGURATION
  const basicTableHead = [
    "name",           // Simple string column
    "email",
    "role",
    "status"
  ];

  // 2. ADVANCED TABLE CONFIGURATION WITH COLUMN OBJECTS
  const advancedTableHead = [
    { key: "name", label: "Full Name" },
    { key: "email", label: "Email Address" },
    { key: "role", label: "Position" },
    {
      key: "status",
      label: "Status",
      type: "status"  // Special rendering for status
    },
    {
      key: "tags",
      label: "Skills",
      type: "tags"    // Special rendering for tags
    },
    {
      key: "joinDate",
      label: "Join Date",
      type: "date"    // Special rendering for dates
    },
    {
      key: "stats",
      label: "Statistics",
      type: "stats"   // Special rendering for stats
    },
    {
      key: "salary",
      label: "Salary",
      render: (value) => `$${value.toLocaleString()}` // Custom render function
    },
    { isAction: true } // Action column
  ];

  // 3. ACTION HANDLERS
  const handleEdit = (row, index) => {

    // Navigate to edit page or open edit modal
    // Example: navigate(`/users/${row.id}/edit`);
  };

  const handleDelete = (row, index) => {

    if (window.confirm(`Are you sure you want to delete ${row.name}?`)) {
      setData(prevData => prevData.filter(item => item.id !== row.id));
    }
  };

  const handleView = (row, index) => {

    // Navigate to view page or open view modal
    // Example: navigate(`/users/${row.id}`);
  };

  // 4. CUSTOM ROW ACTIONS
  const customRowActions = [
    {
      label: "Send Email",
      icon: ({ className }) => <span className={className}>📧</span>,
      onClick: (row) => {

        // Implement email sending logic
      }
    },
    {
      label: "Export Data",
      icon: ({ className }) => <span className={className}>📊</span>,
      onClick: (row) => {

        // Implement export logic
      }
    }
  ];

  // 5. BULK ACTIONS
  const bulkActions = [
    { value: "activate", label: "Activate Selected" },
    { value: "deactivate", label: "Deactivate Selected" },
    { value: "delete", label: "Delete Selected" },
    { value: "export", label: "Export Selected" }
  ];

  const handleBulkAction = (action, selectedIds) => {


    switch (action) {
      case 'activate':
        setData(prevData =>
          prevData.map(item =>
            selectedIds.includes(item.id)
              ? { ...item, status: 'active' }
              : item
          )
        );
        break;
      case 'deactivate':
        setData(prevData =>
          prevData.map(item =>
            selectedIds.includes(item.id)
              ? { ...item, status: 'inactive' }
              : item
          )
        );
        break;
      case 'delete':
        if (window.confirm(`Delete ${selectedIds.length} items?`)) {
          setData(prevData =>
            prevData.filter(item => !selectedIds.includes(item.id))
          );
        }
        break;
      case 'export':
        // Implement export logic

        break;
    }
  };

  // 6. FILTER OPTIONS
  const filterOptions = {
    status: ["active", "inactive"],
    department: ["Engineering", "Design", "Marketing", "Sales"],
    role: ["Admin", "Developer", "Designer", "Manager"]
  };

  const handleFilterChange = (filters) => {

    // You can use this to make API calls with filter parameters
  };

  // 7. CUSTOM CELL RENDERER
  const customCellRenderer = (value, row, column) => {
    // Custom rendering logic for specific columns
    if (column.key === 'name') {
      return (
        <div className="flex items-center">
          <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white text-sm mr-3">
            {value.charAt(0)}
          </div>
          <span>{value}</span>
        </div>
      );
    }

    if (column.key === 'email') {
      return (
        <a
          href={`mailto:${value}`}
          className="text-primary-600 hover:text-primary-800"
        >
          {value}
        </a>
      );
    }

    // Return undefined to use default rendering
    return undefined;
  };

  // 8. STATUS COLORS CUSTOMIZATION
  const statusColors = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-red-100 text-red-800',
    pending: 'bg-yellow-100 text-yellow-800',
    suspended: 'bg-orange-100 text-orange-800'
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">TableComponent Usage Examples</h1>

      {/* BASIC USAGE */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">1. Basic Table</h2>
        <TableComponent
          Title="Basic Employee Table"
          Subtitle="Simple table with basic features"
          TABLE_HEAD={basicTableHead}
          TABLE_ROWS={data}
        />
      </section>

      {/* ADVANCED USAGE WITH ALL FEATURES */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">2. Advanced Table with All Features</h2>
        <TableComponent
          // Basic Configuration
          Title="Advanced Employee Management"
          Subtitle="Complete table with all advanced features enabled"
          TABLE_HEAD={advancedTableHead}
          TABLE_ROWS={data}

          // Pagination
          itemsPerPage={5}
          enablePagination={true}

          // Selection & Bulk Actions
          enableSelection={true}
          enableBulkActions={true}
          bulkActions={bulkActions}
          onBulkAction={handleBulkAction}

          // Filters
          enableFilters={true}
          filterOptions={filterOptions}
          onFilterChange={handleFilterChange}

          // Search Configuration
          searchableColumns={["name", "email", "role"]} // Limit search to specific columns

          // Actions
          actions={{
            create: "/users/create", // Link for create button
            edit: handleEdit,
            delete: handleDelete,
            view: handleView
          }}
          customRowActions={customRowActions}

          // Customization
          statusColors={statusColors}
          renderCell={customCellRenderer}
          emptyStateMessage="No employees found. Add some employees to get started."

          // Loading state (you can control this with your own state)
          loading={false}
        />
      </section>

      {/* MINIMAL CONFIGURATION */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">3. Minimal Configuration</h2>
        <TableComponent
          Title="Minimal Table"
          Subtitle="Just the essentials"
          TABLE_HEAD={["name", "email", "role"]}
          TABLE_ROWS={data}
          enablePagination={false}
        />
      </section>

      {/* CUSTOM COLUMN TYPES EXAMPLE */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">4. Custom Column Types</h2>
        <TableComponent
          Title="Column Types Demo"
          Subtitle="Showcasing different column types"
          TABLE_HEAD={[
            { key: "name", label: "Name" },
            { key: "status", label: "Status", type: "status" },
            { key: "tags", label: "Skills", type: "tags" },
            { key: "joinDate", label: "Join Date", type: "date" },
            { key: "stats", label: "Stats", type: "stats" },
            { key: "isActive", label: "Active" }, // Boolean value
            {
              key: "salary",
              label: "Salary",
              render: (value, row) => (
                <span className="font-semibold text-green-600">
                  ${value.toLocaleString()}
                </span>
              )
            }
          ]}
          TABLE_ROWS={data}
        />
      </section>
    </div>
  );
};



// PROP DOCUMENTATION:

/*
TableComponent Props:

REQUIRED PROPS:
- Title: string - Table title
- Subtitle: string - Table subtitle
- TABLE_HEAD: array - Column definitions
- TABLE_ROWS: array - Data rows

OPTIONAL PROPS:
- itemsPerPage: number (default: 10) - Items per page
- enablePagination: boolean (default: true) - Enable pagination
- enableBulkActions: boolean (default: false) - Enable bulk actions
- enableFilters: boolean (default: false) - Enable filters
- enableSelection: boolean (default: false) - Enable row selection
- filterOptions: object - Filter options for each column
- bulkActions: array - Available bulk actions
- searchableColumns: array - Columns to search in
- loading: boolean (default: false) - Loading state
- emptyStateMessage: string - Message when no data

ACTIONS:
- actions.create: string - URL for create button
- actions.edit: function - Edit handler (row, index) => {}
- actions.delete: function - Delete handler (row, index) => {}
- actions.view: function - View handler (row, index) => {}
- customRowActions: array - Custom action buttons

CALLBACKS:
- onBulkAction: function - Bulk action handler (action, selectedIds) => {}
- onFilterChange: function - Filter change handler (filters) => {}
- renderCell: function - Custom cell renderer (value, row, column) => {}

CUSTOMIZATION:
- statusColors: object - Custom status color mapping
- customRowActions: array - Additional row actions

COLUMN CONFIGURATION:
Columns can be:
1. String: "columnName"
2. Object: {
   key: "columnName",
   label: "Display Name",
   type: "status|tags|date|stats", // Special types
   render: (value, row) => {}, // Custom render function
   isAction: true // For action column
}

COLUMN TYPES:
- "status": Renders status badges with colors
- "tags": Renders tag chips
- "date": Renders with calendar icon
- "stats": Renders view/rating stats
- Custom render function for full control
*/
