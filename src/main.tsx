import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "driver.js/dist/driver.css";
import "./styles/globals.css";

createRoot(document.getElementById("root")!).render(<App />);
