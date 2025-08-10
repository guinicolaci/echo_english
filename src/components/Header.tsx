import React from 'react';
import LoginDialog from './LoginDialog';

export default function Header() {
  return (
    <header className="border-b border-gray-200 py-6">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <svg width={32} height={32} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                className="echo-drawing"
                d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                stroke="black"
                strokeWidth={2}
              />
              <path
                className="echo-drawing"
                d="M8 14C8 14 9.5 16 12 16C14.5 16 16 14 16 14"
                stroke="black"
                strokeWidth={2}
                strokeLinecap="round"
              />
              <path
                className="echo-drawing"
                d="M9 9H9.01"
                stroke="black"
                strokeWidth={2}
                strokeLinecap="round"
              />
              <path
                className="echo-drawing"
                d="M15 9H15.01"
                stroke="black"
                strokeWidth={2}
                strokeLinecap="round"
              />
            </svg>
            <h1 className="text-2xl font-medium">Echo</h1>
          </div>
          <nav className="hidden md:block">
            <ul className="flex space-x-8">
              <li>
                <a href="#" className="hover:text-gray-600 transition">
                  <LoginDialog></LoginDialog>
                </a>
              </li>
            </ul>
          </nav>
          <button className="md:hidden">
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 12H21" stroke="black" strokeWidth={2} strokeLinecap="round" />
              <path d="M3 6H21" stroke="black" strokeWidth={2} strokeLinecap="round" />
              <path d="M3 18H21" stroke="black" strokeWidth={2} strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}