import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route } from "react-router-dom";
import Splash from "./pages/Splash";
import Login from "./pages/Login";
import Layout from "./components/Layout";
import File from "./pages/File";
import Home from "./pages/Home";
import View from "./pages/View";
import Help from "./pages/Help";
import ManageData from "./pages/ManageData";
import Assigning from "./pages/Assigning";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <HashRouter>
    <Routes>
      <Route path="/" element={<Splash />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/home"
        element={
          <Layout>
            <Home />
          </Layout>
        }
      />
      <Route
        path="/file"
        element={
          <Layout>
            <File />
          </Layout>
        }
      />
      <Route path="/manage" element={<Layout><ManageData /></Layout>} />
      <Route path="/assign" element={<Layout><Assigning /></Layout>} />
      <Route
        path="/view"
        element={
          <Layout>
            <View />
          </Layout>
        }
      />
      <Route
        path="/help"
        element={
          <Layout>
            <Help />
          </Layout>
        }
      />
    </Routes>
  </HashRouter>
);
