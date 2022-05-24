import React from "react";
import { observer } from "mobx-react-lite";
import { Toast, ToastContainer } from "react-bootstrap";
import { NotificationStore } from "../stores/NotificationStore";
import "./Notifier.css";
import { motion, AnimatePresence } from "framer-motion";

export const Notifier = observer(function Notifier() {
  const notifications = Array.from(NotificationStore.notifications.entries());

  return (
    <ToastContainer position="top-center" className="mt-3">
      <AnimatePresence>
        {notifications.map(([id, notification]) => (
          <motion.div
            key={id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Toast
              role="alert"
              bg={notification.variant ?? "primary"}
              className="border-0"
              show={true}
              delay={5000}
              autohide={true}
            >
              <Toast.Body className="text-white">
                {notification.message}
              </Toast.Body>
            </Toast>
          </motion.div>
        ))}
      </AnimatePresence>
    </ToastContainer>
  );
});
