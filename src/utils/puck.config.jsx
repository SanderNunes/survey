// import React from 'react';
// import { Phone, Shield, Users, Zap, ThumbsUp, ThumbsDown, CheckCircle, Circle, ArrowRight, AlertCircle, Info, AlertTriangle, MoreHorizontal, Bookmark, Share2, User, Search } from 'lucide-react';

// // Basic UI Components
// export const Button = ({ children, variant = 'default', size = 'default', className = '', ...props }) => {
//   const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';
//   const variants = {
//     default: 'bg-primary-600 text-white hover:bg-primary-700',
//     ghost: 'hover:bg-gray-100 hover:text-gray-900',
//     secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
//   };
//   const sizes = {
//     default: 'h-10 py-2 px-4',
//     sm: 'h-9 px-3 rounded-md',
//     lg: 'h-11 px-8',
//   };

//   return (
//     <button
//       className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
//       {...props}
//     >
//       {children}
//     </button>
//   );
// };

// export const Badge = ({ children, variant = 'default', className = '' }) => {
//   const variants = {
//     default: 'bg-primary-100 text-primary-800',
//     secondary: 'bg-gray-100 text-gray-800',
//     success: 'bg-green-100 text-green-800',
//     warning: 'bg-yellow-100 text-yellow-800',
//     error: 'bg-red-100 text-red-800',
//   };

//   return (
//     <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[variant]} ${className}`}>
//       {children}
//     </span>
//   );
// };

// // Article Components
// export const ArticleHero = ({ title, subtitle, author, publishDate, heroImage, category, readTime }) => {
//   return (
//     <div className="relative bg-white text-gray-800 py-20 mb-8">
//       {heroImage && (
//         <div
//           className="absolute inset-0 bg-cover bg-center opacity-20"
//           style={{ backgroundImage: `url(${heroImage})` }}
//         />
//       )}
//       <div className="relative max-w-4xl mx-auto px-6">
//         {category && (
//           <Badge variant="secondary" className="mb-4 bg-white/20 text-white">
//             {category}
//           </Badge>
//         )}
//         <h1 className="text-5xl font-bold mb-4">{title || "Article Title"}</h1>
//         {subtitle && <p className="text-xl text-gray-200 mb-6 leading-relaxed">{subtitle}</p>}
//         <div className="flex items-center space-x-4 text-gray-300">
//           <div className="flex items-center space-x-2">
//             <User className="h-4 w-4" />
//             <span>By {author || "Author Name"}</span>
//           </div>
//           <span>•</span>
//           <span>{publishDate || "January 1, 2024"}</span>
//           {readTime && (
//             <>
//               <span>•</span>
//               <span>{readTime} min read</span>
//             </>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };

// export const ArticleContent = ({ content, size = "base" }) => {
//   const sizeClasses = {
//     sm: "text-sm",
//     base: "text-base",
//     lg: "text-lg",
//   };

//   return (
//     <div className="max-w-3xl mx-auto px-6 py-8">
//       <div className="prose prose-lg max-w-none">
//         <div
//           className={`text-gray-800 leading-relaxed ${sizeClasses[size]}`}
//           dangerouslySetInnerHTML={{
//             __html: content || "<p>Start writing your article content here...</p>"
//           }}
//         />
//       </div>
//     </div>
//   );
// };

// export const ArticleGrid = ({ title, articles = [], columns = 3 }) => {
//   const gridClasses = {
//     1: "grid-cols-1",
//     2: "grid-cols-1 md:grid-cols-2",
//     3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
//     4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
//   };

//   return (
//     <section className="max-w-6xl mx-auto px-6 py-12">
//       {title && <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">{title}</h2>}
//       <div className={`grid gap-8 ${gridClasses[columns]}`}>
//         {articles.map((article, index) => (
//           <article key={index} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
//             <img
//               src={article.image || "https://via.placeholder.com/400x250?text=Article+Image"}
//               alt={article.title}
//               className="w-full h-48 object-cover"
//             />
//             <div className="p-6">
//               {article.category && (
//                 <Badge variant="secondary" className="mb-2">
//                   {article.category}
//                 </Badge>
//               )}
//               <h3 className="text-xl font-bold mb-3 text-gray-900 hover:text-primary-600 transition-colors">
//                 {article.title}
//               </h3>
//               <p className="text-gray-600 mb-4 line-clamp-3">{article.excerpt}</p>
//               <div className="flex justify-between items-center text-sm text-gray-500">
//                 <span className="font-medium">{article.author}</span>
//                 <div className="flex items-center space-x-2">
//                   <span>{article.date}</span>
//                   {article.readTime && (
//                     <>
//                       <span>•</span>
//                       <span>{article.readTime}</span>
//                     </>
//                   )}
//                 </div>
//               </div>
//             </div>
//           </article>
//         ))}
//       </div>
//     </section>
//   );
// };

