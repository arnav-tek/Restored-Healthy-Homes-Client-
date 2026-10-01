"use client";
import { useSyncExternalStore } from "react";
const subscribe = () => () => {};
export function useDemoReady() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
