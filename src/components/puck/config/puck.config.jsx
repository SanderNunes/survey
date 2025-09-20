import { DropZone } from '@measured/puck';
import {
  ArticleHeader,
  ArticleQuote,
  ArticleStep,
  ArticleText,
  Container,
  ImageComponent,
  TableComponent
} from '../components';
import { ImageUploadField, PublishDateField, RichTextEditorField, TableDataField } from '../fields';


export const config = {
  components: {
    ArticleHeader: {
      label: "Header",
      fields: {
        coverImage: {
          type: "custom",
          label: "Cover Image",
          render: ImageUploadField,
        },
        title: {
          type: "text",
          label: "Article Title",
        },
        type: {
          type: "select",
          label: "Article Type",
          options: [
            { label: "Guide", value: "Guide" },
            { label: "Best Practice", value: "Best Practice" },
            { label: "Case Study", value: "Case Study" },
            { label: "Tutorial", value: "Tutorial" },
            { label: "Other", value: "Other" }
          ],
        },
        publishedAt: {
          type: "custom",
          label: "Published Date",
          render: PublishDateField,
        },
      },
      defaultProps: {
        coverImage: "", // Start empty to encourage upload
        title: "Complete Guide to Modern Web Development",
        type: "Guide",
        publishedAt: "",
        showRating: true,
        rating: 4.5
      },
      render: (props) => <ArticleHeader {...props} />,
    },

    ArticleQuote: {
      label: "Quote",
      fields: {
        quoteText: {
          type: "textarea",
          label: "Quote Text",
        },
        authorName: {
          type: "text",
          label: "Author Name",
        },
        authorTitle: {
          type: "text",
          label: "Author Title",
        },
      },
      defaultProps: {
        quoteText: "With a commitment to driving technological evolution, our IT solutions and tour design services are the cornerstone of your digital progression. We transcend boundaries! enabling businesses to not",
        authorName: "Stanio Iainto",
        authorTitle: "Author",
      },
      render: (props) => <ArticleQuote {...props} />,
    },

    ArticleStep: {
      label: "List",
      fields: {
        listType: {
          type: "select",
          label: "List Type",
          options: [
            { label: "Ordered (Numbered)", value: "ordered" },
            { label: "Unordered (Checkmarks)", value: "unordered" }
          ],
        },
        items: {
          type: "array",
          label: "List Items",
          getItemSummary: (item) => item?.text || "New item",
          arrayFields: {
            text: {
              type: "custom",
              label: "Item Text",
              render: RichTextEditorField
            }
          }
        }
      },
      defaultProps: {
        listType: "ordered",
        title: "Learning Path",
        items: [
          { text: "Set up your development environment" },
          { text: "Create your first React component" },
          { text: "Learn about props and state" },
          { text: "Understand component lifecycle" },
          { text: "Master event handling" }
        ]
      },
      render: ({ listType, items = [] }) => (
        <ArticleStep
          listType={listType}
          items={items.map(item => item?.text || "")}
        />
      ),
    },

    ArticleText: {
      label: "Section Text",
      fields: {
        showSubtitle: {
          type: "radio",
          label: "Show Subtitle",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false }
          ]
        },
        subtitle: {
          type: "text",
          label: "Subtitle Text"
        },
        content: {
          type: "custom",
          label: "Content",
          render: RichTextEditorField
        }
      },
      defaultProps: {
        showSubtitle: true,
        subtitle: "Aliquam eros justo, posuere loborti",
        content: "<p>Aliquam <strong>eros justo</strong>, <em>posuere</em> loborti <u>viverra</u>.</p>"
      },
      render: ({ showSubtitle, subtitle, content }) => (
        <ArticleText
          showSubtitle={showSubtitle}
          subtitle={subtitle}
          content={content}
        />
      ),
    },

    Container: {
      label: "Container",
      fields: {
        layout: {
          type: "select",
          label: "Layout",
          options: [
            { label: "1 Column", value: "1" },
            { label: "2 Columns", value: "2" },
            { label: "3 Columns", value: "3" }
          ],
        },
        gap: {
          type: "select",
          label: "Gap Between Items",
          options: [
            { label: "Small", value: "small" },
            { label: "Medium", value: "medium" },
            { label: "Large", value: "large" }
          ],
        },
        verticalAlign: {
          type: "select",
          label: "Vertical Alignment",
          options: [
            { label: "Top", value: "start" },
            { label: "Center", value: "center" },
            { label: "Bottom", value: "end" },
            { label: "Stretch", value: "stretch" }
          ],
        },
        padding: {
          type: "select",
          label: "Container Padding",
          options: [
            { label: "None", value: "none" },
            { label: "Small", value: "small" },
            { label: "Medium", value: "medium" },
            { label: "Large", value: "large" }
          ],
        },
        backgroundColor: {
          type: "select",
          label: "Background Color",
          options: [
            { label: "None", value: "none" },
            { label: "Light Gray", value: "light-gray" },
            { label: "White", value: "white" },
            { label: "Dark", value: "dark" }
          ],
        }
      },
      defaultProps: {
        layout: "1",
        gap: "medium",
        verticalAlign: "start",
        padding: "medium",
        backgroundColor: "none"
      },
      render: ({ layout, gap, verticalAlign, padding, backgroundColor }) => {
        const columnCount = parseInt(layout, 10) || 1;
        const zones = Array.from({ length: columnCount }, (_, i) => (
          <DropZone key={i} zone={`container-content-${i + 1}`} />
        ));

        return (
          <Container
            layout={layout}
            gap={gap}
            verticalAlign={verticalAlign}
            padding={padding}
            backgroundColor={backgroundColor}
          >
            {zones}
          </Container>
        );
      }
    },

    Image: {
      label: "Image",
      fields: {
        imageFile: {
          type: "custom",
          label: "Image",
          render: ImageUploadField,
        },
        altText: {
          type: "text",
          label: "Alt Text",
        },
        size: {
          type: "select",
          label: "Size",
          options: [
            { label: "Small", value: "small" },
            { label: "Medium", value: "medium" },
            { label: "Large", value: "large" },
            { label: "Full Width", value: "full" }
          ]
        },
        alignment: {
          type: "select",
          label: "Alignment",
          options: [
            { label: "Left", value: "left" },
            { label: "Center", value: "center" },
            { label: "Right", value: "right" }
          ]
        }
      },
      defaultProps: {
        imageFile: '',
        altText: "",
        size: "medium",
        alignment: "center"
      },
      render: ({ imageFile, altText, size, alignment }) => {
        return (
          <ImageComponent imageFile={imageFile} altText={altText} size={size} alignment={alignment} />
        )
      }
    },

    Table: {
      label: "Table",
      fields: {
        showTitle: {
          type: "radio",
          label: "Show Title",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false }
          ]
        },
        title: {
          type: "text",
          label: "Table Title"
        },
        tableData: {
          type: "custom",
          label: "Table Data",
          render: TableDataField
        },
        enableFiltering: {
          type: "radio",
          label: "Enable Column Filtering",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false }
          ]
        },
        headerStyle: {
          type: "select",
          label: "Header Style",
          options: [
            { label: "Default", value: "default" },
            { label: "Dark", value: "dark" },
          ]
        },
        cellStyle: {
          type: "select",
          label: "Cell Style",
          options: [
            { label: "Default", value: "default" },
            { label: "Striped Rows", value: "striped" },
            { label: "Bordered Cells", value: "bordered" }
          ]
        },
        borderStyle: {
          type: "select",
          label: "Border Style",
          options: [
            { label: "Full Border", value: "default" },
            { label: "Heavy Border", value: "full" },
            { label: "Horizontal Only", value: "horizontal" },
            { label: "No Border", value: "none" }
          ]
        },
        size: {
          type: "select",
          label: "Text Size",
          options: [
            { label: "Small", value: "small" },
            { label: "Medium", value: "medium" },
            { label: "Large", value: "large" }
          ]
        },
        enablePagination: {
          type: "radio",
          label: "Enable Pagination",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false }
          ]
        },
        defaultItemsPerPage: {
          type: "select",
          label: "Default Items Per Page",
          options: [
            { label: "5", value: 5 },
            { label: "10", value: 10 },
            { label: "25", value: 25 },
            { label: "50", value: 50 },
            { label: "100", value: 100 }
          ]
        }
      },
      defaultProps: {
        showTitle: true,
        title: "Data Table",
        tableData: {
          headers: ["Name", "Email", "Role", "Department", "Location"],
          rows: [
            ["John Doe", "john@example.com", "Developer", "Engineering", "New York"],
            ["Jane Smith", "jane@example.com", "Designer", "Creative", "San Francisco"],
            ["Bob Johnson", "bob@example.com", "Manager", "Operations", "Chicago"],
            ["Alice Brown", "alice@example.com", "Analyst", "Marketing", "Boston"],
            ["Charlie Wilson", "charlie@example.com", "Developer", "Engineering", "Seattle"],
            ["Diana Chen", "diana@example.com", "Designer", "Creative", "Los Angeles"],
            ["Edward Davis", "edward@example.com", "Manager", "Sales", "Miami"],
            ["Fiona Garcia", "fiona@example.com", "Developer", "Engineering", "Austin"],
            ["George Miller", "george@example.com", "Analyst", "Finance", "Denver"],
            ["Hannah Taylor", "hannah@example.com", "Designer", "Creative", "Portland"],
            ["Ivan Rodriguez", "ivan@example.com", "Manager", "Operations", "Phoenix"],
            ["Julia Martinez", "julia@example.com", "Developer", "Engineering", "San Diego"]
          ]
        },
        enableFiltering: true,
        headerStyle: "default",
        cellStyle: "default",
        borderStyle: "default",
        size: "medium",
        enablePagination: true,
        defaultItemsPerPage: 10
      },
      render: (props) => <TableComponent {...props} />
    },
  },
};

