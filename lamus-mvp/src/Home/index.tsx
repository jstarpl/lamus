import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useCursorNavigation } from "../helpers/useCursorNavigation";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import "./Home.css";
import bkg_480_webp from "./bkg_480.webp";
import bkg_720_webp from "./bkg_720.webp";
import bkg_1440_webp from "./bkg_1440.webp";
import bkg_png from "./bkg.png";
import logo from "./logo.svg";
import { FocusIndicator } from "../helpers/FocusIndicator";
import { EVENT_UI_READY } from "../App";
import classNames from "classnames";
import { useHideMouseOnType } from "../helpers/useHideMouseOnType";

// is this the first time we show the home screen. If so, fade in the logo nicely. Otherwise, just show it.
let FIRST_SHOW = true;

const Home = function Home() {
  const [firstShow] = useState(FIRST_SHOW);
  const bkgEl = useRef<HTMLImageElement>(null);
  useCursorNavigation();

  function onAnimationComplete() {
    setTimeout(() => {
      const el = document.querySelector(
        ".btn[data-focus], button[data-focus]"
      ) as HTMLElement;
      if (!el) return;
      el.focus();
    });
  }

  useEffect(() => {
    FIRST_SHOW = false;
  }, []);

  useLayoutEffect(() => {
    if (!bkgEl.current) return;
    function onLoaded() {
      window.dispatchEvent(new CustomEvent(EVENT_UI_READY));
    }

    if (bkgEl.current.complete) {
      onLoaded();
      return;
    }

    const bkgImage = bkgEl.current;
    bkgImage.addEventListener("load", onLoaded);

    return () => {
      bkgImage.removeEventListener("load", onLoaded);
    };
  }, []);

  useEffect(() => {
    const overflowBuf = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = overflowBuf;
    };
  }, []);

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
        <source
          srcSet={`${bkg_480_webp} 853w, ${bkg_720_webp} 1280w, ${bkg_1440_webp} 2560w`}
          type="image/webp"
        />
        <source srcSet={`${bkg_png}`} type="image/png" />
        <img className="bkg" src={bkg_png} alt="" ref={bkgEl} />
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
      <img
        src={logo}
        className={classNames("logo", {
          "first-show": firstShow,
        })}
        alt="Lamus Logo"
      />
      <FocusIndicator />
    </motion.div>
  );
};

export default Home;
