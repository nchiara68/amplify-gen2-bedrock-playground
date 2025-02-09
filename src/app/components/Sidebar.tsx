"use client";
// Ensures that this file is treated as client-side code in a Next.js application.

import Link from "next/link";
// Importing the `Link` component from Next.js to enable client-side navigation between pages.

export default function Sidebar({
    isOpen,
    onClose,
}: {
    isOpen: boolean; // A boolean prop to control whether the sidebar is visible or hidden.
    onClose: () => void; // A callback function that is triggered to close the sidebar.
}) {
    return (
        <>
            {/* Sidebar overlay to provide a darkened background when the sidebar is open. */}
            <div
                className={`sidebar-overlay ${isOpen ? "visible" : ""}`}
                // Conditionally adds the `visible` class when `isOpen` is true, making the overlay visible.
                onClick={onClose}
                // Closes the sidebar when the overlay is clicked.
            ></div>

            {/* Sidebar container */}
            <div className={`sidebar ${isOpen ? "open" : ""}`}>
                {/* Conditionally applies the `open` class to make the sidebar slide into view when `isOpen` is true. */}

                {/* Sidebar header */}
                <div className="sidebar-header">
                    <h2>Navigation</h2>
                    {/* Sidebar title */}

                    <button onClick={onClose}>✕</button>
                    {/* Button to close the sidebar. The `onClose` callback is triggered when this button is clicked. */}
                </div>

                {/* Navigation Links */}
                <Link href="/" className="sidebar-item">
                    Home
                </Link>
                {/* A link to the homepage. `href="/"` specifies the target route. */}

                <Link href="/actionPlanner" className="sidebar-item">
                    Action Planner
                </Link>

                <Link href="/actCounselor" className="sidebar-item">
                    ACT Counselor
                </Link>

                <Link href="/employeeInformationRetriever" className="sidebar-item">
                    Employee Information Retriever
                </Link>
                <Link href="/employeeTalentGraph" className="sidebar-item">
                    Employee Talent Graph
                </Link>

                {/* Divider above Account Settings */}
                <hr className="sidebar-divider" />
                {/* A horizontal rule styled as a divider */}

                <Link href="/account-settings" className="sidebar-item">
                    Account Settings
                </Link>
                {/* A link to the account settings page. `href="/account-settings"` specifies the target route. */}
            </div>
        </>
    );
}