// export const Callout = ({ type, title, children }) => {
//   const styles = {
//     info: {
//       container: "bg-primary-50 border-l-4 border-primary-400",
//       icon: <Info className="h-5 w-5 text-primary-600" />,
//       titleColor: "text-primary-800",
//       textColor: "text-primary-700",
//     },
//     warning: {
//       container: "bg-yellow-50 border-l-4 border-yellow-400",
//       icon: <AlertTriangle className="h-5 w-5 text-yellow-600" />,
//       titleColor: "text-yellow-800",
//       textColor: "text-yellow-700",
//     },
//     success: {
//       container: "bg-green-50 border-l-4 border-green-400",
//       icon: <CheckCircle className="h-5 w-5 text-green-600" />,
//       titleColor: "text-green-800",
//       textColor: "text-green-700",
//     },
//     error: {
//       container: "bg-red-50 border-l-4 border-red-400",
//       icon: <AlertCircle className="h-5 w-5 text-red-600" />,
//       titleColor: "text-red-800",
//       textColor: "text-red-700",
//     },
//   };

//   const style = styles[type];

//   return (
//     <div className="max-w-3xl mx-auto px-6 py-4">
//       <div className={`${style.container} p-6 rounded-r-lg`}>
//         <div className="flex">
//           <div className="mr-3 mt-1 flex-shrink-0">{style.icon}</div>
//           <div>
//             {title && <p className={`${style.titleColor} font-medium mb-1`}>{title}</p>}
//             <div className={style.textColor}>{children}</div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export const ListBlock = ({ items, type = "bullet", title }) => {
//   const getIcon = (listType) => {
//     switch (listType) {
//       case "check":
//         return <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />;
//       case "arrow":
//         return <ArrowRight className="h-4 w-4 text-gray-500 mr-3 mt-1 flex-shrink-0" />;
//       case "bullet":
//         return <Circle className="h-2 w-2 text-gray-500 mr-3 mt-2 flex-shrink-0 fill-current" />;
//       default:
//         return null;
//     }
//   };

//   const normalizedItems = items.map((item) => (typeof item === "string" ? { text: item } : item));

//   return (
//     <div className="max-w-3xl mx-auto px-6 py-4">
//       {title && <h3 className="text-xl font-semibold text-gray-900 mb-4">{title}</h3>}
//       {type === "numbered" ? (
//         <ol className="space-y-3 text-gray-700">
//           {normalizedItems.map((item, index) => (
//             <li key={index} className="flex items-start">
//               <span className="font-semibold mr-3 mt-0.5 flex-shrink-0 text-primary-600">{index + 1}.</span>
//               <span>{item.text}</span>
//             </li>
//           ))}
//         </ol>
//       ) : (
//         <ul className="space-y-3 text-gray-700">
//           {normalizedItems.map((item, index) => (
//             <li key={index} className="flex items-start">
//               {getIcon(type)}
//               <span>{item.text}</span>
//             </li>
//           ))}
//         </ul>
//       )}
//     </div>
//   );
// };

// // config/puck.config.js
// // Puck Configuration
// const config = {
//   components: {
//     // Hero Section
//     ArticleHero: {
//       fields: {
//         title: {
//           type: "text",
//           label: "Article Title"
//         },
//         subtitle: {
//           type: "textarea",
//           label: "Subtitle"
//         },
//         author: {
//           type: "text",
//           label: "Author Name"
//         },
//         publishDate: {
//           type: "text",
//           label: "Publish Date"
//         },
//         readTime: {
//           type: "text",
//           label: "Read Time (minutes)"
//         },
//         category: {
//           type: "text",
//           label: "Category"
//         },
//         heroImage: {
//           type: "text",
//           label: "Hero Image URL"
//         }
//       },
//       defaultProps: {
//         title: "Article Title",
//         subtitle: "This is a compelling subtitle that draws readers in",
//         author: "Author Name",
//         publishDate: "January 1, 2024",
//         readTime: "5",
//         category: "Technology"
//       },
//       render: (props) => <ArticleHero {...props} />
//     },

