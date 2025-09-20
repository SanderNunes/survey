import React from 'react';

export const Container = ({
  layout = "1",
  gap = "medium",
  verticalAlign = "start",
  padding = "medium",
  backgroundColor = "none",
  children
}) => {
  // Map layout to CSS grid columns
  const getGridColumns = (layout) => {
    switch (layout) {
      case "1":
        return "1fr";
      case "2":
        return "1fr 1fr";
      case "3":
        return "1fr 1fr 1fr";
      default:
        return "1fr";
    }
  };

  // Map gap sizes to CSS values
  const getGapSize = (gap) => {
    switch (gap) {
      case "small":
        return "1rem";
      case "medium":
        return "1.5rem";
      case "large":
        return "2.5rem";
      default:
        return "1.5rem";
    }
  };

  // Map padding sizes to CSS values
  const getPadding = (padding) => {
    switch (padding) {
      case "none":
        return "0";
      case "small":
        return "1rem";
      case "medium":
        return "2rem";
      case "large":
        return "3rem";
      default:
        return "2rem";
    }
  };

  // Map background colors
  const getBackgroundColor = (backgroundColor) => {
    switch (backgroundColor) {
      case "light-gray":
        return "#f8f9fa";
      case "white":
        return "#ffffff";
      case "dark":
        return "#343a40";
      case "none":
      default:
        return "transparent";
    }
  };

  const containerStyles = {
    padding: getPadding(padding),
    backgroundColor: getBackgroundColor(backgroundColor),
  };

  const gridStyles = {
    display: "grid",
    gridTemplateColumns: getGridColumns(layout),
    gap: getGapSize(gap),
    alignItems: verticalAlign,
    width: "100%",
  };

  // Responsive breakpoints
  const responsiveStyles = {
    "@media (max-width: 768px)": {
      gridTemplateColumns: layout === "3-column" ? "1fr 1fr" : "1fr",
    },
    "@media (max-width: 480px)": {
      gridTemplateColumns: "1fr",
    }
  };

  return (
    <div style={containerStyles} className="container-wrapper">
      <div
        style={gridStyles}
        className={`container-grid container-${layout}-column gap-${gap} align-${verticalAlign} padding-${padding} bg-${backgroundColor}`}
      >
        {children}
      </div>

      {/* CSS for responsive behavior */}
      <style jsx>{`
        .container-grid {
          display: grid;
          width: 100%;
        }

        @media (max-width: 768px) {
          .container-3-column {
            grid-template-columns: 1fr 1fr !important;
          }
          .container-2-column {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 480px) {
          .container-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};


