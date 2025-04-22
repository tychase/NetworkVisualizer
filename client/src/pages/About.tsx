import { Link } from "wouter";

const About = () => {
  return (
    <section id="about" className="py-16 bg-light-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-2 lg:gap-8 items-center">
          <div>
            <h1 className="text-3xl font-bold text-dark-900 sm:text-4xl">
              About PolitiConnect
            </h1>
            <p className="mt-4 text-lg text-gray-500">
              PolitiConnect makes political transparency accessible to everyone. We believe that understanding the connections between money, politics, and policy should be easy and engaging.
            </p>
            <p className="mt-4 text-lg text-gray-500">
              Our data comes from official public sources including:
            </p>
            <ul className="mt-2 text-lg text-gray-500 list-disc list-inside">
              <li>Congressional voting records via GovTrack.us and ProPublica</li>
              <li>Campaign finance data from OpenSecrets.org and the FEC</li>
              <li>Stock transaction disclosures from Senate and House STOCK Act filings</li>
            </ul>
            <div className="mt-8">
              <Link href="/money-map" className="text-primary hover:text-blue-700 font-medium">
                Explore our interactive visualizations <i className="fas fa-arrow-right ml-1"></i>
              </Link>
            </div>
            
            <h2 className="mt-12 text-2xl font-bold text-dark-900">Our Mission</h2>
            <p className="mt-4 text-lg text-gray-500">
              We're committed to making political transparency accessible and understandable for everyone. Our goal is to empower citizens with clear information about how money and politics intersect.
            </p>
            
            <h2 className="mt-12 text-2xl font-bold text-dark-900">Methodology</h2>
            <p className="mt-4 text-lg text-gray-500">
              We collect data from public sources, standardize it, and build visualizations that reveal connections between:
            </p>
            <ul className="mt-2 text-lg text-gray-500 list-disc list-inside">
              <li>Campaign contributions from organizations to politicians</li>
              <li>Voting records on legislation that affects these organizations</li>
              <li>Stock transactions that may indicate conflicts of interest</li>
            </ul>
            <p className="mt-4 text-lg text-gray-500">
              All potential conflicts of interest are determined using objective criteria, including:
            </p>
            <ul className="mt-2 text-lg text-gray-500 list-disc list-inside">
              <li>Timing of stock purchases or sales relative to related legislation</li>
              <li>Significant campaign contributions from affected industries</li>
              <li>Direct financial interests in companies affected by legislation</li>
            </ul>
          </div>
          <div className="mt-10 lg:mt-0">
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <svg 
                className="w-full h-auto text-primary"
                viewBox="0 0 1200 800" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f0f0f0" strokeWidth="1"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
                
                {/* Central capitol building */}
                <g transform="translate(600, 400)">
                  <rect x="-100" y="-50" width="200" height="150" fill="#3B82F6" rx="5" />
                  <rect x="-120" y="100" width="240" height="30" fill="#3B82F6" rx="2" />
                  <polygon points="0,-100 -120,0 120,0" fill="#3B82F6" />
                  <circle cx="0" cy="-40" r="25" fill="white" />
                </g>
                
                {/* Politicians */}
                <g>
                  <circle cx="300" cy="300" r="60" fill="#3B82F6" opacity="0.8" />
                  <circle cx="900" cy="300" r="60" fill="#EF4444" opacity="0.8" />
                  <circle cx="300" cy="600" r="60" fill="#3B82F6" opacity="0.8" />
                  <circle cx="900" cy="600" r="60" fill="#10B981" opacity="0.8" />
                </g>
                
                {/* Dollar symbols for politicians */}
                <g fill="white" fontFamily="Arial" fontSize="40" fontWeight="bold" textAnchor="middle">
                  <text x="300" y="315">$</text>
                  <text x="900" y="315">$</text>
                  <text x="300" y="615">$</text>
                  <text x="900" y="615">$</text>
                </g>
                
                {/* Organizations */}
                <g>
                  <rect x="450" y="150" width="80" height="80" fill="#F59E0B" rx="5" />
                  <rect x="670" y="150" width="80" height="80" fill="#F59E0B" rx="5" />
                  <rect x="450" y="570" width="80" height="80" fill="#F59E0B" rx="5" />
                  <rect x="670" y="570" width="80" height="80" fill="#F59E0B" rx="5" />
                </g>
                
                {/* Building symbols for organizations */}
                <g fill="white" fontFamily="Arial" fontSize="40" fontWeight="bold" textAnchor="middle">
                  <text x="490" y="200">🏢</text>
                  <text x="710" y="200">🏢</text>
                  <text x="490" y="620">🏢</text>
                  <text x="710" y="620">🏢</text>
                </g>
                
                {/* Connection lines */}
                <g stroke="#3B82F6" strokeWidth="3" strokeDasharray="10,5" fill="none">
                  <path d="M 360,300 L 450,190" />
                  <path d="M 360,300 L 450,610" />
                </g>
                <g stroke="#EF4444" strokeWidth="3" strokeDasharray="10,5" fill="none">
                  <path d="M 840,300 L 750,190" />
                  <path d="M 840,300 L 750,610" />
                </g>
                <g stroke="#10B981" strokeWidth="3" strokeDasharray="10,5" fill="none">
                  <path d="M 840,600 L 750,190" />
                  <path d="M 840,600 L 750,610" />
                </g>
                <g stroke="#3B82F6" strokeWidth="3" strokeDasharray="10,5" fill="none">
                  <path d="M 360,600 L 450,190" />
                  <path d="M 360,600 L 450,610" />
                </g>
                
                {/* Chart in the bottom */}
                <g transform="translate(600, 700)">
                  <rect x="-200" y="-30" width="400" height="60" fill="white" stroke="#CBD5E1" rx="5" />
                  <rect x="-180" y="-15" width="100" height="30" fill="#3B82F6" rx="2" />
                  <rect x="-70" y="-15" width="80" height="30" fill="#EF4444" rx="2" />
                  <rect x="20" y="-15" width="150" height="30" fill="#10B981" rx="2" />
                </g>
              </svg>
              
              <div className="mt-6">
                <h3 className="text-xl font-bold text-dark-900">Key Features</h3>
                <ul className="mt-4 space-y-2">
                  <li className="flex items-start">
                    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-primary flex items-center justify-center text-white">
                      <i className="fas fa-project-diagram text-xs"></i>
                    </div>
                    <p className="ml-3 text-gray-700">Interactive network visualizations</p>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-primary flex items-center justify-center text-white">
                      <i className="fas fa-user-tie text-xs"></i>
                    </div>
                    <p className="ml-3 text-gray-700">Comprehensive politician profiles</p>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-primary flex items-center justify-center text-white">
                      <i className="fas fa-chart-line text-xs"></i>
                    </div>
                    <p className="ml-3 text-gray-700">Timeline analysis of votes and trades</p>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-primary flex items-center justify-center text-white">
                      <i className="fas fa-search-dollar text-xs"></i>
                    </div>
                    <p className="ml-3 text-gray-700">Potential conflict of interest highlighting</p>
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="mt-8 bg-white p-6 rounded-lg shadow-lg">
              <h3 className="text-xl font-bold text-dark-900">Contact Us</h3>
              <p className="mt-2 text-gray-700">
                Have questions, suggestions, or feedback? We'd love to hear from you.
              </p>
              <div className="mt-4 flex items-center">
                <i className="fas fa-envelope text-primary mr-2"></i>
                <span className="text-gray-700">info@politiconnect.org</span>
              </div>
              <div className="mt-2 flex items-center">
                <i className="fas fa-globe text-primary mr-2"></i>
                <span className="text-gray-700">www.politiconnect.org</span>
              </div>
              <div className="mt-4 flex space-x-4">
                <a href="#" className="text-primary hover:text-blue-700">
                  <i className="fab fa-twitter text-xl"></i>
                </a>
                <a href="#" className="text-primary hover:text-blue-700">
                  <i className="fab fa-facebook text-xl"></i>
                </a>
                <a href="#" className="text-primary hover:text-blue-700">
                  <i className="fab fa-github text-xl"></i>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
