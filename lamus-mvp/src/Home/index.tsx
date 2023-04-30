import React, {
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useCursorNavigation } from "../helpers/useCursorNavigation";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import "./Home.css";
import logo from "./logo.svg";
import { FocusIndicator } from "../helpers/FocusIndicator";
import classNames from "classnames";
import { useFocusSoundEffect } from "../helpers/SoundEffects/useFocusSoundEffect";
import { SoundEffectsContext } from "../helpers/SoundEffects";
import { AppStore } from "../stores/AppStore";
import {
  BsFileEarmarkText,
  BsFolder2Open,
  BsFileEarmarkCode,
} from "react-icons/bs";

// is this the first time we show the home screen. If so, fade in the logo nicely. Otherwise, just show it.
let FIRST_SHOW = true;

const Home = function Home() {
  const [firstShow] = useState(FIRST_SHOW);
  const bkgEl = useRef<HTMLImageElement>(null);
  useCursorNavigation();
  useFocusSoundEffect();
  const sfxContext = useContext(SoundEffectsContext);

  function onAnimationComplete() {
    setTimeout(() => {
      const el = document.querySelector(
        ".btn[data-focus], button[data-focus]"
      ) as HTMLElement;
      if (!el) return;
      el.focus();
      if (sfxContext && !FIRST_SHOW) {
        sfxContext.playEffect(10);
      }
    });
  }

  useEffect(() => {
    return () => {
      if (!sfxContext) return;

      sfxContext.playEffect(9);
    };
  }, [sfxContext]);

  useEffect(() => {
    FIRST_SHOW = false;
  }, []);

  useLayoutEffect(() => {
    if (!bkgEl.current) return;
    function onLoaded() {
      AppStore.setUIReady();
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
          srcSet={`${new URL(
            "../../public/Home/bkg_480.webp",
            import.meta.url
          )} 853w, ${new URL(
            "../../public/Home/bkg_720.webp",
            import.meta.url
          )} 1280w, ${new URL(
            "../../public/Home/bkg_1440.webp",
            import.meta.url
          )} 2560w`}
          type="image/webp"
        />
        <source
          srcSet={`${new URL("../../public/Home/bkg.png", import.meta.url)}`}
          type="image/png"
        />
        <img
          className="bkg"
          src={`${new URL("../../public/Home/bkg.png", import.meta.url)}`}
          alt=""
          ref={bkgEl}
        />
      </picture>
      <nav>
        <ul>
          <li>
            <Link to={"/text"} tabIndex={0} className="btn">
              <span className="icon">
                <BsFileEarmarkText />
              </span>
              Text
            </Link>
          </li>
          <li>
            <Link to={"/files"} tabIndex={1} className="btn" data-focus>
              <span className="icon">
                <BsFolder2Open />
              </span>
              Files
            </Link>
          </li>
          <li>
            <Link to={"/code"} tabIndex={2} className="btn">
              <span className="icon">
                <BsFileEarmarkCode />
              </span>
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
