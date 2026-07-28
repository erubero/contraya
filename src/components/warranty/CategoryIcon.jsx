import React from 'react';
import {
  Smartphone, Home, Sofa, Car, Shirt, Wrench,
  Dumbbell, Gem, Package
} from "lucide-react";

const iconMap = {
  electronics: Smartphone,
  appliances: Home,
  furniture: Sofa,
  automotive: Car,
  clothing: Shirt,
  tools: Wrench,
  sports: Dumbbell,
  jewelry: Gem,
  other: Package,
};

const colorMap = {
  electronics: "bg-blue-50 text-blue-600",
  appliances: "bg-indigo-50 text-indigo-600",
  furniture: "bg-sky-50 text-sky-700",
  automotive: "bg-slate-100 text-slate-700",
  clothing: "bg-blue-50 text-blue-700",
  tools: "bg-cyan-50 text-cyan-700",
  sports: "bg-sky-50 text-sky-600",
  jewelry: "bg-indigo-50 text-indigo-700",
  other: "bg-slate-50 text-slate-600",
};

export default function CategoryIcon({ category, size = "md" }) {
  const Icon = iconMap[category] || Package;
  const colors = colorMap[category] || colorMap.other;
  const sizeClass = size === "lg" ? "w-14 h-14" : size === "sm" ? "w-8 h-8" : "w-10 h-10";
  const iconSize = size === "lg" ? "w-7 h-7" : size === "sm" ? "w-4 h-4" : "w-5 h-5";

  return (
    <div className={`${sizeClass} ${colors} rounded-xl flex items-center justify-center flex-shrink-0`}>
      <Icon className={iconSize} />
    </div>
  );
}