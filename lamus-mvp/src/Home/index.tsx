import classNames from "classnames";
import { motion } from "framer-motion";
import {
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  BsFileEarmarkCode,
  BsFileEarmarkText,
  BsFolder2Open,
} from "react-icons/bs";
import { Link } from "react-router-dom";
import { FocusIndicator } from "../helpers/FocusIndicator";
import { SoundEffectsContext } from "../helpers/SoundEffects";
import { useFocusSoundEffect } from "../helpers/SoundEffects/useFocusSoundEffect";
import { useCursorNavigation } from "../helpers/useCursorNavigation";
import { AppStore } from "../stores/AppStore";
import "./Home.css";
import bkgLegacy from "./img/bkg.png";
import bkg1440 from "./img/bkg_1440.webp";
import bkg480 from "./img/bkg_480.webp";
import bkg720 from "./img/bkg_720.webp";
import logo from "./logo.svg";

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
      // if (sfxContext && !FIRST_SHOW) {
      //   sfxContext.playEffect(10);
      // }
    });
  }

  // useEffect(() => {
  //   return () => {
  //     if (!sfxContext) return;

  //     sfxContext.playEffect(9);
  //   };
  // }, [sfxContext]);

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
          srcSet={`${bkg480} 853w, ${bkg720} 1280w, ${bkg1440} 2560w`}
          type="image/webp"
        />
        <source srcSet={bkgLegacy} type="image/png" />
        <img className="bkg" src={bkgLegacy} alt="" ref={bkgEl} />
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
