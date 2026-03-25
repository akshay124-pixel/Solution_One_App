import React, { useEffect } from "react";

const DisableCopy = ({ isAdmin }) => {
  useEffect(() => {
    if (!isAdmin) {
      // Copy, Cut, Paste Disable (except for allow-copy-paste class)
      const disableCopy = (e) => {
        if (!e.target.classList.contains("allow-copy-paste")) {
          e.preventDefault();
        }
      };
      document.addEventListener("copy", disableCopy);
      document.addEventListener("cut", disableCopy);
      document.addEventListener("paste", disableCopy);

      // Right Click Disable (except for allow-copy-paste class)
      const disableContextMenu = (e) => {
        if (!e.target.classList.contains("allow-copy-paste")) {
          e.preventDefault();
        }
      };
      document.addEventListener("contextmenu", disableContextMenu);

      // Selection Disable (except for allow-copy-paste class)
      const styleElement = document.createElement("style");
      styleElement.innerHTML = `
        body {
          user-select: none;
        }
        .allow-copy-paste {
          user-select: auto !important;
          -webkit-user-select: auto !important;
          -moz-user-select: auto !important;
          -ms-user-select: auto !important;
        }
      `;
      document.head.appendChild(styleElement);

      return () => {
        document.removeEventListener("copy", disableCopy);
        document.removeEventListener("cut", disableCopy);
        document.removeEventListener("paste", disableCopy);
        document.removeEventListener("contextmenu", disableContextMenu);
        document.head.removeChild(styleElement);
        document.body.style.userSelect = "auto";
      };
    }
  }, [isAdmin]);

  return null;
};

export default DisableCopy;