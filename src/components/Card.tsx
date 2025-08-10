import React from 'react';

// Define the props interface for type safety
interface CardProps {
  title: string;
  description: string;
  svgPath: string;
}

/**
 * Card Component
 * A reusable card component with icon, title and description
 * 
 * @param title - Card title text
 * @param description - Card description text
 * @param svgPath - SVG path data for the icon
 */
export default function Card({ title, description, svgPath }: CardProps) {
  return (
    // CHANGED: Added h-full for full height and flexbox for internal alignment
    <div className="border border-gray-200 rounded-lg p-6 hover:bg-gray-50 transition cursor-pointer group h-full flex flex-col">
      {/* Header section with icon and title */}
      <div className="flex items-center mb-4">
        {/* Circular icon container */}
        <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center mr-4 group-hover:bg-gray-800 transition">
          {/* SVG icon - using path data from props */}
          <svg 
            width={16} 
            height={16} 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d={svgPath}
              stroke="white"
              strokeWidth={2}
              strokeLinecap="round"
              // Note: Applying scale transitions to the path may cause rendering issues.
              // It's better to apply them to the parent <svg> if needed.
            />
          </svg>
        </div>
        {/* Card title with hover effect */}
        <h3 className="text-lg font-medium group-hover:text-gray-800 transition">
          {title}
        </h3>
      </div>
      
      {/* Card description with hover effect */}
      <p className="text-gray-600 group-hover:text-gray-700 transition">
        {description}
      </p>
    </div>
  );
}