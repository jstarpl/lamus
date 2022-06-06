import React, { useLayoutEffect } from "react";
import { useDefaultInitialization } from "../helpers/useDefaultInitialization";
import { useCursorNavigation } from "../helpers/useCursorNavigation";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import "./Home.css";
import bkg_webp from "./bkg.webp";
import bkg_png from "./bkg.png";
import { FocusIndicator } from "../helpers/FocusIndicator";

const Home = function Home() {
  useDefaultInitialization();
  useCursorNavigation();

  function onAnimationComplete() {
    setTimeout(() => {
      const el = document.querySelector(
        ".btn[data-focus], button[data-focus]"
      ) as HTMLElement;
      console.log(el);
      if (!el) return;
      el.focus();
    });
  }

  return (
    <motion.div
      id="home-screen"
      initial={{ y: "-100%", opacity: 1 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: "-100%", opacity: 1, zIndex: 99 }}
      transition={{ duration: 0.5 }}
      onAnimationComplete={onAnimationComplete}
    >
      <picture>
        <source srcSet={bkg_webp} type="image/webp" />
        <source srcSet={bkg_png} type="image/png" />
        <img className="bkg" src={bkg_png} alt="" />
      </picture>
      <nav>
        <ul>
          <li>
            <Link to={"/text"} tabIndex={0} className="btn">
              Text
            </Link>
          </li>
          <li>
            <Link to={"/files"} tabIndex={1} className="btn" data-focus>
              Files
            </Link>
          </li>
          <li>
            <Link to={"/code"} tabIndex={2} className="btn">
              Code
            </Link>
          </li>
        </ul>
      </nav>
      <FocusIndicator />
    </motion.div>
  );
};

export default Home;