//     // Content Blocks
//     ArticleContent: {
//       fields: {
//         content: {
//           type: "textarea",
//           label: "Article Content"
//         },
//         size: {
//           type: "select",
//           label: "Text Size",
//           options: [
//             { label: "Small", value: "sm" },
//             { label: "Regular", value: "base" },
//             { label: "Large", value: "lg" }
//           ]
//         }
//       },
//       defaultProps: {
//         content: "<p>Start writing your article content here. You can use HTML formatting.</p>",
//         size: "base"
//       },
//       render: (props) => <ArticleContent {...props} />
//     },

//     // Article Grid
//     ArticleGrid: {
//       fields: {
//         title: {
//           type: "text",
//           label: "Section Title"
//         },
//         columns: {
//           type: "select",
//           label: "Columns",
//           options: [
//             { label: "1 Column", value: 1 },
//             { label: "2 Columns", value: 2 },
//             { label: "3 Columns", value: 3 },
//             { label: "4 Columns", value: 4 }
//           ]
//         },
//         articles: {
//           type: "array",
//           label: "Articles",
//           arrayFields: {
//             title: { type: "text", label: "Article Title" },
//             excerpt: { type: "textarea", label: "Excerpt" },
//             author: { type: "text", label: "Author" },
//             date: { type: "text", label: "Date" },
//             category: { type: "text", label: "Category" },
//             image: { type: "text", label: "Image URL" },
//             readTime: { type: "text", label: "Read Time" }
//           },
//           getItemSummary: (item) => item.title || "New Article"
//         },
//       },
//       defaultProps: {
//         title: "Related Articles",
//         columns: 3,
//         articles: [
//           {
//             title: "Sample Article 1",
//             excerpt: "This is a sample excerpt for the first article...",
//             author: "John Doe",
//             date: "Mar 15, 2024",
//             category: "Technology",
//             readTime: "5 min read"
//           },
//           {
//             title: "Sample Article 2",
//             excerpt: "This is a sample excerpt for the second article...",
//             author: "Jane Smith",
//             date: "Mar 10, 2024",
//             category: "Design",
//             readTime: "3 min read"
//           }
//         ]
//       },
//       render: (props) => <ArticleGrid {...props} />
//     },

//     // Callout Blocks
//     Callout: {
//       fields: {
//         type: {
//           type: "select",
//           label: "Callout Type",
//           options: [
//             { label: "Info", value: "info" },
//             { label: "Warning", value: "warning" },
//             { label: "Success", value: "success" },
//             { label: "Error", value: "error" }
//           ]
//         },
//         title: {
//           type: "text",
//           label: "Title"
//         },
//         content: {
//           type: "textarea",
//           label: "Content"
//         }
//       },
//       defaultProps: {
//         type: "info",
//         title: "Important Note",
//         content: "This is an important piece of information that readers should pay attention to."
//       },
//       render: ({ content, ...props }) => (
//         <Callout {...props}>
//           <p>{content}</p>
//         </Callout>
//       )
//     },

//     // List Block
//     ListBlock: {
//       fields: {
//         title: {
//           type: "text",
//           label: "List Title"
//         },
//         type: {
//           type: "select",
//           label: "List Type",
//           options: [
//             { label: "Bullet Points", value: "bullet" },
//             { label: "Checkmarks", value: "check" },
//             { label: "Arrows", value: "arrow" },
//             { label: "Numbered", value: "numbered" }
//           ]
//         },
//         items: {
//           type: "array",
//           label: "List Items",
//           arrayFields: {
//             text: { type: "text", label: "Item Text" }
//           },
//           getItemSummary: (item) => item.text || "New Item"
//         }
//       },
//       defaultProps: {
//         title: "Key Points",
//         type: "check",
//         items: [
//           { text: "First important point" },
//           { text: "Second important point" },
//           { text: "Third important point" }
//         ]
//       },
//       render: (props) => <ListBlock {...props} />
//     },

