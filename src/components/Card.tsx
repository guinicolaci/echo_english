// components/Card.tsx
import React from 'react';

interface CardProps {
  title: string;
  description: string;
  svgPath: string;
}

export default function Card({ title, description, svgPath }: CardProps) {
  return (
    // ALTERADO: Adicionado h-full para altura total e flexbox para alinhamento interno
    <div className="border border-gray-200 rounded-lg p-6 hover:bg-gray-50 transition cursor-pointer group h-full flex flex-col">
      <div className="flex items-center mb-4">
        <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center mr-4 group-hover:bg-gray-800 transition">
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d={svgPath}
              stroke="white"
              strokeWidth={2}
              strokeLinecap="round"
              // A transição de escala do SVG dentro do path pode causar problemas de renderização.
              // É melhor aplicá-la ao <svg> pai se necessário.
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium group-hover:text-gray-800 transition">{title}</h3>
      </div>
      <p className="text-gray-600 group-hover:text-gray-700 transition">{description}</p>
    </div>
  );
}