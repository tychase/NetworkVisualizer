import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { Analytics } from "@vercel/analytics/react";

const root = createRoot(document.getElementById("root")!);

// Set the document title
document.title = "PolitiConnect - Political Transparency Platform";

// Add favicon
const link = document.createElement("link");
link.rel = "icon";
link.href = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%233B82F6'%3E%3Cpath d='M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.5L20 9v6l-8 4-8-4V9l8-4.5z'%3E%3C/path%3E%3C/svg%3E";
document.head.appendChild(link);

// Add meta description
const meta = document.createElement("meta");
meta.name = "description";
meta.content = "Explore connections between politicians, campaign contributions, voting records, and stock transactions in an interactive, easy-to-understand way.";
document.head.appendChild(meta);

// Add Google font
const font = document.createElement("link");
font.rel = "stylesheet";
font.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap";
document.head.appendChild(font);

// Add FontAwesome
const fontAwesome = document.createElement("link");
fontAwesome.rel = "stylesheet";
fontAwesome.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css";
document.head.appendChild(fontAwesome);

root.render(
  <>
    <App />
    <Analytics />
  </>
);
