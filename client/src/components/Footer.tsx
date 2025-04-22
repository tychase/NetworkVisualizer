import { Link } from "wouter";

const Footer = () => {
  return (
    <footer className="bg-dark-900 text-white">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <div className="flex items-center">
              <svg className="h-8 w-8 text-primary" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.5L20 9v6l-8 4-8-4V9l8-4.5z"></path>
              </svg>
              <span className="ml-2 text-xl font-bold text-white">PolitiConnect</span>
            </div>
            <p className="mt-2 text-sm text-gray-300">
              Making political transparency accessible to everyone.
            </p>
          </div>
          <div className="md:col-span-1">
            <h3 className="text-sm font-semibold text-gray-300 tracking-wider uppercase">
              Explore
            </h3>
            <ul className="mt-4 space-y-4">
              <li>
                <Link href="/money-map" className="text-base text-gray-300 hover:text-white">
                  Money Map
                </Link>
              </li>
              <li>
                <Link href="/politicians" className="text-base text-gray-300 hover:text-white">
                  Politicians
                </Link>
              </li>

              <li>
                <Link href="/about" className="text-base text-gray-300 hover:text-white">
                  About
                </Link>
              </li>
            </ul>
          </div>
          <div className="md:col-span-1">
            <h3 className="text-sm font-semibold text-gray-300 tracking-wider uppercase">
              Resources
            </h3>
            <ul className="mt-4 space-y-4">
              <li>
                <Link href="/about" className="text-base text-gray-300 hover:text-white">
                  Methodology
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-base text-gray-300 hover:text-white">
                  Data Sources
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-base text-gray-300 hover:text-white">
                  API Documentation
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-base text-gray-300 hover:text-white">
                  Academic Research
                </Link>
              </li>
            </ul>
          </div>
          <div className="md:col-span-1">
            <h3 className="text-sm font-semibold text-gray-300 tracking-wider uppercase">
              Connect
            </h3>
            <ul className="mt-4 space-y-4">
              <li>
                <Link href="/about" className="text-base text-gray-300 hover:text-white">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-base text-gray-300 hover:text-white">
                  Newsletter
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-base text-gray-300 hover:text-white">
                  Media Inquiries
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-base text-gray-300 hover:text-white">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-12 border-t border-gray-700 pt-8">
          <p className="text-base text-gray-400 text-center">
            &copy; {new Date().getFullYear()} PolitiConnect. All rights reserved. Created by Tyler Chase.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