//     // Enhanced Quote Block
//     QuoteBlock: {
//       fields: {
//         quote: {
//           type: "textarea",
//           label: "Quote Text"
//         },
//         author: {
//           type: "text",
//           label: "Quote Author"
//         },
//         authorTitle: {
//           type: "text",
//           label: "Author Title/Company"
//         },
//         style: {
//           type: "select",
//           label: "Quote Style",
//           options: [
//             { label: "Default", value: "default" },
//             { label: "Large", value: "large" },
//             { label: "Centered", value: "centered" }
//           ]
//         }
//       },
//       defaultProps: {
//         quote: "Your inspiring quote goes here...",
//         author: "Quote Author",
//         style: "default"
//       },
//       render: ({ quote, author, authorTitle, style }) => {
//         const styleClasses = {
//           default: "text-xl border-l-4 border-primary-500 pl-6",
//           large: "text-3xl text-center border-none",
//           centered: "text-2xl text-center border-t border-b border-gray-200 py-6"
//         };

//         return (
//           <div className="max-w-3xl mx-auto px-6 py-8">
//             <blockquote className={`italic text-gray-700 ${styleClasses[style]}`}>
//               "{quote}"
//             </blockquote>
//             {author && (
//               <div className="text-right mt-4">
//                 <p className="text-gray-600 font-medium">— {author}</p>
//                 {authorTitle && (
//                   <p className="text-gray-500 text-sm">{authorTitle}</p>
//                 )}
//               </div>
//             )}
//           </div>
//         );
//       },
//     },

//     // Enhanced Image Block
//     ImageBlock: {
//       fields: {
//         src: {
//           type: "text",
//           label: "Image URL"
//         },
//         alt: {
//           type: "text",
//           label: "Alt Text"
//         },
//         caption: {
//           type: "text",
//           label: "Caption"
//         },
//         size: {
//           type: "select",
//           label: "Image Size",
//           options: [
//             { label: "Small", value: "small" },
//             { label: "Medium", value: "medium" },
//             { label: "Large", value: "large" },
//             { label: "Full Width", value: "full" }
//           ]
//         },
//         alignment: {
//           type: "select",
//           label: "Alignment",
//           options: [
//             { label: "Left", value: "left" },
//             { label: "Center", value: "center" },
//             { label: "Right", value: "right" }
//           ]
//         }
//       },
//       defaultProps: {
//         src: "https://via.placeholder.com/800x400?text=Your+Image",
//         alt: "Article image",
//         size: "medium",
//         alignment: "center"
//       },
//       render: ({ src, alt, caption, size, alignment }) => {
//         const sizeClasses = {
//           small: "max-w-md",
//           medium: "max-w-2xl",
//           large: "max-w-4xl",
//           full: "max-w-full"
//         };

//         const alignmentClasses = {
//           left: "mr-auto",
//           center: "mx-auto",
//           right: "ml-auto"
//         };

//         return (
//           <div className={`px-6 py-8 ${sizeClasses[size]} ${alignmentClasses[alignment]}`}>
//             <img
//               src={src}
//               alt={alt}
//               className="w-full rounded-lg shadow-md"
//             />
//             {caption && (
//               <p className="text-center text-gray-600 mt-3 italic text-sm">{caption}</p>
//             )}
//           </div>
//         );
//       },
//     },

//     // Newsletter Signup
//     NewsletterSignup: {
//       fields: {
//         title: {
//           type: "text",
//           label: "Title"
//         },
//         description: {
//           type: "textarea",
//           label: "Description"
//         },
//         buttonText: {
//           type: "text",
//           label: "Button Text"
//         },
//         backgroundColor: {
//           type: "select",
//           label: "Background Color",
//           options: [
//             { label: "Blue", value: "blue" },
//             { label: "Gray", value: "gray" },
//             { label: "Green", value: "green" },
//             { label: "Purple", value: "purple" }
//           ]
//         }
//       },
//       defaultProps: {
//         title: "Subscribe to our Newsletter",
//         description: "Get the latest articles delivered to your inbox",
//         buttonText: "Subscribe",
//         backgroundColor: "blue"
//       },
//       render: ({ title, description, buttonText, backgroundColor }) => {
//         const bgClasses = {
//           blue: "bg-primary-50",
//           gray: "bg-gray-50",
//           green: "bg-green-50",
//           purple: "bg-purple-50"
//         };

//         const buttonClasses = {
//           blue: "bg-primary-600 hover:bg-primary-700",
//           gray: "bg-gray-600 hover:bg-gray-700",
//           green: "bg-green-600 hover:bg-green-700",
//           purple: "bg-purple-600 hover:bg-purple-700"
//         };

