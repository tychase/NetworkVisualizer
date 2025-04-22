import { Link } from "wouter";

const Home = () => {
  return (
    <>
      {/* Hero Section */}
      <div className="bg-primary text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-8 items-center">
            <div>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Follow the Money in Politics
              </h1>
              <p className="mt-6 text-xl max-w-3xl">
                Explore connections between politicians, campaign contributions, voting records, and stock transactions in an interactive, easy-to-understand way.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Link 
                  href="/money-map" 
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-primary bg-white hover:bg-gray-100"
                >
                  Explore Money Connections
                </Link>
                <Link 
                  href="/about" 
                  className="inline-flex items-center px-6 py-3 border border-white text-base font-medium rounded-md text-white hover:bg-blue-600"
                >
                  How it Works
                </Link>
              </div>
            </div>
            <div className="mt-12 lg:mt-0 flex justify-center">
              <svg 
                className="w-full max-w-lg h-auto text-blue-100"
                viewBox="0 0 1200 800" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <g fill="currentColor" opacity="0.2">
                  <circle cx="400" cy="400" r="200" />
                  <circle cx="800" cy="400" r="200" />
                  <circle cx="600" cy="600" r="200" />
                </g>
                <g fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M400,400 L800,400" />
                  <path d="M400,400 L600,600" />
                  <path d="M800,400 L600,600" />
                </g>
                <g fill="white">
                  <circle cx="400" cy="400" r="20" />
                  <circle cx="800" cy="400" r="20" />
                  <circle cx="600" cy="600" r="20" />
                </g>
                <g fill="none" stroke="white" strokeWidth="6">
                  <path d="M380,380 L420,420" />
                  <path d="M380,420 L420,380" />
                  <path d="M780,380 L820,420" />
                  <path d="M780,420 L820,380" />
                  <path d="M590,610 C590,610 600,590 610,610" />
                  <path d="M590,590 C590,590 600,610 610,590" />
                </g>
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-primary">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8 lg:flex lg:items-center lg:justify-between">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            <span className="block">Ready to dive deeper?</span>
            <span className="block text-blue-100">Start exploring the connections today.</span>
          </h2>
          <div className="mt-8 flex lg:mt-0 lg:flex-shrink-0">
            <div className="inline-flex rounded-md shadow">
              <Link 
                href="/money-map" 
                className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-primary bg-white hover:bg-gray-50"
              >
                Get Started
              </Link>
            </div>
            <div className="ml-3 inline-flex rounded-md shadow">
              <Link 
                href="/about" 
                className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-700 hover:bg-blue-800"
              >
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
