import React from "react";
import { createRoot } from "react-dom/client";
import {bootStore} from "./browser-store.js";
import App from "./App.jsx";
import "animal-island-ui/style";
import "./style.css";

bootStore().then(initial=>createRoot(document.getElementById("root")).render(<App initial={initial}/>));

import "./dark.css";

import "./mobile.css";