//         return (
//           <div className={`${bgClasses[backgroundColor]} py-12`}>
//             <div className="max-w-2xl mx-auto px-6 text-center">
//               <h3 className="text-2xl font-bold mb-4 text-gray-900">{title}</h3>
//               <p className="text-gray-600 mb-6">{description}</p>
//               <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
//                 <input
//                   type="email"
//                   placeholder="Enter your email"
//                   className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
//                 />
//                 <button className={`text-white px-6 py-2 rounded-md transition-colors ${buttonClasses[backgroundColor]}`}>
//                   {buttonText}
//                 </button>
//               </div>
//             </div>
//           </div>
//         );
//       },
//     }
//   },

//   // Root component configuration
//   root: {
//     fields: {
//       title: {
//         type: "text",
//         label: "Page Title"
//       }
//     },
//     render: ({ children, title }) => (
//       <div className="min-h-screen bg-white">
//         {title && (
//           <head>
//             <title>{title}</title>
//           </head>
//         )}
//         {children}
//       </div>
//     )
//   }
// };

// export default config;
// Dynamic Puck Configuration System
import React from 'react';
import { Phone, Shield, Users, Zap, ThumbsUp, ThumbsDown, CheckCircle, Circle, ArrowRight, AlertCircle, Info, AlertTriangle, MoreHorizontal, Bookmark, Share2, User, Search } from 'lucide-react';

