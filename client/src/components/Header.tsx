import { useState } from "react";
import { Link, useLocation } from "wouter";

const Header = () => {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4 md:justify-start md:space-x-10">
          <div className="flex justify-start lg:w-0 lg:flex-1">
            <Link href="/" className="flex items-center">
              <svg className="h-8 w-8 text-primary" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.5L20 9v6l-8 4-8-4V9l8-4.5z"></path>
              </svg>
              <span className="ml-2 text-xl font-bold text-dark-900">PolitiConnect</span>
            </Link>
          </div>
          <nav className="hidden md:flex space-x-10">
            <Link 
              href="/money-map" 
              className={`text-base font-medium ${location === '/money-map' ? 'text-primary' : 'text-gray-700 hover:text-primary'}`}
            >
              Money Map
            </Link>
            <Link 
              href="/politicians" 
              className={`text-base font-medium ${location === '/politicians' ? 'text-primary' : 'text-gray-700 hover:text-primary'}`}
            >
              Politicians
            </Link>

            <Link 
              href="/about" 
              className={`text-base font-medium ${location === '/about' ? 'text-primary' : 'text-gray-700 hover:text-primary'}`}
            >
              About
            </Link>
          </nav>
          <div className="hidden md:flex items-center justify-end md:flex-1 lg:w-0">
            <Link 
              href="/money-map" 
              className="ml-8 whitespace-nowrap inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-primary hover:bg-blue-700"
            >
              Get Started
            </Link>
          </div>
          <div className="-mr-2 -my-2 md:hidden">
            <button 
              type="button" 
              className="bg-white rounded-md p-2 inline-flex items-center justify-center text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none"
              onClick={toggleMobileMenu}
            >
              <span className="sr-only">Open menu</span>
              <i className="fas fa-bars"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute z-10 top-0 inset-x-0 p-2 transition transform origin-top-right">
          <div className="rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 bg-white divide-y-2 divide-gray-50">
            <div className="pt-5 pb-6 px-5">
              <div className="flex items-center justify-between">
                <div>
                  <svg className="h-8 w-8 text-primary" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.5L20 9v6l-8 4-8-4V9l8-4.5z"></path>
                  </svg>
                </div>
                <div className="-mr-2">
                  <button 
                    type="button" 
                    className="bg-white rounded-md p-2 inline-flex items-center justify-center text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none"
                    onClick={closeMobileMenu}
                  >
                    <span className="sr-only">Close menu</span>
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              </div>
              <div className="mt-6">
                <nav className="grid gap-y-8">
                  <Link 
                    href="/money-map" 
                    className="text-base font-medium text-gray-900 hover:text-primary"
                    onClick={closeMobileMenu}
                  >
                    Money Map
                  </Link>
                  <Link 
                    href="/politicians" 
                    className="text-base font-medium text-gray-900 hover:text-primary"
                    onClick={closeMobileMenu}
                  >
                    Politicians
                  </Link>

                  <Link 
                    href="/about" 
                    className="text-base font-medium text-gray-900 hover:text-primary"
                    onClick={closeMobileMenu}
                  >
                    About
                  </Link>
                </nav>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
