import React from "react";
import { motion } from "motion/react";
import { SEILogo } from "./SEILogo";

export function FlyingAppLogo() {
  return (
    <motion.div
      initial={{ y: 200, opacity: 0, scale: 0.5, rotate: -45 }}
      animate={{ 
        y: [200, -30, 0], 
        opacity: [0, 1, 1],
        scale: [0.5, 1.2, 1],
        rotate: [-45, 15, 0]
      }}
      transition={{ 
        duration: 2, 
        ease: [0.22, 1, 0.36, 1],
        times: [0, 0.6, 1]
      }}
      className="fixed top-12 -right-12 z-10 pointer-events-none"
    >
      <motion.div
        animate={{ 
          y: [0, -40, 0],
          rotate: [0, 5, 0, -5, 0],
          x: [0, 15, 0, -15, 0]
        }}
        transition={{ 
          duration: 8, 
          repeat: Infinity, 
          ease: "easeInOut"
        }}
        className="drop-shadow-[0_50px_100px_rgba(70,130,180,0.5)]"
      >
        <SEILogo className="w-96 h-96 md:w-[500px] md:h-[500px]" />
      </motion.div>
      
      {/* Glow effect */}
      <motion.div 
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: [0, 0.15, 0], scale: [0.8, 2, 0.8] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeOut", delay: 0.2 }}
        className="absolute inset-0 bg-[#4682b4] rounded-full blur-3xl -z-10"
      />
    </motion.div>
  );
}