// Import all your existing components (ArticleHero, ArticleContent, etc.)
export const Button = ({ children, variant = 'default', size = 'default', className = '', ...props }) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';
  const variants = {
    default: 'bg-primary-600 text-white hover:bg-primary-700',
    ghost: 'hover:bg-gray-100 hover:text-gray-900',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
  };
  const sizes = {
    default: 'h-10 py-2 px-4',
    sm: 'h-9 px-3 rounded-md',
    lg: 'h-11 px-8',
  };

  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export const Badge = ({ children, variant = 'default', className = '' }) => {
  const variants = {
    default: 'bg-primary-100 text-primary-800',
    secondary: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

// Article Components
export const ArticleHero = ({ title, subtitle, author, publishDate, heroImage, category, readTime }) => {
  return (
    <div className="relative bg-white text-gray-800 py-20 mb-8">
      {heroImage && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
      )}
      <div className="relative max-w-4xl mx-auto px-6">
        {category && (
          <Badge variant="secondary" className="mb-4 bg-white/20 text-white">
            {category}
          </Badge>
        )}
        <h1 className="text-5xl font-bold mb-4">{title || "Article Title"}</h1>
        {subtitle && <p className="text-xl text-gray-200 mb-6 leading-relaxed">{subtitle}</p>}
        <div className="flex items-center space-x-4 text-gray-300">
          <div className="flex items-center space-x-2">
            <User className="h-4 w-4" />
            <span>By {author || "Author Name"}</span>
          </div>
          <span>•</span>
          <span>{publishDate || "January 1, 2024"}</span>
          {readTime && (
            <>
              <span>•</span>
              <span>{readTime} min read</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export const ArticleContent = ({ content, size = "base" }) => {
  const sizeClasses = {
    sm: "text-sm",
    base: "text-base",
    lg: "text-lg",
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="prose prose-lg max-w-none">
        <div
          className={`text-gray-800 leading-relaxed ${sizeClasses[size]}`}
          dangerouslySetInnerHTML={{
            __html: content || "<p>Start writing your article content here...</p>"
          }}
        />
      </div>
    </div>
  );
};

export const ArticleGrid = ({ title, articles = [], columns = 3 }) => {
  const gridClasses = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <section className="max-w-6xl mx-auto px-6 py-12">
      {title && <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">{title}</h2>}
      <div className={`grid gap-8 ${gridClasses[columns]}`}>
        {articles.map((article, index) => (
          <article key={index} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <img
              src={article.image || "https://via.placeholder.com/400x250?text=Article+Image"}
              alt={article.title}
              className="w-full h-48 object-cover"
            />
            <div className="p-6">
              {article.category && (
                <Badge variant="secondary" className="mb-2">
                  {article.category}
                </Badge>
              )}
              <h3 className="text-xl font-bold mb-3 text-gray-900 hover:text-primary-600 transition-colors">
                {article.title}
              </h3>
              <p className="text-gray-600 mb-4 line-clamp-3">{article.excerpt}</p>
              <div className="flex justify-between items-center text-sm text-gray-500">
                <span className="font-medium">{article.author}</span>
                <div className="flex items-center space-x-2">
                  <span>{article.date}</span>
                  {article.readTime && (
                    <>
                      <span>•</span>
                      <span>{article.readTime}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export const Callout = ({ type, title, children }) => {
  const styles = {
    info: {
      container: "bg-primary-50 border-l-4 border-primary-400",
      icon: <Info className="h-5 w-5 text-primary-600" />,
      titleColor: "text-primary-800",
      textColor: "text-primary-700",
    },
    warning: {
      container: "bg-yellow-50 border-l-4 border-yellow-400",
      icon: <AlertTriangle className="h-5 w-5 text-yellow-600" />,
      titleColor: "text-yellow-800",
      textColor: "text-yellow-700",
    },
    success: {
      container: "bg-green-50 border-l-4 border-green-400",
      icon: <CheckCircle className="h-5 w-5 text-green-600" />,
      titleColor: "text-green-800",
      textColor: "text-green-700",
    },
    error: {
      container: "bg-red-50 border-l-4 border-red-400",
      icon: <AlertCircle className="h-5 w-5 text-red-600" />,
      titleColor: "text-red-800",
      textColor: "text-red-700",
    },
  };

  const style = styles[type];

  return (
    <div className="max-w-3xl mx-auto px-6 py-4">
      <div className={`${style.container} p-6 rounded-r-lg`}>
        <div className="flex">
          <div className="mr-3 mt-1 flex-shrink-0">{style.icon}</div>
          <div>
            {title && <p className={`${style.titleColor} font-medium mb-1`}>{title}</p>}
            <div className={style.textColor}>{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ListBlock = ({ items, type = "bullet", title }) => {
  const getIcon = (listType) => {
    switch (listType) {
      case "check":
        return <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />;
      case "arrow":
        return <ArrowRight className="h-4 w-4 text-gray-500 mr-3 mt-1 flex-shrink-0" />;
      case "bullet":
        return <Circle className="h-2 w-2 text-gray-500 mr-3 mt-2 flex-shrink-0 fill-current" />;
      default:
        return null;
    }
  };

  const normalizedItems = items.map((item) => (typeof item === "string" ? { text: item } : item));

  return (
    <div className="max-w-3xl mx-auto px-6 py-4">
      {title && <h3 className="text-xl font-semibold text-gray-900 mb-4">{title}</h3>}
      {type === "numbered" ? (
        <ol className="space-y-3 text-gray-700">
          {normalizedItems.map((item, index) => (
            <li key={index} className="flex items-start">
              <span className="font-semibold mr-3 mt-0.5 flex-shrink-0 text-primary-600">{index + 1}.</span>
              <span>{item.text}</span>
            </li>
          ))}
        </ol>
      ) : (
        <ul className="space-y-3 text-gray-700">
          {normalizedItems.map((item, index) => (
            <li key={index} className="flex items-start">
              {getIcon(type)}
              <span>{item.text}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
// ... (your existing component definitions) ...

// Component Registry - All available components
const COMPONENT_REGISTRY = {
  // Content Components
  content: {
    ArticleHero: {
      category: 'content',
      label: 'Article Hero',
      description: 'Hero section with title, subtitle, and metadata',
      fields: {
        title: { type: "text", label: "Article Title" },
        subtitle: { type: "textarea", label: "Subtitle" },
        author: { type: "text", label: "Author Name" },
        publishDate: { type: "text", label: "Publish Date" },
        readTime: { type: "text", label: "Read Time (minutes)" },
        category: { type: "text", label: "Category" },
        heroImage: { type: "text", label: "Hero Image URL" }
      },
      defaultProps: {
        title: "Article Title",
        subtitle: "This is a compelling subtitle that draws readers in",
        author: "Author Name",
        publishDate: "January 1, 2024",
        readTime: "5",
        category: "Technology"
      },
      render: (props) => <ArticleHero {...props} />
    },

    ArticleContent: {
      category: 'content',
      label: 'Article Content',
      description: 'Rich text content block',
      fields: {
        content: { type: "textarea", label: "Article Content" },
        size: {
          type: "select",
          label: "Text Size",
          options: [
            { label: "Small", value: "sm" },
            { label: "Regular", value: "base" },
            { label: "Large", value: "lg" }
          ]
        }
      },
      defaultProps: {
        content: "<p>Start writing your article content here. You can use HTML formatting.</p>",
        size: "base"
      },
      render: (props) => <ArticleContent {...props} />
    }
  },

  // Layout Components
  layout: {
    ArticleGrid: {
      category: 'layout',
      label: 'Article Grid',
      description: 'Grid layout for related articles',
      fields: {
        title: { type: "text", label: "Section Title" },
        columns: {
          type: "select",
          label: "Columns",
          options: [
            { label: "1 Column", value: 1 },
            { label: "2 Columns", value: 2 },
            { label: "3 Columns", value: 3 },
            { label: "4 Columns", value: 4 }
          ]
        },
        articles: {
          type: "array",
          label: "Articles",
          arrayFields: {
            title: { type: "text", label: "Article Title" },
            excerpt: { type: "textarea", label: "Excerpt" },
            author: { type: "text", label: "Author" },
            date: { type: "text", label: "Date" },
            category: { type: "text", label: "Category" },
            image: { type: "text", label: "Image URL" },
            readTime: { type: "text", label: "Read Time" }
          },
          getItemSummary: (item) => item.title || "New Article"
        }
      },
      defaultProps: {
        title: "Related Articles",
        columns: 3,
        articles: []
      },
      render: (props) => <ArticleGrid {...props} />
    }
  },

  // Interactive Components
  interactive: {
    Callout: {
      category: 'interactive',
      label: 'Callout',
      description: 'Highlighted information box',
      fields: {
        type: {
          type: "select",
          label: "Callout Type",
          options: [
            { label: "Info", value: "info" },
            { label: "Warning", value: "warning" },
            { label: "Success", value: "success" },
            { label: "Error", value: "error" }
          ]
        },
        title: { type: "text", label: "Title" },
        content: { type: "textarea", label: "Content" }
      },
      defaultProps: {
        type: "info",
        title: "Important Note",
        content: "This is an important piece of information."
      },
      render: ({ content, ...props }) => (
        <Callout {...props}>
          <p>{content}</p>
        </Callout>
      )
    },

    NewsletterSignup: {
      category: 'interactive',
      label: 'Newsletter Signup',
      description: 'Email subscription form',
      fields: {
        title: { type: "text", label: "Title" },
        description: { type: "textarea", label: "Description" },
        buttonText: { type: "text", label: "Button Text" },
        backgroundColor: {
          type: "select",
          label: "Background Color",
          options: [
            { label: "Blue", value: "blue" },
            { label: "Gray", value: "gray" },
            { label: "Green", value: "green" },
            { label: "Purple", value: "purple" }
          ]
        }
      },
      defaultProps: {
        title: "Subscribe to our Newsletter",
        description: "Get the latest articles delivered to your inbox",
        buttonText: "Subscribe",
        backgroundColor: "blue"
      },
      render: (props) => <NewsletterSignup {...props} />
    }
  },

  // Media Components
  media: {
    ImageBlock: {
      category: 'media',
      label: 'Image Block',
      description: 'Image with caption and sizing options',
      fields: {
        src: { type: "text", label: "Image URL" },
        alt: { type: "text", label: "Alt Text" },
        caption: { type: "text", label: "Caption" },
        size: {
          type: "select",
          label: "Image Size",
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
        src: "https://via.placeholder.com/800x400?text=Your+Image",
        alt: "Article image",
        size: "medium",
        alignment: "center"
      },
      render: (props) => <ImageBlock {...props} />
    }
  },

  // Text Components
  text: {


    ListBlock: {
      category: 'text',
      label: 'List Block',
      description: 'Formatted lists with various styles',
      fields: {
        title: { type: "text", label: "List Title" },
        type: {
          type: "select",
          label: "List Type",
          options: [
            { label: "Bullet Points", value: "bullet" },
            { label: "Checkmarks", value: "check" },
            { label: "Arrows", value: "arrow" },
            { label: "Numbered", value: "numbered" }
          ]
        },
        items: {
          type: "array",
          label: "List Items",
          arrayFields: {
            text: { type: "text", label: "Item Text" }
          },
          getItemSummary: (item) => item.text || "New Item"
        }
      },
      defaultProps: {
        title: "Key Points",
        type: "check",
        items: [
          { text: "First important point" },
          { text: "Second important point" },
          { text: "Third important point" }
        ]
      },
      render: (props) => <ListBlock {...props} />
    }
  }
};

// Configuration Builder Class
class PuckConfigBuilder {
  constructor() {
    this.enabledComponents = new Set();
    this.enabledCategories = new Set();
  }

  // Enable specific components
  enableComponents(componentNames) {
    componentNames.forEach(name => this.enabledComponents.add(name));
    return this;
  }

  // Enable entire categories
  enableCategories(categoryNames) {
    categoryNames.forEach(category => this.enabledCategories.add(category));
    return this;
  }

  // Disable specific components
  disableComponents(componentNames) {
    componentNames.forEach(name => this.enabledComponents.delete(name));
    return this;
  }

  // Build the final configuration
  build() {
    const components = {};

    // Add components by category
    Object.entries(COMPONENT_REGISTRY).forEach(([categoryName, categoryComponents]) => {
      if (this.enabledCategories.has(categoryName)) {
        Object.entries(categoryComponents).forEach(([componentName, componentConfig]) => {
          components[componentName] = componentConfig;
        });
      }
    });

    // Add individual components
    Object.entries(COMPONENT_REGISTRY).forEach(([categoryName, categoryComponents]) => {
      Object.entries(categoryComponents).forEach(([componentName, componentConfig]) => {
        if (this.enabledComponents.has(componentName)) {
          components[componentName] = componentConfig;
        }
      });
    });

    return {
      components,
      root: {
        fields: {
          title: { type: "text", label: "Page Title" }
        },
        render: ({ children, title }) => (
          <div className="min-h-screen bg-white">
            {title && <head><title>{title}</title></head>}
            {children}
          </div>
        )
      }
    };
  }
}

// Predefined configurations for different use cases
export const CONFIG_PRESETS = {
  // Basic article editor
  basic: () => new PuckConfigBuilder()
    .enableComponents(['ArticleHero', 'ArticleContent', 'QuoteBlock'])
    .build(),

  // Full featured editor
  full: () => new PuckConfigBuilder()
    .enableCategories(['content', 'layout', 'interactive', 'media', 'text'])
    .build(),

  // Content-focused editor
  content: () => new PuckConfigBuilder()
    .enableCategories(['content', 'text'])
    .enableComponents(['ImageBlock'])
    .build(),

  // Marketing-focused editor
  marketing: () => new PuckConfigBuilder()
    .enableCategories(['interactive', 'layout'])
    .enableComponents(['ArticleHero', 'ImageBlock'])
    .build(),

  // Minimal editor
  minimal: () => new PuckConfigBuilder()
    .enableComponents(['ArticleContent', 'ImageBlock'])
    .build()
};

// Dynamic configuration function
export const createDynamicConfig = (options = {}) => {
  const {
    preset = 'full',
    enabledComponents = [],
    disabledComponents = [],
    enabledCategories = [],
    customComponents = {}
  } = options;

  let config;

  // Start with preset or empty config
  if (preset && CONFIG_PRESETS[preset]) {
    config = CONFIG_PRESETS[preset]();
  } else {
    config = new PuckConfigBuilder().build();
  }

  // Add custom components to registry if provided
  if (Object.keys(customComponents).length > 0) {
    Object.assign(config.components, customComponents);
  }

  // Apply additional modifications
  const builder = new PuckConfigBuilder();

  if (enabledCategories.length > 0) {
    builder.enableCategories(enabledCategories);
  }

  if (enabledComponents.length > 0) {
    builder.enableComponents(enabledComponents);
  }

  const additionalConfig = builder.build();

  // Merge configurations
  Object.assign(config.components, additionalConfig.components);

  // Remove disabled components
  disabledComponents.forEach(componentName => {
    delete config.components[componentName];
  });

  return config;
};

// Utility functions
export const getAvailableComponents = () => {
  const components = {};
  Object.entries(COMPONENT_REGISTRY).forEach(([categoryName, categoryComponents]) => {
    components[categoryName] = Object.keys(categoryComponents);
  });
  return components;
};

export const getComponentInfo = (componentName) => {
  for (const [categoryName, categoryComponents] of Object.entries(COMPONENT_REGISTRY)) {
    if (categoryComponents[componentName]) {
      return {
        ...categoryComponents[componentName],
        category: categoryName
      };
    }
  }
  return null;
};

// Default export - you can customize this based on your needs
export default createDynamicConfig({ preset: 'full' });

