"use client";
// This directive ensures the file is treated as client-side code in a Next.js application.

import { ToggleButton } from "@aws-amplify/ui-react";
// Importing the `ToggleButton` component from the AWS Amplify UI React library.
// This is a styled button with toggle functionality.

import { MdMenu, MdClose } from "react-icons/md";
// Importing Material Design icons from the `react-icons` library.
// - `MdMenu` is a hamburger menu icon.
// - `MdClose` is a close (X) icon.

export default function ToggleSidebarButton({
    isOpen,
    onToggle,
}: {
    isOpen: boolean; // Indicates whether the sidebar is currently open (true) or closed (false).
    onToggle: () => void; // A callback function to toggle the sidebar's open/close state.
}) {
    return (
        <ToggleButton
            size="small"
            // Sets the size of the button. `small` makes the button compact.

            isPressed={isOpen}
            // Indicates whether the button is pressed (active).
            // `isOpen` determines the state of the sidebar, so when `isOpen` is true, the button visually reflects the pressed state.

            onClick={onToggle}
            // Event handler for the button click. When the button is clicked, the `onToggle` function is triggered,
            // which typically toggles the `isOpen` state in the parent component.

            style={{
                position: "fixed",
                // Fixes the button's position relative to the viewport, so it doesn't move when scrolling.

                left: "16px",
                // Positions the button 16px from the left edge of the viewport.

                top: "16px",
                // Positions the button 16px from the top edge of the viewport.
            }}
        >
            {/* The button content is dynamically rendered based on the `isOpen` state. */}
            {isOpen ? (
                <MdClose size={24} />
            ) : (
                // If `isOpen` is true, the close icon (`MdClose`) is displayed to indicate the sidebar can be closed.
                <MdMenu size={24} />
                // If `isOpen` is false, the menu icon (`MdMenu`) is displayed to indicate the sidebar can be opened.
            )}
        </ToggleButton>
    );
}
