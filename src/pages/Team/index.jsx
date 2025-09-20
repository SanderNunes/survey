import FallBackAvatar from "@/components/FallBackAvatar";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import { useSharePoint } from "@/hooks/useSharePoint";
import { getInitials } from "@/utils/constants";
import { Input } from "@material-tailwind/react";
import React, { useEffect, useRef, useState } from "react";
import { OrgChart } from 'd3-org-chart';
import { useTranslation } from "react-i18next";
import * as d3 from 'd3';
import { Edit3, Phone, TrendingUp, User, X } from "lucide-react";
import moment from "moment";
// Modal Component
const Modal = ({ person = mockPerson, onClose = () => {}}) => {
  const { t } = useTranslation();

  if (!person) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <div className="bg-white rounded-2xl shadow-2xl w-[480px] max-w-[90vw] relative overflow-hidden">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 pt-6 pb-4 text-white relative">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white hover:bg-white/10 rounded-full p-1 transition-all"
          >
            <X size={20} />
          </button>

          {/* Employee Identity */}
          <div className="flex items-center space-x-4">
            <FallBackAvatar
              src={`https://africellcloud.sharepoint.com${person.img}`}
              alt={getInitials(person?.name || "User")}
              className="h-16 w-16 text-xl bg-white/20 backdrop-blur-sm border-2 border-white/30"
              isDark={false}
              fontSize="text-xl"
            />
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-1">{person.name}</h2>
              <p className="text-gray-100 font-medium">{person.Function}</p>
              <p className="text-gray-200 text-sm">{person.Department}</p>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-6 space-y-6">
          {/* Contact Information */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="flex items-center text-sm font-semibold text-gray-700 mb-3">
              <Phone size={16} className="mr-2 text-primary-600" />
              {t("modal.contactInfo")}
            </h3>
            <div className="space-y-2">
              <div className="flex items-center text-sm">
                <span className="font-medium text-gray-600 w-16">{t("modal.phone")}:</span>
                <span className="text-gray-800">{person.MSISDN}</span>
              </div>
              <div className="flex items-center text-sm">
                <span className="font-medium text-gray-600 w-16">{t("modal.email")}:</span>
                <span className="text-gray-800 truncate">{person.Email}</span>
              </div>
            </div>
          </div>

          {/* Employment Details */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="flex items-center text-sm font-semibold text-gray-700 mb-3">
              <User size={16} className="mr-2 text-primary-600" />
              {t("modal.employmentDetails")}
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="font-medium text-gray-600 block">{t("modal.team")}:</span>
                <span className="text-gray-800">{person.Team}</span>
              </div>
              <div>
                <span className="font-medium text-gray-600 block">{t("modal.reportTo")}:</span>
                <span className="text-gray-800">{person.ReportTo}</span>
              </div>
              <div>
                <span className="font-medium text-gray-600 block">{t("modal.startDate")}</span>
                <span className="text-gray-800">{moment(person.StartDate).format("DD/MM/YYYY")}</span>
              </div>
              <div>
                <span className="font-medium text-gray-600 block">{t("modal.type")}</span>
                <span className="text-gray-800">{person.CurrentType}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function TeamPage() {
  const { t } = useTranslation();
  const chartContainerRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [loading, setLoading] = useState(false);
  const [orgData, setOrgData] = useState([]);
  const { teams, getTeams } = useSharePoint();
  const [searchTerm, setSearchTerm] = useState("");
  const [fullOrgData, setFullOrgData] = useState([]);

  // Transform SharePoint data to d3-org-chart format
  const transformToD3OrgFormat = (teams) => {
    if (!teams || teams.length === 0) return [];

    // First pass: create all person objects
    const allPeople = teams.map((team, index) => ({
      id: team.Title,
      parentId: team.field_4 || null, // ReportTo field
      name: team.Title,
      Department: team.field_7,
      Section: team.field_1,
      Function: team.field_3,
      Team: team.field_2,
      ReportTo: team.field_4,
      MSISDN: team.field_5,
      Email: team.field_6,
      StartDate: team.field_8,
      CurrentType: team.field_9,
      Ranking: team.field_10,
      KPI: team.field_11,
      img: team.img || "https://via.placeholder.com/80",
    }));

    // Get all valid person IDs
    const validIds = new Set(allPeople.map(person => person.id));

    // Second pass: clean up orphaned references and fix hierarchy
    const cleanedPeople = allPeople.map(person => {
      // If parentId references someone who doesn't exist, make them a root
      if (person.parentId && !validIds.has(person.parentId)) {
        console.warn(`Removing invalid parent reference: ${person.parentId} for ${person.name}`);
        return {
          ...person,
          parentId: null // Make them a root node
        };
      }
      return person;
    });

    // Filter out specific problematic entries if needed
    const filteredPeople = cleanedPeople.filter(person => {
      // Remove Jorge Vazquez if he's causing issues and isn't in the actual team list
      if (person.name === "Jorge Vazquez" || person.id === "Jorge Vazquez") {
        console.warn(`Removing problematic entry: ${person.name}`);
        return false;
      }
      return true;
    });

    return filteredPeople;
  };

  // Custom node template function
  const createNodeTemplate = (d) => {
    const avatarInitials = getInitials(d.data.name || "Anda");
    const nodeId = d.data.id;

    // Create a unique data attribute for the node
    return `
      <div
        data-node-id="${nodeId}"
        class="org-chart-node relative cursor-pointer bg-white rounded-xl border border-gray-200 p-5 w-[250px] h-[110px] flex items-center transition-colors hover:border-primary-500 shadow-sm"
      >
        <!-- Avatar -->
        <div class="flex h-9 w-9 text-xl lg:h-12 lg:w-12 lg:text-xl text-primary border-2 border-background shadow-md justify-center items-center rounded-full">
          ${d.data.img && d.data.img !== "https://via.placeholder.com/80" ?
        `<img src="https://africellcloud.sharepoint.com${d.data.img}" alt="${avatarInitials}" class="w-full h-full rounded-full object-cover">` :
        avatarInitials
      }
        </div>

        <!-- Info -->
        <div class="ml-3 flex-1 min-w-0">
          <p class="text-sm font-semibold text-gray-800 whitespace-nowrap overflow-hidden text-wrap m-0">
            ${d.data.name}
          </p>
          <p class="text-xs text-gray-500 mt-0.5 whitespace-nowrap overflow-hidden text-wrap m-0">
            ${d.data.Function || ''}
          </p>
          <p class="text-xs text-gray-400 mt-0.5 whitespace-nowrap overflow-hidden text-wrap m-0">
            ${d.data.Department || ''}
          </p>
        </div>
      </div>
    `;
  };

  // Add click event listener to chart container
  const handleChartClick = (event) => {
    // Find the closest node element
    const nodeElement = event.target.closest('.org-chart-node');
    if (nodeElement) {
      const nodeId = nodeElement.dataset.nodeId;
      const person = orgData.find(p => p.id === nodeId);
      if (person) {
        setSelectedPerson(person);
      }
    }
  };

  // Initialize chart
  useEffect(() => {
    if (chartContainerRef.current && orgData.length > 0) {
      // Clear previous chart
      if (chartInstanceRef.current) {
        chartContainerRef.current.innerHTML = '';
      }

      // Create new chart instance
      chartInstanceRef.current = new OrgChart()
        .container(chartContainerRef.current)
        .data(orgData)
        .nodeWidth((d) => 250)
        .nodeHeight((d) => 110)
        .nodeContent((d) => createNodeTemplate(d))
        .render();

      // Add click event listener to the chart container
      chartContainerRef.current.addEventListener('click', handleChartClick);

      // Set additional properties if available
      try {
        if (chartInstanceRef.current.childrenMargin) {
          chartInstanceRef.current.childrenMargin((d) => 50);
        }
        if (chartInstanceRef.current.siblingsMargin) {
          chartInstanceRef.current.siblingsMargin((d) => 100);
        }

        if (chartInstanceRef.current.buttonContent) {
          chartInstanceRef.current.buttonContent(({ node, state }) => {
            return `
                  <div style="
                    position: absolute;
                    top: 9px;
                    right: 6px;
                    background: #A1007C;
                    border-radius: 50%;
                    width: 24px;
                    height: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 14px;
                    font-weight: bold;
                    cursor: pointer;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                  ">
                    ${node.children ? (state.expanded ? '−' : '−') : '+'}
                  </div>
      `;
          });
        }

        // Re-render with new settings
        chartInstanceRef.current.render();
      } catch (error) {
        console.log('Some chart methods not available in this version:', error.message);
      }
    }

    // Cleanup function
    return () => {
      if (chartContainerRef.current) {
        chartContainerRef.current.removeEventListener('click', handleChartClick);
      }
    };
  }, [orgData]);

  // Fetch teams data
  useEffect(() => {
    const fetchTeams = async () => {
      setLoading(false);
      try {
        await getTeams();
      } finally {
        setLoading(true);
      }
    };
    fetchTeams();
  }, [getTeams]);

  // Transform teams data when it changes
  useEffect(() => {
    if (teams && teams.length > 0) {
      const transformedData = transformToD3OrgFormat(teams);
      setOrgData(transformedData);
      setFullOrgData(transformedData);
    }
  }, [teams]);

  // Search functionality
  const handleSearch = () => {
    if (!searchTerm || !fullOrgData) return;

    const normalizeAndEscape = (str) => {
      if (!str) return "";
      return str
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    };

    const safeSearch = normalizeAndEscape(searchTerm.toLowerCase());
    const regex = new RegExp(safeSearch, "i");

    // Find matching person
    const matchingPerson = fullOrgData.find(person => {
      const nodeName = normalizeAndEscape(person.name.toLowerCase());
      const nodeEmail = normalizeAndEscape(person.Email?.toLowerCase() || "");
      return regex.test(nodeName) || regex.test(nodeEmail);
    });

    if (matchingPerson) {
      // Get all descendants of the matching person
      const getDescendants = (personId, data) => {
        const descendants = [personId];
        const children = data.filter(p => p.parentId === personId);
        children.forEach(child => {
          descendants.push(...getDescendants(child.id, data));
        });
        return descendants;
      };

      // Get all ancestors of the matching person
      const getAncestors = (personId, data) => {
        const ancestors = [];
        let current = data.find(p => p.id === personId);
        while (current && current.parentId) {
          ancestors.push(current.parentId);
          current = data.find(p => p.id === current.parentId);
        }
        return ancestors;
      };

      const relevantIds = new Set([
        matchingPerson.id,
        ...getAncestors(matchingPerson.id, fullOrgData),
        ...getDescendants(matchingPerson.id, fullOrgData)
      ]);

      const filteredData = fullOrgData.filter(person =>
        relevantIds.has(person.id)
      );

      setOrgData(filteredData);

      // Center on the found person after a short delay
      setTimeout(() => {
        if (chartInstanceRef.current) {
          try {
            if (chartInstanceRef.current.setCentered) {
              chartInstanceRef.current.setCentered(matchingPerson.id).render();
            } else if (chartInstanceRef.current.fit) {
              chartInstanceRef.current.fit().render();
            }
          } catch (error) {
            console.log('Center method not available:', error.message);
          }
        }
      }, 300);
    }
  };

  const handleClean = () => {
    setOrgData(fullOrgData);
    setSearchTerm("");
    setSelectedPerson(null);

    // Re-center chart
    setTimeout(() => {
      if (chartInstanceRef.current) {
        try {
          if (chartInstanceRef.current.fit) {
            chartInstanceRef.current.fit().render();
          } else {
            chartInstanceRef.current.render();
          }
        } catch (error) {
          console.log('Fit method not available:', error.message);
        }
      }
    }, 300);
  };
  // Method 2: Manual zoom using D3 transform
const manualZoomIn = () => {
  if (chartInstanceRef.current) {
    const svg = chartContainerRef.current.querySelector('svg');
    const g = svg?.querySelector('g');

    if (svg && g) {
      // Get current transform
      const transform = d3.zoomTransform(g) || { k: 1, x: 0, y: 0 };
      const newScale = Math.min(transform.k * 1.2, 3); // Max zoom 3x

      // Apply new transform
      const zoom = d3.zoom();
      d3.select(svg).call(
        zoom.transform,
        d3.zoomIdentity.translate(transform.x, transform.y).scale(newScale)
      );
    }
  }
};

const manualZoomOut = () => {
  if (chartInstanceRef.current) {
    const svg = chartContainerRef.current.querySelector('svg');
    const g = svg?.querySelector('g');

    if (svg && g) {
      // Get current transform
      const transform = d3.zoomTransform(g) || { k: 1, x: 0, y: 0 };
      const newScale = Math.max(transform.k * 0.8, 0.1); // Min zoom 0.1x

      // Apply new transform
      const zoom = d3.zoom();
      d3.select(svg).call(
        zoom.transform,
        d3.zoomIdentity.translate(transform.x, transform.y).scale(newScale)
      );
    }
  }
};


  const handleZoomIn = () => {
  if (chartInstanceRef.current) {
    try {
      // Try the compact method first
      chartInstanceRef.current.compact(false).render();

      // Alternative: use zoomIn if available
      if (chartInstanceRef.current.zoomIn) {
        chartInstanceRef.current.zoomIn();
      }
    } catch (error) {
      console.log('Zoom in method not available:', error.message);
      // Fallback to manual zoom
      manualZoomIn();
    }
  }
};

const handleZoomOut = () => {
  if (chartInstanceRef.current) {
    try {
      // Try the compact method
      chartInstanceRef.current.compact(true).render();

      // Alternative: use zoomOut if available
      if (chartInstanceRef.current.zoomOut) {
        chartInstanceRef.current.zoomOut();
      }
    } catch (error) {
      console.log('Zoom out method not available:', error.message);
      // Fallback to manual zoom
      manualZoomOut();
    }
  }
};

  const handleCenter = () => {
    if (chartInstanceRef.current) {
      try {
        if (chartInstanceRef.current.fit) {
          chartInstanceRef.current.fit().render();
        } else {
          chartInstanceRef.current.render();
        }
      } catch (error) {
        console.log('Center method not available:', error.message);
      }
    }
  };

  if (!loading && (!orgData || orgData.length === 0)) {
    return (
      <div className="flex items-center justify-center w-screen h-screen bg-gray-50 animate-fadeIn">
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gray-50 relative">
      {/* Search UI */}
      <div className="absolute top-4 right-4 flex gap-2 bg-white p-3 rounded-xl shadow z-0">
        <Input
          type="text"
          placeholder={t("searchTeam.placeholder")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-3 py-2 border-0 ring:bg-primary-500 rounded-lg text-sm"
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleSearch();
            }
          }}
        />
        <button
          onClick={handleSearch}
          className="px-3 py-1 bg-primary-500 text-white rounded hover:bg-primary-600"
        >
          {t("searchTeam.search")}
        </button>
        <button
          onClick={handleClean}
          className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          {t("searchTeam.clean")}
        </button>
      </div>

      {/* Chart Container */}
      <div
        ref={chartContainerRef}
        className="w-full h-full"
        style={{ minHeight: '100vh' }}
      />

      {/* Zoom & Center Controls */}
      <div className="absolute top-24 right-4 flex flex-col gap-2 bg-white p-3 rounded-xl shadow z-0">
        <button
          onClick={handleZoomIn}
          className="px-3 py-1 bg-primary-500 hover:bg-primary-600 text-white rounded"
        >
          +
        </button>

        <button
          onClick={handleZoomOut}
          className="px-3 py-1 bg-primary-500 hover:bg-primary-600 text-white rounded"
        >
          −
        </button>

        <button
          onClick={handleCenter}
          className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          ⊙
        </button>
      </div>

      {/* Modal */}
      <Modal
        person={selectedPerson}
        onClose={() => setSelectedPerson(null)}
      />
    </div>
  );
}
