"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Drawer,
  DrawerContent,
  DrawerClose,
} from "@/components/ui/drawer"

// Detect touch/mobile device
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.matchMedia('(max-width: 640px)').matches);
    check();
    const mq = window.matchMedia('(max-width: 640px)');
    mq.addEventListener('change', check);
    return () => mq.removeEventListener('change', check);
  }, []);
  return isMobile;
}

const Select = SelectPrimitive.Root

const SelectGroup = SelectPrimitive.Group

const SelectValue = SelectPrimitive.Value

const SelectTrigger = React.forwardRef(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1 select-none",
      className
    )}
    {...props}>
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectScrollUpButton = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}>
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
))
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName

const SelectScrollDownButton = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}>
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
))
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName

// Mobile bottom-sheet content wrapper
const MobileSelectContent = ({ open, onOpenChange, children, value, onValueChange }) => {
  // Extract items from children recursively
  const items = [];
  React.Children.forEach(children, child => {
    if (!child) return;
    if (child.type === SelectItem) {
      items.push(child);
    } else if (child.props?.children) {
      React.Children.forEach(child.props.children, grandchild => {
        if (grandchild?.type === SelectItem) items.push(grandchild);
      });
    }
  });

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="pb-safe">
        <div className="px-4 py-2 max-h-[60vh] overflow-y-auto">
          {items.map((item, i) => {
            const itemValue = item.props.value;
            const isSelected = itemValue === value;
            return (
              <button
                key={itemValue ?? i}
                className={cn(
                  "flex w-full items-center justify-between px-3 py-3.5 text-sm rounded-lg mb-1 transition-colors select-none",
                  isSelected
                    ? "bg-accent text-accent-foreground font-medium"
                    : "hover:bg-secondary active:bg-secondary"
                )}
                onClick={() => {
                  onValueChange?.(itemValue);
                  onOpenChange(false);
                }}
              >
                <span>{item.props.children}</span>
                {isSelected && <Check className="h-4 w-4" />}
              </button>
            );
          })}
        </div>
        <div className="p-4 pt-0">
          <DrawerClose asChild>
            <button className="w-full py-3 text-sm text-muted-foreground border rounded-lg select-none">
              Cancel
            </button>
          </DrawerClose>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

// Responsive Select wrapper — replaces the Radix Select on mobile
const ResponsiveSelect = ({ value, onValueChange, children, ...props }) => {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  if (!isMobile) {
    return (
      <Select value={value} onValueChange={onValueChange} {...props}>
        {children}
      </Select>
    );
  }

  // On mobile: render a plain trigger button + bottom-sheet
  let triggerChild = null;
  let contentChild = null;
  React.Children.forEach(children, child => {
    if (!child) return;
    if (child.type === SelectTrigger) triggerChild = child;
    if (child.type === SelectContent) contentChild = child;
  });

  // Resolve the display label for the current value
  let displayLabel = null;
  if (contentChild) {
    const findLabel = (nodes) => {
      React.Children.forEach(nodes, node => {
        if (!node) return;
        if (node.type === SelectItem && node.props.value === value) {
          displayLabel = node.props.children;
        } else if (node.props?.children) {
          findLabel(node.props.children);
        }
      });
    };
    findLabel(contentChild.props.children);
  }

  const placeholder = triggerChild?.props?.children
    ? React.Children.toArray(triggerChild.props.children).find(c => c?.type === SelectValue)?.props?.placeholder
    : undefined;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm select-none",
          triggerChild?.props?.className
        )}
      >
        <span className={cn(!displayLabel && "text-muted-foreground")}>
          {displayLabel ?? placeholder ?? "Select…"}
        </span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>
      {contentChild && (
        <MobileSelectContent
          open={open}
          onOpenChange={setOpen}
          value={value}
          onValueChange={onValueChange}
        >
          {contentChild.props.children}
        </MobileSelectContent>
      )}
    </>
  );
};

const SelectContent = React.forwardRef(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        position === "popper" &&
          "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
        className
      )}
      position={position}
      {...props}>
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn("p-1", position === "popper" &&
          "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]")}>
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
))
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectLabel = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("px-2 py-1.5 text-sm font-semibold", className)}
    {...props} />
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

const SelectItem = React.forwardRef(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}>
    <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName

const SelectSeparator = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props} />
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

export {
  ResponsiveSelect as Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}